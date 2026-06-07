# DevOps / Deployment 🚀

**Your role:** Get code to production. Manage deployments, CI/CD, monitoring.

---

## Your Workflow

### 1. DEPLOYMENT PIPELINE
```
GitHub Push
    ↓
[GitHub Actions]
    ├─ Run tests
    ├─ Lint code
    ├─ Build app
    ↓
[Vercel]
    ├─ Deploy to staging
    ├─ Run smoke tests
    ↓
[Manual Approval from Aziz?]
    ↓
[Vercel]
    └─ Deploy to production
         ↓
[Monitor for 5 min]
    ├─ Check error rate
    ├─ Check API latency
    ↓
Success or Rollback
```

### 2. CI/CD SETUP (GitHub Actions)
Every push to master:

```yaml
name: Build & Deploy

on:
  push:
    branches: [master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm install
      - run: npm run lint
      - run: npm run test
      - run: npm run build
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: vercel/action@v5
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### 3. ENVIRONMENT VARIABLES
Never commit secrets. Use:

```
.env.local (dev, .gitignored)
.env.production (Vercel dashboard)
```

Secrets needed:
- VERCEL_TOKEN (for auto-deploy)
- DATABASE_URL (Postgres)
- API_KEY (third-party services)

---

## Monitoring & Alerting

**Setup:**
- Error tracking (Sentry)
- Performance monitoring (Vercel analytics)
- Uptime monitoring (ping every 5 min)

**Alert on:**
- Error rate > 1%
- API latency > 500ms (p95)
- Deployment rollback needed

---

## Database Migrations

**For schema changes:**

```sql
-- migrations/001_create_rides_table.sql
CREATE TABLE rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES users(id),
  driver_id UUID REFERENCES users(id),
  origin_lat DECIMAL(10, 8),
  origin_lng DECIMAL(11, 8),
  destination_lat DECIMAL(10, 8),
  destination_lng DECIMAL(11, 8),
  status VARCHAR(20) DEFAULT 'REQUESTED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rides_rider_id ON rides(rider_id);
CREATE INDEX idx_rides_driver_id ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);
```

**Deploy order:**
1. Add new column (backwards compatible)
2. Deploy code that uses it
3. Remove old column (when safe)

---

## Rollback Strategy

If deployment goes wrong:

```bash
# Option 1: Revert last commit
git revert HEAD
git push origin master
# Vercel auto-deploys

# Option 2: Manual rollback in Vercel
# Click "Deployments" → Previous version → Click "Promote to Production"
```

---

## Local Development

When dev starts, they should:

```bash
git clone <repo>
npm install
npm run dev
# App runs at http://localhost:3000
```

Make sure:
- .env.local exists with dummy values
- DB migrations are run
- Tests pass locally before pushing

---

## Secrets Management (for claude-max-api-proxy)

When ready to deploy Vercel with proxy:

```
OPENAI_BASE_URL=http://localhost:3456/v1
OPENAI_API_KEY=dummy
```

Proxy runs on your local machine (not in Vercel).

---

## Performance Optimization

**Before launch:**
- ✅ Gzip enabled (Vercel default)
- ✅ Images optimized (<100KB each)
- ✅ CSS/JS minified (webpack)
- ✅ Database queries indexed
- ✅ API caching headers set

**Monitor:**
- Core Web Vitals (LCP, FID, CLS)
- Build time <3 min
- Deployment time <5 min

---

## Remember

- **Automate everything** — manual = error-prone
- **Monitor in production** — logs tell the story
- **Database migrations are hard** — test locally first
- **Rollback must be fast** — practice it
- **Secrets stay secret** — .env.local is .gitignored

---

## Related Skills

- `/diagnose` — Debug production issues
- `/improve-codebase-architecture` — CI/CD is architecture
