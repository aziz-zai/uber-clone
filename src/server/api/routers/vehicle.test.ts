import { beforeEach, expect, test } from "vitest";

import { appRouter } from "~/server/api/root";
import { createCallerFactory } from "~/server/api/trpc";
import { db } from "~/server/db";

const createCaller = createCallerFactory(appRouter);

/** Caller im Namen eines operator_admin des gegebenen Operators. */
const callerFor = (operatorId: string) =>
  createCaller({ db, headers: new Headers(), operatorId });

let operatorA: { id: string };
let operatorB: { id: string };

// Tests räumen nur ihre eigenen Operatoren ab — die Dev-DB gehört auch der App.
const TEST_OPERATOR_NAMES = ["Taxi A GmbH", "Shuttle B AG"];

beforeEach(async () => {
  await db.vehicle.deleteMany({
    where: { operator: { name: { in: TEST_OPERATOR_NAMES } } },
  });
  await db.operator.deleteMany({
    where: { name: { in: TEST_OPERATOR_NAMES } },
  });
  operatorA = await db.operator.create({ data: { name: "Taxi A GmbH" } });
  operatorB = await db.operator.create({ data: { name: "Shuttle B AG" } });
});

test("vehicle.create legt ein Vehicle für den eigenen Operator an", async () => {
  const caller = callerFor(operatorA.id);

  const vehicle = await caller.vehicle.create({
    licensePlate: "B-XY 1234",
    vehicleClass: "STANDARD",
    seats: 4,
  });

  expect(vehicle.id).toBeDefined();
  expect(vehicle.operatorId).toBe(operatorA.id);
  expect(vehicle.licensePlate).toBe("B-XY 1234");
  expect(vehicle.status).toBe("ACTIVE");
});

test("vehicle.list zeigt nur Vehicles des eigenen Operators (Tenant-Isolation)", async () => {
  await callerFor(operatorA.id).vehicle.create({
    licensePlate: "B-AA 1111",
    vehicleClass: "STANDARD",
    seats: 4,
  });
  await callerFor(operatorB.id).vehicle.create({
    licensePlate: "M-BB 2222",
    vehicleClass: "VAN",
    seats: 8,
  });

  const vehiclesOfA = await callerFor(operatorA.id).vehicle.list();

  expect(vehiclesOfA).toHaveLength(1);
  expect(vehiclesOfA[0]?.licensePlate).toBe("B-AA 1111");
});

test("vehicle.update ändert Stammdaten des eigenen Vehicles", async () => {
  const caller = callerFor(operatorA.id);
  const vehicle = await caller.vehicle.create({
    licensePlate: "B-XY 1234",
    vehicleClass: "STANDARD",
    seats: 4,
  });

  const updated = await caller.vehicle.update({
    id: vehicle.id,
    licensePlate: "B-NEU 999",
    seats: 6,
  });

  expect(updated.licensePlate).toBe("B-NEU 999");
  expect(updated.seats).toBe(6);
  expect(updated.vehicleClass).toBe("STANDARD"); // unverändert
});

test("vehicle.update auf fremdes Vehicle schlägt fehl und ändert nichts (Tenant-Isolation)", async () => {
  const vehicleOfB = await callerFor(operatorB.id).vehicle.create({
    licensePlate: "M-BB 2222",
    vehicleClass: "VAN",
    seats: 8,
  });

  // Operator A versucht, das Vehicle von B zu kapern
  await expect(
    callerFor(operatorA.id).vehicle.update({
      id: vehicleOfB.id,
      licensePlate: "GEKAPERT",
    }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });

  // Daten von B sind unverändert
  const vehiclesOfB = await callerFor(operatorB.id).vehicle.list();
  expect(vehiclesOfB[0]?.licensePlate).toBe("M-BB 2222");
});

test("vehicle.setStatus schaltet ein Vehicle in Wartung und wieder aktiv", async () => {
  const caller = callerFor(operatorA.id);
  const vehicle = await caller.vehicle.create({
    licensePlate: "B-XY 1234",
    vehicleClass: "STANDARD",
    seats: 4,
  });

  const inMaintenance = await caller.vehicle.setStatus({
    id: vehicle.id,
    status: "MAINTENANCE",
  });
  expect(inMaintenance.status).toBe("MAINTENANCE");

  const active = await caller.vehicle.setStatus({
    id: vehicle.id,
    status: "ACTIVE",
  });
  expect(active.status).toBe("ACTIVE");
});

test("vehicle.create lehnt ungültige Eingaben ab", async () => {
  const caller = callerFor(operatorA.id);

  // Leeres Kennzeichen
  await expect(
    caller.vehicle.create({
      licensePlate: "   ",
      vehicleClass: "STANDARD",
      seats: 4,
    }),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });

  // 0 Sitzplätze
  await expect(
    caller.vehicle.create({
      licensePlate: "B-XY 1234",
      vehicleClass: "STANDARD",
      seats: 0,
    }),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });

  expect(await caller.vehicle.list()).toHaveLength(0);
});
