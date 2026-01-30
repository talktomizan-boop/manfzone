import type { Route } from "./+types/session";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function loader({ request }: Route.LoaderArgs) {
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
