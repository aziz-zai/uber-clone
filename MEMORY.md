# MEMORY.md - Aziz's AI Development Assistant

## Active Projects

### Uber Clone
- **Repo:** https://github.com/aziz-zai/uber-clone.git
- **Status:** ✅ FULLY CONFIGURED
- **Branch:** master → auto-deploys via Vercel
- **Vercel Project:** azizzais-projects/workspace
- **Tech Stack:** (To be decided - start with Architect)
- **Access:** GitHub PAT + Vercel Token in .env
- **Credentials:** Secure, not committed

**FROM TELEGRAM — Dev Team Commands:**
- "Starte Feature: [name]" → Requirements Engineer grills you → PRD created → Issues broken down
- "Architecture: [question]" → Architect proposes tech decisions + ADRs
- "Prototype: [feature]" → Frontend builds throwaway prototype
- "Status?" → Team gives update on progress, blockers, live URL
- "Deploy" → DevOps runs CI/CD → Deploys to Vercel → Reports success
- "Code Review: [PR]" → Team reviews architecture, tests, performance
- "Bug: [description]" → QA triages, assigns severity, tracks fix
- "Standup?" → Daily status (optional)

**Team Structure:**
```
You (Telegram) orchestrate
├─ Requirements Engineer (.claude/requirements-engineer.md)
├─ Architect (.claude/architect.md)
├─ Backend Dev (.claude/backend-dev.md)
├─ Frontend Dev (.claude/frontend-dev.md)
├─ QA Tester (.claude/qa-tester.md)
└─ DevOps (.claude/devops.md)
```

**Auto-Deploy Flow:**
```
You (Telegram) → "Deploy" → GitHub → Vercel auto-builds → Live URL + monitoring
```

---

## Setup Completed ✅

### 1. Git + GitHub
- ✅ Local repo initialized
- ✅ GitHub remote connected
- ✅ First commit pushed
- ✅ Tokens in .env (secure)

### 2. Vercel Deployment
- ✅ Vercel CLI linked
- ✅ GitHub integration connected
- ✅ Auto-deploy on push enabled
- ✅ Project: azizzais-projects/workspace

### 3. Claude Instructions (.claude/ folder)
- ✅ CONTEXT.md — Shared domain language
- ✅ requirements-engineer.md — Grill + PRD workflow
- ✅ architect.md — Tech decisions + ADRs
- ✅ backend-dev.md — TDD + API design
- ✅ frontend-dev.md — Prototypes + components
- ✅ qa-tester.md — Testing + bug triage
- ✅ devops.md — CI/CD + deployments
- ✅ ORCHESTRATION.md — Commands from Telegram

### 4. Claude Max API Proxy (Ready to activate)
- ✅ `npm install -g claude-max-api-proxy`
- ⏳ Requires: Claude Code CLI authenticated with subscription
- ⏳ Once set up: `claude-max-api` → runs on localhost:3456
- ⏳ Then: OpenClaw points to proxy instead of Anthropic API

---

## Next: Claude Code CLI Setup

To use your **Claude Subscription** ($200/month) instead of API tokens:

```bash
# 1. Install Claude Code CLI (if not already installed)
# https://claude.ai/download

# 2. Authenticate with your subscription
claude --version  # Should show version + auth status

# 3. Start proxy
claude-max-api
# Now running at http://localhost:3456/v1

# 4. OpenClaw will use it automatically (when you set config)
```

Until then, OpenClaw uses your Anthropic API key (pay-per-token).

---

## Communication Style
- Aziz: Direct, action-oriented, controls from phone
- Prefers specific commands (see ORCHESTRATION.md)
- Decisions from Telegram drive whole team
- All work tracked in GitHub + deployed via Vercel

---

## Communication Style
- Aziz: Direct, action-oriented
- Prefers concise updates
- Controls project from phone via Telegram
