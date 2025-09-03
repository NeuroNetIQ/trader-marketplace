# @neuronetiq/marketplace-contracts

TypeScript contracts and schemas for the NeuroNetIQ ML Marketplace.

## Installation

```bash
npm install @neuronetiq/marketplace-contracts zod
```

## Usage

### Signal Inference

```typescript
import { SignalInferenceRequest, SignalInferenceResponse, SignalWrite } from '@neuronetiq/marketplace-contracts';

// Validate inference request
const request = SignalInferenceRequest.parse({
  symbol: "EURUSD",
  timeframe: "5m",
  ohlcv: [[1234567890, 1.1000, 1.1010, 1.0990, 1.1005, 1000000]]
});

// Create inference response
const response: SignalInferenceResponse = {
  decision: "BUY",
  confidence: 0.85,
  model_version: "1.0.0",
  timestamp: new Date().toISOString(),
  rationale: ["Strong upward momentum"]
};

// Write to Infrastructure
const write: SignalWrite = {
  ...response,
  symbol: "EURUSD",
  timeframe: "5m",
  vendor_id: "vendor_123",
  deployment_id: "dep_456"
};
```

### Consensus Inference

```typescript
import { ConsensusInferenceRequest, ConsensusInferenceResponse } from '@neuronetiq/marketplace-contracts';

const request: ConsensusInferenceRequest = {
  symbol: "EURUSD",
  timeframe: "1h",
  signals: [
    { decision: "BUY", confidence: 0.8, source: "model_1" },
    { decision: "HOLD", confidence: 0.6, source: "model_2" }
  ]
};

const response: ConsensusInferenceResponse = {
  decision: "BUY",
  confidence: 0.75,
  model_version: "consensus_v1.0.0",
  timestamp: new Date().toISOString(),
  contributions: {
    "model_1": { decision: "BUY", weight: 0.6 },
    "model_2": { decision: "HOLD", weight: 0.4 }
  }
};
```

### Headers and Authentication

```typescript
import { withMarketplaceHeaders, withMarketplaceAuth } from '@neuronetiq/marketplace-contracts';

// Add marketplace headers
const headers = withMarketplaceHeaders({
  'Content-Type': 'application/json'
});

// Add marketplace headers with auth
const authHeaders = withMarketplaceAuth('your-token', {
  'Content-Type': 'application/json'
});
```

### Utility Functions

```typescript
import { 
  makeIdempotencyKey, 
  isValidSymbol, 
  formatConfidence 
} from '@neuronetiq/marketplace-contracts';

// Generate idempotency key for 5-second slots
const key = makeIdempotencyKey("EURUSD", "5m", new Date());

// Validate symbol
const isValid = isValidSymbol("EURUSD"); // true

// Format confidence as percentage
const formatted = formatConfidence(0.85); // "85.0%"
```

## API Reference

### Schemas

- **SignalInferenceRequest** - Request schema for signal inference
- **SignalInferenceResponse** - Response schema for signal inference  
- **SignalWrite** - Schema for writing signals to Infrastructure
- **ConsensusInferenceRequest** - Request schema for consensus inference
- **ConsensusInferenceResponse** - Response schema for consensus inference
- **ConsensusWrite** - Schema for writing consensus to Infrastructure
- **OptimizerInferenceRequest** - Request schema for portfolio optimization
- **OptimizerInferenceResponse** - Response schema for portfolio optimization
- **CatalogModel** - Schema for models in the marketplace catalog
- **Heartbeat** - Schema for deployment heartbeats
- **Metric** - Schema for performance metrics

### Constants

- **HEADER_CONTRACTS_VERSION** - `"X-Marketplace-Contracts-Version"`
- **HEADER_MARKETPLACE_TOKEN** - `"X-Marketplace-Token"`
- **HEADER_IDEMPOTENCY_KEY** - `"X-Idempotency-Key"`
- **CONTRACTS_SEMVER** - Current version `"0.1.0"`

### Types

All schemas export corresponding TypeScript types:

```typescript
import type { 
  SignalInferenceRequest,
  SignalInferenceResponse,
  ConsensusInferenceRequest,
  CatalogModel,
  Timeframe,
  Decision
} from '@neuronetiq/marketplace-contracts';
```

## License

MIT
