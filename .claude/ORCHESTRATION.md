# ORCHESTRATION.md - Commands from Telegram

This is how you control your AI Dev Team from your phone (Telegram).

---

## Feature Development

### Start a New Feature
```
You: "Starte Feature: Ride Request"

Team Flow:
1. Requirements Engineer grills you:
   - "Who uses this?"
   - "What's the happy path?"
   - "What breaks it?"
   
2. Creates PRD + breaks into issues
   
3. Architect reviews tech impact
   
4. Frontend/Backend/QA start work
```

### Check Status
```
You: "Status?"

Response:
- What's in progress
- What's blocked
- What needs review
- Vercel deployment status + live URL
```

### Code Review
```
You: "Review [PR link or feature name]"

Team responds:
- Architecture impact
- Test coverage
- Performance implications
- Ready to merge? Y/N
```

### Deploy to Production
```
You: "Deploy"

Team flow:
- Runs tests
- Builds app
- Deploys to Vercel
- Checks error rate
- Reports success or rollback
```

---

## During Development

### Report a Bug
```
You: "Bug: Ride request button doesn't work"

QA responds:
- Reproduces
- Severity assessment
- Assigns to team
- Tracks resolution
```

### Ask Architecture Question
```
You: "Should we use WebSocket or polling for real-time?"

Architect responds:
- Pros/cons of each
- Recommendation
- Decision recorded in ADR
```

### Review Feature
```
You: "Show me a prototype of ride request flow"

Frontend responds:
- Throwaway prototype
- Can toggle between different states
- You click to approve or request changes
```

---

## Tech Stack Decision

```
You: "What tech stack for this project?"

Architect responds:
- Asks clarifying questions
- Proposes options (Next.js vs React+Node vs other)
- Recommends based on your constraints
- Creates ADRs with decision
```

---

## Daily Standup (Optional)

```
You: "Standup?"

Team responds:
- What we completed yesterday
- What we're working on today
- Any blockers
- Risks/concerns
```

---

## Code Examples

You can also ask for code reviews:

```
You: "Review this API design"
[paste code]

Backend responds:
- Type safety issues
- Error handling
- Performance concerns
- Suggestions
```

---

## Remember

- **Be specific** — "Starte Feature: X" > "Build the app"
- **Use domain language** — "rider", "driver", "ride" (not "user", "trip")
- **One request per message** — easier to track
- **Decisions = ADRs** — big decisions get documented
- **Production only with approval** — you always decide when to ship

---

## Quick Reference

| Need | Command |
|------|---------|
| Start feature | "Starte Feature: [name]" |
| Check progress | "Status?" |
| See prototype | "Prototype: [feature]" |
| Code review | "Review [PR/feature]" |
| Deploy | "Deploy" |
| Report bug | "Bug: [description]" |
| Tech decision | "Architecture: [question]" |
| Standup | "Standup?" |
