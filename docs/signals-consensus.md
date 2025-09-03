# 📊 Signals & Consensus Contracts v0.16.0

> **Required fields and formats for writing trading signals to Infrastructure**

## Signal Writing

### **Required Fields (v0.16.0)**

```typescript
interface SignalWrite {
  // Core trading decision
  symbol: string;              // ✅ Required: "EURUSD", "GBPUSD", etc.
  timeframe: string;           // ✅ Required: "1m", "5m", "15m", "1h", "4h", "1d"
  decision: "BUY" | "SELL" | "HOLD";  // ✅ Required
  confidence: number;          // ✅ Required: 0.0 to 1.0
  
  // Model identification (NEW in v0.16.0)
  model_id: string;            // ✅ Required: Your model identifier
  model_version: string;       // ✅ Required: Version string
  event_time: string;          // ✅ Required: ISO timestamp
  timestamp: string;           // ✅ Required: ISO timestamp
  
  // Marketplace attribution
  vendor_id?: string;          // ✅ Recommended: Your vendor ID
  deployment_id?: string;      // ✅ Recommended: Deployment ID
  
  // Optional fields
  rationale?: string[];        // Reasoning for decision
  metadata?: Record<string, any>;  // Additional data
}
```

### **Example Signal Write**

```typescript
import { 
  SignalWrite, 
  makeIdempotencyKey,
  withMarketplaceHeaders 
} from '@neuronetiq/marketplace-contracts';

const signal: SignalWrite = {
  // Required core fields
  symbol: "EURUSD",
  timeframe: "5m",
  decision: "BUY",
  confidence: 0.85,
  
  // Required identification (v0.16.0)
  model_id: "rsi_ema_signal_v2",
  model_version: "2.1.0",
  event_time: new Date().toISOString(),
  timestamp: new Date().toISOString(),
  
  // Marketplace attribution
  vendor_id: "vendor_abc123",
  deployment_id: "dep_xyz789",
  
  // Optional details
  rationale: [
    "RSI oversold at 25",
    "EMA crossover bullish",
    "Volume confirmation above SMA"
  ],
  metadata: {
    rsi_value: 25.3,
    ema_fast: 1.1045,
    ema_slow: 1.1038,
    volume_ratio: 1.25
  }
};

// Write to Infrastructure
const response = await fetch('https://infra.neuronetiq.com/api/signals/store', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.MARKETPLACE_TOKEN}`,
    'X-Idempotency-Key': makeIdempotencyKey(signal.symbol, signal.timeframe, new Date()),
    ...withMarketplaceHeaders()
  },
  body: JSON.stringify([signal])
});
```

## Consensus Writing

### **Consensus Fields**

```typescript
interface ConsensusWrite {
  // Core consensus decision
  symbol: string;
  timeframe: string;
  decision: "BUY" | "SELL" | "HOLD";
  confidence: number;          // Aggregated confidence
  
  // Model identification (v0.16.0)
  model_id: string;
  model_version: string;
  event_time: string;
  timestamp: string;
  
  // Consensus-specific
  contributions?: Record<string, {
    decision: "BUY" | "SELL" | "HOLD";
    weight: number;
    confidence?: number;
  }>;
  
  // Attribution
  vendor_id?: string;
  deployment_id?: string;
}
```

### **Example Consensus Write**

```typescript
const consensus: ConsensusWrite = {
  symbol: "EURUSD",
  timeframe: "1h",
  decision: "BUY",
  confidence: 0.78,
  
  model_id: "multi_signal_consensus",
  model_version: "1.5.0",
  event_time: new Date().toISOString(),
  timestamp: new Date().toISOString(),
  
  contributions: {
    "rsi_model": { decision: "BUY", weight: 0.3, confidence: 0.85 },
    "macd_model": { decision: "BUY", weight: 0.4, confidence: 0.75 },
    "ema_model": { decision: "HOLD", weight: 0.3, confidence: 0.65 }
  },
  
  vendor_id: "consensus_vendor",
  deployment_id: "dep_consensus_001"
};
```

## HTTP Headers

### **Required Headers**

```http
POST /api/signals/store
Content-Type: application/json
Authorization: Bearer sit_your_scoped_token
X-Marketplace-Contracts-Version: 0.2.0
X-Idempotency-Key: EURUSD:5m:1672747200
```

### **Header Descriptions**

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | ✅ | Scoped Infrastructure token from `mp link-infra` |
| `X-Marketplace-Contracts-Version` | ✅ | Contract version for compatibility |
| `X-Idempotency-Key` | ✅ | Prevents duplicate writes (5-second slots) |
| `Content-Type` | ✅ | Must be `application/json` |
| `User-Agent` | ⚠️ | Recommended: `your-model/1.0.0 vendor/abc123` |

### **Idempotency Keys**

Prevent duplicate signals using 5-second time slots:

```typescript
import { makeIdempotencyKey } from '@neuronetiq/marketplace-contracts';

// Automatic key generation
const key = makeIdempotencyKey("EURUSD", "5m", new Date());
// → "EURUSD:5m:335544960" (5-second slot)

// Manual key generation
const slot = Math.floor(Date.now() / 5000);
const key = `${symbol}:${timeframe}:${slot}`;
```

## Rate Limits & Quotas

### **Default Limits**

| Endpoint | Limit | Window | Scope |
|----------|-------|--------|-------|
| `/api/signals/store` | 60 requests | 1 minute | Per deployment |
| `/api/consensus/store` | 60 requests | 1 minute | Per deployment |
| Heartbeats | 120 requests | 1 hour | Per deployment |

### **Rate Limit Headers**

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1672747260
Retry-After: 60
```

### **Handling Rate Limits**

```typescript
async function writeSignalWithBackoff(signal: SignalWrite) {
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch('/api/signals/store', {
      method: 'POST',
      headers: { /* ... */ },
      body: JSON.stringify([signal])
    });
    
    if (response.ok) {
      return { success: true };
    }
    
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      console.log(`Rate limited, waiting ${retryAfter}s...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }
    
    // Other errors
    return { success: false, error: await response.text() };
  }
  
  return { success: false, error: 'Max retries exceeded' };
}
```

## Validation & Error Handling

### **Schema Validation**

All writes are validated against Zod schemas:

```typescript
import { SignalWrite } from '@neuronetiq/marketplace-contracts';

// Validate before sending
const validation = SignalWrite.safeParse(yourSignal);
if (!validation.success) {
  console.error('Validation failed:', validation.error.issues);
  return;
}

// Send validated signal
await writeSignal(validation.data);
```

### **Common Validation Errors**

| Error | Cause | Fix |
|-------|-------|-----|
| `symbol required` | Missing symbol field | Add `symbol: "EURUSD"` |
| `confidence must be between 0 and 1` | Invalid confidence | Use `0.0` to `1.0` range |
| `decision must be BUY, SELL, or HOLD` | Invalid decision | Use exact string values |
| `event_time required` | Missing event_time | Add `event_time: new Date().toISOString()` |
| `model_id required` | Missing model_id | Add `model_id: "your_model_name"` |

### **HTTP Error Codes**

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Signal stored successfully |
| 204 | No Content | Signal stored (idempotent) |
| 400 | Bad Request | Check schema validation |
| 401 | Unauthorized | Check token with `mp link-infra` |
| 422 | Validation Error | Fix required fields |
| 429 | Rate Limited | Implement backoff |
| 500 | Server Error | Retry with exponential backoff |

## Performance Optimization

### **Batch Writing**

Write multiple signals in one request:

```typescript
const signals: SignalWrite[] = [
  { symbol: "EURUSD", timeframe: "5m", decision: "BUY", confidence: 0.8, /* ... */ },
  { symbol: "GBPUSD", timeframe: "5m", decision: "SELL", confidence: 0.7, /* ... */ },
  { symbol: "USDJPY", timeframe: "5m", decision: "HOLD", confidence: 0.6, /* ... */ },
];

// Single API call for multiple signals
await fetch('/api/signals/store', {
  method: 'POST',
  body: JSON.stringify(signals)
});
```

### **Connection Pooling**

```typescript
// Reuse HTTP connections
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 10
});

const response = await fetch(url, { agent });
```

### **Compression**

```typescript
// Enable gzip compression
const response = await fetch(url, {
  headers: {
    'Accept-Encoding': 'gzip, deflate',
    // ... other headers
  }
});
```

## Migration from Previous Versions

### **v0.15.x → v0.16.0 Changes**

**New Required Fields:**
```typescript
// Add these fields to existing signals:
signal.model_id = "your_model_identifier";
signal.event_time = new Date().toISOString();
```

**Backward Compatibility:**
- Old signals without `model_id` will be rejected
- Old signals without `event_time` will be rejected
- All other fields remain compatible

### **Migration Script**

```typescript
// Update existing signal generation
function upgradeSignalToV16(oldSignal: any): SignalWrite {
  return {
    ...oldSignal,
    model_id: process.env.MODEL_ID || "legacy_model",
    event_time: new Date().toISOString(),
    // Ensure all required fields are present
  };
}
```

**Ready to write high-performance trading signals? Check the [quickstart guide](./quickstart.md) to get started!** 📈
