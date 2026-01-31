-- migrate:up
-- Consolidated RBAC policies for auth, orders, and admin features.

-- =========================================================
-- 1) Helper functions
-- =========================================================

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
      and is_active = true
      and deleted_at is null
  );
end;
$$;

create or replace function public.is_super_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and is_active = true
      and deleted_at is null
  );
end;
$$;

-- =========================================================
-- 2) Profiles
-- =========================================================

alter table if exists public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;
drop policy if exists "Super admins can delete profiles" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );

create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "Admins can update profiles"
  on public.profiles for update
  using (public.is_admin());

create policy "Super admins can delete profiles"
  on public.profiles for delete
  using (public.is_super_admin());

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- =========================================================
-- 3) Addresses
-- =========================================================

alter table if exists public.addresses enable row level security;

drop policy if exists "Users can manage own addresses" on public.addresses;
drop policy if exists "Admins can view all addresses" on public.addresses;

create policy "Users can manage own addresses"
  on public.addresses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can view all addresses"
  on public.addresses for select
  using (public.is_admin());

-- =========================================================
-- 4) Carts
-- =========================================================

alter table if exists public.carts enable row level security;

drop policy if exists "Users can view own carts" on public.carts;
drop policy if exists "Users can manage own carts" on public.carts;
drop policy if exists "Admins can view all carts" on public.carts;

create policy "Users can view own carts"
  on public.carts for select
  using (auth.uid() = user_id or session_id is not null);

create policy "Users can manage own carts"
  on public.carts for all
  using (auth.uid() = user_id or session_id is not null)
  with check (auth.uid() = user_id or session_id is not null);

create policy "Admins can view all carts"
  on public.carts for select
  using (public.is_admin());

-- =========================================================
-- 5) Cart items
-- =========================================================

alter table if exists public.cart_items enable row level security;

drop policy if exists "Users can manage own cart items" on public.cart_items;
drop policy if exists "Admins can view all cart items" on public.cart_items;

create policy "Users can manage own cart items"
  on public.cart_items for all
  using (
    exists (
      select 1 from public.carts
      where public.carts.id = public.cart_items.cart_id
        and (public.carts.user_id = auth.uid() or public.carts.session_id is not null)
    )
  )
  with check (
    exists (
      select 1 from public.carts
      where public.carts.id = public.cart_items.cart_id
        and (public.carts.user_id = auth.uid() or public.carts.session_id is not null)
    )
  );

create policy "Admins can view all cart items"
  on public.cart_items for select
  using (public.is_admin());

-- =========================================================
-- 6) Orders
-- =========================================================

alter table if exists public.orders enable row level security;

drop policy if exists "Users can view own orders" on public.orders;
drop policy if exists "Users can create orders" on public.orders;
drop policy if exists "Admins can view all orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;

create policy "Users can view own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Users can create orders"
  on public.orders for insert
  with check (auth.uid() = user_id or user_id is null);

create policy "Admins can view all orders"
  on public.orders for select
  using (public.is_admin());

create policy "Admins can update orders"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================
-- 7) Order items
-- =========================================================

alter table if exists public.order_items enable row level security;

drop policy if exists "Users can view own order items" on public.order_items;
drop policy if exists "Admins can manage order items" on public.order_items;

create policy "Users can view own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where public.orders.id = public.order_items.order_id
        and public.orders.user_id = auth.uid()
    )
  );

create policy "Admins can manage order items"
  on public.order_items for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================
-- 8) Payments
-- =========================================================

alter table if exists public.payments enable row level security;

drop policy if exists "Users can view own payments" on public.payments;
drop policy if exists "Admins can manage payments" on public.payments;

create policy "Users can view own payments"
  on public.payments for select
  using (
    exists (
      select 1 from public.orders
      where public.orders.id = public.payments.order_id
        and public.orders.user_id = auth.uid()
    )
  );

create policy "Admins can manage payments"
  on public.payments for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================
-- 9) Wishlists
-- =========================================================

alter table if exists public.wishlists enable row level security;

drop policy if exists "Users can manage own wishlist" on public.wishlists;

create policy "Users can manage own wishlist"
  on public.wishlists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================================================
-- 10) Reviews  ✅ FIXED
-- =========================================================

alter table if exists public.reviews enable row level security;

drop policy if exists "Anyone can view approved reviews" on public.reviews;
drop policy if exists "Users can create reviews" on public.reviews;
drop policy if exists "Users can update own reviews" on public.reviews;
drop policy if exists "Users can delete own reviews" on public.reviews;
drop policy if exists "Admins can manage reviews" on public.reviews;

create policy "Anyone can view approved reviews"
  on public.reviews for select
  using (is_approved = true);

create policy "Users can create reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reviews"
  on public.reviews for update
  using (auth.uid() = user_id);

create policy "Users can delete own reviews"
  on public.reviews for delete
  using (auth.uid() = user_id);

create policy "Admins can manage reviews"
  on public.reviews for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================
-- 11) Feature flags & settings
-- =========================================================

alter table if exists public.feature_flags enable row level security;

drop policy if exists "Anyone can view enabled features" on public.feature_flags;
drop policy if exists "Admins can manage feature flags" on public.feature_flags;

create policy "Anyone can view enabled features"
  on public.feature_flags for select
  using (is_enabled = true);

create policy "Admins can manage feature flags"
  on public.feature_flags for all
  using (public.is_admin())
  with check (public.is_admin());

alter table if exists public.store_settings enable row level security;

drop policy if exists "Admins can manage store settings" on public.store_settings;
drop policy if exists "Admins can view store settings" on public.store_settings;

create policy "Admins can view store settings"
  on public.store_settings for select
  using (public.is_admin());

create policy "Admins can manage store settings"
  on public.store_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================
-- 12) Admin notifications & insights
-- =========================================================

alter table if exists public.admin_notifications enable row level security;

drop policy if exists "Admins can view own notifications" on public.admin_notifications;
drop policy if exists "Admins can manage notifications" on public.admin_notifications;

create policy "Admins can view own notifications"
  on public.admin_notifications for select
  using (public.is_admin() and recipient_user_id = auth.uid());

create policy "Admins can manage notifications"
  on public.admin_notifications for update
  using (public.is_admin() and recipient_user_id = auth.uid());

alter table if exists public.admin_insights enable row level security;

drop policy if exists "Admins can view insights" on public.admin_insights;
drop policy if exists "Admins can manage insights" on public.admin_insights;

create policy "Admins can view insights"
  on public.admin_insights for select
  using (public.is_admin());

create policy "Admins can manage insights"
  on public.admin_insights for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================
-- 13) Loyalty points
-- =========================================================

alter table if exists public.customer_loyalty_points enable row level security;

drop policy if exists "Users can view own loyalty points" on public.customer_loyalty_points;
drop policy if exists "Admins can manage loyalty points" on public.customer_loyalty_points;

create policy "Users can view own loyalty points"
  on public.customer_loyalty_points for select
  using (auth.uid() = user_id);

create policy "Admins can manage loyalty points"
  on public.customer_loyalty_points for all
  using (public.is_admin())
  with check (public.is_admin());


-- migrate:down
-- IMPORTANT:
-- Do NOT drop public.is_admin() / public.is_super_admin() here.
-- They are used by many other existing RLS policies across your schema.
-- Dropping them would break those features and Postgres will block it.

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;
drop policy if exists "Super admins can delete profiles" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

drop policy if exists "Users can manage own addresses" on public.addresses;
drop policy if exists "Admins can view all addresses" on public.addresses;

drop policy if exists "Users can view own carts" on public.carts;
drop policy if exists "Users can manage own carts" on public.carts;
drop policy if exists "Admins can view all carts" on public.carts;

drop policy if exists "Users can manage own cart items" on public.cart_items;
drop policy if exists "Admins can view all cart items" on public.cart_items;

drop policy if exists "Users can view own orders" on public.orders;
drop policy if exists "Users can create orders" on public.orders;
drop policy if exists "Admins can view all orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;

drop policy if exists "Users can view own order items" on public.order_items;
drop policy if exists "Admins can manage order items" on public.order_items;

drop policy if exists "Users can view own payments" on public.payments;
drop policy if exists "Admins can manage payments" on public.payments;

drop policy if exists "Users can manage own wishlist" on public.wishlists;

drop policy if exists "Anyone can view approved reviews" on public.reviews;
drop policy if exists "Users can create reviews" on public.reviews;
drop policy if exists "Users can update own reviews" on public.reviews;
drop policy if exists "Users can delete own reviews" on public.reviews;
drop policy if exists "Admins can manage reviews" on public.reviews;

drop policy if exists "Anyone can view enabled features" on public.feature_flags;
drop policy if exists "Admins can manage feature flags" on public.feature_flags;

drop policy if exists "Admins can view store settings" on public.store_settings;
drop policy if exists "Admins can manage store settings" on public.store_settings;

drop policy if exists "Admins can view own notifications" on public.admin_notifications;
drop policy if exists "Admins can manage notifications" on public.admin_notifications;

drop policy if exists "Admins can view insights" on public.admin_insights;
drop policy if exists "Admins can manage insights" on public.admin_insights;

drop policy if exists "Users can view own loyalty points" on public.customer_loyalty_points;
drop policy if exists "Admins can manage loyalty points" on public.customer_loyalty_points;
