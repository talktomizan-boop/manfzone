import type { Route } from "./+types/healthz";
import { createSupabaseServerClient } from "~/lib/supabase";

/**
 * Simple deployment validation endpoint.
 * - Returns 200 when the server can reach Supabase and required env vars exist.
 * - Does NOT expose secrets.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const startedAt = Date.now();

  const { supabase } = createSupabaseServerClient(request);

  let supabaseOk = false;
  let supabaseError: string | null = null;

  try {
    // Lightweight connectivity check. (Public read tables should work under anon key.)
    const { error } = await supabase.from("products").select("id").limit(1);
    if (error) throw error;
    supabaseOk = true;
  } catch (e: any) {
    supabaseOk = false;
    supabaseError = e?.message || "Supabase connectivity check failed";
  }

  const envSummary = {
    nodeEnv: process.env.NODE_ENV || "development",
    appVersion: process.env.APP_VERSION || process.env.RENDER_GIT_COMMIT || "",
    appUrl: Boolean(process.env.APP_URL),
    supabaseUrl: Boolean(process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL),
    supabaseAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_API_KEY),
    supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    sentryDsn: Boolean(process.env.VITE_SENTRY_DSN || process.env.SENTRY_DSN),
    emailProvider: process.env.EMAIL_PROVIDER || "smtp",
    cronSecret: Boolean(process.env.CRON_SECRET),
  };

  const payload = {
    ok: supabaseOk,
    env: envSummary,
    checks: {
      supabase: {
        ok: supabaseOk,
        error: supabaseError,
      },
    },
    durationMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(payload), {
    status: supabaseOk ? 200 : 503,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export default function ApiHealthz() {
  return null;
}
