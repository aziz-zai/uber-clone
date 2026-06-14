-- AlterTable: nullable vehicleId on Driver + unique constraint (one driver per vehicle)
ALTER TABLE "Driver" ADD COLUMN "vehicleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Driver_vehicleId_key" ON "Driver"("vehicleId");

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
