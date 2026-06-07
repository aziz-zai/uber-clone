# Claude Instructions — AI Dev Team

This folder contains **Claude instructions** for each role in your dev team. Each agent gets one file as their "job description."

---

## Files

| File | Role | Purpose |
|------|------|---------|
| `ORCHESTRATION.md` | You (Aziz) | How to command the team from Telegram |
| `requirements-engineer.md` | Requirements | Grill sessions, PRDs, issue breakdown |
| `architect.md` | Architecture | Tech stack, system design, ADRs |
| `backend-dev.md` | Backend | APIs, databases, business logic, TDD |
| `frontend-dev.md` | Frontend | UI, components, prototypes, UX |
| `qa-tester.md` | QA | Testing, bug triage, quality gates |
| `devops.md` | DevOps | Deployments, CI/CD, monitoring |

---

## How to Use

### Single-Agent Mode (Recommended to start)
Run Claude and load the instructions:

```
You: "Load .claude/requirements-engineer.md"
Claude: "Loaded. I'm your Requirements Engineer."

You: "Starte Feature: Ride Booking"
Claude: [Grills you on requirements]
```

### Multi-Agent Mode (Future)
When spawning sub-agents:

```
Main Session (You)
├─ Sub-agent 1: requirements-engineer.md
├─ Sub-agent 2: architect.md
├─ Sub-agent 3: backend-dev.md
├─ Sub-agent 4: frontend-dev.md
├─ Sub-agent 5: qa-tester.md
└─ Sub-agent 6: devops.md
```

Each agent specializes in their domain.

---

## Shared Language

All agents use `CONTEXT.md` to understand:
- Domain model (Ride, Driver, Rider, Location)
- Key workflows (ride request → matching → completion)
- Technical jargon (Materialization, Matching Algorithm, etc.)

---

## Architecture Decisions

Major decisions get recorded in `docs/adr/`:
- Why we chose tech stack
- How real-time will work
- Payment integration approach
- etc.

---

## Getting Started

1. **Define Tech Stack** → Ask Architect
2. **Create Context** → Add to CONTEXT.md
3. **Start Feature 1** → Requirements Engineer grills you
4. **Break into slices** → Backend/Frontend/QA execute
5. **Deploy** → DevOps handles it

---

## Tips

- **Be specific in requests** — "Starte Feature: Ride Booking" > "Build the app"
- **Use domain terms** — Look at CONTEXT.md for the shared language
- **Document decisions** — ADRs keep everyone aligned
- **Test-driven** — Backend/Frontend start with failing tests
- **Vertical slices** — Each slice is shippable, deployable

---

## OpenClaw Integration

These instructions work best with OpenClaw because:
- Spawning sub-agents for each role (parallel development)
- Telegram orchestration from your phone
- Git + Vercel auto-deployment
- claude-max-api-proxy for subscription usage

---

## Next Steps

1. Load `architect.md` and decide on tech stack
2. Update `CONTEXT.md` with domain model
3. Start first feature with `requirements-engineer.md`
4. Commit everything to git
