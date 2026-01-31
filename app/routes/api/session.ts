import type { Route } from "./+types/session";
import { createSupabaseServerClient } from "~/lib/supabase";

export async function loader({ request }: Route.LoaderArgs) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_API_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Cache-Control", "no-store");
    return new Response(
      JSON.stringify({
        isLoggedIn: false,
        userId: null,
        role: null,
        error: "Supabase environment variables are not configured.",
      }),
      { status: 200, headers }
    );
  }

  const { supabase, headers } = createSupabaseServerClient(request);

  // Use getUser() (server-verified) instead of getSession().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user?.id) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!error) {
      role = (profile as any)?.role ?? null;
    }
  }

  const payload = {
    isLoggedIn: Boolean(user),
    userId: user?.id ?? null,
    role,
  };

  // Preserve the original Headers instance to avoid collapsing multiple
  // Set-Cookie headers in some runtimes.
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', 'no-store');

  return new Response(JSON.stringify(payload), { status: 200, headers });
}

export default function ApiSession() {
  // This route only serves JSON from the loader.
  return null;
}
