# @neuronetiq/marketplace-cli

Command-line interface for the NeuroNetIQ ML Marketplace.

## Installation

```bash
npm install -g @neuronetiq/marketplace-cli
```

## Quick Start

```bash
# 1. Authenticate
mp login

# 2. Create new model from template
mp init --template runpod-signal-http

# 3. Develop locally
cd my-trading-model
npm install
mp dev

# 4. Validate model
mp validate

# 5. Deploy to RunPod
mp deploy --provider runpod --cpu 2 --memory 4

# 6. Register in marketplace
mp register --name "My Signal Model"

# 7. Connect to live trading
mp link-infra
```

## Commands

### `mp login`
Authenticate with the marketplace API.

```bash
mp login --api-url https://marketplace.neuronetiq.com
```

### `mp init`
Create a new model from template.

```bash
mp init --template runpod-signal-http --name my-model
```

Available templates:
- `runpod-signal-http` - HTTP-based signal inference model

### `mp validate`
Validate model endpoints and response schemas.

```bash
mp validate --url http://localhost:8080 --task signal
```

### `mp dev`
Run model in development mode with hot reload.

```bash
mp dev --port 8080 --watch
```

### `mp deploy`
Deploy model to cloud provider.

```bash
mp deploy --provider runpod --cpu 2 --memory 4 --gpu RTX4090
```

Options:
- `--provider` - Cloud provider (runpod)
- `--cpu` - CPU cores
- `--memory` - Memory in GB
- `--gpu` - GPU type (optional)
- `--image` - Docker image URI

### `mp register`
Register model in marketplace catalog.

```bash
mp register --name "My Signal Model" --version 1.0.0 --task signal
```

### `mp heartbeat`
Send heartbeat to show model is alive.

```bash
# Single heartbeat
mp heartbeat

# Continuous monitoring
mp heartbeat --interval 30
```

### `mp link-infra`
Connect deployment to Infrastructure for live trading.

```bash
mp link-infra --signals-url https://infra.neuronetiq.com/api/signals/store
```

## Configuration

Configuration is stored in `~/.mp/config.json`:

```json
{
  "apiKey": "mk_...",
  "apiUrl": "https://marketplace.neuronetiq.com",
  "vendorId": "vendor_abc123",
  "infraUrl": "https://infra.neuronetiq.com",
  "infraToken": "sit_...",
  "lastDeploymentId": "dep_xyz789"
}
```

## Templates

### RunPod Signal HTTP Template

Creates a FastAPI-based HTTP server with:
- `/health` endpoint for health checks
- `/infer` endpoint for signal inference
- Automatic Infrastructure integration
- Docker support for RunPod deployment
- TypeScript with full type safety

Template structure:
```
my-model/
├── src/
│   └── server.ts         # Main server
├── package.json
├── tsconfig.json
├── Dockerfile           # RunPod deployment
├── start.sh            # RunPod entry script
├── .env.template       # Environment variables
└── README.md
```

## Environment Variables

Templates use these environment variables:

- `PORT` - Server port (default: 8080)
- `VENDOR_ID` - Your marketplace vendor ID
- `DEPLOYMENT_ID` - Deployment ID from marketplace
- `MARKETPLACE_TOKEN` - Scoped Infrastructure token
- `INFRA_SIGNALS_URL` - Infrastructure signals endpoint
- `INFRA_CONSENSUS_URL` - Infrastructure consensus endpoint

## API Integration

The CLI integrates with:

1. **Marketplace API** - Authentication, deployment management, model registration
2. **RunPod API** - Cloud deployment provisioning
3. **Infrastructure API** - Live trading data writes

## Development

```bash
git clone https://github.com/neuronetiq/trader-marketplace
cd trader-marketplace/packages/marketplace-cli
pnpm install
pnpm build
./bin/mp.js --help
```

## License

MIT
