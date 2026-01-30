/**
 * Redirect helpers
 *
 * We return raw Response objects (instead of redirect() helpers) whenever
 * Supabase auth cookies may be set/updated. Some redirect helpers/layers can
 * accidentally collapse multiple Set-Cookie headers, causing "login bounce"
 * issues in production.
 */

export function safeRedirect(to: string | null | undefined, defaultRedirect = '/') {
  if (!to) return defaultRedirect;
  const value = String(to).trim();
  if (!value) return defaultRedirect;

  // Only allow relative, internal paths.
  if (!value.startsWith('/')) return defaultRedirect;
  if (value.startsWith('//')) return defaultRedirect;
  if (value.includes('://')) return defaultRedirect;

  // Avoid loops.
  if (value.startsWith('/login')) return defaultRedirect;
  if (value.startsWith('/register')) return defaultRedirect;

  return value;
}

export function getRequestedRedirect(request: Request, formData?: FormData): string | null {
  const url = new URL(request.url);
  const fromForm = formData?.get('redirectTo');
  const fromQuery = url.searchParams.get('redirectTo') || url.searchParams.get('next');
  const raw = (fromForm ?? fromQuery ?? '').toString();
  return raw ? raw : null;
}

export function buildLoginRedirect(request: Request): string {
  const url = new URL(request.url);
  const current = `${url.pathname}${url.search}`;
  return `/login?redirectTo=${encodeURIComponent(current)}`;
}

export function redirectWithHeaders(headers: Headers, location: string, status = 302): Response {
  headers.set('Location', location);
  return new Response(null, { status, headers });
}

export function redirectToLogin(request: Request, headers: Headers): Response {
  return redirectWithHeaders(headers, buildLoginRedirect(request));
}
