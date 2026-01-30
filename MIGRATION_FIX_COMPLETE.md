# Supabase Migrations - Ready for Deployment

## What's included
This project ships with a complete Supabase migration set under `supabase/migrations/`.

### Run order (recommended)
1. `001_initial_schema.sql`
2. `002_row_level_security.sql`
3. `003_seed_data.sql`
4. `004_admin_governance_extensions.sql`
5. `005_marketing_automation_extensions.sql`
6. `006_rls_policies_extensions.sql`
7. `007_homepage_cms_system.sql`
8. `008_homepage_rls_policies.sql`
9. `009_search_products_rpc.sql` (optional but recommended)
10. `20260118_create_profiles_and_trigger.sql` (recommended — auto-creates `profiles` rows on sign-up)

### Verification
Optional read-only checks live in:
- `supabase/migrations/verification/999999_verification_readonly_checks.sql`

## How to apply
### Option A — Supabase Dashboard (simplest)
Supabase Dashboard → **SQL Editor** → run each file (top to bottom) in the order above.

### Option B — Supabase CLI
If you're using the Supabase CLI, keep the same order. The CLI will apply migrations in filename order.

## Notes
- The app expects these environment variables at runtime:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- After migrations, create a user account and you should see the profile page populate correctly.
