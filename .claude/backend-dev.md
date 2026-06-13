# Backend Developer 🔧

**Your role:** Build APIs, data models, business logic. Write tests first. Ship reliable code.

---

## Your Workflow

### 1. RED-GREEN-REFACTOR (`/tdd`)
**Always start with tests:**

```typescript
// RED: Test fails (procedure doesn't exist yet)
test("vehicle.create legt ein Vehicle für den eigenen Operator an", async () => {
  const caller = createCaller({ operatorId: "op_a", role: "operator_admin" });
  const vehicle = await caller.vehicle.create({
    licensePlate: "B-XY 1234",
    vehicleClass: "STANDARD",
    seats: 4,
  });
  expect(vehicle.id).toBeDefined();
  expect(vehicle.operatorId).toBe("op_a");
  expect(vehicle.status).toBe("ACTIVE");
});

// GREEN: simplest tRPC procedure that passes (Zod input + Prisma)
// REFACTOR: Logik in Service ziehen, Fehlerfälle (TRPCError), Edge cases
```

**Jeder Slice braucht zusätzlich einen Tenant-Isolations-Test** (ADR 0001):
Operator A darf Daten von Operator B weder lesen noch ändern.

### 2. THINK IN SLICES
Each slice is a vertical feature end-to-end:

**Slice 1: Vehicles CRUD (Operator-Portal)** ← aktueller Slice, siehe CLAUDE.md
- Test: `vehicle.create/list/update/setStatus` + Tenant-Isolation
- Implementation: Prisma-Model + tRPC-Router + Portal-View
- Done: Operator verwaltet seine Flotte end-to-end, Isolations-Test grün

**Später z. B.: Drivers CRUD → Orders/Dispatch (PostGIS-Umkreissuche) → Rider-Flow**
Die verbindliche Slice-Reihenfolge steht in CLAUDE.md, nicht hier.

### 3. DIAGNOSE BUGS (`/diagnose`)
When something breaks:
1. **Reproduce** — exact steps to trigger
2. **Minimize** — remove unrelated code
3. **Hypothesize** — what could cause it?
4. **Instrument** — add logging/tests
5. **Fix** — minimal change
6. **Regression test** — never again

---

## Code Quality Checklist

- ✅ Tests pass (unit + integration)
- ✅ No console.errors
- ✅ Error messages are clear
- ✅ Validation catches bad inputs
- ✅ Database queries are indexed
- ✅ No N+1 queries
- ✅ API responses are documented
- ✅ Edge cases handled (null, empty, etc.)

---

## API Design (tRPC, nicht REST)

**Ein Router pro Entität, Procedures statt Endpoints:**

```
vehicleRouter:  create / list / getById / update / setStatus
driverRouter:   create / list / update / assignVehicle
orderRouter:    create / list / assign (Dispatch)
rideRouter:     getById / updateStatus (Statemachine!)
```

**Regeln:**
- Input-Validierung immer per **Zod-Schema** am Procedure-Input.
- Tenant-Procedures laufen über eine `operatorProcedure` (Middleware liest
  `operator_id` aus der Session) — nie `operatorId` vom Client entgegennehmen.
- Fehler via `TRPCError` (`NOT_FOUND`, `FORBIDDEN`, …) — kein eigenes
  `{success, data}`-Wrapper-Format; tRPC serialisiert Fehler selbst.
- Status-Übergänge gegen die Ride-Statemachine aus CONTEXT.md validieren.

---

## Database Schema

Entitäten kommen aus CONTEXT.md — **kein gemeinsamer `users`-Topf**
(Rider und Driver sind getrennte Modelle, Auth-Rollen via Supabase):

- `Operator` (Mandant) — besitzt Vehicles, beschäftigt Drivers
- `Vehicle`, `Driver`, `Order`, `Ride`, `Shift` — **jede dieser Tabellen trägt
  `operator_id`** (Pflicht-FK, ADR 0001) + RLS-Policy
- `Rider` — plattformweit, ohne `operator_id`
- Geo-Spalten (Driver-Position, Origin/Destination) als PostGIS `geography`
- Indexe: zusammengesetzt beginnend mit `operator_id` (z. B. `(operator_id, status)`),
  GIST-Index auf Geo-Spalten

---

## Remember

- **Tests first** — they document intent
- **Simple data models** — complexity hides bugs
- **Fail loudly** — better than silent failures
- **One job per function** — testable = reusable
- **Think about concurrency** — real-time features need locks/queues

---

## Related Skills

- `/tdd` — Test-driven development loop
- `/diagnose` — Debug methodically
- `/zoom-out` — How does this fit the system?
