import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { RideStatus } from "../../../../generated/prisma";

import { createTRPCRouter, operatorProcedure } from "~/server/api/trpc";
import { assertValidTransition } from "~/server/api/lib/ride-statemachine";

const TIMESTAMP_FIELD: Partial<Record<RideStatus, string>> = {
  ACCEPTED: "acceptedAt",
  ARRIVED: "arrivedAt",
  IN_PROGRESS: "inProgressAt",
  COMPLETED: "completedAt",
  PAID: "paidAt",
};

export const rideRouter = createTRPCRouter({
  getById: operatorProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const ride = await ctx.db.ride.findFirst({
        where: { id: input.id, operatorId: ctx.operatorId },
        include: {
          order: { include: { rider: true } },
          driver: { include: { vehicle: true } },
        },
      });
      if (!ride) throw new TRPCError({ code: "NOT_FOUND" });
      return ride;
    }),

  updateStatus: operatorProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum([
          "ACCEPTED",
          "ARRIVED",
          "IN_PROGRESS",
          "COMPLETED",
          "CANCELLED",
        ]),
        cancelReason: z.string().trim().min(1).max(500).optional(),
        cancelledByRole: z.enum(["RIDER", "DRIVER", "OPERATOR"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const ride = await tx.ride.findFirst({
          where: { id: input.id, operatorId: ctx.operatorId },
        });
        if (!ride) throw new TRPCError({ code: "NOT_FOUND" });
        assertValidTransition(ride.status, input.status);

        if (input.status === "CANCELLED" && !input.cancelReason) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Stornogrund erforderlich",
          });
        }

        const timestampField = TIMESTAMP_FIELD[input.status];

        const updated = await tx.ride.update({
          where: { id: ride.id },
          data: {
            status: input.status,
            ...(timestampField ? { [timestampField]: new Date() } : {}),
            ...(input.status === "CANCELLED"
              ? {
                  cancelReason: input.cancelReason,
                  cancelledByRole: input.cancelledByRole ?? "OPERATOR",
                }
              : {}),
          },
        });

        if (
          (input.status === "COMPLETED" || input.status === "CANCELLED") &&
          ride.driverId
        ) {
          await tx.driver.update({
            where: { id: ride.driverId },
            data: { status: "ONLINE" },
          });
        }

        return updated;
      });
    }),
});
