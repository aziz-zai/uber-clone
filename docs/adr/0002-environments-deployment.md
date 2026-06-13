# ADR 0002 — Environments & Continuous Deployment (Dev/Prod-Trennung ab Tag 1)

**Status:** Akzeptiert (2026-06-13)

## Kontext

Wir wollen nicht wochenlang „nur lokal" entwickeln und am Ende feststellen, dass die App
auf Vercel (Serverless) nicht läuft. Deployment-Probleme (Env-Variablen, Connection-Pooling,
Build-Fehler) sollen pro Slice auffallen, nicht am Projektende. Gleichzeitig dürfen
Entwicklungs-Experimente niemals Produktionsdaten berühren.

## Entscheidung

1. **Jeder Slice endet deployed.** „Done" heißt: läuft auf Vercel, nicht nur auf localhost.
2. **Branch-Workflow = Environment-Trennung:**
   - Feature-Branches → Vercel **Preview-Deploys** (automatisch pro Push)
   - `master` → Vercel **Production**
   - Direkt auf `master` committen nur für Doku/Konfig; Feature-Arbeit über Branches.
3. **Zwei Datenbanken (zwei Supabase-Projekte):**
   - **Dev-DB:** aktuelles Projekt `nmoiuirarxbqrvbkzfri` — für lokale Entwicklung + Preview-Deploys
   - **Prod-DB:** eigenes Supabase-Projekt, angelegt beim ersten echten Production-Release
     (bis dahin zeigt Production ebenfalls auf die Dev-DB — vermerkt als bewusstes Provisorium)
   - Env-Zuordnung über Vercel Environment Variables (Production / Preview / Development getrennt).
4. **Serverless-tauglich von Anfang an:**
   - Prisma nutzt auf Vercel den **Supabase Transaction Pooler (Port 6543)** als `DATABASE_URL`
     (Vercel kann die Direct Connection nicht erreichen — IPv6-only) und die Direct/Session-
     Connection (5432) als `directUrl` für Migrationen.
   - Keine Konstrukte, die einen dauerlaufenden Server voraussetzen (kein eigener
     WebSocket-Server, keine In-Memory-Session) — Realtime via Supabase, State in der DB.
5. **Migrationen laufen explizit** (`prisma migrate deploy`), nicht automatisch beim Build.

## Konsequenzen

**Positiv:** Deploy-Fehler fallen pro Slice auf; Preview-URLs machen jeden Stand teilbar;
Dev-Experimente können keine Prod-Daten beschädigen; der Serverless-Zwang verhindert
Architektur, die später auf Vercel bricht.

**Negativ / Kosten:** Zweites Supabase-Projekt zu pflegen (Free Tier reicht);
Env-Variablen an drei Stellen (lokal, Preview, Production) aktuell halten;
Pooler-Eigenheiten (z. B. Prepared Statements) müssen beachtet werden.

## Prüfkriterium

Slice 1 gilt erst als fertig, wenn die Vehicles-Verwaltung auf einer
Vercel-Production-URL funktioniert.
