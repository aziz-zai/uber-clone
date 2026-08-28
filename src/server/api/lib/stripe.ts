import Stripe from "stripe";

import { env } from "~/env";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);

/** Vercel setzt VERCEL_URL automatisch pro Deployment (Preview/Prod); lokal Fallback auf localhost. */
export function getAppUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
