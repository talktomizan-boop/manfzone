import * as Sentry from '@sentry/react';

let initialized = false;

export function initSentryBrowser() {
  if (initialized) return;

  const dsn = (import.meta.env.VITE_SENTRY_DSN || import.meta.env.SENTRY_DSN) as string | undefined;
  if (!dsn) return;

  const environment =
    (import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development') as string;

  const release = (import.meta.env.VITE_SENTRY_RELEASE || import.meta.env.VITE_GIT_SHA) as string | undefined;

  Sentry.init({
    dsn,
    environment,
    release,
    // Keep conservative by default; adjust in Render env if desired.
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
  });

  initialized = true;
}

export function captureError(err: unknown) {
  try {
    Sentry.captureException(err);
  } catch {
    // no-op
  }
}
