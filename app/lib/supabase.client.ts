import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, validateEnvironment } from "~/config/environment";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  // Prefer the centralized env module, which supports:
  // - Server runtime: process.env
  // - Browser runtime: window.ENV (injected by the root loader)
  // - Optional Vite build-time vars: VITE_* fallbacks
  validateEnvironment();
  const url = env.supabase.url;
  const anonKey = env.supabase.anonKey;

  _client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  return _client;
}

/**
 * Backwards-compatible alias used in some routes/components.
 * Returns the same singleton instance as getSupabaseClient().
 */
export function createSupabaseClient(): SupabaseClient {
  return getSupabaseClient();
}

export const supabase = getSupabaseClient();
