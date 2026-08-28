# CLAUDE.md — Uber Clone (Personentransport)

> Auto-geladen in jede Claude-Session. Kurz halten. Details liegen in den verlinkten Dateien.

## Was wir bauen

Eine Personentransport-Plattform (klassisches Ride-Hailing, **kein** Uber Eats) mit **drei Oberflächen**:

1. **Rider-App** — Endkunde bestellt Fahrten, sieht Fahrer/ETA, Verlauf, Bezahlung, Bewertung.
2. **Driver-App** — der Fahrer sieht seine Fahrten-Übersicht, nimmt Buchungen an/ab, steuert seinen Status (online/offline/busy).
3. **Operator-Portal** (B2B, Admin) — der Betreiber (Unternehmer) verwaltet Fahrzeuge, Fahrer/Mitarbeiter, Fahrten und Aufträge; Dispatch, Auslastung, Abrechnung — inkl. eigener Subunternehmen/Teams. Analog zu Ubers Fleet-/Supplier-Portal.

**MVP-Fokus: Operator-Portal zuerst** (CRUD-lastig, weniger Realtime/Karten-Komplexität am Start), danach Rider-App, danach Driver-App.

Domänenmodell & Workflows: siehe [CONTEXT.md](./CONTEXT.md).

## Techstack

- **Next.js (App Router) + TypeScript** — eine Codebase für alle drei Oberflächen (Route-Gruppen `(operator)` / `(rider)` / `(driver)`).
- **tRPC** — typsichere API (ideal fürs CRUD-lastige Portal).
- **Prisma** — ORM + Migrations.
- **Postgres + PostGIS** via **Supabase** — Geo-Suche („nächsten freien Fahrer finden") nativ.
- **Supabase Realtime** — Live-Fahrer-Position & Ride-Status (füllt Vercels WebSocket-Lücke).
- **Supabase Auth** — Rollen: `rider` / `driver` / `operator_admin`.
- **Mapbox** (oder Google Maps) — Karten.
- **Tailwind CSS + shadcn/ui** — UI. Komponenten via `npx shadcn@latest add <component>` ins Repo kopieren; DataTable + Form (react-hook-form + Zod) sind der Standard für CRUD-Views.
- **Hosting: Vercel** — Feature-Branches = Preview-Deploys, `master` = Production. Jeder Slice endet deployed; Dev-/Prod-DB getrennt. Details: ADR 0002.

Architektur-Entscheidungen werden als ADR in `docs/adr/NNNN-titel.md` festgehalten.

## Arbeitsweise

- **Vertical Slices** — jedes Slice ist end-to-end lauffähig und deploybar.
- **TDD** wo sinnvoll (Skill `/tdd`).
- **Domain-Sprache** konsequent nutzen (Rider, Driver, Vehicle, Ride, Operator — nicht „User"/„Trip").
- Rollen-Briefings (Architect, Backend, Frontend, QA, …) liegen in `.claude/`.
- Skills (mattpocock) liegen in `.claude/skills/`.

## UI-Prinzipien

- **Mobile-first & immer responsive** — jede neue UI-Komponente muss auf mobilen Viewports (≥ 320px) funktionieren. Sidebar auf Mobile: Drawer/Overlay statt fest links. Tabellen auf Mobile: horizontal scrollbar oder Card-Layout. Kein hartes `w-56` ohne responsive Fallback.
- **Dark/Light Mode** — Theme folgt dem OS (`next-themes`, `enableSystem`). Alle Farben über CSS-Variablen (`--background`, `--foreground`, etc.), nie hardcodierte Hex-Werte in Komponenten.
- **Design-System: shadcn/ui + Tailwind 4** — Komponenten via `npx shadcn@latest add <name>`. Eigene Farben nur über die definierten Token in `globals.css` (Primary = Blue, Secondary = Slate, Accent = Cyan).
- **Font: Geist** (via `next/font`) mit `-webkit-font-smoothing: antialiased` auf dem Body.

## Projekt-Infra

- Repo: `github.com/aziz-zai/uber-clone` (Branch `master`)
- Vercel: `azizzais-projects/workspace`
- Secrets nur in `.env.local` (gitignored) bzw. Vercel-Dashboard — nie committen.

## Aktueller Stand & nächster Schritt

**Entschieden:**
- MVP-Fokus: **Operator-Portal zuerst**, danach Rider-App.
- **Multi-tenant-ready** von Anfang an: `operator_id` überall + Row-Level-Security (Supabase RLS). ADR noch zu schreiben.
- Erster Slice: **Vehicles CRUD** im Operator-Portal (anlegen, Liste, bearbeiten, Status) — beweist den ganzen Stack end-to-end.

**Erledigt (2026-06-13):** Workspace aufgeräumt & committet; T3-App gescaffoldet (Next 15, tRPC 11, Prisma 6, Tailwind 4, Postgres — Typecheck & Build grün); ADR `docs/adr/0001-multi-tenancy.md` geschrieben.

**Nächster Schritt (noch offen):**
1. Supabase-Projekt anlegen (User), `DATABASE_URL` in `.env`, PostGIS-Extension aktivieren.
2. **Slice 1: Vehicles CRUD** testgetrieben bauen (`/tdd`) — Done-Kriterium inkl. Tenant-Isolations-Test (siehe ADR 0001).

> Hinweis: **Claude Fable 5** existiert (Anthropics fähigstes Modell, Claude-5-Familie) und ist als Default-Modell in Claude Code gesetzt. Weitere verfügbare Modelle: Opus 4.8 / Sonnet 4.6 / Haiku 4.5.
