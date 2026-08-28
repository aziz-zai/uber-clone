import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { env } from "~/env";
import { assertValidTransition } from "~/server/api/lib/ride-statemachine";
import { stripe } from "~/server/api/lib/stripe";
import { db } from "~/server/db";

// Server-zu-Server-Callback: kein Nutzer-JWT, keine operatorId im Kontext.
// Die Stripe-Signaturprüfung ist hier die einzige und ausreichende
// Authentifizierung (siehe ADR 0004).
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const rideId = session.metadata?.rideId;

    if (rideId) {
      const ride = await db.ride.findUnique({ where: { id: rideId } });
      if (ride) {
        assertValidTransition(ride.status, "PAID");
        await db.ride.update({
          where: { id: rideId },
          data: {
            status: "PAID",
            paidAt: new Date(),
            stripePaymentIntentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : (session.payment_intent?.id ?? null),
          },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
