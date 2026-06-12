# CLAUDE.md — Uber Clone (Personentransport)

> Auto-geladen in jede Claude-Session. Kurz halten. Details liegen in den verlinkten Dateien.

## Was wir bauen

Eine Personentransport-Plattform (klassisches Ride-Hailing, **kein** Uber Eats) mit **zwei Oberflächen**:

1. **Rider-App** — Endkunde bestellt Fahrten, sieht Fahrer/ETA, Verlauf, Bezahlung, Bewertung.
2. **Operator-Portal** (B2B, Admin) — der Betreiber des Transportunternehmens verwaltet Fahrzeuge, Fahrer/Mitarbeiter, Fahrten und Aufträge; Dispatch, Auslastung, Abrechnung. Analog zu Ubers Fleet-/Supplier-Portal.

**MVP-Fokus: Operator-Portal zuerst** (CRUD-lastig, weniger Realtime/Karten-Komplexität am Start), danach Rider-App.

Domänenmodell & Workflows: siehe [CONTEXT.md](./CONTEXT.md).

## Techstack

- **Next.js (App Router) + TypeScript** — eine Codebase für beide Oberflächen (Route-Gruppen `(operator)` / `(rider)`).
- **tRPC** — typsichere API (ideal fürs CRUD-lastige Portal).
- **Prisma** — ORM + Migrations.
- **Postgres + PostGIS** via **Supabase** — Geo-Suche („nächsten freien Fahrer finden") nativ.
- **Supabase Realtime** — Live-Fahrer-Position & Ride-Status (füllt Vercels WebSocket-Lücke).
- **Supabase Auth** — Rollen: `rider` / `driver` / `operator_admin`.
- **Mapbox** (oder Google Maps) — Karten.
- **Tailwind CSS** — UI.
- **Hosting: Vercel** (Auto-Deploy auf `master`).

Architektur-Entscheidungen werden als ADR in `docs/adr/NNNN-titel.md` festgehalten.

## Arbeitsweise

- **Vertical Slices** — jedes Slice ist end-to-end lauffähig und deploybar.
- **TDD** wo sinnvoll (Skill `/tdd`).
- **Domain-Sprache** konsequent nutzen (Rider, Driver, Vehicle, Ride, Operator — nicht „User"/„Trip").
- Rollen-Briefings (Architect, Backend, Frontend, QA, …) liegen in `.claude/`.
- Skills (mattpocock) liegen in `.claude/skills/`.

## Projekt-Infra

- Repo: `github.com/aziz-zai/uber-clone` (Branch `master`)
- Vercel: `azizzais-projects/workspace`
- Secrets nur in `.env.local` (gitignored) bzw. Vercel-Dashboard — nie committen.

## Aktueller Stand & nächster Schritt

**Entschieden:**
- MVP-Fokus: **Operator-Portal zuerst**, danach Rider-App.
- **Multi-tenant-ready** von Anfang an: `operator_id` überall + Row-Level-Security (Supabase RLS). ADR noch zu schreiben.
- Erster Slice: **Vehicles CRUD** im Operator-Portal (anlegen, Liste, bearbeiten, Status) — beweist den ganzen Stack end-to-end.

**Erledigt:** Workspace aufgeräumt (Companion-OS-Ballast raus), `CLAUDE.md`/`CONTEXT.md` neu, mattpocock-Skills installiert.

**Nächster Schritt (noch offen):**
1. Aufgeräumtes Fundament **committen** (noch nicht passiert).
2. `create-t3-app` scaffolden + Supabase/Prisma/PostGIS einrichten.
3. ADR `docs/adr/0001-multi-tenancy.md` schreiben.
4. **Slice 1: Vehicles CRUD** testgetrieben bauen (`/tdd`).

> Hinweis: **Claude Fable 5** existiert (Anthropics fähigstes Modell, Claude-5-Familie) und ist als Default-Modell in Claude Code gesetzt. Weitere verfügbare Modelle: Opus 4.8 / Sonnet 4.6 / Haiku 4.5.
