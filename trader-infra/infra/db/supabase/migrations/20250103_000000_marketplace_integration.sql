-- Marketplace Integration Migration
-- Adds support for external ML vendor management and training workflows

-- Vendor management
CREATE TABLE IF NOT EXISTS marketplace_vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  encrypted_connections JSONB DEFAULT '{}', -- RunPod/HF tokens
  revenue_share DECIMAL DEFAULT 0.70,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
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

-- Dataset rounds for training data distribution
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

-- Marketplace models registry
CREATE TABLE IF NOT EXISTS marketplace_models (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES marketplace_vendors(id),
  name TEXT NOT NULL,
  description TEXT,
  task TEXT NOT NULL CHECK (task IN ('signal', 'consensus', 'optimizer')),
  stage TEXT NOT NULL CHECK (stage IN ('shadow', 'pilot', 'prod', 'retired')) DEFAULT 'shadow',
  hf_repo_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Model deployments
CREATE TABLE IF NOT EXISTS marketplace_deployments (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES marketplace_models(id),
  vendor_id TEXT NOT NULL REFERENCES marketplace_vendors(id),
  runpod_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'error', 'maintenance', 'offline')) DEFAULT 'pending',
  endpoint_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat_at TIMESTAMPTZ
);

-- Deployment heartbeats
CREATE TABLE IF NOT EXISTS marketplace_heartbeats (
  id BIGSERIAL PRIMARY KEY,
  deployment_id TEXT NOT NULL REFERENCES marketplace_deployments(id),
  status TEXT NOT NULL CHECK (status IN ('ready', 'error', 'maintenance', 'offline')),
  metrics JSONB DEFAULT '{}',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add vendor attribution to existing signals tables
ALTER TABLE signals_latest ADD COLUMN IF NOT EXISTS vendor_id TEXT;
ALTER TABLE signals_latest ADD COLUMN IF NOT EXISTS deployment_id TEXT;
ALTER TABLE signals_history ADD COLUMN IF NOT EXISTS vendor_id TEXT;
ALTER TABLE signals_history ADD COLUMN IF NOT EXISTS deployment_id TEXT;

ALTER TABLE consensus_latest ADD COLUMN IF NOT EXISTS vendor_id TEXT;
ALTER TABLE consensus_latest ADD COLUMN IF NOT EXISTS deployment_id TEXT;
ALTER TABLE consensus_history ADD COLUMN IF NOT EXISTS vendor_id TEXT;
ALTER TABLE consensus_history ADD COLUMN IF NOT EXISTS deployment_id TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_vendors_api_key ON marketplace_vendors(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_training_runs_vendor_id ON training_runs(vendor_id);
CREATE INDEX IF NOT EXISTS idx_training_runs_status ON training_runs(status);
CREATE INDEX IF NOT EXISTS idx_deployment_tokens_vendor_id ON deployment_tokens(vendor_id);
CREATE INDEX IF NOT EXISTS idx_deployment_tokens_expires_at ON deployment_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_models_vendor_id ON marketplace_models(vendor_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_deployments_vendor_id ON marketplace_deployments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_heartbeats_deployment_id ON marketplace_heartbeats(deployment_id);

-- Indexes for vendor attribution on existing tables
CREATE INDEX IF NOT EXISTS idx_signals_latest_vendor ON signals_latest(vendor_id);
CREATE INDEX IF NOT EXISTS idx_signals_history_vendor ON signals_history(vendor_id);
CREATE INDEX IF NOT EXISTS idx_consensus_latest_vendor ON consensus_latest(vendor_id);
CREATE INDEX IF NOT EXISTS idx_consensus_history_vendor ON consensus_history(vendor_id);

-- Insert sample dataset round
INSERT INTO dataset_rounds (id, name, description, is_current, files, metadata) VALUES (
  '2025-01-03',
  'Daily Trading Signals Round',
  'OHLCV data and technical indicators for major currency pairs',
  TRUE,
  '[
    {"name": "train.csv", "type": "train", "size_bytes": 52428800, "format": "csv"},
    {"name": "validation.csv", "type": "validation", "size_bytes": 10485760, "format": "csv"},
    {"name": "features.parquet", "type": "features", "size_bytes": 26214400, "format": "parquet"}
  ]',
  '{
    "symbols": ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD"],
    "timeframes": ["5m", "15m", "1h"],
    "features_count": 19,
    "samples_count": 100000
  }'
) ON CONFLICT (id) DO UPDATE SET
  is_current = EXCLUDED.is_current,
  updated_at = NOW();

-- Update any existing rounds to not be current
UPDATE dataset_rounds SET is_current = FALSE WHERE id != '2025-01-03';

COMMENT ON TABLE marketplace_vendors IS 'External ML vendor management';
COMMENT ON TABLE training_runs IS 'Training job tracking and management';
COMMENT ON TABLE dataset_rounds IS 'Dataset rounds for training data distribution';
COMMENT ON TABLE deployment_tokens IS 'Scoped Infrastructure access tokens';
COMMENT ON TABLE marketplace_models IS 'Marketplace model registry';
COMMENT ON TABLE marketplace_deployments IS 'Model deployment tracking';
COMMENT ON TABLE marketplace_heartbeats IS 'Deployment health monitoring';
