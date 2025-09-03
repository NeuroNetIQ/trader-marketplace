# ML Marketplace Quick Reference

> **Essential commands and code snippets for each team**

## 🏗️ **INFRASTRUCTURE TEAM**

### **Critical Files to Add:**
```bash
supabase/migrations/20250102_marketplace.sql    # Database schema
src/middleware/marketplaceAuth.ts               # Token introspection  
src/routes/marketplace.ts                       # API endpoints
src/services/runpod.ts                          # RunPod integration
```

### **Essential Commands:**
```bash
# Apply database migration
supabase db push

# Test token introspection
curl -X POST localhost:3010/api/tokens/introspect \
  -d '{"token":"sit_test"}'

# Test marketplace auth on signals
curl -X POST localhost:3010/api/signals/store \
  -H "Authorization: Bearer sit_test_token" \
  -d '[{"symbol":"EURUSD","decision":"BUY"}]'
```

### **Doppler Secrets:**
```bash
INFRA_TOKEN_PEPPER=secret_for_token_hashing
MP_JWT_SECRET=jwt_signing_secret  
RUNPOD_API_KEY=runpod_api_key
```

---

## 🖥️ **FRONTEND TEAM**

### **Critical Files to Add:**
```bash
src/app/marketplace/layout.tsx                  # Marketplace layout
src/app/marketplace/vendor/page.tsx             # Vendor dashboard
src/app/marketplace/vendor/training/page.tsx    # Training management
src/app/marketplace/vendor/training/new/page.tsx # New training form
```

### **Navigation Update:**
```typescript
// src/lib/nav-model.ts - Add marketplace section
{
  title: "Marketplace",
  icon: Store,
  href: "/marketplace",
  items: [
    { title: "Catalog", href: "/marketplace" },
    { title: "Vendor Console", href: "/marketplace/vendor" },
    { title: "Training", href: "/marketplace/vendor/training" },
    { title: "Docs", href: "/marketplace/docs" },
  ]
}
```

### **Environment Variables:**
```bash
INFRA_BASE_URL=http://localhost:3010
NEXT_PUBLIC_ENABLE_MARKETPLACE_UI=true
```

---

## 🤖 **ML TEAM**

### **Installation:**
```bash
# Install CLI globally
npm install -g @neuronetiq/marketplace-cli

# Or install from local build
cd /Users/mark/Documents/Trader/trader-marketplace
npm link packages/marketplace-cli
```

### **Testing Workflow:**
```bash
# 1. Authenticate
mp login --api-url http://localhost:3010

# 2. Get training data
mp data list
mp data pull --round current

# 3. Start training
mp train start --task signal --round current \
  --hp lr=0.001 --hp epochs=20

# 4. Monitor training  
mp train status <run_id>
mp train logs <run_id>

# 5. Deploy inference model
mp init --template runpod-signal-http
mp validate
mp deploy --provider runpod

# 6. Connect to live trading
mp register --name "ML Team Test Model"
mp link-infra
```

### **Integration Code:**
```typescript
// Add to existing ML pipeline
import { MLMarketplaceRunner } from './marketplace/mlMarketplaceRunner';

const marketplaceRunner = new MLMarketplaceRunner();
await marketplaceRunner.runTrainingExperiment('2025-01-02');
await marketplaceRunner.simulateVendorBehavior();
```

---

## 📦 **CONTRACTS TEAM**

### **Publishing Commands:**
```bash
cd /Users/mark/Documents/Trader/trader-marketplace

# Build packages
pnpm build

# Publish contracts
pnpm --filter @neuronetiq/marketplace-contracts publish --access public

# Publish CLI
pnpm --filter @neuronetiq/marketplace-cli publish --access public

# Or use Git tags for automated publishing
git tag contracts-v0.1.0 && git push origin contracts-v0.1.0
git tag cli-v0.1.0 && git push origin cli-v0.1.0
```

### **Verification:**
```bash
# Test installation
npm install -g @neuronetiq/marketplace-cli@latest
mp --version

# Test contracts import
node -e "const {SignalWrite} = require('@neuronetiq/marketplace-contracts'); console.log('✅ Contracts working')"
```

### **GitHub Secrets:**
```bash
# Required in GitHub repository settings
NPM_TOKEN=npm_your_publish_token
```

---

## 🔐 **SECURITY CHECKLIST**

### **Token Security:**
- [ ] All tokens hashed with argon2 + salt + pepper
- [ ] Tokens shown only once on creation
- [ ] Log redaction for vk_, sit_, whsec_ patterns
- [ ] Rate limiting per deployment_id
- [ ] Token expiration enforced

### **API Security:**
- [ ] CORS configured for Frontend domain only
- [ ] Authentication required on all vendor endpoints
- [ ] Input validation using Zod schemas
- [ ] Error messages don't leak sensitive data

### **Secrets Management:**
- [ ] All secrets in Doppler, not environment files
- [ ] No secrets in public repository
- [ ] Vendor connections encrypted at rest
- [ ] Infrastructure tokens scoped per deployment

---

## 📊 **MONITORING & ALERTS**

### **Key Metrics:**
```bash
# API Response Times
curl -w "%{time_total}" $INFRA_BASE_URL/api/catalog

# Token Cache Hit Rate  
grep "token_cache_hit" /var/log/infra.log | wc -l

# Training Job Success Rate
curl $INFRA_BASE_URL/api/training/runs?status=succeeded | jq '.data | length'

# Active Deployments
curl $INFRA_BASE_URL/api/deployments?status=ready | jq '.data | length'
```

### **Health Checks:**
```bash
# Infrastructure
curl $INFRA_BASE_URL/api/health

# Frontend marketplace pages
curl $FRONTEND_URL/marketplace

# Package availability
npm info @neuronetiq/marketplace-cli version
```

---

## 🎯 **SUCCESS VALIDATION**

### **External Developer Simulation:**
```bash
# 1. Fresh environment
docker run -it --rm node:20-alpine sh

# 2. Install CLI
npm install -g @neuronetiq/marketplace-cli

# 3. Complete workflow
mp login --api-url https://your-infra.com
mp data pull --round current
mp train start --task signal --round current
mp init --template runpod-signal-http
mp deploy --provider runpod
mp register --name "Test Model"
mp link-infra

# 4. Verify in catalog
curl https://your-infra.com/api/catalog | jq '.data[] | select(.vendor == "test_vendor")'
```

### **Integration Verification:**
```bash
# Vendor signals in Frontend
curl $FRONTEND_URL/api/consensus/latest | jq '.data[0] | {vendor_id, deployment_id}'

# Training runs in database
psql $DATABASE_URL -c "SELECT id, status, task FROM training_runs ORDER BY created_at DESC LIMIT 5;"

# Marketplace catalog working
curl $INFRA_BASE_URL/api/catalog | jq '.data | length'
```

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues:**

**Package Installation Fails:**
```bash
# Clear npm cache
npm cache clean --force
npm install -g @neuronetiq/marketplace-cli@latest
```

**Authentication Errors:**
```bash
# Check Doppler secrets
doppler secrets get --project marketplace --config infra-api

# Test token introspection
curl -X POST $INFRA_BASE_URL/api/tokens/introspect \
  -d '{"token":"sit_test_token"}'
```

**Frontend Pages Not Loading:**
```bash
# Check environment variables
echo $INFRA_BASE_URL
echo $NEXT_PUBLIC_ENABLE_MARKETPLACE_UI

# Test API connectivity
curl $INFRA_BASE_URL/api/health
```

**Training Runs Failing:**
```bash
# Check RunPod API key
curl -H "Authorization: Bearer $RUNPOD_API_KEY" \
  https://api.runpod.io/graphql \
  -d '{"query":"query { myself { id } }"}'

# Check training run logs
mp train logs <run_id>
```

### **Emergency Contacts:**
- **Infrastructure down**: Infrastructure Team Lead
- **Frontend broken**: Frontend Team Lead
- **Packages broken**: Contracts Team Lead
- **ML pipeline issues**: ML Team Lead

---

## 📈 **PERFORMANCE TARGETS**

| Component | Target | Measurement |
|-----------|--------|-------------|
| Token introspection | <50ms | Middleware timing |
| Catalog API | <100ms | Response time |
| Training job creation | <5s | End-to-end timing |
| CLI command execution | <2s | Command completion |
| Frontend page load | <1s | Time to interactive |

### **Load Testing:**
```bash
# Simulate multiple vendors
for i in {1..10}; do
  curl -X POST $INFRA_BASE_URL/api/signals/store \
    -H "Authorization: Bearer sit_vendor_$i" \
    -d '[{"symbol":"EURUSD","decision":"BUY"}]' &
done
wait
```

**Target: Support 100 concurrent vendors with <200ms p95 response times** 🎯
