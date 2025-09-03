# ML Marketplace Implementation Guide

> **Detailed instructions for each team to integrate the marketplace with existing infrastructure**

## 🎯 **Overview**

The public `trader-marketplace` repo provides contracts, CLI, and templates for external developers. Each team needs to integrate marketplace functionality into your existing private infrastructure.

---

## 🏗️ **INFRASTRUCTURE TEAM**

### **Objective**: Add marketplace API endpoints to existing Infra repo

### **Files to Create/Modify:**

#### 1. Database Schema Updates

**File**: `supabase/migrations/20250102_marketplace_integration.sql`

```sql
-- Vendor management
CREATE TABLE IF NOT EXISTS marketplace_vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  encrypted_connections JSONB DEFAULT '{}', -- RunPod/HF tokens
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training runs
CREATE TABLE IF NOT EXISTS training_runs (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES marketplace_vendors(id),
  round_id TEXT NOT NULL,
  task TEXT NOT NULL CHECK (task IN ('signal', 'consensus', 'optimizer')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  spec JSONB NOT NULL,
  runpod_job_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  metrics JSONB DEFAULT '{}',
  artifacts JSONB DEFAULT '{}'
);

-- Dataset rounds
CREATE TABLE IF NOT EXISTS dataset_rounds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  schema_version TEXT NOT NULL DEFAULT '1.0.0',
  is_current BOOLEAN DEFAULT FALSE,
  files JSONB NOT NULL DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Deployment tokens (scoped Infrastructure tokens)
CREATE TABLE IF NOT EXISTS deployment_tokens (
  deployment_id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES marketplace_vendors(id),
  token_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  scope JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_runs_vendor_id ON training_runs(vendor_id);
CREATE INDEX IF NOT EXISTS idx_training_runs_status ON training_runs(status);
CREATE INDEX IF NOT EXISTS idx_deployment_tokens_vendor_id ON deployment_tokens(vendor_id);
CREATE INDEX IF NOT EXISTS idx_deployment_tokens_expires_at ON deployment_tokens(expires_at);

-- Insert sample dataset round
INSERT INTO dataset_rounds (id, name, description, is_current, files) VALUES (
  '2025-01-02',
  'Daily Trading Signals Round',
  'OHLCV data and technical indicators for major currency pairs',
  TRUE,
  '[
    {"name": "train.csv", "type": "train", "size_bytes": 52428800, "format": "csv"},
    {"name": "validation.csv", "type": "validation", "size_bytes": 10485760, "format": "csv"},
    {"name": "features.parquet", "type": "features", "size_bytes": 26214400, "format": "parquet"}
  ]'
) ON CONFLICT (id) DO NOTHING;
```

#### 2. Token Introspection Middleware

**File**: `src/middleware/marketplaceAuth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import { sql } from './db';

interface MarketplaceToken {
  active: boolean;
  vendor_id?: string;
  deployment_id?: string;
  scope?: any;
  expires_at?: string;
}

const TOKEN_CACHE = new Map<string, { data: MarketplaceToken; until: number }>();

export async function marketplaceAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authorization header required' });
    }

    const token = authHeader.substring(7);
    if (!token.startsWith('sit_')) {
      return res.status(401).json({ success: false, error: 'Invalid token format' });
    }

    // Check cache first
    const cached = TOKEN_CACHE.get(token);
    const now = Date.now();
    if (cached && cached.until > now) {
      if (!cached.data.active) {
        return res.status(401).json({ success: false, error: 'Token inactive' });
      }
      (req as any).marketplace = cached.data;
      return next();
    }

    // Introspect token
    const tokenData = await introspectToken(token);
    
    // Cache result for 60 seconds
    TOKEN_CACHE.set(token, {
      data: tokenData,
      until: now + 60_000
    });

    if (!tokenData.active) {
      return res.status(401).json({ success: false, error: 'Token inactive or expired' });
    }

    // Add to request context
    (req as any).marketplace = tokenData;
    next();

  } catch (error) {
    console.error('Marketplace auth error:', error);
    res.status(503).json({ success: false, error: 'Authentication service unavailable' });
  }
}

async function introspectToken(token: string): Promise<MarketplaceToken> {
  try {
    // Get token record from database
    const result = await sql`
      SELECT dt.*, mv.id as vendor_id
      FROM deployment_tokens dt
      JOIN marketplace_vendors mv ON dt.vendor_id = mv.id
      WHERE dt.deployment_id = (
        SELECT deployment_id FROM deployment_tokens 
        WHERE token_hash LIKE ${token.substring(0, 10) + '%'}
        LIMIT 1
      )
      AND dt.expires_at > NOW()
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return { active: false };
    }

    const row = result.rows[0];
    
    // Verify token hash
    const pepper = process.env.INFRA_TOKEN_PEPPER!;
    const isValid = await argon2.verify(
      row.token_hash, 
      `${row.salt}:${token}:${pepper}`
    );

    if (!isValid) {
      return { active: false };
    }

    // Update last used timestamp
    await sql`
      UPDATE deployment_tokens 
      SET last_used_at = NOW() 
      WHERE deployment_id = ${row.deployment_id}
    `;

    return {
      active: true,
      vendor_id: row.vendor_id,
      deployment_id: row.deployment_id,
      scope: row.scope,
      expires_at: row.expires_at,
    };

  } catch (error) {
    console.error('Token introspection error:', error);
    return { active: false };
  }
}
```

#### 3. Marketplace API Routes

**File**: `src/routes/marketplace.ts`

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { TrainingSpecSchema, TrainingRunSchema } from '@neuronetiq/marketplace-contracts';
import { marketplaceAuth } from '../middleware/marketplaceAuth';
import { createRunPodTrainingJob } from '../services/runpod';
import { sql } from '../db';

const router = Router();

// Public catalog endpoint
router.get('/api/catalog', async (req, res) => {
  try {
    const result = await sql`
      SELECT 
        m.id,
        m.name,
        m.description,
        mv.name as vendor,
        m.task,
        mv2.stage,
        m.created_at,
        m.updated_at,
        d.last_heartbeat_at,
        d.status
      FROM models m
      JOIN marketplace_vendors mv ON m.vendor_id = mv.id
      LEFT JOIN model_versions mv2 ON m.id = mv2.model_id
      LEFT JOIN deployments d ON mv2.id = d.version_id
      WHERE mv2.stage IN ('pilot', 'prod')
      ORDER BY m.created_at DESC
    `;

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Catalog error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch catalog' });
  }
});

// Current dataset round
router.get('/api/rounds/current', async (req, res) => {
  try {
    const result = await sql`
      SELECT * FROM dataset_rounds 
      WHERE is_current = TRUE 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No current round' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Current round error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch current round' });
  }
});

// Signed dataset URLs (authenticated)
router.post('/api/datasets/signed-urls', marketplaceAuth, async (req, res) => {
  try {
    const { round_id } = req.body;
    
    // Get round info
    const roundResult = await sql`
      SELECT * FROM dataset_rounds WHERE id = ${round_id} LIMIT 1
    `;

    if (roundResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Round not found' });
    }

    const round = roundResult.rows[0];
    const files = round.files;
    const ttlSeconds = 15 * 60; // 15 minutes

    // Generate signed URLs (implement with your storage provider)
    const urls = files.map((file: any) => ({
      name: file.name,
      url: generateSignedUrl(round_id, file.name, ttlSeconds),
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    }));

    res.json({
      success: true,
      data: { urls, round_id, ttl_seconds: ttlSeconds },
    });
  } catch (error) {
    console.error('Signed URLs error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate URLs' });
  }
});

// Create training run (authenticated)
router.post('/api/training/runs', marketplaceAuth, async (req, res) => {
  try {
    const spec = TrainingSpecSchema.parse(req.body);
    const marketplace = (req as any).marketplace;
    
    const runId = `run_${Math.random().toString(36).substring(2, 10)}`;
    
    // Store training run
    await sql`
      INSERT INTO training_runs (id, vendor_id, round_id, task, status, spec)
      VALUES (${runId}, ${marketplace.vendor_id}, ${spec.round_id}, ${spec.task}, 'queued', ${JSON.stringify(spec)})
    `;

    // Create RunPod job if provider is runpod
    let runpodJobId = null;
    if (req.body.provider === 'runpod') {
      // Get vendor's encrypted RunPod API key
      const vendorResult = await sql`
        SELECT encrypted_connections FROM marketplace_vendors 
        WHERE id = ${marketplace.vendor_id}
      `;
      
      const connections = vendorResult.rows[0]?.encrypted_connections || {};
      const runpodApiKey = connections.runpod_api_key; // Decrypt this
      
      if (runpodApiKey) {
        const job = await createRunPodTrainingJob(runpodApiKey, spec);
        runpodJobId = job.job_id;
        
        await sql`
          UPDATE training_runs 
          SET runpod_job_id = ${runpodJobId}, status = 'running', started_at = NOW()
          WHERE id = ${runId}
        `;
      }
    }

    const trainingRun = {
      run_id: runId,
      provider: req.body.provider || 'runpod',
      status: runpodJobId ? 'running' : 'queued',
      created_at: new Date().toISOString(),
      started_at: runpodJobId ? new Date().toISOString() : undefined,
      logs_url: `${process.env.INFRA_BASE_URL}/api/training/runs/${runId}/logs`,
      artifacts: {},
      metrics: {},
    };

    res.json({
      success: true,
      data: trainingRun,
    });
  } catch (error) {
    console.error('Training run creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create training run' });
  }
});

// Add other training endpoints...
// GET /api/training/runs/:id
// GET /api/training/runs/:id/logs  
// POST /api/training/runs/:id/cancel

export default router;
```

#### 4. RunPod Service Integration

**File**: `src/services/runpod.ts`

```typescript
import fetch from 'node-fetch';
import { TrainingSpec } from '@neuronetiq/marketplace-contracts';

export async function createRunPodTrainingJob(
  apiKey: string,
  spec: TrainingSpec
): Promise<{ job_id: string; raw: any }> {
  const envVars = {
    TRAINING_SPEC: JSON.stringify(spec),
    ROUND_ID: spec.round_id,
    TASK: spec.task,
    // Add HF_TOKEN and WANDB_API_KEY from vendor connections
  };

  const body = {
    name: `train-${spec.task}-${spec.round_id}`,
    image: spec.base_image || "neuronetiq/signal-trainer:latest",
    gpu: "A100",
    minVcpuCount: 8,
    minMemoryInGb: 32,
    containerDiskInGb: 40,
    command: ["python", "train.py"],
    env: Object.entries(envVars).map(([key, value]) => ({ key, value })),
  };

  const response = await fetch("https://api.runpod.io/v2/jobs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RunPod job creation failed: ${response.status} ${error}`);
  }

  const data = await response.json() as any;
  return {
    job_id: data.id || data.jobId,
    raw: data,
  };
}
```

#### 5. Update Existing Signal/Consensus Endpoints

**File**: `src/routes/signals.ts` (modify existing)

```typescript
// Add to existing POST /api/signals/store
import { marketplaceAuth } from '../middleware/marketplaceAuth';

// Make marketplace auth optional for backward compatibility
router.post('/api/signals/store', 
  async (req, res, next) => {
    // Try marketplace auth first
    if (req.headers.authorization?.startsWith('Bearer sit_')) {
      return marketplaceAuth(req, res, next);
    }
    // Fall back to existing auth
    next();
  },
  async (req, res) => {
    const signals = req.body;
    const marketplace = (req as any).marketplace;
    
    // Add vendor attribution if marketplace token
    if (marketplace) {
      signals.forEach((signal: any) => {
        signal.vendor_id = marketplace.vendor_id;
        signal.deployment_id = marketplace.deployment_id;
      });
    }
    
    // Continue with existing logic...
  }
);
```

### **Environment Variables to Add (Doppler)**

```bash
# Marketplace secrets
INFRA_TOKEN_PEPPER=your_secret_pepper_for_token_hashing
MP_JWT_SECRET=your_jwt_signing_secret
RUNPOD_API_KEY=your_runpod_api_key

# Storage for datasets (choose one)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
# OR
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
```

### **Testing Commands**

```bash
# Test token introspection
curl -X POST http://localhost:3010/api/tokens/introspect \
  -H "Content-Type: application/json" \
  -d '{"token": "sit_test_token"}'

# Test marketplace auth on signals
curl -X POST http://localhost:3010/api/signals/store \
  -H "Authorization: Bearer sit_test_token" \
  -H "X-Marketplace-Contracts-Version: 0.1.0" \
  -d '[{"symbol":"EURUSD","decision":"BUY","confidence":0.8}]'
```

---

## 🖥️ **FRONTEND TEAM**

### **Objective**: Add marketplace vendor console to existing trader-frontend

### **Files to Create:**

#### 1. Marketplace Layout

**File**: `src/app/marketplace/layout.tsx`

```tsx
export const dynamic = "force-dynamic";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between py-4">
            <h1 className="text-2xl font-bold">🏪 ML Marketplace</h1>
            <div className="flex space-x-6">
              <a href="/marketplace" className="text-muted-foreground hover:text-foreground">
                Catalog
              </a>
              <a href="/marketplace/vendor" className="text-muted-foreground hover:text-foreground">
                Vendor Console
              </a>
              <a href="/marketplace/docs" className="text-muted-foreground hover:text-foreground">
                Documentation
              </a>
            </div>
          </nav>
        </div>
      </div>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
```

#### 2. Vendor Console Dashboard

**File**: `src/app/marketplace/vendor/page.tsx`

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function VendorConsolePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Vendor Console</h1>
        <p className="text-muted-foreground">
          Manage your models, training runs, and deployments
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            <span className="text-2xl">🤖</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">2 in production</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Runs</CardTitle>
            <span className="text-2xl">🏃</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">1 running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deployments</CardTitle>
            <span className="text-2xl">🚀</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">All healthy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Sharpe</CardTitle>
            <span className="text-2xl">📈</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.8</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" asChild>
              <a href="/marketplace/vendor/training/new">🚀 Start Training Run</a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/marketplace/vendor/models">📦 Deploy Model</a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/marketplace/vendor/connections">🔗 Manage Connections</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Training run completed</span>
                <span className="text-muted-foreground">2 hours ago</span>
              </div>
              <div className="flex justify-between">
                <span>Model deployed to prod</span>
                <span className="text-muted-foreground">1 day ago</span>
              </div>
              <div className="flex justify-between">
                <span>New dataset round available</span>
                <span className="text-muted-foreground">2 days ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

#### 3. Training Management Page

**File**: `src/app/marketplace/vendor/training/page.tsx`

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface TrainingRun {
  id: string;
  task: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  created_at: string;
  started_at?: string;
  finished_at?: string;
  metrics: Record<string, number>;
}

async function getTrainingRuns(): Promise<TrainingRun[]> {
  // In production, fetch from your private API
  return [
    {
      id: 'run_abc123',
      task: 'signal',
      status: 'running',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      started_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
      metrics: { epoch: 15, loss: 0.234 }
    },
    {
      id: 'run_def456',
      task: 'consensus',
      status: 'succeeded',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      finished_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
      metrics: { final_accuracy: 0.876, sharpe_ratio: 1.45 }
    }
  ];
}

function getStatusColor(status: string) {
  switch (status) {
    case 'running': return 'bg-blue-500';
    case 'succeeded': return 'bg-green-500';
    case 'failed': return 'bg-red-500';
    case 'cancelled': return 'bg-gray-500';
    default: return 'bg-yellow-500';
  }
}

export default async function TrainingPage() {
  const runs = await getTrainingRuns();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Training Runs</h1>
          <p className="text-muted-foreground">
            Manage your model training and monitor progress
          </p>
        </div>
        <Button asChild>
          <a href="/marketplace/vendor/training/new">🚀 New Training Run</a>
        </Button>
      </div>

      <div className="space-y-4">
        {runs.map((run) => (
          <Card key={run.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(run.status)}`} />
                    {run.id}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {run.task} model • Created {new Date(run.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant={run.status === 'succeeded' ? 'default' : 'secondary'}>
                  {run.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="flex space-x-4 text-sm">
                  {Object.entries(run.metrics).map(([key, value]) => (
                    <span key={key} className="text-muted-foreground">
                      {key}: <span className="font-medium">{value}</span>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    View Logs
                  </Button>
                  {run.status === 'succeeded' && (
                    <Button size="sm">
                      Deploy Model
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

#### 4. New Training Run Form

**File**: `src/app/marketplace/vendor/training/new/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { startTrainingRun } from "./actions";

export default function NewTrainingRunPage() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    const result = await startTrainingRun(formData);
    setResult(result);
    setSubmitting(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Training Run</h1>
        <p className="text-muted-foreground">
          Configure and start a new model training job
        </p>
      </div>

      <form action={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dataset Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="round_id">Dataset Round</Label>
              <Input 
                id="round_id" 
                name="round_id" 
                placeholder="2025-01-02" 
                defaultValue={new Date().toISOString().split('T')[0]}
                required 
              />
            </div>
            
            <div>
              <Label htmlFor="task">Model Task</Label>
              <Select name="task" defaultValue="signal">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="signal">Signal</SelectItem>
                  <SelectItem value="consensus">Consensus</SelectItem>
                  <SelectItem value="optimizer">Optimizer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hyperparameters</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              name="hyperparams_json"
              placeholder='{"lr": 0.001, "epochs": 20, "batch_size": 256}'
              rows={6}
              className="font-mono text-sm"
              defaultValue={JSON.stringify({
                lr: 0.001,
                epochs: 20,
                batch_size: 256
              }, null, 2)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compute & Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget_hours">Max Hours</Label>
                <Input 
                  id="budget_hours" 
                  name="budget_hours" 
                  type="number" 
                  step="0.5"
                  placeholder="2" 
                />
              </div>
              <div>
                <Label htmlFor="budget_cost">Max Cost (USD)</Label>
                <Input 
                  id="budget_cost" 
                  name="budget_cost" 
                  type="number" 
                  placeholder="20" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="hf_repo_id">Hugging Face Repository</Label>
              <Input 
                id="hf_repo_id" 
                name="hf_repo_id" 
                placeholder="vendor/model-name" 
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox id="wandb_enabled" name="wandb_enabled" />
              <Label htmlFor="wandb_enabled">Enable Weights & Biases tracking</Label>
            </div>
            
            <div>
              <Label htmlFor="wandb_project">W&B Project (optional)</Label>
              <Input 
                id="wandb_project" 
                name="wandb_project" 
                placeholder="signal-training" 
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" asChild>
            <a href="/marketplace/vendor/training">Cancel</a>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "🚀 Start Training"}
          </Button>
        </div>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-3 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
```

#### 5. Server Actions

**File**: `src/app/marketplace/vendor/training/new/actions.ts`

```typescript
"use server";

import { TrainingSpecSchema } from "@neuronetiq/marketplace-contracts";
import { redirect } from "next/navigation";

export async function startTrainingRun(formData: FormData) {
  try {
    const specCandidate = {
      round_id: String(formData.get("round_id") || ""),
      dataset_urls: [], // Will be populated by API
      task: String(formData.get("task") || "signal"),
      hyperparams: JSON.parse(String(formData.get("hyperparams_json") || "{}")),
      hf_repo_id: String(formData.get("hf_repo_id") || "") || undefined,
      wandb: {
        enabled: formData.get("wandb_enabled") === "on",
        project: String(formData.get("wandb_project") || "") || undefined,
      },
      budget: {
        max_hours: formData.get("budget_hours") ? Number(formData.get("budget_hours")) : undefined,
        max_cost_usd: formData.get("budget_cost") ? Number(formData.get("budget_cost")) : undefined,
      },
    };

    const parsed = TrainingSpecSchema.safeParse(specCandidate);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.flatten() };
    }

    // Call your private Infrastructure API
    const response = await fetch(`${process.env.INFRA_BASE_URL}/api/training/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add vendor authentication here
      },
      body: JSON.stringify(parsed.data),
    });

    if (!response.ok) {
      const error = await response.text();
      return { ok: false, error: `Failed to create training run: ${error}` };
    }

    const data = await response.json();
    
    // Redirect to training run page
    redirect(`/marketplace/vendor/training/${data.data.run_id}`);
    
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
```

### **Environment Variables to Add**

```bash
# Add to your existing Doppler config
INFRA_BASE_URL=http://localhost:3010  # Your Infrastructure API
NEXT_PUBLIC_ENABLE_MARKETPLACE_UI=true
```

---

## 🤖 **ML TEAM**

### **Objective**: Dogfood the marketplace system and provide feedback

### **Implementation Steps:**

#### 1. Install CLI from Local Build

```bash
# In your ML repo
cd /path/to/trader-marketplace
npm link packages/marketplace-cli

# Or install globally
npm install -g ./packages/marketplace-cli
```

#### 2. Test Training Workflow

```bash
# Authenticate (will need API endpoint from Infrastructure team)
mp login --api-url http://localhost:3010

# Check available data
mp data list
mp data info --round current

# Download training data locally (BYOC approach)
mp data pull --round current

# Start managed training run (RunPod Jobs approach)
mp train start --task signal --round current \
  --hp lr=0.001 --hp epochs=20 --hp batch_size=256 \
  --gpu A100 --max-hours 2

# Monitor training
mp train status <run_id>
mp train logs <run_id>
```

#### 3. Integration with Existing ML Pipeline

**File**: `src/marketplace/mlMarketplaceRunner.ts` (add to existing ML repo)

```typescript
import { 
  TrainingSpecSchema, 
  SignalWrite,
  makeIdempotencyKey 
} from '@neuronetiq/marketplace-contracts';

export class MLMarketplaceRunner {
  private vendorId = 'ml_team_internal';
  private deploymentId = 'dep_internal_ml';

  async runTrainingExperiment(roundId: string) {
    console.log('🧪 Running ML team training experiment');
    
    // Use CLI programmatically
    const { execSync } = await import('child_process');
    
    try {
      // Pull latest data
      execSync(`mp data pull --round ${roundId}`, { stdio: 'inherit' });
      
      // Start training with ML team hyperparameters
      const result = execSync(`mp train start --task signal --round ${roundId} \
        --hp lr=0.0005 --hp epochs=50 --hp batch_size=512 \
        --hp model_type=ensemble --hp features=19 \
        --max-hours 1`, { encoding: 'utf8' });
      
      console.log('Training started:', result);
      
    } catch (error) {
      console.error('Training experiment failed:', error);
    }
  }

  async simulateVendorBehavior() {
    // Simulate how an external vendor would use the system
    console.log('🏪 Simulating vendor behavior for marketplace testing');
    
    // This helps test the full vendor experience
    const signals = await this.generateSignalsWithMarketplaceHeaders();
    await this.writeToInfrastructure(signals);
  }

  private async generateSignalsWithMarketplaceHeaders() {
    // Use your existing signal generation but add marketplace headers
    const signal: SignalWrite = {
      symbol: 'EURUSD',
      timeframe: '5m',
      decision: 'HOLD',
      confidence: 1.0,
      model_version: 'marketplace_test_v1.0.0',
      timestamp: new Date().toISOString(),
      vendor_id: this.vendorId,
      deployment_id: this.deploymentId,
      rationale: ['ML team marketplace integration test']
    };

    return [signal];
  }

  private async writeToInfrastructure(signals: SignalWrite[]) {
    // Test writing with marketplace attribution
    const response = await fetch('http://localhost:3010/api/signals/store', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sit_ml_team_test_token',
        'X-Marketplace-Contracts-Version': '0.1.0',
        'X-Idempotency-Key': makeIdempotencyKey('EURUSD', '5m', new Date()),
      },
      body: JSON.stringify(signals),
    });

    console.log('Infrastructure write result:', response.status);
  }
}
```

### **Testing Checklist:**

```bash
# ✅ CLI installation
mp --version

# ✅ Authentication  
mp login --api-url http://localhost:3010

# ✅ Data access
mp data list
mp data pull --round current

# ✅ Training workflow
mp train start --task signal --round current
mp train status <run_id>

# ✅ Inference deployment
mp init --template runpod-signal-http
mp validate
mp deploy --provider runpod

# ✅ Marketplace integration
mp register --name "ML Team Test Model"
mp link-infra
```

---

## 📦 **CONTRACTS TEAM**

### **Objective**: Publish packages and maintain versioning

### **Implementation Steps:**

#### 1. Prepare for Publishing

```bash
cd /path/to/trader-marketplace

# Build packages
pnpm build

# Test packages locally
pnpm test

# Check package contents
npm pack packages/marketplace-contracts --dry-run
npm pack packages/marketplace-cli --dry-run
```

#### 2. Set up npm Publishing

**File**: `.npmrc` (in each package directory)

```
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
access=public
```

#### 3. Version Management

**Update package versions before publishing:**

```bash
# Contracts
cd packages/marketplace-contracts
npm version 0.1.0 --no-git-tag-version

# CLI  
cd packages/marketplace-cli
npm version 0.1.0 --no-git-tag-version
```

#### 4. Publishing Commands

```bash
# Publish contracts first (CLI depends on it)
pnpm --filter @neuronetiq/marketplace-contracts publish --access public

# Then publish CLI
pnpm --filter @neuronetiq/marketplace-cli publish --access public

# Or use Git tags to trigger automated publishing
git tag contracts-v0.1.0
git push origin contracts-v0.1.0

git tag cli-v0.1.0  
git push origin cli-v0.1.0
```

#### 5. GitHub Secrets Setup

**Required secrets for automated publishing:**

```bash
# In GitHub repository settings > Secrets
NPM_TOKEN=npm_...  # npm access token with publish permissions
```

### **Version Compatibility Matrix:**

| Contracts Version | CLI Version | Infrastructure API | Status |
|-------------------|-------------|-------------------|---------|
| 0.1.0 | 0.1.0 | v0.15.12 | ✅ Compatible |
| 0.1.x | 0.1.x | v0.15.x | ✅ Compatible |

### **Breaking Change Protocol:**

1. **Major Version**: Breaking schema changes (0.1.0 → 1.0.0)
2. **Minor Version**: New features, backward compatible (0.1.0 → 0.2.0)  
3. **Patch Version**: Bug fixes (0.1.0 → 0.1.1)

---

## 🔐 **SECURITY & SECRETS (ALL TEAMS)**

### **Doppler Configuration Updates:**

#### 1. Create Marketplace Project

```bash
# Create new Doppler project for marketplace
doppler projects create marketplace

# Create environments
doppler environments create --project marketplace dev
doppler environments create --project marketplace staging  
doppler environments create --project marketplace prod

# Create configs
doppler configs create --project marketplace --environment prod infra-api
doppler configs create --project marketplace --environment prod frontend
```

#### 2. Set Marketplace Secrets

```bash
# Infrastructure secrets
doppler secrets set --project marketplace --config infra-api \
  INFRA_TOKEN_PEPPER=your_secret_pepper_for_token_hashing

doppler secrets set --project marketplace --config infra-api \
  MP_JWT_SECRET=your_jwt_signing_secret

doppler secrets set --project marketplace --config infra-api \
  RUNPOD_API_KEY=your_runpod_api_key

# Frontend secrets  
doppler secrets set --project marketplace --config frontend \
  INFRA_BASE_URL=http://localhost:3010

doppler secrets set --project marketplace --config frontend \
  NEXT_PUBLIC_ENABLE_MARKETPLACE_UI=true
```

#### 3. Token Security Implementation

**Infrastructure team - add to existing auth middleware:**

```typescript
// Never log tokens
export function redactLogs(logData: any) {
  const sensitive = /\b(vk_|sit_|whsec_)[a-zA-Z0-9_-]+/g;
  return JSON.stringify(logData).replace(sensitive, '****');
}

// Rate limiting per deployment
export function createDeploymentRateLimit() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute per deployment
    keyGenerator: (req) => {
      const marketplace = (req as any).marketplace;
      return marketplace?.deployment_id || req.ip;
    },
  });
}
```

---

## 📋 **INTEGRATION CHECKLIST**

### **Week 1: Foundation**

**Infrastructure Team:**
- [ ] Add database schema migrations
- [ ] Implement token introspection middleware  
- [ ] Add marketplace auth to existing signal/consensus endpoints
- [ ] Create training API routes
- [ ] Set up Doppler secrets

**Frontend Team:**
- [ ] Add marketplace layout and navigation
- [ ] Create vendor console dashboard
- [ ] Implement training run management pages
- [ ] Add connections management for RunPod/HF tokens
- [ ] Test with mock data

**ML Team:**
- [ ] Install CLI from local build
- [ ] Test data download workflow
- [ ] Test training run creation
- [ ] Integrate marketplace runner with existing ML pipeline
- [ ] Provide feedback on CLI ergonomics

**Contracts Team:**
- [ ] Review and test all schemas
- [ ] Set up npm publishing workflow
- [ ] Prepare documentation updates
- [ ] Test package installation

### **Week 2: Integration & Testing**

**All Teams:**
- [ ] End-to-end testing: CLI → API → Database → Frontend
- [ ] Load testing with multiple vendor tokens
- [ ] Security review of token handling
- [ ] Performance testing of training workflows
- [ ] Documentation review and updates

**Go-Live Checklist:**
- [ ] Packages published to npm
- [ ] Infrastructure endpoints deployed
- [ ] Frontend pages accessible
- [ ] Doppler secrets configured
- [ ] GitHub Actions working
- [ ] External developer onboarding tested

---

## 🚨 **CRITICAL SUCCESS CRITERIA**

### **End-to-End Test:**

```bash
# 1. External developer installs CLI
npm install -g @neuronetiq/marketplace-cli

# 2. Authenticates with your Infrastructure
mp login --api-url https://infra.neuronetiq.com

# 3. Downloads training data  
mp data pull --round current

# 4. Starts training run
mp train start --task signal --round current

# 5. Deploys inference model
mp init --template runpod-signal-http
mp deploy --provider runpod

# 6. Connects to live trading
mp link-infra

# 7. Model appears in public catalog
curl https://infra.neuronetiq.com/api/catalog

# 8. Signals flow to your Frontend
# Check /consensus page shows vendor attribution
```

### **Success Metrics:**

- [ ] **CLI Installation**: External developers can install and use CLI
- [ ] **Authentication**: Vendor API keys work end-to-end
- [ ] **Training**: Both BYOC and RunPod Jobs workflows functional
- [ ] **Deployment**: Models deploy to RunPod and connect to Infrastructure
- [ ] **Live Trading**: Vendor signals appear in Frontend with attribution
- [ ] **Security**: No plaintext tokens logged or exposed
- [ ] **Performance**: <100ms API response times, <60s training job startup

---

## 🎯 **TEAM COORDINATION**

### **Dependencies:**

1. **Contracts → All Teams**: Publish packages first
2. **Infrastructure → Frontend**: API endpoints must be ready
3. **Infrastructure → ML**: Authentication and data endpoints needed
4. **Frontend → ML**: UI testing requires working API

### **Communication:**

- **Daily standups**: Share progress on marketplace integration
- **Slack channel**: `#marketplace-integration` for quick questions
- **Weekly demo**: Show end-to-end workflow progress
- **Blockers**: Escalate authentication or API issues immediately

**Each team should complete their implementation within 1 week, then spend week 2 on integration testing and refinement.**

The marketplace will be ready for external developers once all teams complete their integration! 🚀
