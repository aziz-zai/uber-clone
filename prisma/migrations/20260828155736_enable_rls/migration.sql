-- Row-Level-Security (ADR 0001) als Sicherheitsnetz zusaetzlich zum App-Layer-Filter
-- (operatorId in jeder Prisma-Query, siehe src/server/api/routers/*.ts).
--
-- WICHTIG: Prisma verbindet ueber die "postgres"-Rolle (Table-Owner) und umgeht RLS
-- damit standardmaessig (Table-Owner-Bypass in Postgres). Diese Policies greifen also
-- (noch) nicht gegen tRPC-Requests, sondern erst, sobald ein Pfad ueber den
-- Supabase-Client mit der "authenticated"-Rolle laeuft (z.B. spaeter Realtime).
-- Volle Durchsetzung auch gegen Prisma braucht eine eigene unprivilegierte DB-Rolle
-- fuer DATABASE_URL + FORCE ROW LEVEL SECURITY -- bewusst zurueckgestellt.

ALTER TABLE "Operator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Driver" ENABLE ROW LEVEL SECURITY;

-- Operator: operator_admin sieht/aendert nur die eigene Mandanten-Zeile.
-- Insert laeuft ausschliesslich ueber den Service-Role-Client (Registrierung,
-- src/app/register/actions.ts) und damit ausserhalb von RLS.
CREATE POLICY "operator_select_own" ON "Operator"
    FOR SELECT
    USING (id = (auth.jwt() -> 'app_metadata' ->> 'operator_id'));

CREATE POLICY "operator_update_own" ON "Operator"
    FOR UPDATE
    USING (id = (auth.jwt() -> 'app_metadata' ->> 'operator_id'))
    WITH CHECK (id = (auth.jwt() -> 'app_metadata' ->> 'operator_id'));

-- Vehicle: volle Tenant-Isolation ueber operatorId.
CREATE POLICY "vehicle_operator_isolation" ON "Vehicle"
    FOR ALL
    USING ("operatorId" = (auth.jwt() -> 'app_metadata' ->> 'operator_id'))
    WITH CHECK ("operatorId" = (auth.jwt() -> 'app_metadata' ->> 'operator_id'));

-- Driver: volle Tenant-Isolation ueber operatorId.
CREATE POLICY "driver_operator_isolation" ON "Driver"
    FOR ALL
    USING ("operatorId" = (auth.jwt() -> 'app_metadata' ->> 'operator_id'))
    WITH CHECK ("operatorId" = (auth.jwt() -> 'app_metadata' ->> 'operator_id'));
