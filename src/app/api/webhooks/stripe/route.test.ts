import { expect, test } from "vitest";

import { env } from "~/env";
import { stripe } from "~/server/api/lib/stripe";
import { db } from "~/server/db";
import { POST } from "./route";

const TEST_OPERATOR_NAMES = ["Webhook-Test A GmbH"];
const TEST_RIDER_PHONES = ["+49 170 6666666"];

function fakeCheckoutSessionCompletedPayload(rideId: string, paymentIntentId: string) {
  return JSON.stringify({
    id: "evt_test",
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test",
        object: "checkout.session",
        payment_intent: paymentIntentId,
        metadata: { rideId },
      },
    },
  });
}

async function setupCompletedRide() {
  await db.ride.deleteMany({
    where: { operator: { name: { in: TEST_OPERATOR_NAMES } } },
  });
  await db.order.deleteMany({
    where: { operator: { name: { in: TEST_OPERATOR_NAMES } } },
  });
  await db.operator.deleteMany({ where: { name: { in: TEST_OPERATOR_NAMES } } });
  await db.rider.deleteMany({ where: { phone: { in: TEST_RIDER_PHONES } } });

  const operator = await db.operator.create({ data: { name: TEST_OPERATOR_NAMES[0]! } });
  const rider = await db.rider.create({
    data: { name: "Webhook Rider", phone: TEST_RIDER_PHONES[0]! },
  });
  const order = await db.order.create({
    data: {
      operatorId: operator.id,
      riderId: rider.id,
      originAddress: "A",
      originLat: 48.7,
      originLng: 9.1,
      destinationAddress: "B",
      destinationLat: 48.8,
      destinationLng: 9.2,
    },
  });
  const ride = await db.ride.create({
    data: { operatorId: operator.id, orderId: order.id, status: "COMPLETED" },
  });
  return ride;
}

test("Webhook setzt die Ride bei gültiger Signatur auf PAID", async () => {
  const ride = await setupCompletedRide();
  const payload = fakeCheckoutSessionCompletedPayload(ride.id, "pi_test_123");
  const header = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: env.STRIPE_WEBHOOK_SECRET,
  });

  const response = await POST(
    new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: payload,
      headers: { "stripe-signature": header },
    }),
  );

  expect(response.status).toBe(200);
  const updated = await db.ride.findUnique({ where: { id: ride.id } });
  expect(updated?.status).toBe("PAID");
  expect(updated?.stripePaymentIntentId).toBe("pi_test_123");
});

test("Webhook lehnt ungültige Signatur ab und ändert nichts", async () => {
  const ride = await setupCompletedRide();
  const payload = fakeCheckoutSessionCompletedPayload(ride.id, "pi_test_456");

  const response = await POST(
    new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: payload,
      headers: { "stripe-signature": "t=1,v1=invalid" },
    }),
  );

  expect(response.status).toBe(400);
  const unchanged = await db.ride.findUnique({ where: { id: ride.id } });
  expect(unchanged?.status).toBe("COMPLETED");
});
