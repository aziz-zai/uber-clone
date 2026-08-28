import { beforeEach, expect, test } from "vitest";

import { appRouter } from "~/server/api/root";
import { createCallerFactory } from "~/server/api/trpc";
import { db } from "~/server/db";

const createCaller = createCallerFactory(appRouter);

const callerFor = (operatorId: string) =>
  createCaller({ db, headers: new Headers(), operatorId });

let operatorA: { id: string };
let operatorB: { id: string };

const TEST_OPERATOR_NAMES = ["Order-Test A GmbH", "Order-Test B AG"];
const TEST_RIDER_PHONES = ["+49 170 1111111", "+49 170 2222222"];

// Origin der Testfahrten: Stuttgart-ish. "near" liegt ~1.1km entfernt (im
// 15km-Radius), "mid" ~5.6km, "far" ~22km (außerhalb des Radius).
const ORIGIN = { lat: 48.7758, lng: 9.1829 };
const NEAR = { lat: 48.7858, lng: 9.1829 }; // ~1.1km
const MID = { lat: 48.8258, lng: 9.1829 }; // ~5.6km
const FAR = { lat: 48.9758, lng: 9.1829 }; // ~22km

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
  // Löschreihenfolge respektiert FKs: Ride → Order → Driver → Vehicle → Operator.
  // Rider ist plattformweit (kein operatorId), über Testtelefonnummern eingrenzen.
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

  operatorA = await db.operator.create({ data: { name: "Order-Test A GmbH" } });
  operatorB = await db.operator.create({ data: { name: "Order-Test B AG" } });
});

/** Legt einen ONLINE-Fahrer mit Fahrzeug + Standort direkt in der DB an. */
async function createOnlineDriver(
  operatorId: string,
  licenseNumber: string,
  location: { lat: number; lng: number },
  vehicleClass: "STANDARD" | "VAN" | "PREMIUM" = "STANDARD",
) {
  const vehicle = await db.vehicle.create({
    data: {
      operatorId,
      licensePlate: `T-${licenseNumber}`,
      vehicleClass,
      seats: 4,
    },
  });
  return db.driver.create({
    data: {
      operatorId,
      name: `Fahrer ${licenseNumber}`,
      licenseNumber,
      licenseClass: "B",
      status: "ONLINE",
      vehicleId: vehicle.id,
      currentLat: location.lat,
      currentLng: location.lng,
    },
  });
}

test("order.create legt Rider, Order und Ride (REQUESTED) an", async () => {
  const { order, ride } = await callerFor(operatorA.id).order.create(ORDER_INPUT);

  expect(order.operatorId).toBe(operatorA.id);
  expect(order.originAddress).toBe(ORDER_INPUT.originAddress);
  expect(ride.orderId).toBe(order.id);
  expect(ride.status).toBe("REQUESTED");

  const rider = await db.rider.findUnique({ where: { phone: ORDER_INPUT.riderPhone } });
  expect(rider?.name).toBe("Erika Musterfrau");
});

test("order.create nutzt bestehenden Rider erneut (kein Duplikat pro Telefonnummer)", async () => {
  await callerFor(operatorA.id).order.create(ORDER_INPUT);
  await callerFor(operatorA.id).order.create({
    ...ORDER_INPUT,
    riderName: "Erika M.", // aktualisierter Name
  });

  const riders = await db.rider.findMany({ where: { phone: ORDER_INPUT.riderPhone } });
  expect(riders).toHaveLength(1);
  expect(riders[0]?.name).toBe("Erika M.");
});

test("order.list zeigt nur Rides des eigenen Operators (Tenant-Isolation)", async () => {
  await callerFor(operatorA.id).order.create(ORDER_INPUT);
  await callerFor(operatorB.id).order.create({
    ...ORDER_INPUT,
    riderPhone: TEST_RIDER_PHONES[1]!,
  });

  const ridesOfA = await callerFor(operatorA.id).order.list();
  expect(ridesOfA).toHaveLength(1);
  expect(ridesOfA[0]?.order.operatorId).toBe(operatorA.id);
});

test("order.assign (automatisch) wählt den nächsten freien Fahrer", async () => {
  const caller = callerFor(operatorA.id);
  const near = await createOnlineDriver(operatorA.id, "NEAR1", NEAR);
  await createOnlineDriver(operatorA.id, "MID1", MID);

  const { ride } = await caller.order.create(ORDER_INPUT);
  const assigned = await caller.order.assign({ rideId: ride.id });

  expect(assigned.status).toBe("ASSIGNED");
  expect(assigned.driverId).toBe(near.id);

  const nearReloaded = await db.driver.findUnique({ where: { id: near.id } });
  expect(nearReloaded?.status).toBe("BUSY");
});

test("order.assign (automatisch) überspringt Fahrer außerhalb des Radius", async () => {
  const caller = callerFor(operatorA.id);
  await createOnlineDriver(operatorA.id, "FAR1", FAR);

  const { ride } = await caller.order.create(ORDER_INPUT);

  await expect(caller.order.assign({ rideId: ride.id })).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
});

test("order.assign (automatisch) überspringt BUSY/OFFLINE-Fahrer und Fahrer ohne Fahrzeug", async () => {
  const caller = callerFor(operatorA.id);
  const busy = await createOnlineDriver(operatorA.id, "BUSY1", NEAR);
  await db.driver.update({ where: { id: busy.id }, data: { status: "BUSY" } });
  await db.driver.create({
    data: {
      operatorId: operatorA.id,
      name: "Ohne Auto",
      licenseNumber: "NOVEH1",
      licenseClass: "B",
      status: "ONLINE",
      currentLat: NEAR.lat,
      currentLng: NEAR.lng,
    },
  });

  const { ride } = await caller.order.create(ORDER_INPUT);

  await expect(caller.order.assign({ rideId: ride.id })).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
});

test("order.assign (automatisch) berücksichtigt die gewünschte Fahrzeugklasse", async () => {
  const caller = callerFor(operatorA.id);
  await createOnlineDriver(operatorA.id, "STD1", NEAR, "STANDARD");
  const van = await createOnlineDriver(operatorA.id, "VAN1", NEAR, "VAN");

  const { ride } = await caller.order.create({ ...ORDER_INPUT, vehicleClass: "VAN" });
  const assigned = await caller.order.assign({ rideId: ride.id });

  expect(assigned.driverId).toBe(van.id);
});

test("order.assign (manuell) lehnt nicht verfügbaren Fahrer ab", async () => {
  const caller = callerFor(operatorA.id);
  const offline = await db.driver.create({
    data: {
      operatorId: operatorA.id,
      name: "Offline",
      licenseNumber: "OFF1",
      licenseClass: "B",
      status: "OFFLINE",
    },
  });
  const { ride } = await caller.order.create(ORDER_INPUT);

  await expect(
    caller.order.assign({ rideId: ride.id, driverId: offline.id }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("order.assign (manuell) lehnt Fahrer eines anderen Operators ab (Tenant-Isolation)", async () => {
  const driverOfB = await createOnlineDriver(operatorB.id, "FOREIGN1", NEAR);
  const { ride } = await callerFor(operatorA.id).order.create(ORDER_INPUT);

  await expect(
    callerFor(operatorA.id).order.assign({ rideId: ride.id, driverId: driverOfB.id }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("order.assign auf fremden Ride schlägt fehl (Tenant-Isolation)", async () => {
  const { ride } = await callerFor(operatorB.id).order.create({
    ...ORDER_INPUT,
    riderPhone: TEST_RIDER_PHONES[1]!,
  });

  await expect(
    callerFor(operatorA.id).order.assign({ rideId: ride.id }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("order.create lehnt ungültige Eingaben ab", async () => {
  const caller = callerFor(operatorA.id);

  await expect(
    caller.order.create({ ...ORDER_INPUT, riderName: "  " }),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });

  expect(await caller.order.list()).toHaveLength(0);
});
