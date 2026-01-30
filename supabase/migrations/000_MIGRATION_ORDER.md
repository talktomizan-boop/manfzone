# Supabase Migration Files - Execution Order

## ✅ ALL MIGRATION ERRORS FIXED - READY TO RUN

All migration files have been fixed and are now production-ready. You can execute them without any errors.

## Important: Read This First

This document explains the correct order to execute the migration files when setting up your Supabase database.

## Prerequisites

Before running any migrations:

1. **Enable Supabase Integration** in your Dazl project settings
2. **Configure Environment Variables**:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

## Migration Execution Order

Execute migrations in this exact order (file-name order):

1. **001_initial_schema.sql** - Core database tables and structure
2. **002_row_level_security.sql** - Security policies and RLS
3. **003_seed_data.sql** - Sample/initial data
4. **004_admin_governance_extensions.sql** - Admin features (orders state machine, warehouses, admin sessions, etc.)
5. **005_marketing_automation_extensions.sql** - Marketing/analytics extensions (feature flags, A/B, funnels, etc.)
6. **006_rls_policies_extensions.sql** - Extended security policies for the extension tables
7. **007_homepage_cms_system.sql** - Homepage CMS core tables
8. **008_homepage_rls_policies.sql** - Homepage CMS RLS policies
9. **009_homepage_active_config_rpc.sql** - RPC used by the homepage loader (**required**)
10. **009_search_products_rpc.sql** - Product search RPC (recommended)
11. **010_app_schema_compatibility.sql** - Compatibility columns + hardening (orders payment_status/total_amount, inventory upsert fix, etc.)
12. **011_homepage_cms_additional_tables.sql** - Additional homepage CMS tables (trust signals, flash sales, content blocks, etc.)
13. **012_role_permissions_and_rpcs.sql** - Optional admin permission mapping + `check_user_permission` RPC
14. **013_feature_completeness_fixes.sql** - Fixes missing RPCs + compatibility columns for optional services
15. **20260118_create_profiles_and_trigger.sql** - Ensures profiles row auto-creation on sign-up
16. **20260121_store_settings.sql** - Store settings (admin configurable)
17. **20260121_email_outbox.sql** - Email outbox table for transactional mail
18. **20260121_coupons_and_promotions.sql** - Coupon redemption + promotion helpers (optional, but enables coupon tracking)

## How to Run Migrations

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of each migration file in order
4. Execute each migration one at a time
5. Verify no errors before proceeding to the next migration

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

## Troubleshooting

### If you encounter errors:

1. **Foreign Key Constraint Errors**: 
   - Ensure migrations are run in the correct order
   - Check that referenced tables exist before creating dependent tables

2. **Already Exists Errors**:
   - Use `CREATE TABLE IF NOT EXISTS` statements
   - Drop and recreate if necessary (only in development)

3. **Permission Errors**:
   - Ensure your Supabase user has proper permissions
   - Run migrations with a service role key if needed

## Post-Migration Steps

After all migrations complete successfully:

1. Verify all tables are created: Check in Supabase Dashboard → Database → Tables
2. Test RLS policies: Try accessing data with different user roles
3. Verify seed data: Check that sample products, categories, etc. exist
4. Update your application's Supabase client configuration

## Resetting Database (Development Only)

If you need to start fresh:

```sql
-- WARNING: This will delete ALL data
-- Only run in development environments

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Then re-run all migrations in order.

## Notes

- Migration files are idempotent where possible (using IF NOT EXISTS)
- Some migrations may take several minutes to complete
- Monitor the Supabase dashboard for any constraint violations
- Always backup your database before running migrations in production
