# 💓 Heartbeat System

> **Keep your deployments healthy and visible in the marketplace**

## Overview

The heartbeat system allows your deployed models to communicate their health status to the marketplace. This enables:

- ✅ **Health Monitoring**: Real-time status in vendor console
- ✅ **Catalog Visibility**: Models show as "online" or "offline"
- ✅ **Performance Tracking**: CPU, memory, and latency metrics
- ✅ **Automatic Alerts**: Notifications when models go offline

## Heartbeat Specification

### **Payload Format**

```json
{
  "deployment_id": "dep_abc123",
  "status": "ready",
  "timestamp": "2025-01-03T10:30:00.000Z",
  "metrics": {
    "cpu_usage": 0.65,
    "memory_usage": 0.45,
    "uptime_seconds": 3600,
    "requests_processed": 1200,
    "avg_latency_ms": 85,
    "error_count_last_minute": 0
  },
  "message": "Heartbeat from model v1.0.0"
}
```

### **Status Values**

| Status | Description | Catalog Display |
|--------|-------------|-----------------|
| `ready` | Model healthy and processing | 🟢 Online |
| `error` | Model experiencing errors | 🔴 Error |
| `maintenance` | Model in maintenance mode | 🟡 Maintenance |
| `offline` | Model shutting down | ⚫ Offline |

### **Metrics Fields**

| Field | Type | Description | Range |
|-------|------|-------------|-------|
| `cpu_usage` | number | CPU utilization | 0.0 - 1.0 |
| `memory_usage` | number | Memory utilization | 0.0 - 1.0 |
| `uptime_seconds` | number | Process uptime | 0+ |
| `requests_processed` | number | Total requests handled | 0+ |
| `avg_latency_ms` | number | Average response time | 0+ |
| `error_count_last_minute` | number | Errors in last minute | 0+ |

## Implementation

### **Automatic Heartbeats (Recommended)**

Your RunPod template automatically sends heartbeats every 30 seconds:

```typescript
// Automatic heartbeat loop (built into templates)
const intervalSeconds = parseInt(process.env.HEARTBEAT_INTERVAL || "30");
const jitter = Math.random() * 5000; // Prevent thundering herd

setInterval(sendHeartbeat, intervalSeconds * 1000 + jitter);
```

### **Manual Heartbeats (CLI)**

```bash
# Send single heartbeat
mp heartbeat --deployment-id dep_abc123

# Start continuous heartbeat monitoring
mp heartbeat --interval 30

# Send heartbeat with custom status
mp heartbeat --status maintenance --message "Updating model"
```

### **Custom Implementation (Node.js)**

```javascript
import fetch from 'node-fetch';

async function sendHeartbeat(deploymentId, marketplaceToken) {
  const heartbeat = {
    deployment_id: deploymentId,
    status: "ready",
    timestamp: new Date().toISOString(),
    metrics: {
      cpu_usage: getCpuUsage(),
      memory_usage: getMemoryUsage(),
      avg_latency_ms: getAverageLatency(),
    }
  };

  const response = await fetch(`${process.env.MARKETPLACE_API_URL}/api/marketplace/vendor/heartbeats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${marketplaceToken}`,
      'X-Marketplace-Contracts-Version': '0.2.0',
    },
    body: JSON.stringify(heartbeat)
  });

  return response.ok;
}
```

### **Custom Implementation (Python)**

```python
import requests
import time
import psutil
from datetime import datetime

def send_heartbeat(deployment_id, marketplace_token):
    heartbeat = {
        "deployment_id": deployment_id,
        "status": "ready",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "metrics": {
            "cpu_usage": psutil.cpu_percent() / 100,
            "memory_usage": psutil.virtual_memory().percent / 100,
            "uptime_seconds": time.time() - start_time,
        }
    }
    
    response = requests.post(
        f"{os.getenv('MARKETPLACE_API_URL')}/api/marketplace/vendor/heartbeats",
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {marketplace_token}',
            'X-Marketplace-Contracts-Version': '0.2.0',
        },
        json=heartbeat
    )
    
    return response.status_code == 200
```

## Heartbeat Cadence & Best Practices

### **Recommended Intervals**

| Deployment Type | Interval | Jitter | Rationale |
|-----------------|----------|--------|-----------|
| Production | 30s | ±5s | Balance freshness vs load |
| Development | 60s | ±10s | Reduce noise during testing |
| High-frequency | 15s | ±3s | Critical models needing fast detection |

### **Jitter Implementation**

Always add jitter to prevent thundering herd:

```javascript
const baseInterval = 30000; // 30 seconds
const jitter = Math.random() * 5000; // 0-5 seconds
const actualInterval = baseInterval + jitter;
```

### **Retry & Backoff**

```javascript
async function sendHeartbeatWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const success = await sendHeartbeat();
      if (success) return;
    } catch (error) {
      console.warn(`Heartbeat attempt ${attempt} failed:`, error.message);
    }
    
    if (attempt < maxRetries) {
      const backoffMs = 1000 * Math.pow(2, attempt); // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  
  console.error('All heartbeat attempts failed');
}
```

## Monitoring & Alerts

### **Health Detection**

Models are considered:
- **🟢 Online**: Heartbeat received within last 2 intervals (60s default)
- **🟡 Degraded**: Heartbeat received within last 5 intervals (150s default)  
- **🔴 Offline**: No heartbeat for 5+ intervals

### **Automatic Actions**

When models go offline:
- Catalog shows "offline" status
- Vendor console shows alert
- Email notification sent (if configured)
- Auto-scaling may provision replacement

### **Performance Tracking**

Heartbeat metrics are used for:
- **Resource Optimization**: Right-size CPU/memory
- **Performance Monitoring**: Track latency trends
- **Billing**: Usage-based pricing calculations
- **SLA Monitoring**: Uptime and availability tracking

## Troubleshooting

### **Heartbeats Not Appearing**

**Check configuration:**
```bash
mp doctor  # Verify heartbeat configuration
```

**Check environment variables:**
```bash
echo $MARKETPLACE_API_URL
echo $MARKETPLACE_TOKEN
echo $DEPLOYMENT_ID
```

**Test manually:**
```bash
mp heartbeat --deployment-id dep_your_id
```

### **High Heartbeat Latency**

**Check network connectivity:**
```bash
curl -w "%{time_total}" $MARKETPLACE_API_URL/api/health
```

**Optimize heartbeat payload:**
```javascript
// Reduce metrics collection overhead
const lightMetrics = {
  status: "ready",
  uptime_seconds: process.uptime(),
  // Skip expensive CPU/memory calculations
};
```

### **Rate Limiting**

If heartbeats are rate limited:
- Increase interval: `HEARTBEAT_INTERVAL=60`
- Add more jitter: `Math.random() * 10000`
- Check vendor quotas in console

## Integration with Templates

### **RunPod Signal HTTP Template**

Heartbeats are automatically enabled when these environment variables are set:

```bash
MARKETPLACE_API_URL=https://infra.neuronetiq.com
MARKETPLACE_TOKEN=your_marketplace_token
DEPLOYMENT_ID=dep_abc123
HEARTBEAT_INTERVAL=30
```

### **Custom Models**

Add heartbeat support to your custom models:

```typescript
import { HeartbeatSender } from '@neuronetiq/marketplace-contracts';

const heartbeat = new HeartbeatSender(
  process.env.MARKETPLACE_API_URL,
  process.env.MARKETPLACE_TOKEN
);

// Start automatic heartbeats
heartbeat.start({
  deploymentId: process.env.DEPLOYMENT_ID,
  interval: 30,
  jitter: 5,
});
```

## Security Considerations

### **Token Scope**

Heartbeat tokens are scoped to:
- ✅ **Single deployment**: Cannot access other deployments
- ✅ **Heartbeat endpoint only**: Cannot access training or billing APIs
- ✅ **Time-limited**: Tokens expire after 30 days
- ✅ **Revocable**: Can be rotated via `mp link-infra --rotate`

### **Rate Limiting**

- **Default**: 120 heartbeats per hour per deployment
- **Burst**: Up to 5 heartbeats per minute
- **Backoff**: Exponential backoff on 429 responses

### **Data Privacy**

- **No sensitive data**: Heartbeats contain only operational metrics
- **Aggregated metrics**: Individual request data not transmitted
- **Retention**: Heartbeat history kept for 30 days

**Keep your models healthy and visible with regular heartbeats!** 💓
