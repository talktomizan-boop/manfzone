-- Runtime Auth + RLS Fixes (idempotent)
-- Apply in Supabase SQL editor for existing projects that missed policy migration execution.

-- 1) Ensure helper exists for admin checks
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
      and coalesce(p.is_active, true) = true
      and p.deleted_at is null
  );
$$;

grant execute on function public.is_admin() to anon, authenticated, service_role;

-- 2) Auto-create profile rows on signup (avoids login/admin failures when profile is missing)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, is_active, email_verified)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'customer',
    true,
    new.email_confirmed_at is not null
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
        email_verified = excluded.email_verified;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Ensure RLS is enabled for core auth/commerce tables
alter table if exists public.profiles enable row level security;
alter table if exists public.products enable row level security;
alter table if exists public.inventory enable row level security;
alter table if exists public.carts enable row level security;
alter table if exists public.cart_items enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.order_items enable row level security;

-- 4) Core profile access policies
 drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

 drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

 drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

 drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

 drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- 5) Product read/write policies
 drop policy if exists "Anyone can view active products" on public.products;
create policy "Anyone can view active products"
  on public.products for select
  using (is_active = true and deleted_at is null);

 drop policy if exists "Admins can view all products" on public.products;
create policy "Admins can view all products"
  on public.products for select
  using (public.is_admin());

 drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

-- Inventory required for admin product add/edit stock
 drop policy if exists "Anyone can view inventory" on public.inventory;
create policy "Anyone can view inventory"
  on public.inventory for select
  using (true);

 drop policy if exists "Admins can manage inventory" on public.inventory;
create policy "Admins can manage inventory"
  on public.inventory for all
  using (public.is_admin())
  with check (public.is_admin());

-- 6) Cart + cart_items policies (authenticated + guest)
 drop policy if exists "Users can manage own cart" on public.carts;
create policy "Users can manage own cart"
  on public.carts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

 drop policy if exists "Guests can manage cart by session" on public.carts;
create policy "Guests can manage cart by session"
  on public.carts for all
  using (user_id is null and session_id is not null)
  with check (user_id is null and session_id is not null);

 drop policy if exists "Users can manage own cart items" on public.cart_items;
create policy "Users can manage own cart items"
  on public.cart_items for all
  using (
    exists (
      select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()
    )
  );

 drop policy if exists "Guests can manage cart items" on public.cart_items;
create policy "Guests can manage cart items"
  on public.cart_items for all
  using (
    exists (
      select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id is null and c.session_id is not null
    )
  )
  with check (
    exists (
      select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id is null and c.session_id is not null
    )
  );

-- 7) Order + order_items policies for checkout flow
 drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());

 drop policy if exists "Users can create orders" on public.orders;
create policy "Users can create orders"
  on public.orders for insert
  with check (
    (auth.uid() is not null and auth.uid() = user_id)
    or user_id is null
  );

 drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

 drop policy if exists "Users can view own order items" on public.order_items;
create policy "Users can view own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o where o.id = order_items.order_id and (o.user_id = auth.uid() or public.is_admin())
    )
  );

 drop policy if exists "Users/Admins can create order items" on public.order_items;
create policy "Users/Admins can create order items"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o where o.id = order_items.order_id and (
        public.is_admin() or (o.user_id = auth.uid()) or o.user_id is null
      )
    )
  );

-- 8) Schema hardening for role-based access
alter table if exists public.profiles
  add column if not exists role text default 'customer';

alter table if exists public.profiles
  add column if not exists is_active boolean default true;

-- 9) Storage bucket + policies for product images (idempotent)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public can read product images
 drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Admins can upload/update/delete product images
 drop policy if exists "Admins manage product images" on storage.objects;
create policy "Admins manage product images"
  on storage.objects for all
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());
