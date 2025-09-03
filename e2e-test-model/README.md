# RunPod Signal HTTP Template

This template provides a basic HTTP server for signal inference that can be deployed to RunPod.

## Features

- `/health` endpoint for health checks
- `/infer` endpoint for signal inference
- Automatic writing to Infrastructure when configured
- Docker support for RunPod deployment
- TypeScript with full type safety

## Development

```bash
npm install
npm run dev
```

## Testing

```bash
# Health check
curl http://localhost:8080/health

# Signal inference
curl -X POST http://localhost:8080/infer \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "EURUSD",
    "timeframe": "5m",
    "ohlcv": [[1234567890, 1.1000, 1.1010, 1.0990, 1.1005, 1000000]]
  }'
```

## Deployment

1. Build Docker image:
   ```bash
   docker build -t my-signal-model .
   ```

2. Deploy with `mp deploy`:
   ```bash
   mp deploy --provider runpod --cpu 2 --memory 4Gi
   ```

## Environment Variables

- `PORT` - Server port (default: 8080)
- `VENDOR_ID` - Your marketplace vendor ID
- `DEPLOYMENT_ID` - Deployment ID from marketplace
- `MARKETPLACE_TOKEN` - Scoped Infrastructure token
- `INFRA_SIGNALS_URL` - Infrastructure signals endpoint
- `MODEL_VERSION` - Your model version string

## Customization

Replace the `inferDecision` function in `src/server.ts` with your actual model logic.