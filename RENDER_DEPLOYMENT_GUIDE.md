# Deploy Manaf Zone on GitHub + Render + Supabase

This project is designed to deploy cleanly as a **Render Web Service** with Supabase as the backend.

## 1) Supabase setup

### Create a Supabase project
1. Create a new Supabase project.
2. In **Project Settings -> API**, copy:
   - **Project URL**
   - **anon public key**

### Run database migrations
Run the SQL migrations in this order from `supabase/migrations/`:
1. `001_initial_schema.sql`
2. `002_row_level_security.sql`
3. `003_seed_data.sql`
4. `004_admin_governance_extensions.sql`
5. `005_marketing_automation_extensions.sql`
6. `006_rls_policies_extensions.sql`
7. `007_homepage_cms_system.sql`
8. `008_homepage_rls_policies.sql`
9. `009_search_products_rpc.sql` (optional but recommended)
10. `20260118_create_profiles_and_trigger.sql` (recommended)

**How to run:**
- Supabase Dashboard -> **SQL Editor** -> paste each file -> Run (one at a time, in order)

> Note: The project includes `supabase/config.toml` for Supabase CLI users.

## 2) Environment variables

For local dev, copy `.env.example` -> `.env` and fill in values.

For Render, set these environment variables:
- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_ANON_KEY` = your Supabase anon public key
- `SITE_NAME` = `Manaf Zone` (optional)
- `SITE_URL` = your deployed Render URL (optional, but recommended)

## 3) Deploy to GitHub

1. Unzip the project and push it to a GitHub repo.
2. Ensure your repo includes:
   - `render.yaml` (included)
   - `package.json` / `package-lock.json`
   - `supabase/migrations/*`

## 4) Deploy on Render (Web Service)

### Option A: Blueprint (recommended)
1. In Render, choose **New -> Blueprint**.
2. Select your GitHub repo.
3. Render will read `render.yaml` and create the service.
4. Add the environment variables listed above.
5. Deploy.

### Option B: Manual Web Service
- Build Command: `npm install --no-audit --no-fund && npm run build`
- Start Command: `npm run start`

## 5) Supabase Auth + Profile page

This project includes a migration to ensure a `profiles` row exists for each signed-up user (`20260118_create_profiles_and_trigger.sql`).
If you skip it, the Profile page may show empty data until a profile row is created.
