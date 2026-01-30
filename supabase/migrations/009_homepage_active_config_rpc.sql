-- =====================================================
-- MIGRATION 009: Homepage CMS - Active Config RPC
--
-- Fixes runtime error:
--   PGRST202: Could not find the function public.get_active_homepage_config
--
-- This project calls `supabase.rpc('get_active_homepage_config')` from the
-- homepage loader. Supabase/PostgREST errors if the function doesn't exist.
-- =====================================================

-- 1) Align homepage_sections with fields used by the React Router UI
ALTER TABLE public.homepage_sections
  ADD COLUMN IF NOT EXISTS background_color text,
  ADD COLUMN IF NOT EXISTS background_gradient text;

-- Expand allowed section types to include all types referenced in app/routes/home.tsx
ALTER TABLE public.homepage_sections
  DROP CONSTRAINT IF EXISTS homepage_sections_section_type_check;

ALTER TABLE public.homepage_sections
  ADD CONSTRAINT homepage_sections_section_type_check CHECK (
    section_type IN (
      'hero',
      'trust_signals',
      'promotional_banner',
      'featured_categories',
      'best_sellers',
      'trending_products',
      'new_arrivals',
      'flash_sale',
      'brand_story',
      'newsletter',
      'social_proof',
      'custom'
    )
  );

-- 2) Align hero slides table with fields used by the UI/service
ALTER TABLE public.homepage_hero_slides
  ADD COLUMN IF NOT EXISTS primary_cta_text text,
  ADD COLUMN IF NOT EXISTS primary_cta_link text,
  ADD COLUMN IF NOT EXISTS secondary_cta_text text,
  ADD COLUMN IF NOT EXISTS secondary_cta_link text,
  ADD COLUMN IF NOT EXISTS foreground_image_url text,
  ADD COLUMN IF NOT EXISTS duration_seconds integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill legacy CTA fields if they exist
UPDATE public.homepage_hero_slides
SET
  primary_cta_text = COALESCE(primary_cta_text, cta_text),
  primary_cta_link = COALESCE(primary_cta_link, cta_link)
WHERE (primary_cta_text IS NULL OR primary_cta_link IS NULL)
  AND (cta_text IS NOT NULL OR cta_link IS NOT NULL);

-- 3) Align banners table with fields used by the service
ALTER TABLE public.homepage_banners
  ADD COLUMN IF NOT EXISTS mobile_image_url text,
  ADD COLUMN IF NOT EXISTS banner_type text,
  ADD COLUMN IF NOT EXISTS scheduled_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4) Add soft-delete support to featured products
ALTER TABLE public.homepage_featured_products
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 5) Create the missing RPC used by the app
CREATE OR REPLACE FUNCTION public.get_active_homepage_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sections jsonb;
BEGIN
  SELECT COALESCE(
    jsonb_agg(to_jsonb(s) ORDER BY s.display_order),
    '[]'::jsonb
  )
  INTO sections
  FROM public.homepage_sections s
  WHERE s.is_enabled = TRUE;

  RETURN jsonb_build_object(
    'version', 1,
    'sections', sections
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_homepage_config() TO anon, authenticated;

-- 6) Optional: analytics sink for homepage events (used by HomepageService.trackHomepageEvent)
CREATE TABLE IF NOT EXISTS public.homepage_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  section_id uuid,
  item_id uuid,
  item_type text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.homepage_analytics_events ENABLE ROW LEVEL SECURITY;

-- Insert via SECURITY DEFINER function so anon/auth can write analytics without direct table access
CREATE OR REPLACE FUNCTION public.track_homepage_event(
  p_event_type text,
  p_section_id uuid,
  p_item_id uuid,
  p_item_type text,
  p_metadata jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.homepage_analytics_events (
    event_type,
    section_id,
    item_id,
    item_type,
    metadata
  ) VALUES (
    p_event_type,
    p_section_id,
    p_item_id,
    p_item_type,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_homepage_event(text, uuid, uuid, text, jsonb) TO anon, authenticated;

-- =====================================================
-- END MIGRATION 009
-- =====================================================
