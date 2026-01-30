-- =====================================================
-- MIGRATION 013: FEATURE COMPLETENESS FIXES (FINAL)
-- =====================================================
-- Purpose:
--  - Add missing RPCs referenced by optional services (inventory reservations)
--  - Add small compatibility columns used by optional services
--  - Add FK-based relationships required by the order state machine service
--  - Add safe uniqueness constraints for `.single()` queries
--
-- IMPORTANT FIX:
--  - Postgres requires that after a parameter has a DEFAULT, all following params must also have DEFAULTs.
--    So we moved p_quantity BEFORE p_variant_id (which has DEFAULT NULL).
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1) Compatibility columns
-- -----------------------------------------------------

-- Some optional services select `products.price` (alias of base_price).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'price'
  ) THEN
    ALTER TABLE public.products
      ADD COLUMN price DECIMAL(10,2)
        GENERATED ALWAYS AS (base_price) STORED;
  END IF;
END $$;

-- Some optional services select `cart_items.unit_price` (alias of cart_items.price).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cart_items'
      AND column_name = 'unit_price'
  ) THEN
    ALTER TABLE public.cart_items
      ADD COLUMN unit_price DECIMAL(10,2)
        GENERATED ALWAYS AS (price) STORED;
  END IF;
END $$;

-- -----------------------------------------------------
-- 2) Warehouse inventory reservation RPCs
-- -----------------------------------------------------

-- Ensure the base (non-batch) rows are unique so `.single()` queries are safe.
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouse_inventory_unique_product_base
  ON public.warehouse_inventory(warehouse_id, product_id)
  WHERE variant_id IS NULL AND batch_number IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouse_inventory_unique_variant_base
  ON public.warehouse_inventory(warehouse_id, product_id, variant_id)
  WHERE variant_id IS NOT NULL AND batch_number IS NULL;

-- If you previously attempted a bad signature, clean it up safely.
DROP FUNCTION IF EXISTS public.increment_reserved_quantity(UUID, UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.decrement_reserved_quantity(UUID, UUID, UUID, INTEGER);

-- FIXED SIGNATURE: non-default param (p_quantity) comes before default param (p_variant_id)
CREATE OR REPLACE FUNCTION public.increment_reserved_quantity(
  p_warehouse_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_variant_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be a positive integer';
  END IF;

  -- Only allow authenticated users and service role.
  IF auth.role() NOT IN ('authenticated', 'service_role') THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.warehouse_inventory wi
  SET reserved_quantity = wi.reserved_quantity + p_quantity,
      updated_at = NOW()
  WHERE wi.warehouse_id = p_warehouse_id
    AND wi.product_id = p_product_id
    AND wi.variant_id IS NOT DISTINCT FROM p_variant_id
    AND wi.batch_number IS NULL
    AND (wi.quantity - wi.reserved_quantity) >= p_quantity;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Insufficient stock or inventory record not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_reserved_quantity(
  p_warehouse_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_variant_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be a positive integer';
  END IF;

  -- Only allow authenticated users and service role.
  IF auth.role() NOT IN ('authenticated', 'service_role') THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.warehouse_inventory wi
  SET reserved_quantity = wi.reserved_quantity - p_quantity,
      updated_at = NOW()
  WHERE wi.warehouse_id = p_warehouse_id
    AND wi.product_id = p_product_id
    AND wi.variant_id IS NOT DISTINCT FROM p_variant_id
    AND wi.batch_number IS NULL
    AND wi.reserved_quantity >= p_quantity;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Reservation not found or quantity underflow';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_reserved_quantity(UUID, UUID, INTEGER, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_reserved_quantity(UUID, UUID, INTEGER, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.increment_reserved_quantity(UUID, UUID, INTEGER, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_reserved_quantity(UUID, UUID, INTEGER, UUID) TO authenticated, service_role;

-- -----------------------------------------------------
-- 3) Order state machine: FK-based transitions (for PostgREST joins)
-- -----------------------------------------------------

ALTER TABLE public.order_state_transitions
  ADD COLUMN IF NOT EXISTS from_state_id UUID,
  ADD COLUMN IF NOT EXISTS to_state_id UUID;

-- Backfill the id columns from legacy name columns (if present).
UPDATE public.order_state_transitions ost
SET from_state_id = os.id
FROM public.order_states os
WHERE ost.from_state_id IS NULL
  AND ost.from_state_name IS NOT NULL
  AND os.name = ost.from_state_name;

UPDATE public.order_state_transitions ost
SET to_state_id = os.id
FROM public.order_states os
WHERE ost.to_state_id IS NULL
  AND ost.to_state_name IS NOT NULL
  AND os.name = ost.to_state_name;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_state_transitions_from_state_id_fkey'
      AND conrelid = 'public.order_state_transitions'::regclass
  ) THEN
    ALTER TABLE public.order_state_transitions
      ADD CONSTRAINT order_state_transitions_from_state_id_fkey
      FOREIGN KEY (from_state_id)
      REFERENCES public.order_states(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_state_transitions_to_state_id_fkey'
      AND conrelid = 'public.order_state_transitions'::regclass
  ) THEN
    ALTER TABLE public.order_state_transitions
      ADD CONSTRAINT order_state_transitions_to_state_id_fkey
      FOREIGN KEY (to_state_id)
      REFERENCES public.order_states(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_state_transitions_from_state_id
  ON public.order_state_transitions(from_state_id);

CREATE INDEX IF NOT EXISTS idx_order_state_transitions_to_state_id
  ON public.order_state_transitions(to_state_id);

-- -----------------------------------------------------
-- 4) Role elevation: alias columns expected by optional admin tooling
-- -----------------------------------------------------

ALTER TABLE public.role_elevations
  ADD COLUMN IF NOT EXISTS elevated_role_id user_role,
  ADD COLUMN IF NOT EXISTS original_role_id user_role;

UPDATE public.role_elevations
SET elevated_role_id = elevated_to_role
WHERE elevated_role_id IS NULL AND elevated_to_role IS NOT NULL;

UPDATE public.role_elevations
SET original_role_id = original_role
WHERE original_role_id IS NULL AND original_role IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_role_elevations_alias_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prefer canonical columns; backfill from aliases when needed.
  IF NEW.elevated_to_role IS NULL AND NEW.elevated_role_id IS NOT NULL THEN
    NEW.elevated_to_role := NEW.elevated_role_id;
  END IF;
  IF NEW.elevated_role_id IS NULL AND NEW.elevated_to_role IS NOT NULL THEN
    NEW.elevated_role_id := NEW.elevated_to_role;
  END IF;

  IF NEW.original_role IS NULL AND NEW.original_role_id IS NOT NULL THEN
    NEW.original_role := NEW.original_role_id;
  END IF;
  IF NEW.original_role_id IS NULL AND NEW.original_role IS NOT NULL THEN
    NEW.original_role_id := NEW.original_role;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_sync_role_elevations_alias_columns'
      AND tgrelid = 'public.role_elevations'::regclass
  ) THEN
    CREATE TRIGGER trg_sync_role_elevations_alias_columns
    BEFORE INSERT OR UPDATE ON public.role_elevations
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_role_elevations_alias_columns();
  END IF;
END $$;

COMMIT;
