import { Prisma, type VehicleClass } from "../../../../generated/prisma";

/** Umkreis für automatisches Matching (siehe ADR 0003). */
export const MATCH_RADIUS_METERS = 15_000;

/**
 * Sucht den nächsten freien, zum Operator gehörenden Fahrer im Umkreis und
 * beansprucht ihn (Status → BUSY). Gibt die Fahrer-ID zurück, oder null wenn
 * niemand passt oder ein anderer Prozess schneller war (Claim-Race).
 */
export async function findAndClaimNearestDriver(
  tx: Prisma.TransactionClient,
  params: {
    operatorId: string;
    lat: number;
    lng: number;
    vehicleClass?: VehicleClass | null;
  },
): Promise<string | null> {
  const candidates = await tx.$queryRaw<{ id: string }[]>`
    SELECT d.id
    FROM "Driver" d
    JOIN "Vehicle" v ON v.id = d."vehicleId"
    WHERE d."operatorId" = ${params.operatorId}
      AND d.status = 'ONLINE'
      AND d."currentLocationGeo" IS NOT NULL
      AND ST_DWithin(
        d."currentLocationGeo",
        ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography,
        ${MATCH_RADIUS_METERS}
      )
      ${
        params.vehicleClass
          ? Prisma.sql`AND v."vehicleClass" = ${params.vehicleClass}::"VehicleClass"`
          : Prisma.empty
      }
    ORDER BY d."currentLocationGeo" <-> ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography
    LIMIT 1
  `;

  const candidate = candidates[0];
  if (!candidate) return null;

  const claimed = await tx.driver.updateMany({
    where: { id: candidate.id, operatorId: params.operatorId, status: "ONLINE" },
    data: { status: "BUSY" },
  });

  return claimed.count === 1 ? candidate.id : null;
}
