# .claude/ — Dev-Team-Setup

Hier liegen die Rollen-Briefings und Skills, mit denen wir dieses Projekt wie ein Entwicklerteam bauen.

## Rollen-Briefings

Fachliche „Job-Beschreibungen", die Haltung & Vorgehen je Domäne festlegen. Ich (Claude) ziehe sie heran, wenn ich in der jeweiligen Rolle arbeite — entweder direkt im Hauptchat oder als Subagent.

| Datei | Rolle |
|---|---|
| `requirements-engineer.md` | Anforderungen grillen, PRDs, Issues schneiden |
| `architect.md` | Techstack, Systemdesign, ADRs |
| `backend-dev.md` | API, Datenmodell, Business-Logik, TDD |
| `frontend-dev.md` | UI, Komponenten, Prototypen, UX |
| `qa-tester.md` | Tests, Bug-Triage, Quality-Gates |
| `devops.md` | Deployments, CI/CD, Monitoring |

## Skills

`skills/` enthält die installierten [mattpocock/skills](https://github.com/mattpocock/skills) — aufrufbare Slash-Commands wie `/tdd`, `/diagnose`, `/grill-me`, `/to-prd`, `/to-issues`, `/zoom-out`, `/prototype`.

Installieren / aktualisieren:
```bash
npx skills@latest add mattpocock/skills
```

## Gemeinsame Sprache

Alle Rollen nutzen [`../CONTEXT.md`](../CONTEXT.md) als verbindliches Domänenmodell. Projektüberblick & Techstack: [`../CLAUDE.md`](../CLAUDE.md).

## So arbeiten wir

1. **Anforderungen** — Requirements-Engineer grillt den Scope (`/grill-me`), schreibt PRD (`/to-prd`).
2. **Schneiden** — in vertikale, lauffähige Slices (`/to-issues`).
3. **Bauen** — Backend/Frontend, testgetrieben (`/tdd`).
4. **Prüfen** — QA gegen Acceptance-Kriterien.
5. **Deployen** — Vercel.

Große Entscheidungen → ADR in `docs/adr/`.
