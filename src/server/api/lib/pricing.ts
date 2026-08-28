import type { VehicleClass } from "../../../../generated/prisma";

/** Feste Preistabelle pro Fahrzeugklasse (siehe ADR 0004) — kein
 * distanzbasiertes Pricing in diesem Slice, im Dispatch-UI überschreibbar. */
export const BASE_FARE_CENTS: Record<VehicleClass, number> = {
  STANDARD: 800,
  VAN: 1200,
  PREMIUM: 1800,
};
