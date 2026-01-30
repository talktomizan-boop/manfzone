# Supabase Database Setup Guide

## Current Issue

Your Admin Dashboard is showing "Loading" or "Processing" indefinitely because:

1. **Supabase is not enabled** in your Dazl project
2. **No database connection** is configured
3. **No environment variables** are set for Supabase

## Quick Fix Options

### Option 1: Use Mock Data (Currently Implemented)

The Admin Dashboard is now configured to work with mock data stored in browser memory. This means:

✅ All admin features work immediately  
✅ No database setup required  
✅ Great for development and testing  
✅ Changes persist during the session  
⚠️ Data is lost when you refresh the page  

**No action needed** - your dashboard is already functional with mock data.

---

### Option 2: Connect to Supabase (Production Setup)

Follow these steps to connect your application to a real Supabase database:

#### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in project details:
   - Project Name: `my-ecommerce-store`
   - Database Password: (choose a strong password and save it)
   - Region: Choose closest to your users
5. Wait for the project to be created (~2 minutes)

#### Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, click "Settings" (gear icon)
2. Go to "API" section
3. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

#### Step 3: Configure Environment Variables in Dazl

1. In your Dazl project, go to Settings or Environment Variables
2. Add two new environment variables:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Save the configuration

#### Step 4: Run Database Migrations

Now you need to create all the database tables. You have two options:

##### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "+ New Query"
4. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
5. Paste it into the SQL editor
6. Click "Run" (or press Ctrl+Enter)
7. Wait for it to complete successfully
8. Repeat steps 3-7 for each migration file in order:
   - `002_row_level_security.sql`
   - `003_seed_data.sql`
   - `004_admin_governance_extensions.sql`
   - `005_marketing_automation_extensions.sql`
   - `006_rls_policies_extensions.sql`
   - `007_homepage_cms_system.sql`
   - `008_homepage_rls_policies.sql`

> ⚠️ **Important:** Only the files inside `supabase/migrations/*.sql` belong in the Supabase **SQL Editor**.  
> Do **not** paste any of the following into SQL Editor (they are not SQL files):  
> - `supabase/config.toml` (CLI config)  
> - `supabase/functions/**` (Edge Function TypeScript)  
> - `supabase/rls-policy-templates.sql` (reference-only templates)

##### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project (get project ref from dashboard URL)
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

#### Step 4.1: Deploy Edge Functions (if using email automation)
The `supabase/functions/**` files are **Edge Functions** (TypeScript) and must be deployed with the CLI:
```bash
supabase functions deploy send-email
supabase functions deploy process-email-outbox
supabase functions deploy cart-abandonment
```

Set Edge Function secrets:
```bash
supabase secrets set \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  EMAIL_FROM=... \
  RESEND_API_KEY=... \
  APP_URL=... \
  CRON_SECRET=...
```

#### Step 5: Enable Supabase Integration in Dazl

1. In Dazl project settings, find "Integrations"
2. Enable "Supabase"
3. Save settings

#### Step 6: Update Application Code

The application needs to switch from mock data to real Supabase data:

1. In each admin page file, change imports from:
   ```typescript
   import { mockDataStore } from '~/services/mock-data.service';
   ```
   to:
   ```typescript
   import { supabase } from '~/lib/supabase.client';
   ```

2. Replace mock data calls with Supabase queries (examples provided below)

#### Step 7: Verify Connection

1. Reload your application
2. Go to Admin Dashboard
3. If you see the sample data from the migrations, you're connected!
4. Try creating a new product - it should now persist across page refreshes

---

## Migration File Overview

Here's what each migration does:

- **001_initial_schema.sql** (Required)
  - Creates all core tables: products, orders, customers, inventory, payments
  - Sets up indexes for performance
  - Creates triggers for auto-updates

- **002_row_level_security.sql** (Required)
  - Enables Row Level Security (RLS)
  - Creates security policies for each table
  - Ensures users can only see their own data

- **003_seed_data.sql** (Recommended)
  - Adds sample products, categories, and banners
  - Populates inventory with stock levels
  - Creates sample coupons

- **004_admin_governance_extensions.sql** (Optional)
  - Advanced admin permissions
  - Multi-warehouse inventory
  - Product workflow and approvals

- **005_marketing_automation_extensions.sql** (Optional)
  - Promotion campaigns
  - Referral program
  - Analytics and automation rules

- **006_rls_policies_extensions.sql** (Optional)
  - Extended security policies for new tables

- **007_homepage_cms_system.sql** (Optional)
  - Homepage content management
  - Banners, hero slides, featured products
  - A/B testing support

- **008_homepage_rls_policies.sql** (Optional)
  - Security policies for homepage CMS

**Minimum Setup**: Run migrations 001, 002, and 003 only.

---

## Code Examples: Switching from Mock Data to Supabase

### Example 1: Fetching Products

**Before (Mock Data):**
```typescript
const products = await mockDataStore.products.getAll();
```

**After (Supabase):**
```typescript
const { data: products, error } = await supabase
  .from('products')
  .select('*')
  .eq('deleted_at', null)
  .order('created_at', { ascending: false });
```

### Example 2: Creating a Product

**Before (Mock Data):**
```typescript
const newProduct = await mockDataStore.products.create({
  name: 'New Product',
  price: 99.99,
  // ... other fields
});
```

**After (Supabase):**
```typescript
const { data: newProduct, error } = await supabase
  .from('products')
  .insert({
    name: 'New Product',
    base_price: 99.99,
    // ... other fields
  })
  .select()
  .single();
```

### Example 3: Updating a Product

**Before (Mock Data):**
```typescript
await mockDataStore.products.update(productId, {
  name: 'Updated Name',
  is_featured: true,
});
```

**After (Supabase):**
```typescript
const { error } = await supabase
  .from('products')
  .update({
    name: 'Updated Name',
    is_featured: true,
    updated_at: new Date().toISOString(),
  })
  .eq('id', productId);
```

### Example 4: Deleting a Product

**Before (Mock Data):**
```typescript
await mockDataStore.products.delete(productId);
```

**After (Supabase):**
```typescript
// Soft delete (recommended)
const { error } = await supabase
  .from('products')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', productId);

// Or hard delete
const { error } = await supabase
  .from('products')
  .delete()
  .eq('id', productId);
```

---

## Troubleshooting

### Error: "relation does not exist"
- **Cause**: Migration files haven't been run or failed
- **Fix**: Run the migration files in order in Supabase SQL Editor

### Error: "permission denied"
- **Cause**: Row Level Security is blocking access
- **Fix**: Ensure user is authenticated or check RLS policies in migration 002

### Error: "foreign key violation"
- **Cause**: Referenced record doesn't exist
- **Fix**: Ensure parent records exist before creating child records

### Error: "invalid input syntax for type uuid"
- **Cause**: Invalid UUID format
- **Fix**: Use `gen_random_uuid()` or ensure UUIDs are properly formatted

### Admin Dashboard still showing "Loading"
- **Cause**: Supabase credentials not configured or incorrect
- **Fix**: 
  1. Check environment variables are set correctly
  2. Verify Supabase URL and key are correct
  3. Check browser console for errors
  4. Ensure Supabase project is not paused

---

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Check Supabase logs: Dashboard → Logs
3. Verify all migrations ran successfully
4. Ensure environment variables are correct
5. Try the mock data mode first to isolate database issues

---

## Summary

**Current State**: Admin Dashboard works with mock data (no setup needed)

**To Go Live**: 
1. Create Supabase project
2. Add environment variables
3. Run migrations
4. Switch code from mock data to Supabase queries

**Time Required**: ~30 minutes for full Supabase setup
