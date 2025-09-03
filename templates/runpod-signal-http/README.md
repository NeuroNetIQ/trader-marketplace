# RunPod Signal HTTP Template

This template provides a production-ready HTTP server for signal inference that can be deployed to RunPod and integrated with the NeuroNetIQ trading infrastructure.

## Features

- ✅ `/health` endpoint for health checks and monitoring
- ✅ `/infer` endpoint for signal inference with full schema validation
- ✅ Automatic writing to Infrastructure when configured
- ✅ Docker support optimized for RunPod deployment
- ✅ TypeScript with full type safety using marketplace contracts
- ✅ Comprehensive logging and error handling
- ✅ Graceful shutdown handling
- ✅ Performance metrics and monitoring

## Quick Start

### 1. Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Test endpoints
curl http://localhost:8080/health
curl -X POST http://localhost:8080/infer \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "EURUSD",
    "timeframe": "5m",
    "ohlcv": [[1234567890, 1.1000, 1.1010, 1.0990, 1.1005, 1000000]]
  }'
```

### 2. Deploy with CLI

```bash
# Deploy to RunPod
mp deploy --provider runpod --cpu 2 --memory 4

# Register model
mp register --name "My Signal Model" --task signal

# Connect to Infrastructure
mp link-infra --signals-url https://infra.neuronetiq.com/api/signals/store
```

## API Endpoints

### GET /health

Health check endpoint that returns server status and configuration.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-01-01T10:30:00.000Z",
  "deployment_id": "dep_abc123",
  "vendor_id": "vendor_xyz789"
}
```

### POST /infer

Main inference endpoint that processes trading signals.

**Request:**
```json
{
  "symbol": "EURUSD",
  "timeframe": "5m",
  "ohlcv": [
    [1234567890, 1.1000, 1.1010, 1.0990, 1.1005, 1000000]
  ],
  "features": {
    "rsi": 65.5,
    "macd": 0.0012,
    "volume_sma": 1200000
  }
}
```

**Response:**
```json
{
  "decision": "BUY",
  "confidence": 0.85,
  "model_version": "1.0.0",
  "timestamp": "2025-01-01T10:30:00.000Z",
  "rationale": [
    "Strong bullish candle (body ratio: 0.75)",
    "Used 3 technical features",
    "EURUSD 5m analysis complete"
  ],
  "metadata": {
    "inference_time_ms": 45,
    "features_count": 3,
    "ohlcv_bars": 1
  }
}
```

## Environment Variables

These are automatically configured by the CLI when you deploy:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `HOST` | Server host | `0.0.0.0` |
| `VENDOR_ID` | Your marketplace vendor ID | `vendor_abc123` |
| `DEPLOYMENT_ID` | Unique deployment ID | `dep_xyz789` |
| `MARKETPLACE_TOKEN` | Scoped Infrastructure token | `sit_...` |
| `INFRA_SIGNALS_URL` | Infrastructure signals endpoint | `https://infra.../api/signals/store` |
| `MODEL_VERSION` | Your model version | `1.0.0` |
| `LOG_LEVEL` | Logging level | `info` |

## Customization

### Replace Model Logic

The core inference logic is in the `inferDecision` function in `src/server.ts`. Replace this with your actual model:

```typescript
async function inferDecision(
  symbol: string,
  timeframe: string,
  ohlcv?: number[][],
  features?: Record<string, number>
): Promise<{
  decision: Decision;
  confidence: number;
  rationale: string[];
}> {
  // Your model logic here
  const prediction = await yourModel.predict({
    symbol,
    timeframe,
    ohlcv,
    features
  });
  
  return {
    decision: prediction.action, // "BUY" | "SELL" | "HOLD"
    confidence: prediction.confidence, // 0.0 to 1.0
    rationale: prediction.reasoning
  };
}
```

### Add Custom Features

You can add custom preprocessing, feature engineering, or post-processing:

```typescript
// Add custom preprocessing
function preprocessData(ohlcv: number[][]) {
  // Your preprocessing logic
  return processedData;
}

// Add custom features
function extractFeatures(ohlcv: number[][]) {
  // Your feature extraction logic
  return features;
}

// Use in inference
const processedOhlcv = preprocessData(ohlcv);
const extractedFeatures = extractFeatures(processedOhlcv);
```

## Docker Deployment

### Build Image

```bash
docker build -t my-signal-model .
```

### Run Locally

```bash
docker run -p 8080:8080 \
  -e VENDOR_ID=vendor_123 \
  -e DEPLOYMENT_ID=dep_456 \
  -e MODEL_VERSION=1.0.0 \
  my-signal-model
```

### RunPod Deployment

The CLI handles RunPod deployment automatically, but you can also deploy manually:

```bash
# Tag for registry
docker tag my-signal-model registry.runpod.io/your-username/my-signal-model

# Push to registry
docker push registry.runpod.io/your-username/my-signal-model

# Deploy via RunPod API or web interface
```

## Performance Optimization

### Memory Usage

- The template uses minimal dependencies
- Alpine Linux base image for smaller size
- Production-only npm install in Docker

### CPU Usage

- Async/await for non-blocking operations
- Efficient JSON parsing and validation
- Minimal logging overhead in production

### Network

- Keep-alive connections to Infrastructure
- Gzip compression for responses
- Request timeout handling

## Monitoring

### Health Checks

The `/health` endpoint provides:
- Server status
- Version information
- Configuration details
- Timestamp for uptime tracking

### Logging

Structured logging with:
- Request/response timing
- Error details and stack traces
- Infrastructure write status
- Performance metrics

### Metrics

Automatic tracking of:
- Inference latency
- Infrastructure write latency
- Request throughput
- Error rates

## Troubleshooting

### Common Issues

1. **Port binding errors**: Ensure `PORT` environment variable is set correctly
2. **Infrastructure write failures**: Check `MARKETPLACE_TOKEN` and `INFRA_SIGNALS_URL`
3. **Memory issues**: Monitor usage and adjust RunPod memory allocation
4. **Timeout errors**: Optimize model inference speed

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=debug
npm run dev
```

### Health Check

Test server health:

```bash
curl -f http://localhost:8080/health || echo "Health check failed"
```

## License

MIT - See LICENSE file for details.
