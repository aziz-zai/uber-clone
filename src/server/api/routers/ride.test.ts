import { beforeEach, expect, test } from "vitest";

import { appRouter } from "~/server/api/root";
import { createCallerFactory } from "~/server/api/trpc";
import { db } from "~/server/db";

const createCaller = createCallerFactory(appRouter);

const callerFor = (operatorId: string) =>
  createCaller({ db, headers: new Headers(), operatorId });

let operatorA: { id: string };
let operatorB: { id: string };

const TEST_OPERATOR_NAMES = ["Ride-Test A GmbH", "Ride-Test B AG"];
const TEST_RIDER_PHONES = ["+49 170 3333333", "+49 170 4444444"];

const ORIGIN = { lat: 48.7758, lng: 9.1829 };
const NEAR = { lat: 48.7858, lng: 9.1829 }; // ~1.1km

const ORDER_INPUT = {
  riderName: "Erika Musterfrau",
  riderPhone: TEST_RIDER_PHONES[0]!,
  originAddress: "Teststraße 1, Stuttgart",
  originLat: ORIGIN.lat,
  originLng: ORIGIN.lng,
  destinationAddress: "Zielstraße 2, Stuttgart",
  destinationLat: 48.8,
  destinationLng: 9.2,
} as const;

beforeEach(async () => {
  await db.ride.deleteMany({
    where: { operator: { name: { in: TEST_OPERATOR_NAMES } } },
  });
  await db.order.deleteMany({
    where: { operator: { name: { in: TEST_OPERATOR_NAMES } } },
  });
  await db.driver.deleteMany({
    where: { operator: { name: { in: TEST_OPERATOR_NAMES } } },
  });
  await db.vehicle.deleteMany({
    where: { operator: { name: { in: TEST_OPERATOR_NAMES } } },
  });
  await db.operator.deleteMany({ where: { name: { in: TEST_OPERATOR_NAMES } } });
  await db.rider.deleteMany({ where: { phone: { in: TEST_RIDER_PHONES } } });

  operatorA = await db.operator.create({ data: { name: "Ride-Test A GmbH" } });
  operatorB = await db.operator.create({ data: { name: "Ride-Test B AG" } });
});

/** Erzeugt eine bereits einem Fahrer zugewiesene Ride (Status ASSIGNED). */
async function createAssignedRide(operatorId: string, riderPhone: string) {
  const vehicle = await db.vehicle.create({
    data: { operatorId, licensePlate: "T-RIDE1", vehicleClass: "STANDARD", seats: 4 },
  });
  const driver = await db.driver.create({
    data: {
      operatorId,
      name: "Fahrer Ride",
      licenseNumber: `RIDE-${riderPhone}`,
      licenseClass: "B",
      status: "ONLINE",
      vehicleId: vehicle.id,
      currentLat: NEAR.lat,
      currentLng: NEAR.lng,
    },
  });
  const caller = callerFor(operatorId);
  const { ride } = await caller.order.create({ ...ORDER_INPUT, riderPhone });
  const assigned = await caller.order.assign({ rideId: ride.id });
  return { ride: assigned, driver };
}

test("ride.getById liefert die eigene Ride inkl. Order/Rider/Driver", async () => {
  const { ride } = await createAssignedRide(operatorA.id, TEST_RIDER_PHONES[0]!);
  const caller = callerFor(operatorA.id);

  const loaded = await caller.ride.getById({ id: ride.id });

  expect(loaded.id).toBe(ride.id);
  expect(loaded.order.rider.name).toBe("Erika Musterfrau");
  expect(loaded.driver?.vehicle?.licensePlate).toBe("T-RIDE1");
});

test("ride.getById auf fremde Ride schlägt fehl (Tenant-Isolation)", async () => {
  const { ride } = await createAssignedRide(operatorB.id, TEST_RIDER_PHONES[1]!);

  await expect(
    callerFor(operatorA.id).ride.getById({ id: ride.id }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test(
  "ride.updateStatus durchläuft die volle Kette bis COMPLETED und gibt den Fahrer wieder frei",
  async () => {
    const { ride, driver } = await createAssignedRide(operatorA.id, TEST_RIDER_PHONES[0]!);
    const caller = callerFor(operatorA.id);

    await caller.ride.updateStatus({ id: ride.id, status: "ACCEPTED" });
    await caller.ride.updateStatus({ id: ride.id, status: "ARRIVED" });
    await caller.ride.updateStatus({ id: ride.id, status: "IN_PROGRESS" });
    const completed = await caller.ride.updateStatus({ id: ride.id, status: "COMPLETED" });

    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).not.toBeNull();

    const driverReloaded = await db.driver.findUnique({ where: { id: driver.id } });
    expect(driverReloaded?.status).toBe("ONLINE");
  },
  15000,
);

test("ride.updateStatus lehnt ungültigen Sprung ab", async () => {
  const { ride } = await createAssignedRide(operatorA.id, TEST_RIDER_PHONES[0]!);
  const caller = callerFor(operatorA.id);

  await expect(
    caller.ride.updateStatus({ id: ride.id, status: "COMPLETED" }),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
});

test("ride.updateStatus auf CANCELLED verlangt einen Grund und gibt den Fahrer frei", async () => {
  const { ride, driver } = await createAssignedRide(operatorA.id, TEST_RIDER_PHONES[0]!);
  const caller = callerFor(operatorA.id);

  await expect(
    caller.ride.updateStatus({ id: ride.id, status: "CANCELLED" }),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });

  const cancelled = await caller.ride.updateStatus({
    id: ride.id,
    status: "CANCELLED",
    cancelReason: "Rider nicht erreichbar",
    cancelledByRole: "OPERATOR",
  });

  expect(cancelled.status).toBe("CANCELLED");
  expect(cancelled.cancelReason).toBe("Rider nicht erreichbar");

  const driverReloaded = await db.driver.findUnique({ where: { id: driver.id } });
  expect(driverReloaded?.status).toBe("ONLINE");
});

test("ride.updateStatus auf fremde Ride schlägt fehl (Tenant-Isolation)", async () => {
  const { ride } = await createAssignedRide(operatorB.id, TEST_RIDER_PHONES[1]!);

  await expect(
    callerFor(operatorA.id).ride.updateStatus({ id: ride.id, status: "ACCEPTED" }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});
