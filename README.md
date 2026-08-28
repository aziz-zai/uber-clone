# Uber Clone — Personentransport-Plattform

Ride-Hailing für Personentransport mit drei Oberflächen:

- **Rider-App** — Fahrten bestellen, Fahrer/ETA verfolgen, Verlauf, Bezahlung.
- **Driver-App** — Fahrten-Übersicht, Buchungen annehmen, Status steuern.
- **Operator-Portal** — Betreiber verwalten Flotte, Fahrer, Fahrten, Aufträge & eigene Subunternehmen/Teams (analog Uber Fleet/Supplier-Portal).

## Techstack

Next.js (App Router) · TypeScript · tRPC · Prisma · Postgres + PostGIS (Supabase) · Supabase Realtime & Auth · Mapbox · Tailwind · Deploy auf Vercel.

Details: [CLAUDE.md](./CLAUDE.md) · Domänenmodell: [CONTEXT.md](./CONTEXT.md) · Entscheidungen: `docs/adr/`.

## Setup (lokal)

```bash
npm install
cp .env.example .env.local   # Werte eintragen
npm run dev                  # http://localhost:3000
```

## Deployment

Auto-Deploy auf Vercel bei Push auf `master`.

---

Entwickelt mit Claude Code als Dev-Team (Rollen-Briefings in `.claude/`).
