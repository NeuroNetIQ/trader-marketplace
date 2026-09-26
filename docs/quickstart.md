# 🚀 Quickstart: From Zero to Live Model in 15 Minutes

> **Get your ML model deployed and generating live trading signals in under 15 minutes**

## Prerequisites

- Node.js 20.11.0+ 
- Git
- (Optional) RunPod account for cloud deployment
- (Optional) Hugging Face account for model storage

## Step 1: Install CLI (2 minutes)

```bash
# Install globally
npm install -g @neuronetiq/marketplace-cli

# Verify installation
mp --version
# → @neuronetiq/marketplace-cli v0.2.0

# Check health
mp doctor
```

## Step 2: Authenticate (3 minutes)

### Option A: SSO Login (Recommended)
```bash
# Opens browser for GitHub/Google login
mp login --sso --api-url https://trader-infra.fly.dev

# Follow browser prompts, then enter auth code
# Enter the authentication code from your browser: abc123def456
# ✅ Successfully authenticated
```

### Option B: API Key Login
```bash
# Get API key from vendor console first
mp login --api-key vk_your_api_key_here --api-url https://trader-infra.fly.dev
```

### Environment Configuration
```bash
# Set default API URL to avoid repeating --api-url
export MARKETPLACE_INFRA_API_URL=https://trader-infra.fly.dev
mp login --sso  # Now uses environment variable
```

## Step 3: Get Training Data (2 minutes)

```bash
# See available datasets
mp data list

# Get current round info
mp data info --round current

# Download training data locally (BYOC approach)
mp data pull --round current
# → Downloaded 3 files to ./data/2025-01-02/
```

## Step 4: Train Your Model (5 minutes)

### Option A: Managed Training (RunPod Jobs)
```bash
# Start cloud training run
mp train start --task signal --round current \
  --hp lr=0.001 --hp epochs=20 --hp batch_size=256 \
  --gpu A100 --max-hours 1

# Monitor progress
mp train status run_abc123
mp train logs run_abc123
```

### Option B: Local Training (BYOC)
```bash
# Use downloaded data to train locally
# Push your model to Hugging Face
# Then register it:
mp register --name "My Local Model" --hf-repo vendor/my-model
```

## Step 5: Deploy for Inference (2 minutes)

```bash
# Create inference server from template
mp init --template runpod-signal-http
cd my-trading-model

# Test locally
npm install
mp dev
mp validate

# Deploy to RunPod
mp deploy --provider runpod --cpu 2 --memory 4
# → Deployment ID: dep_xyz789
# → Endpoint: https://xyz-runpod.com
```

## Step 6: Connect to Live Trading (1 minute)

```bash
# Register model in marketplace catalog
mp register --name "My Signal Model" --version 1.0.0

# Connect to trading infrastructure
mp link-infra --signals-url https://infra.neuronetiq.com/api/signals/store
# → ✅ Infrastructure linked successfully!

# Start sending heartbeats
mp heartbeat --interval 30
```

## ✅ Success! Your Model is Live

**Check your results:**

1. **Marketplace Catalog**: Visit https://trader.neuronetiq.com/marketplace
   - Your model should appear in the catalog with "online" status

2. **Live Trading**: Visit https://trader.neuronetiq.com/consensus  
   - Your signals should appear with vendor attribution badges

3. **Vendor Console**: Visit https://trader.neuronetiq.com/marketplace/vendor
   - Monitor deployments, metrics, and revenue

## 🎯 What You Just Built

- **🤖 ML Model**: Deployed to RunPod with auto-scaling
- **📊 Live Signals**: Generating trading signals every 5 seconds
- **💰 Revenue Stream**: Earning from signal performance
- **📈 Monitoring**: Real-time health and performance tracking
- **🔗 Integration**: Connected to live trading infrastructure

## Next Steps

- **Optimize Model**: Use training data to improve accuracy
- **Scale Deployment**: Add more CPU/memory or multiple regions
- **Monitor Performance**: Track Sharpe ratio and win rate
- **Iterate**: Retrain with new data rounds

## Troubleshooting

**Authentication Issues:**
```bash
mp doctor  # Check all health
mp login --sso  # Re-authenticate
```

**Deployment Issues:**
```bash
mp validate  # Test endpoints
mp deploy --provider runpod  # Redeploy
```

**Connection Issues:**
```bash
mp link-infra  # Reconnect to infrastructure
mp heartbeat  # Send manual heartbeat
```

## Support

- 📖 **Documentation**: [Full API Reference](./README.md)
- 💬 **Community**: [Discord Server](https://discord.gg/neuronetiq)
- 🐛 **Issues**: [GitHub Issues](https://github.com/NeuroNetIQ/trader-marketplace/issues)
- 📧 **Support**: support@neuronetiq.com

**Welcome to the NeuroNetIQ ML Marketplace! 🎉**
