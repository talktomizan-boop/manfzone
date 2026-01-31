import type { Route } from "./+types/logout";
import { createSupabaseServerClient } from "~/lib/supabase";
import { redirectWithHeaders } from "~/lib/redirect";

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  await supabase.auth.signOut();
  return redirectWithHeaders(headers, "/");
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  if (request.method.toLowerCase() === "post") {
    return action({ request } as Route.ActionArgs);
  }
  // GET should not be used for logout; redirect safely.
  return redirectWithHeaders(new Headers(), url.searchParams.get("next") || "/");
}

export default function Logout() {
  return null;
}
