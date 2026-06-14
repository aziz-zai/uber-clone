import { Prisma } from "../../../../generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, operatorProcedure } from "~/server/api/trpc";

const notFoundOnP2025 = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  throw error;
};

export const driverRouter = createTRPCRouter({
  create: operatorProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(100),
        licenseNumber: z.string().trim().min(1).max(50),
        licenseClass: z.enum(["B", "BE", "C", "CE"]),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.driver.create({
        data: { ...input, operatorId: ctx.operatorId },
      }),
    ),

  list: operatorProcedure.query(({ ctx }) =>
    ctx.db.driver.findMany({
      where: { operatorId: ctx.operatorId },
      include: { vehicle: { select: { id: true, licensePlate: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ),

  update: operatorProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().trim().min(1).max(100).optional(),
        licenseNumber: z.string().trim().min(1).max(50).optional(),
        licenseClass: z.enum(["B", "BE", "C", "CE"]).optional(),
      }),
    )
    .mutation(({ ctx, input: { id, ...data } }) =>
      ctx.db.driver
        .update({ where: { id, operatorId: ctx.operatorId }, data })
        .catch(notFoundOnP2025),
    ),

  setStatus: operatorProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["OFFLINE", "ONLINE", "BUSY"]),
      }),
    )
    .mutation(({ ctx, input: { id, status } }) =>
      ctx.db.driver
        .update({ where: { id, operatorId: ctx.operatorId }, data: { status } })
        .catch(notFoundOnP2025),
    ),

  // Weist einem Fahrer ein Fahrzeug zu. Wenn das Fahrzeug bereits belegt ist,
  // wird die alte Zuweisung atomisch aufgehoben (Transaktion).
  assign: operatorProcedure
    .input(z.object({ driverId: z.string(), vehicleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const vehicle = await ctx.db.vehicle.findFirst({
        where: { id: input.vehicleId, operatorId: ctx.operatorId },
      });
      if (!vehicle) throw new TRPCError({ code: "NOT_FOUND" });

      const [, driver] = await ctx.db.$transaction([
        // Vorherige Zuweisung aufheben + Fahrer auf OFFLINE setzen
        ctx.db.driver.updateMany({
          where: { vehicleId: input.vehicleId, operatorId: ctx.operatorId },
          data: { vehicleId: null, status: "OFFLINE" },
        }),
        ctx.db.driver.update({
          where: { id: input.driverId, operatorId: ctx.operatorId },
          data: { vehicleId: input.vehicleId, status: "BUSY" },
        }),
      ]);
      return driver;
    }),

  unassign: operatorProcedure
    .input(z.object({ driverId: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.driver
        .update({
          where: { id: input.driverId, operatorId: ctx.operatorId },
          data: { vehicleId: null, status: "OFFLINE" },
        })
        .catch(notFoundOnP2025),
    ),
});
