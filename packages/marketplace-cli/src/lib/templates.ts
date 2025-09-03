import { promises as fs } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Template {
  name: string;
  description: string;
  files: Record<string, string>;
}

/**
 * Get available templates
 */
export function getAvailableTemplates(): Template[] {
  return [
    {
      name: "runpod-signal-http",
      description: "HTTP-based signal inference model for RunPod deployment",
      files: {
        "package.json": JSON.stringify({
          name: "runpod-signal-http",
          version: "0.1.0",
          type: "module",
          scripts: {
            dev: "tsx watch src/server.ts",
            build: "tsc -p tsconfig.json",
            start: "node dist/server.js"
          },
          dependencies: {
            fastify: "^4.26.2",
            "node-fetch": "^3.3.2",
            "@neuronetiq/marketplace-contracts": "^0.1.0"
          },
          devDependencies: {
            tsx: "^4.7.0",
            typescript: "^5.5.0"
          }
        }, null, 2),
        
        "tsconfig.json": JSON.stringify({
          compilerOptions: {
            target: "ES2022",
            module: "ESNext",
            moduleResolution: "Bundler",
            strict: true,
            resolveJsonModule: true,
            esModuleInterop: true,
            skipLibCheck: true,
            outDir: "dist",
            declaration: true
          },
          include: ["src"]
        }, null, 2),

        "src/server.ts": `import Fastify from "fastify";
import fetch from "node-fetch";
import {
  SignalInferenceRequest,
  SignalWrite,
  withMarketplaceHeaders,
  makeIdempotencyKey,
  Decision,
} from "@neuronetiq/marketplace-contracts";

const app = Fastify({ logger: true });

// Health check endpoint
app.get("/health", async () => ({
  status: "ok",
  version: "1.0.0",
  timestamp: new Date().toISOString(),
}));

// Main inference endpoint
app.post("/infer", async (req, reply) => {
  const parsed = SignalInferenceRequest.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ 
      error: "Invalid request", 
      details: parsed.error.issues 
    });
  }

  const { symbol, timeframe, ohlcv, features } = parsed.data;
  const now = new Date();

  // TODO: Replace with your actual model inference
  const decision = inferDecision(symbol, timeframe, ohlcv, features);
  
  const payload = SignalWrite.parse({
    symbol,
    timeframe,
    decision: decision.decision,
    confidence: decision.confidence,
    model_version: "1.0.0",
    timestamp: now.toISOString(),
    rationale: decision.rationale,
    vendor_id: process.env.VENDOR_ID,
    deployment_id: process.env.DEPLOYMENT_ID,
  });

  // Write to Infrastructure if configured
  if (process.env.INFRA_SIGNALS_URL && process.env.MARKETPLACE_TOKEN) {
    try {
      await fetch(process.env.INFRA_SIGNALS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: \`Bearer \${process.env.MARKETPLACE_TOKEN}\`,
          "X-Idempotency-Key": makeIdempotencyKey(symbol, timeframe, now),
          ...withMarketplaceHeaders(),
        },
        body: JSON.stringify([payload]),
      });
      
      app.log.info({ symbol, timeframe, decision: payload.decision }, "Signal written to Infrastructure");
    } catch (error) {
      app.log.warn({ error }, "Failed to write to Infrastructure");
    }
  }

  return reply.send(payload);
});

// Simple model inference (replace with your logic)
function inferDecision(
  symbol: string,
  timeframe: string,
  ohlcv?: number[][],
  features?: Record<string, number>
) {
  // TODO: Implement your actual model logic here
  // This is a placeholder that returns random decisions
  
  const decisions = ["BUY", "SELL", "HOLD"] as const;
  const decision = decisions[Math.floor(Math.random() * decisions.length)];
  const confidence = 0.5 + Math.random() * 0.5; // 0.5 to 1.0
  
  return {
    decision,
    confidence,
    rationale: [\`Placeholder inference for \${symbol} \${timeframe}\`],
  };
}

// Start server
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "0.0.0.0";

app.listen({ port, host }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(\`Server listening at \${address}\`);
});`,

        "Dockerfile": `FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["node", "dist/server.js"]`,

        "start.sh": `#!/usr/bin/env bash
set -e

echo "Starting RunPod Signal HTTP server..."
echo "Environment:"
echo "  PORT: \${PORT:-8080}"
echo "  VENDOR_ID: \${VENDOR_ID}"
echo "  DEPLOYMENT_ID: \${DEPLOYMENT_ID}"
echo "  INFRA_SIGNALS_URL: \${INFRA_SIGNALS_URL}"

# Start the Node.js server
exec node dist/server.js`,

        ".env.template": `# RunPod Environment Variables
PORT=8080
HOST=0.0.0.0

# Marketplace Configuration
VENDOR_ID=your_vendor_id
DEPLOYMENT_ID=your_deployment_id
MARKETPLACE_TOKEN=your_scoped_infra_token

# Infrastructure Endpoints
INFRA_SIGNALS_URL=https://infra.yourorg.com/api/signals/store
INFRA_CONSENSUS_URL=https://infra.yourorg.com/api/consensus/store

# Model Configuration
MODEL_VERSION=1.0.0
LOG_LEVEL=info`,

        "README.md": `# RunPod Signal HTTP Template

This template provides a basic HTTP server for signal inference that can be deployed to RunPod.

## Features

- \`/health\` endpoint for health checks
- \`/infer\` endpoint for signal inference
- Automatic writing to Infrastructure when configured
- Docker support for RunPod deployment
- TypeScript with full type safety

## Development

\`\`\`bash
npm install
npm run dev
\`\`\`

## Testing

\`\`\`bash
# Health check
curl http://localhost:8080/health

# Signal inference
curl -X POST http://localhost:8080/infer \\
  -H "Content-Type: application/json" \\
  -d '{
    "symbol": "EURUSD",
    "timeframe": "5m",
    "ohlcv": [[1234567890, 1.1000, 1.1010, 1.0990, 1.1005, 1000000]]
  }'
\`\`\`

## Deployment

1. Build Docker image:
   \`\`\`bash
   docker build -t my-signal-model .
   \`\`\`

2. Deploy with \`mp deploy\`:
   \`\`\`bash
   mp deploy --provider runpod --cpu 2 --memory 4Gi
   \`\`\`

## Environment Variables

- \`PORT\` - Server port (default: 8080)
- \`VENDOR_ID\` - Your marketplace vendor ID
- \`DEPLOYMENT_ID\` - Deployment ID from marketplace
- \`MARKETPLACE_TOKEN\` - Scoped Infrastructure token
- \`INFRA_SIGNALS_URL\` - Infrastructure signals endpoint
- \`MODEL_VERSION\` - Your model version string

## Customization

Replace the \`inferDecision\` function in \`src/server.ts\` with your actual model logic.`,
      },
    },
  ];
}

/**
 * Create template files in target directory
 */
export async function createTemplate(templateName: string, targetDir: string): Promise<void> {
  const templates = getAvailableTemplates();
  const template = templates.find(t => t.name === templateName);
  
  if (!template) {
    throw new Error(`Template "${templateName}" not found. Available: ${templates.map(t => t.name).join(", ")}`);
  }

  // Create target directory
  await fs.mkdir(targetDir, { recursive: true });

  // Write all template files
  for (const [filePath, content] of Object.entries(template.files)) {
    const fullPath = join(targetDir, filePath);
    const dir = dirname(fullPath);
    
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, content, "utf-8");
  }
}
