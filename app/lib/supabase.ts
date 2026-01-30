/**
 * Supabase Server Client
 * For server-side operations in loaders and actions
 */

import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import { env } from '~/config/environment';

export function createSupabaseServerClient(request: Request) {
  const headers = new Headers();
  
  const supabase = createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '').map(cookie => ({
          name: cookie.name,
          value: cookie.value ?? ''
        }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          headers.append('Set-Cookie', serializeCookieHeader(name, value, options))
        );
      },
    },
  });

  return { supabase, headers };
}
