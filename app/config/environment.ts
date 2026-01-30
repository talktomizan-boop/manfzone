/**
 * Centralized Environment Configuration
 *
 * This module is imported by both server and browser bundles.
 *
 * - Server runtime (Render/Node): values come from process.env
 * - Browser runtime: process.env is not available; values come from:
 *   1) window.ENV (injected from the root loader)
 *   2) import.meta.env (if the project uses VITE_* variables)
 *
 * NOTE: We support both naming conventions because the repo currently mixes them:
 * - SUPABASE_URL / SUPABASE_ANON_KEY (recommended)
 * - SUPABASE_PROJECT_URL / SUPABASE_API_KEY (legacy)
 */

declare global {
  interface Window {
    ENV?: Record<string, string | undefined>;
  }
}

function readEnv(key: string): string {
  // 1) Server: process.env
  if (typeof process !== 'undefined' && process?.env && typeof process.env[key] === 'string') {
    return process.env[key] as string;
  }

  // 2) Browser: window.ENV injected by root loader
  if (typeof window !== 'undefined' && window.ENV && typeof window.ENV[key] === 'string') {
    return window.ENV[key] as string;
  }

  // 3) Vite (optional): import.meta.env
  try {
    const metaEnv = (import.meta as any)?.env as Record<string, any> | undefined;
    if (metaEnv && typeof metaEnv[key] === 'string') return metaEnv[key];
    if (metaEnv && typeof metaEnv[`VITE_${key}`] === 'string') return metaEnv[`VITE_${key}`];
  } catch {
    // ignore
  }

  return '';
}

const supabaseUrl = readEnv('SUPABASE_URL') || readEnv('SUPABASE_PROJECT_URL');
const supabaseAnonKey = readEnv('SUPABASE_ANON_KEY') || readEnv('SUPABASE_API_KEY');

export const env = {
  // Supabase Configuration
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  },

  // Application Configuration
  app: {
    name: 'Manaf Zone',
    url: readEnv('APP_URL') || 'http://localhost:5173',
    environment: (readEnv('NODE_ENV') || 'development') as 'development' | 'staging' | 'production',
    version: readEnv('APP_VERSION') || '',
  },

  // Feature Flags (can be overridden by database)
  features: {
    enableWishlist: readEnv('ENABLE_WISHLIST') !== 'false',
    enableReviews: readEnv('ENABLE_REVIEWS') !== 'false',
    enableCoupons: readEnv('ENABLE_COUPONS') !== 'false',
    enableGuestCheckout: readEnv('ENABLE_GUEST_CHECKOUT') !== 'false',
  },

  // Payment Configuration
  payments: {
    enableCOD: readEnv('ENABLE_COD') !== 'false',
    enableCardPayments: readEnv('ENABLE_CARD_PAYMENTS') === 'true',
  },

  // Session Configuration
  session: {
    cartExpirationDays: parseInt(readEnv('CART_EXPIRATION_DAYS') || '30', 10),
  },
} as const;

/**
 * Validate that all required environment variables are set
 */
export function validateEnvironment(): void {
  const required = [
    { key: 'SUPABASE_URL (or SUPABASE_PROJECT_URL)', value: env.supabase.url },
    { key: 'SUPABASE_ANON_KEY (or SUPABASE_API_KEY)', value: env.supabase.anonKey },
  ];

  const missing = required.filter((item) => !item.value);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map((item) => item.key).join(', ')}\n` +
        'Please check your .env / Render environment variables.'
    );
  }
}
