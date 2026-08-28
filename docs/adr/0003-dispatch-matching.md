# ADR 0003 — Dispatch: Datenmodell, Matching-Algorithmus, Statemachine

**Status:** Akzeptiert (2026-08-28)

## Kontext

Slice 6 führt das Kerngeschäft ein: eine Fahrt buchen (`Order`), einem Fahrer zuweisen
(automatisch per Umkreissuche oder manuell), und die Fahrt durch die in CONTEXT.md
definierte Statemachine führen (`REQUESTED → ... → PAID`, mit `CANCELLED`-Zweig).

Während der Planung wurde entdeckt, dass die Dev-Datenbank bereits eine `Ride`- und
`RiderProfile`-Tabelle enthielt (8 bzw. 1 Zeile, vom 14.06.2026) — ein früherer,
direkt gegen die DB gebauter Prototyp, nie in `schema.prisma`, einer Migration oder
Git erfasst. Die Daten wurden vor dem Cleanup nach
`docs/legacy-dispatch-prototype-2026-06-14.json` exportiert.

## Entscheidungen

### 1. Eigenes `Rider`-Model (nicht Inline-Felder auf `Order`)

ADR 0001 legt bereits fest, dass `Rider` plattformweit ist (kein `operatorId`) —
Inline-Felder auf `Order` hätten das stillschweigend unterlaufen. `Rider` bekommt
`id`, `name`, `phone` (unique — Dedupe-Schlüssel für `order.create`s `upsert`),
optional `stripeCustomerId`. Kein `operatorId`, keine RLS-Policy (siehe unten).

### 2. `Order` und `Ride` getrennt, gemeinsam angelegt

`Order` hält unveränderliche Buchungsdaten (Rider, Origin/Destination inkl.
Lat/Lng, gewünschte Fahrzeugklasse). `Ride` hält den veränderlichen Zustand
(Status, Fahrer, Zeitstempel pro Übergang, Storno-Grund, Zahlungsfelder).
`order.create` legt beides transaktional an (1:1 über `Ride.orderId`), da aktuell
nur On-Demand-Buchung unterstützt wird.

**Bewusst zurückgestellt:** `scheduledAt`/Vorbestellung — kein Code-Pfad braucht es,
kommt erst mit einem eigenen Vorbestell-Feature.

### 3. Matching: generierte PostGIS-Spalten statt `$queryRaw`-Schreibzugriffe

`Driver.currentLocationGeo` und `Order.originLocationGeo` sind
`GENERATED ALWAYS AS (...) STORED`-Spalten (aus `currentLat`/`currentLng` bzw.
`originLat`/`originLng`), mit GIST-Index. Die App schreibt weiterhin normale
Float-Spalten über Prisma; Postgres pflegt die Geography-Spalte automatisch. Nur
die Nearest-Neighbor-Suche selbst läuft als Raw SQL (`ST_DWithin` + `<->`-Operator),
weil Prisma PostGIS-Operatoren nicht kennt.

Radius: **15 km**, als Konstante im Code (`MATCH_RADIUS_METERS` in
`src/server/api/lib/dispatch.ts`), nicht als Env-Var — das ist ein
Business-Tuning-Wert, kein Umgebungsunterschied.

### 4. Kein `FOR UPDATE SKIP LOCKED`

Erwogen, aber verworfen: `DATABASE_URL` läuft über den Supabase Transaction
Pooler mit `connection_limit=1` (ADR 0002) — pro Prozess genau eine gepoolte
Verbindung, echte Nebenläufigkeit ist damit ohnehin nicht das Problem, das wir
lösen müssen. Stattdessen der gleiche Compare-and-Swap-Trick, der im Code schon
überall verwendet wird (`updateMany` mit Status-Guard im `where`): Finden, dann
mit `WHERE status = 'ONLINE'` beanspruchen — `count === 0` heißt, ein anderer
Prozess war schneller, Aufrufer bekommt `CONFLICT`. Korrekt unter Postgres-MVCC,
ohne zusätzliche Locking-Hinweise.

### 5. Statemachine-Guard als eigene, wiederverwendbare Funktion

Bisher gab es kein Muster dafür — `vehicle.setStatus`/`driver.setStatus` sind
uneingeschränkte Enum-Swaps. `src/server/api/lib/ride-statemachine.ts` bildet die
Transition-Map exakt nach CONTEXT.md ab und wirft `BAD_REQUEST` bei ungültigen
Sprüngen. Wird von `order.assign` (REQUESTED→ASSIGNED) und `ride.updateStatus`
(alle weiteren Übergänge) genutzt.

### 6. Fahrer-Standort: manueller Platzhalter

Es gibt noch keine Driver-App, die echte GPS-Positionen liefert. `Driver.currentLat`/
`currentLng` werden vorerst manuell im Bearbeiten-Dialog der Fahrer-Seite gepflegt.
Sobald eine Driver-App existiert, ersetzt sie das durch Live-Updates via Supabase
Realtime (siehe Techstack in CLAUDE.md) — die Datenspalten und der generierte
Geography-Index bleiben dabei unverändert.

### 7. RLS auf `Order`/`Ride`, nicht auf `Rider`

Gleiches Muster wie in Migration `20260828155736_enable_rls` (Slice 5):
`ENABLE ROW LEVEL SECURITY` + Policy auf `operatorId`-Match gegen `auth.jwt()`,
mit der gleichen bekannten Einschränkung (greift nicht gegen Prisma/`postgres`-
Rolle, siehe ADR 0001-Update). `Rider` bekommt keine Policy — hat kein
`operatorId`, ist nicht mandantenbezogen.

## Konsequenzen

**Positiv:** Matching ist real (PostGIS, nicht simuliert), Statemachine ist zentral
validiert statt an mehreren Stellen dupliziert, Fahrer-Freigabe bei
Abschluss/Storno ist automatisch (mirrored von `driver.assign`s bestehendem
Auto-Status-Muster).

**Negativ / Kosten:** Fester Radius statt konfigurierbar (bewusst — YAGNI für
einen Operator); manueller Standort-Platzhalter ist eine erkennbare Interims-
lösung, die bei der Driver-App-Slice ersetzt werden muss.
