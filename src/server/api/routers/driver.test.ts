import { beforeEach, expect, test } from "vitest";
import { TRPCError } from "@trpc/server";

import { appRouter } from "~/server/api/root";
import { createCallerFactory } from "~/server/api/trpc";
import { db } from "~/server/db";

const createCaller = createCallerFactory(appRouter);

const callerFor = (operatorId: string) =>
  createCaller({ db, headers: new Headers(), operatorId });

let operatorA: { id: string };
let operatorB: { id: string };

const TEST_OPERATOR_NAMES = ["Driver-Test A GmbH", "Driver-Test B AG"];

beforeEach(async () => {
  // Drivers first (FK references vehicles → delete drivers before vehicles)
  await db.driver.deleteMany({
    where: { operator: { name: { in: TEST_OPERATOR_NAMES } } },
  });
  await db.vehicle.deleteMany({
    where: { operator: { name: { in: TEST_OPERATOR_NAMES } } },
  });
  await db.operator.deleteMany({
    where: { name: { in: TEST_OPERATOR_NAMES } },
  });
  operatorA = await db.operator.create({ data: { name: "Driver-Test A GmbH" } });
  operatorB = await db.operator.create({ data: { name: "Driver-Test B AG" } });
});

const DRIVER_A = { name: "Max Müller", licenseNumber: "B123456789", licenseClass: "B" } as const;
const DRIVER_B = { name: "Jana Schmidt", licenseNumber: "M987654321", licenseClass: "BE" } as const;

test("driver.create legt einen Driver für den eigenen Operator an", async () => {
  const caller = callerFor(operatorA.id);

  const driver = await caller.driver.create({
    name: "Max Müller",
    licenseNumber: "B123456789",
    licenseClass: "B",
  });

  expect(driver.id).toBeDefined();
  expect(driver.operatorId).toBe(operatorA.id);
  expect(driver.name).toBe("Max Müller");
  expect(driver.status).toBe("OFFLINE");
});

test("driver.list zeigt nur Drivers des eigenen Operators (Tenant-Isolation)", async () => {
  await callerFor(operatorA.id).driver.create(DRIVER_A);
  await callerFor(operatorB.id).driver.create(DRIVER_B);

  const driversOfA = await callerFor(operatorA.id).driver.list();

  expect(driversOfA).toHaveLength(1);
  expect(driversOfA[0]?.name).toBe("Max Müller");
});

test("driver.update ändert Stammdaten des eigenen Drivers", async () => {
  const caller = callerFor(operatorA.id);
  const driver = await caller.driver.create(DRIVER_A);

  const updated = await caller.driver.update({
    id: driver.id,
    name: "Max Mustermann",
    licenseClass: "BE",
  });

  expect(updated.name).toBe("Max Mustermann");
  expect(updated.licenseClass).toBe("BE");
  expect(updated.licenseNumber).toBe(DRIVER_A.licenseNumber);
});

test("driver.update auf fremden Driver schlägt fehl (Tenant-Isolation)", async () => {
  const driverOfB = await callerFor(operatorB.id).driver.create(DRIVER_B);

  await expect(
    callerFor(operatorA.id).driver.update({
      id: driverOfB.id,
      name: "GEKAPERT",
    }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });

  const driversOfB = await callerFor(operatorB.id).driver.list();
  expect(driversOfB[0]?.name).toBe(DRIVER_B.name);
});

test("driver.setStatus schaltet Status OFFLINE → ONLINE → BUSY", async () => {
  const caller = callerFor(operatorA.id);
  const driver = await caller.driver.create(DRIVER_A);

  const online = await caller.driver.setStatus({ id: driver.id, status: "ONLINE" });
  expect(online.status).toBe("ONLINE");

  const busy = await caller.driver.setStatus({ id: driver.id, status: "BUSY" });
  expect(busy.status).toBe("BUSY");

  const offline = await caller.driver.setStatus({ id: driver.id, status: "OFFLINE" });
  expect(offline.status).toBe("OFFLINE");
});

test("driver.assign weist Fahrzeug zu und gibt vehicleId zurück", async () => {
  const callerA = callerFor(operatorA.id);
  const driver = await callerA.driver.create(DRIVER_A);
  const vehicle = await db.vehicle.create({
    data: { operatorId: operatorA.id, licensePlate: "B-TS 100", vehicleClass: "STANDARD", seats: 4 },
  });

  const updated = await callerA.driver.assign({ driverId: driver.id, vehicleId: vehicle.id });

  expect(updated.vehicleId).toBe(vehicle.id);
});

test("driver.assign auf fremdes Fahrzeug schlägt fehl (Tenant-Isolation)", async () => {
  const callerA = callerFor(operatorA.id);
  const callerB = callerFor(operatorB.id);
  const driver = await callerA.driver.create(DRIVER_A);
  const vehicleOfB = await db.vehicle.create({
    data: { operatorId: operatorB.id, licensePlate: "M-FK 200", vehicleClass: "VAN", seats: 6 },
  });

  await expect(
    callerA.driver.assign({ driverId: driver.id, vehicleId: vehicleOfB.id }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });

  // Fahrzeug von B bleibt unberührt
  const driversOfB = await callerB.driver.list();
  expect(driversOfB.every((d) => d.vehicleId === null)).toBe(true);
});

test("driver.assign wechselt Zuweisung atomisch (alte Zuweisung wird aufgehoben)", async () => {
  const callerA = callerFor(operatorA.id);
  const driverOld = await callerA.driver.create(DRIVER_A);
  const driverNew = await callerA.driver.create(DRIVER_B);
  const vehicle = await db.vehicle.create({
    data: { operatorId: operatorA.id, licensePlate: "B-TS 300", vehicleClass: "STANDARD", seats: 4 },
  });

  // Erstzuweisung
  await callerA.driver.assign({ driverId: driverOld.id, vehicleId: vehicle.id });

  // Neuzuweisung: driverOld wird automatisch freigegeben
  await callerA.driver.assign({ driverId: driverNew.id, vehicleId: vehicle.id });

  const drivers = await callerA.driver.list();
  const old = drivers.find((d) => d.id === driverOld.id)!;
  const newD = drivers.find((d) => d.id === driverNew.id)!;
  expect(old.vehicleId).toBeNull();
  expect(newD.vehicleId).toBe(vehicle.id);
});

test("driver.unassign hebt Fahrzeug-Zuweisung auf", async () => {
  const callerA = callerFor(operatorA.id);
  const driver = await callerA.driver.create(DRIVER_A);
  const vehicle = await db.vehicle.create({
    data: { operatorId: operatorA.id, licensePlate: "B-TS 400", vehicleClass: "PREMIUM", seats: 3 },
  });
  await callerA.driver.assign({ driverId: driver.id, vehicleId: vehicle.id });

  const unassigned = await callerA.driver.unassign({ driverId: driver.id });
  expect(unassigned.vehicleId).toBeNull();
});

test("driver.create lehnt ungültige Eingaben ab", async () => {
  const caller = callerFor(operatorA.id);

  await expect(
    caller.driver.create({ name: "  ", licenseNumber: "B123", licenseClass: "B" }),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });

  await expect(
    caller.driver.create({ name: "Max", licenseNumber: "  ", licenseClass: "B" }),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });

  expect(await caller.driver.list()).toHaveLength(0);
});
