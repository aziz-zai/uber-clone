import { beforeEach, expect, test } from "vitest";

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
  await db.driver.deleteMany({
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
