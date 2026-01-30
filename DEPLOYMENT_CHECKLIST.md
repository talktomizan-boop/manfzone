# Render + Supabase Deployment Checklist

## Supabase
- [ ] Project created and billing enabled (if required for RLS / extensions)
- [ ] Migrations applied in order (`supabase/migrations/*`)
- [ ] `profiles` trigger migration applied (`20260118_create_profiles_and_trigger.sql`)
- [ ] Only SQL files were run in SQL Editor (do **not** paste `supabase/config.toml` or `supabase/functions/**` TS there)
- [ ] RLS enabled for all public tables and policies validated
- [ ] Auth settings updated (Site URL + Redirect URLs)
- [ ] Storage buckets created (if used)
- [ ] Edge Functions deployed (e.g. `send-email`, `process-email-outbox`, `cart-abandonment`)
- [ ] `CRON_SECRET` stored for scheduled functions

## Render
- [ ] Build command: `npm install --no-audit --no-fund && npm run build`
- [ ] Start command: `npm run start`
- [ ] Node version pinned to 20 (see `render.yaml`)
- [ ] Environment variables set (see `.env.example`)
- [ ] `APP_URL` matches Render URL
- [ ] `EMAIL_PROVIDER` + email credentials set
- [ ] `VITE_SENTRY_DSN` set for production error tracking

## Validation
- [ ] `GET /api/healthz` returns `ok: true`
- [ ] `npm run validate:deploy` passes
- [ ] Smoke tests (`npm run smoke`) succeed (optional but recommended)

## Security
- [ ] Service role key **never** exposed to the client
- [ ] RLS policies verified for user-scoped tables
- [ ] Admin routes protected by role checks
- [ ] `SMOKE_TEST_SECRET` set to protect order/invoice preview endpoints

## Final Go-Live
- [ ] Custom domain configured (optional)
- [ ] SSL enabled (Render default)
- [ ] Supabase Site URL updated to production domain
- [ ] Sentry release/environment set (optional)
