# Manaf Zone — Production README

## Project Overview
Manaf Zone is a production-grade e-commerce storefront + admin panel built with React Router v7, Vite, and Supabase. The app ships with customer shopping flows (catalog, cart, checkout, orders) and admin tooling (products, orders, customers, insights). It is designed for deployment on Render with Supabase as the backend.

## Tech Stack
- **Frontend**: React 19, React Router v7, TypeScript, Vite
- **Backend**: Supabase (Postgres, Auth, Edge Functions)
- **Email**: Supabase Edge Function + Resend (recommended) or SMTP fallback
- **Observability**: Sentry (browser)
- **Hosting**: Render

## Local Setup
### Prerequisites
- Node.js **20.x** (see `package.json` engines)
- npm
- Supabase project

### Installation
```bash
npm install
```

### Environment Variables
Copy the template and fill in values:
```bash
cp .env.example .env
```

### Run the App
```bash
npm run dev
```
App runs at `http://localhost:5173`.

## Supabase Setup
### 1) Create the Project
Create a Supabase project and capture:
- **Project URL**
- **Anon key**
- **Service role key**

### 2) Run Migrations (In Order)
Apply SQL files in `supabase/migrations/` in order. The key milestones are:
1. `001_initial_schema.sql`
2. `002_row_level_security.sql`
3. `003_seed_data.sql`
4. `004_admin_governance_extensions.sql`
5. `005_marketing_automation_extensions.sql`
6. `006_rls_policies_extensions.sql`
7. `007_homepage_cms_system.sql`
8. `008_homepage_rls_policies.sql`
9. `20260118_create_profiles_and_trigger.sql` (ensures profiles rows for each user)

> ⚠️ **Important:** Only the `supabase/migrations/*.sql` files belong in the Supabase **SQL Editor**.  
> Do **not** paste `supabase/config.toml` or any `supabase/functions/**` TypeScript files into SQL Editor — those are CLI/config and Edge Function sources, not SQL.

### 3) Configure Auth
- **Authentication → Settings**: enable Email auth
- **URL Configuration**: add your Render URL for Site URL + Redirect URLs

### 4) Storage (Optional)
If using product images in Supabase Storage, create a bucket named `product-images` with public read.

### 5) Deploy Edge Functions (Required for email + automation)
These functions are **not** SQL migrations. Deploy them with the Supabase CLI:
```bash
supabase functions deploy send-email
supabase functions deploy process-email-outbox
supabase functions deploy cart-abandonment
```

Set function secrets (example):
```bash
supabase secrets set \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  EMAIL_FROM=... \
  RESEND_API_KEY=... \
  APP_URL=... \
  CRON_SECRET=...
```

## Render Deployment
### Build + Start Commands
Use the defaults from `render.yaml`:
- **Build**: `npm install --no-audit --no-fund && npm run build`
- **Start**: `npm run start`

### Required Environment Variables
At minimum:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`
- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `RESEND_API_KEY` (if using `EMAIL_PROVIDER=supabase_resend`)

Optional (recommended):
- `VITE_SENTRY_DSN`
- `SMOKE_TEST_SECRET` (secure invoice/order preview endpoints)
- `CRON_SECRET` (Edge Function cron tasks)

### Deploy Validation
After deploy, run:
```bash
APP_URL=https://your-app.onrender.com npm run validate:deploy
```

## Common Issues & Fixes
1. **Profiles missing** (errors like `PGRST116` or FK failures)
   - Run `supabase/migrations/20260118_create_profiles_and_trigger.sql` to ensure profile rows are created on signup.
2. **Health check fails**
   - Confirm `SUPABASE_URL` + `SUPABASE_ANON_KEY` are set in Render.
3. **Invoice preview endpoints return 401**
   - Set `SMOKE_TEST_SECRET` in Render and pass header `x-smoke-test-secret`.
4. **Emails not sending**
   - Set `EMAIL_PROVIDER=supabase_resend` and configure `SUPABASE_SERVICE_ROLE_KEY` + `EMAIL_FROM`, or configure SMTP vars.

## Production Checklist (Quick)
Use the full checklist in `DEPLOYMENT_CHECKLIST.md` before go-live.
