-- =====================================================
-- FIX SCRIPT: Resolve duplicate inventory rows (product-level)
-- Error addressed:
--   ERROR: 23505 could not create unique index "idx_inventory_unique_product"
--   DETAIL: Key (product_id)=(...) is duplicated.
--
-- What this does:
--  1) Shows duplicates (dry run)
--  2) Merges duplicates into ONE "keeper" row per product_id
--     - quantity = SUM(quantity)
--     - reserved_quantity = SUM(reserved_quantity)
--     - updated_at refreshed
--  3) Deletes extra duplicate rows (no data loss of totals)
--  4) Creates the partial unique index required by migration
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 0) DRY RUN: list duplicate product_id rows (variant_id IS NULL)
-- -----------------------------------------------------
-- This shows which product_ids are duplicated and how many rows exist.
-- Keep this output for verification.
SELECT
  product_id,
  COUNT(*) AS duplicate_rows
FROM public.inventory
WHERE variant_id IS NULL
GROUP BY product_id
HAVING COUNT(*) > 1
ORDER BY duplicate_rows DESC, product_id;

-- Optional: show detailed duplicate rows (ids + quantities)
SELECT
  id,
  product_id,
  variant_id,
  quantity,
  reserved_quantity,
  available_quantity,
  created_at,
  updated_at
FROM public.inventory
WHERE variant_id IS NULL
  AND product_id IN (
    SELECT product_id
    FROM public.inventory
    WHERE variant_id IS NULL
    GROUP BY product_id
    HAVING COUNT(*) > 1
  )
ORDER BY product_id, created_at, id;

-- -----------------------------------------------------
-- 1) MERGE duplicates into one row per product_id
-- -----------------------------------------------------
-- Strategy:
-- - Pick a keeper row (earliest created_at, then lowest id)
-- - Sum quantities + reserved quantities across duplicates
-- - Update keeper with merged totals
-- - Delete the other rows
--
-- NOTE:
-- available_quantity will be recalculated by your trigger if present,
-- or can be derived later as quantity - reserved_quantity.
WITH ranked AS (
  SELECT
    id,
    product_id,
    quantity,
    reserved_quantity,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY product_id
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.inventory
  WHERE variant_id IS NULL
),
keepers AS (
  SELECT * FROM ranked WHERE rn = 1
),
dupes AS (
  SELECT * FROM ranked WHERE rn > 1
),
summed AS (
  SELECT
    product_id,
    SUM(COALESCE(quantity, 0)) AS sum_qty,
    SUM(COALESCE(reserved_quantity, 0)) AS sum_reserved
  FROM ranked
  GROUP BY product_id
)
UPDATE public.inventory i
SET
  quantity = s.sum_qty,
  reserved_quantity = s.sum_reserved,
  updated_at = NOW()
FROM summed s
WHERE i.variant_id IS NULL
  AND i.product_id = s.product_id
  AND i.id IN (SELECT id FROM keepers);

-- Delete non-keeper duplicate rows
DELETE FROM public.inventory i
WHERE i.id IN (SELECT id FROM dupes);

-- -----------------------------------------------------
-- 2) POST-MERGE CHECK: confirm no duplicates remain
-- -----------------------------------------------------
-- This should return ZERO rows.
SELECT
  product_id,
  COUNT(*) AS rows_after_merge
FROM public.inventory
WHERE variant_id IS NULL
GROUP BY product_id
HAVING COUNT(*) > 1;

-- -----------------------------------------------------
-- 3) CREATE the unique index (now safe)
-- -----------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_unique_product
  ON public.inventory(product_id)
  WHERE variant_id IS NULL;

COMMIT;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================
-- Check index exists:
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'idx_inventory_unique_product';
