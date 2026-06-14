import { createClient } from "@supabase/supabase-js";
import { env } from "~/env";

// Service-Role-Client — nur server-seitig, NIEMALS in Browsern / NEXT_PUBLIC_
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
