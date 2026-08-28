import { TRPCError } from "@trpc/server";
import type { RideStatus } from "../../../../generated/prisma";

/** Statemachine aus CONTEXT.md: REQUESTED → ASSIGNED → ACCEPTED → ARRIVED →
 * IN_PROGRESS → COMPLETED → PAID, mit CANCELLED-Zweig aus jedem aktiven Status. */
const TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  REQUESTED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["PAID"],
  PAID: [],
  CANCELLED: [],
};

export function assertValidTransition(from: RideStatus, to: RideStatus) {
  if (!TRANSITIONS[from].includes(to)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Ungültiger Statusübergang: ${from} → ${to}`,
    });
  }
}
