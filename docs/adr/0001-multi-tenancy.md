# ADR 0001 — Multi-Tenancy von Anfang an (operator_id + Supabase RLS)

**Status:** Akzeptiert (2026-06-13)

## Kontext

Die Plattform bedient Transportunternehmen (**Operator** = Mandant/Tenant). Auch wenn das MVP
zunächst mit einem einzigen Operator startet, ist das Geschäftsmodell B2B: mittelfristig sollen
mehrere Operatoren dieselbe Plattform nutzen, ohne gegenseitig Daten zu sehen.

Mandantentrennung nachträglich einzuziehen ist eine der teuersten Migrationen überhaupt — jede
Tabelle, jede Query, jede API-Route und jedes Auth-Konzept müsste angefasst werden.

## Entscheidung

1. **Shared Database, Shared Schema** — alle Operatoren in einer Postgres-Datenbank (Supabase),
   keine DB- oder Schema-pro-Tenant-Trennung.
2. **`operator_id` auf jeder mandantenbezogenen Tabelle** (Vehicle, Driver, Ride, Order, Shift, …)
   als Pflicht-Fremdschlüssel auf `Operator`. Rider sind plattformweit (kein `operator_id`),
   da Endkunden potenziell bei mehreren Operatoren buchen.
3. **Row-Level Security (Supabase RLS)** als Durchsetzungsebene in der Datenbank: Policies
   filtern pro Tabelle auf den `operator_id` aus dem JWT (Custom Claim). Die Anwendung
   (tRPC-Procedures) filtert *zusätzlich* — RLS ist das Sicherheitsnetz, nicht die einzige Hürde.
4. **Auth-Rollen** via Supabase Auth: `rider`, `driver`, `operator_admin`. Driver und
   `operator_admin` tragen ihren `operator_id` als Claim.

## Konsequenzen

**Positiv**
- Mandantenfähigkeit kostet jetzt fast nichts (eine Spalte + Policy pro Tabelle), spart später eine Großmigration.
- Defense in depth: selbst ein fehlerhafter tRPC-Filter leakt keine Fremddaten, weil RLS in der DB greift.
- Eine Datenbank → einfaches Hosting, einfache Migrations, PostGIS-Queries über alle Tenants möglich (z. B. internes Monitoring).

**Negativ / Kosten**
- Jede Tabelle und jede Query trägt `operator_id` mit — etwas Boilerplate in Schema und Tests.
- RLS-Policies müssen pro Tabelle gepflegt und getestet werden (Test pro Slice: „Operator A sieht Operator B nicht").
- Prisma umgeht RLS, wenn es mit dem Service-Role-Key verbindet → Verbindungs-Setup muss bewusst gewählt werden
  (Connection mit `request.jwt.claims` bzw. Supabase-Client für RLS-relevante Pfade; dokumentieren im Slice 1).

**Verworfene Alternativen**
- *Single-Tenant, später migrieren:* billiger heute, sehr teuer später; verworfen.
- *Schema/DB pro Tenant:* maximale Isolation, aber Migrations- und Betriebsaufwand pro Tenant; für unsere Größenordnung Overkill.

## Prüfkriterium

Slice 1 (Vehicles CRUD) gilt erst als fertig, wenn ein Test nachweist, dass ein
`operator_admin` von Operator A keine Vehicles von Operator B lesen oder ändern kann.

## Update (2026-08-28) — RLS aktiviert, mit bekannter Einschränkung

`ENABLE ROW LEVEL SECURITY` + Policies (auf `operator_id`-Match via `auth.jwt()`) sind für
Operator/Vehicle/Driver live (Migration `20260828155736_enable_rls`). **Bewusst ohne**
`FORCE ROW LEVEL SECURITY`: `DATABASE_URL` verbindet als `postgres`-Rolle, die als
Table-Owner RLS standardmäßig umgeht — die Policies greifen aktuell also nicht gegen
Prisma/tRPC-Queries (die App-Layer-Filterung + ihre Tests bleiben der eigentliche Schutz),
sondern erst gegen künftige Pfade über den Supabase-Client mit der `authenticated`-Rolle
(z. B. Realtime). Volle Durchsetzung auch gegen Prisma würde eine eigene unprivilegierte
DB-Rolle für `DATABASE_URL` plus `FORCE ROW LEVEL SECURITY` erfordern — zurückgestellt,
bis ein Feature das tatsächlich braucht.
