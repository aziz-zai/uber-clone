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
});
