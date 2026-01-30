# Phase 1 - UI & Integration

This project is designed to be deployed on **Render** with **GitHub** and **Supabase**.

## 1) Supabase setup

1. Create a Supabase project.
2. Run migrations:
   - In Supabase Dashboard → SQL Editor → run all files in `supabase/migrations` in order (see `supabase/migrations/000_MIGRATION_ORDER.md`).
3. Copy keys:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)

## 2) Email provider: Supabase Edge Functions + Resend

The app sends emails via an Edge Function (`send-email`) using **Resend**.

### 2.1 Create a Resend API key
- Create an API key in Resend
- Verify your sending domain (so `no-reply@manafzone.com` is allowed)

### 2.2 Deploy Edge Functions

Install Supabase CLI and login:

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

Set Edge Function secrets:

```bash
supabase secrets set RESEND_API_KEY=<YOUR_RESEND_API_KEY>
supabase secrets set EMAIL_FROM=no-reply@manafzone.com
supabase secrets set SUPABASE_URL=<YOUR_SUPABASE_URL>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>
supabase secrets set APP_URL=<YOUR_PUBLIC_SITE_URL>
# Used to protect the cron function:
supabase secrets set CRON_SECRET=<RANDOM_LONG_SECRET>
```

Deploy functions:

```bash
supabase functions deploy send-email
supabase functions deploy cart-abandonment
```

## 3) Cart abandonment emails (24 hours)

The Edge Function `cart-abandonment`:
- Looks for carts with **user_id** that were last updated **≥ 24 hours** ago
- Skips carts that have already received a recovery email (uses `cart_abandonment_snapshots`)
- Emails the user and writes a snapshot row

### 3.1 Schedule it

In Supabase Dashboard → Edge Functions → **Scheduled Functions** (or Cron), schedule a POST call to:
- Function: `cart-abandonment`
- Header: `x-cron-secret: <CRON_SECRET>`

Recommended frequency:
- every 1 hour (so users get the email soon after the 24h mark)

## 4) Render deployment

### 4.1 Connect GitHub
- Create a new Render Web Service from your repo
- Render will use `render.yaml`

### 4.2 Environment variables (Render)
Set these in Render:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SITE_URL` (your public URL)
- `APP_URL` (same as SITE_URL)
- `EMAIL_PROVIDER=supabase_resend`
- `EMAIL_FROM=no-reply@manafzone.com`

## 5) Verify

- Customer flow: products → cart → checkout → orders
- Customer dashboard: `/dashboard`
- Admin dashboards:
  - `/admin/dashboard`
  - `/admin/insights`
  - `/admin/notifications`
  - `/admin/settings`
