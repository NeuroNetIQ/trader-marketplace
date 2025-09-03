# ML Marketplace Implementation Plan

> **Copy-paste commands and code for immediate execution by each team**

## 🚀 **IMMEDIATE ACTIONS (Next 2 Hours)**

### **1. Contracts Team - Publish Packages**

```bash
cd /Users/mark/Documents/Trader/trader-marketplace

# Verify build works
pnpm build

# Set npm token in environment
export NPM_TOKEN=your_npm_token

# Publish contracts package
cd packages/marketplace-contracts
npm publish --access public

# Publish CLI package  
cd ../marketplace-cli
npm publish --access public

# Verify packages are live
npm info @neuronetiq/marketplace-contracts
npm info @neuronetiq/marketplace-cli
```

### **2. Infrastructure Team - Add to Existing Infra Repo**

**Copy these files to your Infrastructure repo:**

**A. Database Migration**
```bash
# Create file: supabase/migrations/20250102_marketplace.sql
```
```sql
-- Copy the SQL from TEAM_IMPLEMENTATION_GUIDE.md section 1
-- Add marketplace tables: marketplace_vendors, training_runs, dataset_rounds, deployment_tokens
```

**B. Middleware**
```bash
# Create file: src/middleware/marketplaceAuth.ts
```
```typescript
// Copy the marketplaceAuth middleware from the guide
// Implements token introspection with 60-second caching
```

**C. API Routes**
```bash
# Create file: src/routes/marketplace.ts
```
```typescript
// Copy the marketplace router from the guide
// Includes /api/catalog, /api/rounds/current, /api/datasets/signed-urls, /api/training/runs
```

**D. Update Main Server**
```typescript
// In your existing src/server.ts or src/app.ts
import marketplaceRouter from './routes/marketplace';
app.use(marketplaceRouter);
```

### **3. Frontend Team - Add to Existing trader-frontend**

**Copy these pages to your Frontend repo:**

**A. Marketplace Navigation**
```bash
# Update src/lib/nav-model.ts
```
```typescript
// Add marketplace section:
{
  title: "Marketplace",
  icon: Store,
  href: "/marketplace",
  items: [
    { title: "Catalog", href: "/marketplace" },
    { title: "Vendor Console", href: "/marketplace/vendor" },
    { title: "Documentation", href: "/marketplace/docs" },
  ]
}
```

**B. Marketplace Pages**
```bash
# Create directory: src/app/marketplace/
# Copy all the page components from TEAM_IMPLEMENTATION_GUIDE.md section 2
```

### **4. ML Team - Install and Test**

```bash
# Install CLI globally
npm install -g @neuronetiq/marketplace-cli

# Test CLI
mp --help
mp data --help
mp train --help

# Test with your existing ML infrastructure
mp login --api-url http://localhost:3010  # Point to your Infra
mp data list
mp data info --round current
```

---

## 📅 **WEEK 1 SPRINT PLAN**

### **Day 1 - Foundation**
- [ ] **Contracts**: Packages published to npm
- [ ] **Infrastructure**: Database schema deployed
- [ ] **Frontend**: Marketplace navigation added
- [ ] **ML**: CLI installed and tested

### **Day 2 - Authentication**  
- [ ] **Infrastructure**: Token introspection middleware working
- [ ] **Frontend**: Vendor login/registration pages
- [ ] **ML**: Authentication workflow tested
- [ ] **All**: Doppler secrets configured

### **Day 3 - Data Pipeline**
- [ ] **Infrastructure**: Dataset rounds and signed URLs working
- [ ] **Frontend**: Dataset management pages
- [ ] **ML**: Data download workflow tested
- [ ] **Contracts**: Training schemas validated

### **Day 4 - Training Integration**
- [ ] **Infrastructure**: Training run API endpoints
- [ ] **Frontend**: Training management UI
- [ ] **ML**: Training workflow end-to-end
- [ ] **All**: RunPod integration tested

### **Day 5 - Deployment & Live Trading**
- [ ] **Infrastructure**: Deployment token issuance
- [ ] **Frontend**: Deployment management UI
- [ ] **ML**: Inference deployment tested
- [ ] **All**: Live trading integration verified

---

## 🧪 **TESTING PROTOCOL**

### **Integration Tests (Run Daily)**

```bash
# 1. Package installation
npm install -g @neuronetiq/marketplace-cli@latest
mp --version

# 2. Authentication
mp login --api-url $INFRA_BASE_URL

# 3. Data access  
mp data list
mp data pull --round current

# 4. Training
mp train start --task signal --round current --hp lr=0.001

# 5. Deployment
mp init --template runpod-signal-http
mp deploy --provider runpod

# 6. Live integration
mp link-infra --signals-url $INFRA_BASE_URL/api/signals/store

# 7. Verify in Frontend
curl $FRONTEND_URL/marketplace
curl $INFRA_BASE_URL/api/catalog
```

### **Performance Benchmarks**

| Endpoint | Target | Test Command |
|----------|--------|--------------|
| `/api/catalog` | <100ms | `curl -w "%{time_total}" $API/catalog` |
| `/api/rounds/current` | <200ms | `curl -w "%{time_total}" $API/rounds/current` |
| Token introspection | <50ms | Internal middleware timing |
| Training job creation | <5s | `mp train start --task signal` |

---

## 🚨 **BLOCKERS & ESCALATION**

### **Critical Path Dependencies:**

1. **NPM Publishing** → All teams need published packages
2. **Infrastructure Auth** → Frontend and ML teams blocked without this
3. **Database Schema** → All data operations depend on this
4. **Doppler Secrets** → Authentication won't work without proper secrets

### **Escalation Process:**

| Issue | Escalate To | Timeline |
|-------|-------------|----------|
| Package publishing fails | Contracts Team Lead | Immediate |
| Authentication not working | Infrastructure Team Lead | 2 hours |
| Frontend pages not loading | Frontend Team Lead | 4 hours |
| ML integration broken | ML Team Lead | 4 hours |

### **Daily Checkpoints:**

**9 AM**: Each team reports progress and blockers
**5 PM**: Demo working functionality  
**Blockers**: Escalate immediately via Slack

---

## ✅ **DEFINITION OF DONE**

### **End-to-End Success Criteria:**

1. **External Developer Experience:**
   ```bash
   npm install -g @neuronetiq/marketplace-cli
   mp login
   mp data pull --round current
   mp train start --task signal
   mp deploy --provider runpod
   mp link-infra
   ```

2. **Frontend Integration:**
   - [ ] Marketplace pages accessible at `/marketplace/*`
   - [ ] Vendor console shows training runs and deployments
   - [ ] Live trading pages show vendor attribution badges
   - [ ] All UI components use existing SSOT design system

3. **Infrastructure Integration:**
   - [ ] Marketplace auth middleware working
   - [ ] Training API endpoints responding
   - [ ] Token introspection with caching
   - [ ] Vendor signals writing to database with attribution

4. **Security Compliance:**
   - [ ] No plaintext tokens in logs
   - [ ] All secrets managed via Doppler
   - [ ] Rate limiting on all vendor endpoints
   - [ ] Scoped tokens working correctly

### **Launch Readiness:**

- [ ] All packages published to npm
- [ ] Infrastructure deployed and tested
- [ ] Frontend pages live and functional
- [ ] ML team successfully using CLI
- [ ] External developer documentation complete
- [ ] Security review passed
- [ ] Performance benchmarks met

**Target: Complete implementation in 5 days, ready for external developer beta in 2 weeks** 🎯

---

## 📞 **SUPPORT CONTACTS**

- **Marketplace Architecture**: @NeuroNetIQ
- **Infrastructure Issues**: Infrastructure Team Lead
- **Frontend Integration**: Frontend Team Lead  
- **ML Pipeline**: ML Team Lead
- **Package Publishing**: Contracts Team Lead

**Slack Channels:**
- `#marketplace-integration` - Daily coordination
- `#marketplace-blockers` - Urgent issues only
- `#marketplace-demo` - Share progress and screenshots
