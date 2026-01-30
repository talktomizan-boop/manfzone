-- =====================================================
-- Product search RPC (text search, sorting, filtering)
-- FIX: removed reviews.is_verified filter (column not present)
-- Safe additive change; does not modify existing tables.
-- =====================================================

CREATE OR REPLACE FUNCTION search_products(
  q TEXT DEFAULT NULL,
  category_slug TEXT DEFAULT NULL,
  min_price NUMERIC DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  in_stock BOOLEAN DEFAULT NULL,
  min_rating NUMERIC DEFAULT NULL,
  sort_key TEXT DEFAULT 'featured',
  limit_count INTEGER DEFAULT 60,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  base_price NUMERIC,
  compare_at_price NUMERIC,
  is_featured BOOLEAN,
  created_at TIMESTAMPTZ,
  image_url TEXT,
  rating_average NUMERIC,
  rating_count INTEGER,
  in_stock BOOLEAN
)
LANGUAGE SQL
STABLE
AS $$
  WITH base AS (
    SELECT
      p.id,
      p.name,
      p.slug,
      p.base_price,
      p.compare_at_price,
      p.is_featured,
      p.created_at,
      p.search_vector,
      c.slug AS cat_slug,
      (
        SELECT url
        FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.is_primary DESC, pi.created_at ASC
        LIMIT 1
      ) AS image_url,
      COALESCE(inv.available_quantity, 0) AS available_quantity,
      COALESCE(r.avg_rating, 0) AS avg_rating,
      COALESCE(r.rating_count, 0) AS rating_count,
      COALESCE(oi.sales_count, 0) AS sales_count
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN inventory inv ON inv.product_id = p.id
    LEFT JOIN (
      -- FIX: No is_verified column assumption; aggregate all reviews
      SELECT product_id, AVG(rating)::NUMERIC(10,2) AS avg_rating, COUNT(*)::INT AS rating_count
      FROM reviews
      GROUP BY product_id
    ) r ON r.product_id = p.id
    LEFT JOIN (
      SELECT product_id, SUM(quantity)::INT AS sales_count
      FROM order_items
      GROUP BY product_id
    ) oi ON oi.product_id = p.id
    WHERE p.is_active = TRUE
      AND p.deleted_at IS NULL
  )
  SELECT
    id,
    name,
    slug,
    base_price,
    compare_at_price,
    is_featured,
    created_at,
    image_url,
    avg_rating AS rating_average,
    rating_count,
    (available_quantity > 0) AS in_stock
  FROM base
  WHERE (q IS NULL OR q = ''
         OR to_tsvector('english', COALESCE(name,'' ) || ' ' || COALESCE(slug,'' )) @@ plainto_tsquery('english', q)
         OR search_vector @@ plainto_tsquery('english', q))
    AND (category_slug IS NULL OR category_slug = '' OR cat_slug = category_slug)
    AND (min_price IS NULL OR base_price >= min_price)
    AND (max_price IS NULL OR base_price <= max_price)
    AND (in_stock IS NULL OR (available_quantity > 0) = in_stock)
    AND (min_rating IS NULL OR avg_rating >= min_rating)
  ORDER BY
    CASE WHEN sort_key = 'price-low' THEN base_price END ASC NULLS LAST,
    CASE WHEN sort_key = 'price-high' THEN base_price END DESC NULLS LAST,
    CASE WHEN sort_key = 'newest' THEN created_at END DESC NULLS LAST,
    CASE WHEN sort_key = 'popularity' THEN sales_count END DESC NULLS LAST,
    CASE WHEN sort_key = 'featured' THEN is_featured END DESC NULLS LAST,
    created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
$$;

-- Allow anon/authenticated to call (RLS still applies on base tables)
GRANT EXECUTE ON FUNCTION search_products TO anon, authenticated;
