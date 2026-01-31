-- Hotfix: Reviews policy cleanup (safe to run on production)
-- Purpose: Ensure only approved reviews are publicly readable.
-- This does NOT modify data; it only redefines the SELECT policy on reviews.

-- Enable RLS if not already enabled.
alter table if exists public.reviews enable row level security;

-- Drop the existing policy (if any) to avoid duplicate or invalid definitions.
drop policy if exists "Anyone can view approved reviews" on public.reviews;

-- Recreate with the correct column: is_approved (boolean).
create policy "Anyone can view approved reviews"
  on public.reviews for select
  using (is_approved = true);
