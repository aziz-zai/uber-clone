import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, operatorProcedure } from "~/server/api/trpc";
import { findAndClaimNearestDriver } from "~/server/api/lib/dispatch";
import { assertValidTransition } from "~/server/api/lib/ride-statemachine";

export const orderRouter = createTRPCRouter({
  create: operatorProcedure
    .input(
      z.object({
        riderName: z.string().trim().min(1).max(100),
        riderPhone: z.string().trim().min(1).max(30),
        originAddress: z.string().trim().min(1).max(200),
        originLat: z.number().min(-90).max(90),
        originLng: z.number().min(-180).max(180),
        destinationAddress: z.string().trim().min(1).max(200),
        destinationLat: z.number().min(-90).max(90),
        destinationLng: z.number().min(-180).max(180),
        vehicleClass: z.enum(["STANDARD", "VAN", "PREMIUM"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { riderName, riderPhone, ...orderInput } = input;

      return ctx.db.$transaction(async (tx) => {
        const rider = await tx.rider.upsert({
          where: { phone: riderPhone },
          update: { name: riderName },
          create: { name: riderName, phone: riderPhone },
        });

        const order = await tx.order.create({
          data: { ...orderInput, riderId: rider.id, operatorId: ctx.operatorId },
        });

        const ride = await tx.ride.create({
          data: { orderId: order.id, operatorId: ctx.operatorId },
        });

        return { order, ride };
      });
    }),

  list: operatorProcedure.query(({ ctx }) =>
    ctx.db.ride.findMany({
      where: { operatorId: ctx.operatorId },
      include: {
        order: { include: { rider: true } },
        driver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ),

  assign: operatorProcedure
    .input(z.object({ rideId: z.string(), driverId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const ride = await tx.ride.findFirst({
          where: { id: input.rideId, operatorId: ctx.operatorId },
          include: { order: true },
        });
        if (!ride) throw new TRPCError({ code: "NOT_FOUND" });
        assertValidTransition(ride.status, "ASSIGNED");

        let driverId: string;

        if (input.driverId) {
          const driver = await tx.driver.findFirst({
            where: {
              id: input.driverId,
              operatorId: ctx.operatorId,
              status: "ONLINE",
              vehicleId: { not: null },
            },
          });
          if (!driver) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Fahrer nicht verfügbar",
            });
          }
          const claimed = await tx.driver.updateMany({
            where: { id: driver.id, operatorId: ctx.operatorId, status: "ONLINE" },
            data: { status: "BUSY" },
          });
          if (claimed.count === 0) {
            throw new TRPCError({ code: "CONFLICT" });
          }
          driverId = driver.id;
        } else {
          const matchedId = await findAndClaimNearestDriver(tx, {
            operatorId: ctx.operatorId,
            lat: ride.order.originLat,
            lng: ride.order.originLng,
            vehicleClass: ride.order.vehicleClass,
          });
          if (!matchedId) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Kein verfügbarer Fahrer im Umkreis",
            });
          }
          driverId = matchedId;
        }

        return tx.ride.update({
          where: { id: ride.id },
          data: { status: "ASSIGNED", driverId, assignedAt: new Date() },
        });
      });
    }),
});
