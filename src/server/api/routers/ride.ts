import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { RideStatus } from "../../../../generated/prisma";

import { createTRPCRouter, operatorProcedure } from "~/server/api/trpc";
import { assertValidTransition } from "~/server/api/lib/ride-statemachine";
import { getAppUrl, stripe } from "~/server/api/lib/stripe";

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

  // Erzeugt einen Stripe-Checkout-Link für eine abgeschlossene Fahrt. Der
  // Rider zahlt selbst auf der von Stripe gehosteten Seite (kein eigenes
  // Kartenformular, kein PCI-Scope bei uns) — der Webhook setzt die Ride
  // anschließend auf PAID (siehe /api/webhooks/stripe, ADR 0004).
  requestPayment: operatorProcedure
    .input(z.object({ id: z.string(), amountInCents: z.number().int().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const ride = await ctx.db.ride.findFirst({
        where: { id: input.id, operatorId: ctx.operatorId },
        include: { order: { include: { rider: true } } },
      });
      if (!ride) throw new TRPCError({ code: "NOT_FOUND" });
      if (ride.status !== "COMPLETED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Zahlung kann erst nach Abschluss der Fahrt angefordert werden.",
        });
      }

      const rider = ride.order.rider;
      let stripeCustomerId = rider.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          name: rider.name,
          phone: rider.phone,
        });
        stripeCustomerId = customer.id;
        await ctx.db.rider.update({
          where: { id: rider.id },
          data: { stripeCustomerId },
        });
      }

      const appUrl = getAppUrl();
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: stripeCustomerId,
        line_items: [
          {
            price_data: {
              currency: ride.currency,
              product_data: {
                name: `Fahrt: ${ride.order.originAddress} → ${ride.order.destinationAddress}`,
              },
              unit_amount: input.amountInCents,
            },
            quantity: 1,
          },
        ],
        metadata: { rideId: ride.id },
        success_url: `${appUrl}/dispatch?payment=success`,
        cancel_url: `${appUrl}/dispatch?payment=cancelled`,
      });

      await ctx.db.ride.update({
        where: { id: ride.id },
        data: {
          priceInCents: input.amountInCents,
          stripeCheckoutSessionId: session.id,
        },
      });

      if (!session.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe hat keine Checkout-URL zurückgegeben.",
        });
      }

      return { checkoutUrl: session.url };
    }),
});
