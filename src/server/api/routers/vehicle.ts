import { Prisma } from "../../../../generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, operatorProcedure } from "~/server/api/trpc";

/** Prisma P2025 ("record not found") → 404, alles andere weiterwerfen. */
const notFoundOnP2025 = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  throw error;
};

export const vehicleRouter = createTRPCRouter({
  create: operatorProcedure
    .input(
      z.object({
        licensePlate: z.string().trim().min(1).max(20),
        vehicleClass: z.enum(["STANDARD", "VAN", "PREMIUM"]),
        seats: z.number().int().min(1).max(50),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.vehicle.create({
        data: { ...input, operatorId: ctx.operatorId },
      }),
    ),

  list: operatorProcedure.query(({ ctx }) =>
    ctx.db.vehicle.findMany({
      where: { operatorId: ctx.operatorId },
      include: { driver: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ),

  update: operatorProcedure
    .input(
      z.object({
        id: z.string(),
        licensePlate: z.string().trim().min(1).max(20).optional(),
        vehicleClass: z.enum(["STANDARD", "VAN", "PREMIUM"]).optional(),
        seats: z.number().int().min(1).max(50).optional(),
      }),
    )
    .mutation(({ ctx, input: { id, ...data } }) =>
      ctx.db.vehicle
        // operatorId im where = Tenant-Isolation: fremde Vehicles sind unsichtbar
        .update({ where: { id, operatorId: ctx.operatorId }, data })
        .catch(notFoundOnP2025),
    ),

  setStatus: operatorProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE"]),
      }),
    )
    .mutation(({ ctx, input: { id, status } }) =>
      ctx.db.vehicle
        .update({ where: { id, operatorId: ctx.operatorId }, data: { status } })
        .catch(notFoundOnP2025),
    ),
});
