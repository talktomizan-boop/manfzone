/**
 * Supabase Service Role Client (Server-only)
 *
 * Use ONLY on the server (loaders/actions/scripts/edge-like server code).
 * This client bypasses RLS using the Service Role key.
 */
import { createClient } from "@supabase/supabase-js";

let cached: ReturnType<typeof createClient> | null = null;

export function getSupabaseServiceClient() {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL/SUPABASE_PROJECT_URL or SUPABASE_SERVICE_ROLE_KEY for service client."
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
