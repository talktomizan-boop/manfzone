import { useEffect } from "react";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "react-router";

import type { Route } from "./+types/root";
import { Toaster } from "./components/ui/toaster/toaster";
import colorSchemeApi from "@dazl/color-scheme/client?url";

import "./styles/reset.css";
import "./styles/global.css";
import "./styles/tokens/keyframes.css";
import "./styles/tokens/animations.css";
import "./styles/tokens/colors.css";
import "./styles/tokens/decorations.css";
import "./styles/tokens/spacings.css";
import "./styles/tokens/typography.css";
import "./styles/theme.css";
import { useSafeColorScheme } from "./hooks/use-color-scheme";
import favicon from "/favicon.png";
import { captureError, initSentryBrowser } from "~/lib/sentry.client";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "icon",
    href: favicon,
    type: "image/png",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

// Provide safe, public runtime env to the browser bundle.
// (Only values that are safe to expose to the client.)
export async function loader({}: Route.LoaderArgs) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || "";
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_API_KEY || "";
  const APP_URL = process.env.APP_URL || "";
  const APP_VERSION = process.env.APP_VERSION || process.env.RENDER_GIT_COMMIT || "";

  return {
    ENV: {
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      APP_URL,
      APP_VERSION,
    },
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { rootCssClass, resolvedScheme } = useSafeColorScheme();
  const data = useLoaderData<typeof loader>();
  const envScript = `window.ENV = ${JSON.stringify(data?.ENV || {}).replace(/</g, "\\u003c")};`;
  return (
    <html lang="en" suppressHydrationWarning className={rootCssClass} style={{ colorScheme: resolvedScheme }}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <script dangerouslySetInnerHTML={{ __html: envScript }} />
        <script src={colorSchemeApi}></script>
        <Links />
      </head>
      <body>
        {children}
        <Toaster />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  useEffect(() => {
    initSentryBrowser();
  }, []);
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  // Best-effort error capture (non-blocking)
  useEffect(() => {
    captureError(error);
  }, [error]);
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      backgroundColor: 'var(--color-neutral-1)',
      color: 'var(--color-neutral-12)',
    }}>
      <h1 style={{
        fontSize: '3rem',
        fontWeight: 800,
        marginBottom: '1rem',
        color: 'var(--color-accent-9)',
      }}>{message}</h1>
      <p style={{
        fontSize: '1.125rem',
        marginBottom: '2rem',
        color: 'var(--color-neutral-11)',
      }}>{details}</p>
      <a href="/" style={{
        padding: '0.75rem 1.5rem',
        backgroundColor: 'var(--color-accent-9)',
        color: 'white',
        borderRadius: 'var(--radius-2)',
        textDecoration: 'none',
        fontWeight: 600,
      }}>Go Home</a>
      {stack && (
        <pre style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: 'var(--color-neutral-3)',
          borderRadius: 'var(--radius-2)',
          overflow: 'auto',
          maxWidth: '100%',
          textAlign: 'left',
        }}>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
