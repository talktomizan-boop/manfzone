-- =====================================================
-- App Schema Compatibility & Production Hardening
--
-- This migration is intentionally **additive** (or minimally invasive) and
-- focuses on aligning the database schema with the production application
-- queries without changing UI/UX behavior.
--
-- Key fixes:
-- 1) Orders: add `payment_status`, `refunded_at`, and a `total_amount` alias.
-- 2) Order items: add `product_name_snapshot` alias used by admin UI.
-- 3) Inventory: make `available_quantity` writable (admin UI upserts it).
-- 4) Uniqueness: add partial unique indexes for nullable-unique patterns
--    that break `.single()` queries and PostgREST upserts.
-- 5) Coupons: add compatibility columns expected by checkout/marketing flows.
-- 6) Enum extension: add `completed` to order_status to avoid enum cast errors.
-- =====================================================

-- Ensure pgcrypto is available for gen_random_uuid() used in later migrations
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------
-- 1) ORDER STATUS ENUM: add missing value used in code
-- -----------------------------------------------------
DO $$
BEGIN
  -- Prevent "invalid input value for enum order_status: completed" errors
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'order_status'
      AND e.enumlabel = 'completed'
  ) THEN
    ALTER TYPE order_status ADD VALUE 'completed';
  END IF;
END $$;

-- -----------------------------------------------------
-- 2) ORDERS: add payment_status/refunded_at + total_amount alias
-- -----------------------------------------------------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Guardrail: only allow known payment states on orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_payment_status_check'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_payment_status_check
      CHECK (payment_status IN ('pending','paid','processing','succeeded','failed','refunded'));
  END IF;
END $$;

-- Alias used by analytics/admin pages
-- Prefer a generated column to keep it always consistent with `total`.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='orders'
      AND column_name='total_amount'
  ) THEN
    EXECUTE 'ALTER TABLE public.orders ADD COLUMN total_amount NUMERIC(10,2) GENERATED ALWAYS AS (total) STORED';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- -----------------------------------------------------
-- 3) ORDER ITEMS: snapshot alias used by admin UI
-- -----------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='order_items'
      AND column_name='product_name_snapshot'
  ) THEN
    EXECUTE 'ALTER TABLE public.order_items ADD COLUMN product_name_snapshot TEXT GENERATED ALWAYS AS (product_name) STORED';
  END IF;
END $$;

-- Optional: future-proof
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='order_items'
      AND column_name='variant_name_snapshot'
  ) THEN
    EXECUTE 'ALTER TABLE public.order_items ADD COLUMN variant_name_snapshot TEXT GENERATED ALWAYS AS (COALESCE(variant_name, '''')) STORED';
  END IF;
END $$;

-- -----------------------------------------------------
-- 4) INVENTORY: make available_quantity writable
--
-- Admin UI upserts `available_quantity`, but the initial schema defined it as a
-- generated column, which is not writable and breaks upsert.
--
-- Strategy:
-- - If available_quantity is generated, drop the generation expression.
-- - Add a trigger to keep available_quantity in sync with quantity/reserved.
-- - Add partial unique indexes so PostgREST upserts + .single() are reliable.
-- -----------------------------------------------------

DO $$
DECLARE
  gen CHAR;
BEGIN
  SELECT a.attgenerated INTO gen
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public'
    AND c.relname='inventory'
    AND a.attname='available_quantity'
    AND a.attnum > 0;

  IF gen = 's' THEN
    -- Convert stored generated column into a regular column (keeps existing values)
    EXECUTE 'ALTER TABLE public.inventory ALTER COLUMN available_quantity DROP EXPRESSION';
  END IF;

  -- Ensure NOT NULL/default/check for safety
  EXECUTE 'ALTER TABLE public.inventory ALTER COLUMN available_quantity SET DEFAULT 0';
  EXECUTE 'ALTER TABLE public.inventory ALTER COLUMN available_quantity SET NOT NULL';

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_available_quantity_check'
  ) THEN
    EXECUTE 'ALTER TABLE public.inventory ADD CONSTRAINT inventory_available_quantity_check CHECK (available_quantity >= 0)';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    -- Inventory table not present (should not happen in this project)
    NULL;
END $$;

-- Sync trigger function
CREATE OR REPLACE FUNCTION public.sync_inventory_available_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If available_quantity was explicitly changed (admin UI), adjust quantity.
  IF TG_OP = 'UPDATE' THEN
    IF NEW.available_quantity IS DISTINCT FROM OLD.available_quantity
       AND NEW.quantity = OLD.quantity
       AND NEW.reserved_quantity = OLD.reserved_quantity THEN
      NEW.quantity := GREATEST(NEW.available_quantity + NEW.reserved_quantity, 0);
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    -- On insert, treat available_quantity as the desired available stock.
    -- If quantity wasn't explicitly set (default 0) but available_quantity is,
    -- promote it to quantity.
    IF NEW.quantity = 0 AND NEW.reserved_quantity = 0 AND NEW.available_quantity <> 0 THEN
      NEW.quantity := GREATEST(NEW.available_quantity, 0);
    END IF;
  END IF;

  -- Always keep available_quantity consistent
  NEW.available_quantity := GREATEST(NEW.quantity - NEW.reserved_quantity, 0);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_sync_inventory_available_quantity'
  ) THEN
    CREATE TRIGGER trg_sync_inventory_available_quantity
    BEFORE INSERT OR UPDATE ON public.inventory
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_inventory_available_quantity();
  END IF;
END $$;

-- Partial unique indexes for reliable upsert/single() patterns
-- (product-level inventory rows)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_unique_product
  ON public.inventory(product_id)
  WHERE variant_id IS NULL;

-- (variant-level inventory rows)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_unique_variant
  ON public.inventory(variant_id)
  WHERE product_id IS NULL;

-- -----------------------------------------------------
-- 5) CARTS/CART_ITEMS/WISHLISTS: fix nullable unique pitfalls
-- -----------------------------------------------------

-- One active cart per user and one per guest session
CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_unique_user
  ON public.carts(user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_unique_session
  ON public.carts(session_id)
  WHERE session_id IS NOT NULL;

-- Prevent duplicates for product-only cart items (variant_id NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_unique_product_no_variant
  ON public.cart_items(cart_id, product_id)
  WHERE variant_id IS NULL;

-- Prevent duplicates for wishlist entries (variant_id NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlists_unique_product_no_variant
  ON public.wishlists(user_id, product_id)
  WHERE variant_id IS NULL;

-- -----------------------------------------------------
-- 6) COUPONS: compatibility columns expected by app code
-- -----------------------------------------------------

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS discount_type TEXT,
  ADD COLUMN IF NOT EXISTS min_subtotal NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS max_discount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_uses INTEGER,
  ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_uses INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_to TIMESTAMPTZ;

-- Backfill compatibility columns from the original schema where possible
UPDATE public.coupons
SET
  discount_type = COALESCE(discount_type,
    CASE
      WHEN type = 'percentage' THEN 'percent'
      WHEN type = 'fixed_amount' THEN 'fixed'
      ELSE NULL
    END
  ),
  min_subtotal = COALESCE(min_subtotal, min_purchase_amount),
  max_discount = COALESCE(max_discount, max_discount_amount),
  starts_at = COALESCE(starts_at, valid_from),
  ends_at = COALESCE(ends_at, valid_until),
  valid_to = COALESCE(valid_to, valid_until),
  max_uses = COALESCE(max_uses, usage_limit),
  used_count = COALESCE(used_count, usage_count, 0),
  current_uses = COALESCE(current_uses, usage_count, used_count, 0),
  -- The app expects `discount_value` to hold the percent value for percent coupons.
  -- Legacy schema stored this in `discount_percentage`.
  discount_value = CASE
    WHEN type = 'percentage' AND (discount_value IS NULL OR discount_value = 0) AND discount_percentage IS NOT NULL
      THEN discount_percentage
    ELSE discount_value
  END
WHERE TRUE;

-- Keep legacy counters in sync when app uses used_count/current_uses
CREATE OR REPLACE FUNCTION public.sync_coupon_usage_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.used_count := COALESCE(NEW.used_count, 0);
  NEW.current_uses := COALESCE(NEW.current_uses, NEW.used_count, 0);
  -- Mirror into legacy column
  NEW.usage_count := COALESCE(NEW.usage_count, NEW.used_count, NEW.current_uses, 0);
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_sync_coupon_usage_counters'
  ) THEN
    CREATE TRIGGER trg_sync_coupon_usage_counters
    BEFORE INSERT OR UPDATE ON public.coupons
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_coupon_usage_counters();
  END IF;
END $$;

-- Guardrail for discount_type if used
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='coupons_discount_type_check'
  ) THEN
    ALTER TABLE public.coupons
      ADD CONSTRAINT coupons_discount_type_check
      CHECK (discount_type IS NULL OR discount_type IN ('percent','fixed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coupons_discount_type ON public.coupons(discount_type);
