-- Slice 6: Dispatch (Order/Ride/Rider + PostGIS-Matching + Stripe-Zahlung)
--
-- Cleanup zuerst: "Ride" und "RiderProfile" existierten bereits in der DB,
-- aber nie in schema.prisma/einer Migration/Git -- ein fruehrer, direkt
-- gegen die DB gebauter Prototyp (8 Ride-Zeilen vom 14.06.2026, 1 RiderProfile-
-- Zeile). Daten wurden vorher nach docs/legacy-dispatch-prototype-2026-06-14.json
-- exportiert. Die alte "Ride"-Tabelle hatte u.a. nullable operatorId (teils NULL)
-- und kein orderId -- ein In-Place-Alter war nicht sinnvoll moeglich, daher
-- Drop + sauberer Neuaufbau. Der Postgres-Enum-Typ "RideStatus" existierte
-- bereits mit exakt unseren Werten und wird weiterverwendet.

DROP TABLE "Ride";
DROP TABLE "RiderProfile";

-- CreateEnum
CREATE TYPE "CancelledByRole" AS ENUM ('RIDER', 'DRIVER', 'OPERATOR');

-- AlterTable Driver: alte, nie genutzte Auth/Foto-Spalten aus dem Prototyp
-- entfernen, Zeitstempel fuer die (weiterhin manuelle) Standort-Pflege
-- ergaenzen. currentLat/currentLng existieren bereits unveraendert.
ALTER TABLE "Driver"
    DROP COLUMN "authUserId",
    DROP COLUMN "photoUrl",
    ADD COLUMN     "currentLocationUpdatedAt" TIMESTAMP(3),
    ALTER COLUMN "operatorId" SET NOT NULL;

DROP INDEX IF EXISTS "Driver_authUserId_key";

-- Vorher fehlende Altlast schliessen: schema.prisma sah @@unique([operatorId,
-- licenseNumber]) immer vor, der Index existierte in der echten DB aber nicht.
CREATE UNIQUE INDEX "Driver_operatorId_licenseNumber_key" ON "Driver"("operatorId", "licenseNumber");

-- CreateTable
CREATE TABLE "Rider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rider_phone_key" ON "Rider"("phone");

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "originAddress" TEXT NOT NULL,
    "originLat" DOUBLE PRECISION NOT NULL,
    "originLng" DOUBLE PRECISION NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "destinationLat" DOUBLE PRECISION NOT NULL,
    "destinationLng" DOUBLE PRECISION NOT NULL,
    "vehicleClass" "VehicleClass",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ride" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "driverId" TEXT,
    "status" "RideStatus" NOT NULL DEFAULT 'REQUESTED',
    "cancelReason" TEXT,
    "cancelledByRole" "CancelledByRole",
    "assignedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "inProgressAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "priceInCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_operatorId_createdAt_idx" ON "Order"("operatorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ride_orderId_key" ON "Ride"("orderId");

-- CreateIndex
CREATE INDEX "Ride_operatorId_status_idx" ON "Ride"("operatorId", "status");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- PostGIS (Ausnahme laut devops.md -- Hand-SQL, Prisma kennt geography nicht)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "Driver" ADD COLUMN "currentLocationGeo" geography(Point,4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("currentLng", "currentLat"), 4326)::geography) STORED;
CREATE INDEX "Driver_currentLocationGeo_idx" ON "Driver" USING GIST ("currentLocationGeo");

ALTER TABLE "Order" ADD COLUMN "originLocationGeo" geography(Point,4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("originLng", "originLat"), 4326)::geography) STORED;
CREATE INDEX "Order_originLocationGeo_idx" ON "Order" USING GIST ("originLocationGeo");

-- ============================================================
-- Row-Level-Security (ADR 0001) -- gleiches Muster wie 20260828155736_enable_rls.
-- Nicht auf "Rider": keine operatorId-Spalte, ist plattformweit.
-- ============================================================

ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ride" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_operator_isolation" ON "Order"
    FOR ALL
    USING ("operatorId" = (auth.jwt() -> 'app_metadata' ->> 'operator_id'))
    WITH CHECK ("operatorId" = (auth.jwt() -> 'app_metadata' ->> 'operator_id'));

CREATE POLICY "ride_operator_isolation" ON "Ride"
    FOR ALL
    USING ("operatorId" = (auth.jwt() -> 'app_metadata' ->> 'operator_id'))
    WITH CHECK ("operatorId" = (auth.jwt() -> 'app_metadata' ->> 'operator_id'));
