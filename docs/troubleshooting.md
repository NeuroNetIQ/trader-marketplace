# 🔧 Troubleshooting Guide

> **Common issues and solutions for the NeuroNetIQ ML Marketplace**

## 🩺 Health Check First

Always start with the doctor command:

```bash
mp doctor
```

This checks:
- ✅ CLI configuration and API connectivity
- ✅ Authentication status
- ✅ Marketplace endpoints
- ✅ Environment variables

---

## 🔐 Authentication Issues

### **❌ "Authentication required" / HTTP 401**

**Symptoms:**
```bash
mp data list
# → ❌ Authentication required
```

**Solutions:**
```bash
# Re-authenticate with SSO
mp login --sso

# Or use API key
mp login --api-key vk_your_key

# Verify authentication
mp doctor
```

### **❌ "Invalid token format" / "Token inactive"**

**Cause:** Token expired or corrupted

**Solutions:**
```bash
# Clear stored credentials
rm ~/.mp/config.json

# Re-authenticate
mp login --sso

# For deployed models, rotate Infrastructure token
mp link-infra --rotate
```

### **❌ SSO browser doesn't open**

**Manual steps:**
```bash
mp login --sso
# → If browser doesn't open, visit: https://infra.neuronetiq.com/marketplace/login?cli=true
# Copy auth code and paste when prompted
```

---

## 📊 Data & Training Issues

### **❌ "No current round available"**

**Symptoms:**
```bash
mp data pull --round current
# → ❌ No current round available
```

**Solutions:**
```bash
# List available rounds
mp data list

# Use specific round
mp data pull --round 2025-01-02

# Check round info
mp data info --round 2025-01-02
```

### **❌ Training run fails to start**

**Check requirements:**
```bash
# Verify RunPod connection
mp doctor
# → Check RUNPOD_API_KEY status

# Check training spec
mp train start --task signal --round current --hp lr=0.001
# → Look for validation errors
```

**Common fixes:**
```bash
# Invalid hyperparameters
mp train start --hp lr=0.001 --hp epochs=20  # Use valid JSON values

# Missing dataset round
mp data list  # Verify round exists

# Budget exceeded
mp train start --max-hours 2 --max-cost 20  # Set reasonable limits
```

### **❌ Training logs not streaming**

**Check log endpoint:**
```bash
mp train status <run_id>
# → Check logs_url field

# Manual log access
curl -H "Authorization: Bearer your_token" \
  https://infra.neuronetiq.com/api/training/runs/<run_id>/logs
```

---

## 🚀 Deployment Issues

### **❌ Deployment creation fails**

**Check RunPod configuration:**
```bash
# Verify RunPod API key
export RUNPOD_API_KEY=your_key
mp doctor

# Test with minimal resources
mp deploy --provider runpod --cpu 1 --memory 2

# Check RunPod account limits
curl -H "Authorization: Bearer $RUNPOD_API_KEY" \
  https://api.runpod.io/graphql \
  -d '{"query":"query { myself { id } }"}'
```

### **❌ Model validation fails**

**Common validation errors:**
```bash
# Health endpoint not responding
mp validate --url http://localhost:8080
# → Ensure server is running: mp dev

# Invalid response schema
mp validate --task signal
# → Check response matches SignalInferenceResponse schema

# Missing required fields
# Ensure response includes: decision, confidence, model_version, timestamp
```

### **❌ Deployment shows "offline" in console**

**Check heartbeat system:**
```bash
# Send manual heartbeat
mp heartbeat --deployment-id dep_your_id

# Check heartbeat interval
mp heartbeat --interval 30  # Start continuous heartbeats

# Verify deployment status
curl -H "Authorization: Bearer your_token" \
  https://infra.neuronetiq.com/api/marketplace/deployments
```

---

## 📡 Infrastructure Connection Issues

### **❌ "Failed to write to Infrastructure"**

**Check Infrastructure token:**
```bash
# Verify token is set
mp link-infra --signals-url https://infra.neuronetiq.com/api/signals/store

# Test Infrastructure connectivity
curl -H "Authorization: Bearer sit_your_token" \
  https://infra.neuronetiq.com/api/health
```

### **❌ HTTP 429 - Rate Limited**

**Symptoms:**
```bash
# Too many requests
POST /api/signals/store → 429 Too Many Requests
```

**Solutions:**
```bash
# Check rate limits
mp doctor  # Shows current limits

# Reduce inference frequency
# Default: 60 requests/minute per deployment
# Recommended: 1 request every 5 seconds (12/minute)

# Add backoff in your model:
if response.status_code == 429:
    time.sleep(5)  # Wait 5 seconds before retry
```

### **❌ HTTP 422 - Validation Error**

**Check required fields (v0.16.0):**
```json
{
  "symbol": "EURUSD",        // ✅ Required
  "timeframe": "5m",         // ✅ Required  
  "decision": "BUY",         // ✅ Required: "BUY" | "SELL" | "HOLD"
  "confidence": 0.85,        // ✅ Required: 0.0 to 1.0
  "model_version": "1.0.0",  // ✅ Required
  "timestamp": "2025-01-02T10:30:00Z",  // ✅ Required: ISO format
  "event_time": "2025-01-02T10:30:00Z", // ✅ Required in v0.16.0
  "model_id": "my_model",    // ✅ Required in v0.16.0
  "vendor_id": "vendor_123", // ✅ Optional but recommended
  "deployment_id": "dep_456" // ✅ Optional but recommended
}
```

---

## 🐛 Common Error Codes

### **HTTP Status Codes**

| Code | Meaning | Solution |
|------|---------|----------|
| 401 | Unauthorized | Re-authenticate with `mp login` |
| 403 | Forbidden | Check vendor permissions |
| 404 | Not Found | Verify endpoint URLs and resource IDs |
| 422 | Validation Error | Check request schema against contracts |
| 429 | Rate Limited | Reduce request frequency, add backoff |
| 500 | Server Error | Check Infrastructure status, try again |
| 503 | Service Unavailable | Infrastructure maintenance, wait and retry |

### **CLI Error Patterns**

**Network Errors:**
```bash
# DNS resolution fails
Error: getaddrinfo ENOTFOUND infra.neuronetiq.com
# → Check internet connection and URL

# Connection timeout
Error: connect ETIMEDOUT
# → Check firewall and network connectivity

# SSL certificate errors  
Error: unable to verify the first certificate
# → Update Node.js or disable SSL verification (dev only)
```

**Configuration Errors:**
```bash
# Missing config file
Error: ENOENT: no such file or directory, open '/Users/user/.mp/config.json'
# → Run mp login first

# Invalid JSON in config
Error: Unexpected token in JSON
# → Delete ~/.mp/config.json and re-authenticate
```

---

## 🔧 Debug Mode

### **Enable Verbose Logging**

```bash
# Set debug environment
export DEBUG=mp:*
export LOG_LEVEL=debug

# Run commands with verbose output
mp train start --task signal --round current
```

### **Manual API Testing**

```bash
# Test authentication
curl -H "Authorization: Bearer vk_your_key" \
  https://infra.neuronetiq.com/api/marketplace/vendor/me

# Test catalog access
curl https://infra.neuronetiq.com/api/catalog

# Test training run creation
curl -X POST https://infra.neuronetiq.com/api/training/runs \
  -H "Authorization: Bearer vk_your_key" \
  -H "Content-Type: application/json" \
  -d '{"round_id":"2025-01-02","task":"signal","hyperparams":{"lr":0.001}}'
```

---

## 🚨 Emergency Procedures

### **Complete Reset**

```bash
# 1. Clear all local state
rm -rf ~/.mp/

# 2. Re-authenticate
mp login --sso

# 3. Verify health
mp doctor

# 4. Test basic operations
mp data list
```

### **Deployment Recovery**

```bash
# 1. Check deployment status
mp heartbeat --deployment-id dep_your_id

# 2. Rotate Infrastructure token
mp link-infra --rotate

# 3. Redeploy if necessary
mp deploy --provider runpod --cpu 2 --memory 4

# 4. Re-register model
mp register --name "Recovered Model"
```

### **Performance Issues**

```bash
# Check system resources
mp doctor

# Monitor deployment health
mp heartbeat --interval 10  # More frequent monitoring

# Check Infrastructure status
curl https://infra.neuronetiq.com/api/health
```

---

## 📞 Getting Help

### **Self-Service Resources**

1. **Documentation**: [Complete API Reference](../README.md)
2. **Examples**: Check `/examples/` directory for working code
3. **GitHub Issues**: [Search existing issues](https://github.com/NeuroNetIQ/trader-marketplace/issues)
4. **Community**: [Discord Server](https://discord.gg/neuronetiq)

### **Support Channels**

**For CLI/Template Issues:**
- GitHub Issues: https://github.com/NeuroNetIQ/trader-marketplace/issues
- Tag: `cli`, `template`, `documentation`

**For Infrastructure/API Issues:**
- Email: support@neuronetiq.com
- Include: Error messages, request IDs, timestamps

**For Account/Billing Issues:**
- Email: billing@neuronetiq.com
- Include: Vendor ID, deployment IDs

### **Bug Report Template**

```markdown
**Environment:**
- CLI Version: (mp --version)
- Node.js Version: (node --version)
- Operating System: (macOS/Linux/Windows)
- API URL: (mp doctor output)

**Issue:**
- Command: mp train start --task signal
- Expected: Training run should start
- Actual: Error message or unexpected behavior

**Logs:**
```
(paste relevant error messages)
```

**Additional Context:**
Any other relevant information
```

### **Performance Issues**

**Slow CLI Commands:**
```bash
# Check network latency
time curl https://infra.neuronetiq.com/api/health

# Use faster endpoints
mp data info --round current  # Instead of mp data pull for quick checks
```

**High Memory Usage:**
```bash
# Monitor during training
mp train start --task signal --max-hours 1  # Set limits

# Use smaller datasets
mp data pull --round current  # Check file sizes first
```

---

## ✅ **Known Good Configurations**

### **Development Environment**
```bash
# Local development
INFRA_API_URL=http://localhost:3010
RUNPOD_API_KEY=optional_for_local_testing
HF_TOKEN=optional_for_local_testing
```

### **Production Environment**
```bash
# Production deployment
INFRA_API_URL=https://infra.neuronetiq.com
RUNPOD_API_KEY=required_for_deployment
HF_TOKEN=required_for_model_storage
WANDB_API_KEY=optional_for_tracking
```

### **Tested Configurations**

| OS | Node.js | CLI Version | Status |
|----|---------|-------------|---------|
| macOS 14+ | 20.11.0 | 0.2.0 | ✅ Fully supported |
| Ubuntu 22.04 | 20.11.0 | 0.2.0 | ✅ Fully supported |
| Windows 11 | 20.11.0 | 0.2.0 | ✅ Fully supported |
| Docker | 20.11.0 | 0.2.0 | ✅ Supported |

**If you're still having issues after checking this guide, please reach out to our support team!** 🙋‍♂️
