import { Prisma } from "../../../../generated/prisma";
import { TRPCError } from "@trpc/server";

/** Prisma P2025 ("record not found") → 404, alles andere weiterwerfen. */
export const notFoundOnP2025 = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  throw error;
};
