-- =====================================================
-- Homepage CMS - Additional Tables (Parity with app/services/homepage.service.ts)
--
-- The project already contains the core homepage CMS tables
-- (homepage_configs, homepage_sections, homepage_hero_slides, homepage_banners,
-- homepage_featured_products, newsletter_subscriptions, etc.).
--
-- The application code also supports additional section content types:
-- - trust_signals
-- - featured_categories
-- - flash_sale
-- - brand_story
-- - newsletter
-- - social_proof (featured reviews)
--
-- This migration creates the missing tables for those section types and
-- applies production-grade RLS policies consistent with the rest of the
-- schema (public read, admin manage).
--
-- NOTE: This is additive and safe to apply on existing databases.
-- =====================================================

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Harden homepage admin check: only real admins can manage homepage content.
-- Earlier versions used "authenticated" which is insecure for production.
CREATE OR REPLACE FUNCTION public.is_homepage_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.is_admin();
$$;

-- -----------------------------------------------------
-- TRUST SIGNALS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.homepage_trust_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_homepage_trust_signals_section
  ON public.homepage_trust_signals(section_id);

-- -----------------------------------------------------
-- FEATURED CATEGORIES
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.homepage_featured_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(section_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_homepage_featured_categories_section
  ON public.homepage_featured_categories(section_id);

-- -----------------------------------------------------
-- FLASH SALES
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.homepage_flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  badge_text TEXT,
  display_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_homepage_flash_sales_section
  ON public.homepage_flash_sales(section_id);

CREATE INDEX IF NOT EXISTS idx_homepage_flash_sales_active_window
  ON public.homepage_flash_sales(start_at, end_at);

-- Products in a flash sale
CREATE TABLE IF NOT EXISTS public.homepage_flash_sale_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flash_sale_id UUID NOT NULL REFERENCES public.homepage_flash_sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(flash_sale_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_homepage_flash_sale_products_sale
  ON public.homepage_flash_sale_products(flash_sale_id);

-- -----------------------------------------------------
-- CONTENT BLOCKS (brand story / custom HTML blocks)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.homepage_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  title TEXT,
  content_html TEXT NOT NULL,
  image_url TEXT,
  link_url TEXT,
  button_text TEXT,
  layout_variant TEXT DEFAULT 'default',
  display_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_homepage_content_blocks_section
  ON public.homepage_content_blocks(section_id);

-- -----------------------------------------------------
-- NEWSLETTER CONFIG (copy shown near subscription form)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.homepage_newsletter_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  heading TEXT NOT NULL,
  subheading TEXT NOT NULL,
  placeholder_text TEXT NOT NULL,
  button_text TEXT NOT NULL,
  success_message TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(section_id)
);

CREATE INDEX IF NOT EXISTS idx_homepage_newsletter_config_section
  ON public.homepage_newsletter_config(section_id);

-- -----------------------------------------------------
-- FEATURED REVIEWS (social proof)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.homepage_featured_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(section_id, review_id)
);

CREATE INDEX IF NOT EXISTS idx_homepage_featured_reviews_section
  ON public.homepage_featured_reviews(section_id);

-- -----------------------------------------------------
-- updated_at triggers (consistent with other tables)
-- -----------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    -- Best-effort: attach triggers only if helper exists
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_homepage_trust_signals_updated_at') THEN
      CREATE TRIGGER update_homepage_trust_signals_updated_at
      BEFORE UPDATE ON public.homepage_trust_signals
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_homepage_featured_categories_updated_at') THEN
      CREATE TRIGGER update_homepage_featured_categories_updated_at
      BEFORE UPDATE ON public.homepage_featured_categories
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_homepage_flash_sales_updated_at') THEN
      CREATE TRIGGER update_homepage_flash_sales_updated_at
      BEFORE UPDATE ON public.homepage_flash_sales
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_homepage_flash_sale_products_updated_at') THEN
      CREATE TRIGGER update_homepage_flash_sale_products_updated_at
      BEFORE UPDATE ON public.homepage_flash_sale_products
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_homepage_content_blocks_updated_at') THEN
      CREATE TRIGGER update_homepage_content_blocks_updated_at
      BEFORE UPDATE ON public.homepage_content_blocks
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_homepage_newsletter_config_updated_at') THEN
      CREATE TRIGGER update_homepage_newsletter_config_updated_at
      BEFORE UPDATE ON public.homepage_newsletter_config
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_homepage_featured_reviews_updated_at') THEN
      CREATE TRIGGER update_homepage_featured_reviews_updated_at
      BEFORE UPDATE ON public.homepage_featured_reviews
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
  END IF;
END $$;

-- =====================================================
-- RLS + POLICIES
-- =====================================================

ALTER TABLE public.homepage_trust_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_featured_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_flash_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_flash_sale_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_newsletter_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_featured_reviews ENABLE ROW LEVEL SECURITY;

-- Public read (anon + authenticated)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read trust signals') THEN
    CREATE POLICY "Public can read trust signals"
      ON public.homepage_trust_signals
      FOR SELECT
      TO anon, authenticated
      USING (is_enabled = TRUE AND deleted_at IS NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read featured categories') THEN
    CREATE POLICY "Public can read featured categories"
      ON public.homepage_featured_categories
      FOR SELECT
      TO anon, authenticated
      USING (is_enabled = TRUE AND deleted_at IS NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read flash sales') THEN
    CREATE POLICY "Public can read flash sales"
      ON public.homepage_flash_sales
      FOR SELECT
      TO anon, authenticated
      USING (is_enabled = TRUE AND deleted_at IS NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read flash sale products') THEN
    CREATE POLICY "Public can read flash sale products"
      ON public.homepage_flash_sale_products
      FOR SELECT
      TO anon, authenticated
      USING (is_enabled = TRUE AND deleted_at IS NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read content blocks') THEN
    CREATE POLICY "Public can read content blocks"
      ON public.homepage_content_blocks
      FOR SELECT
      TO anon, authenticated
      USING (is_published = TRUE AND deleted_at IS NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read newsletter config') THEN
    CREATE POLICY "Public can read newsletter config"
      ON public.homepage_newsletter_config
      FOR SELECT
      TO anon, authenticated
      USING (is_enabled = TRUE AND deleted_at IS NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read featured reviews') THEN
    CREATE POLICY "Public can read featured reviews"
      ON public.homepage_featured_reviews
      FOR SELECT
      TO anon, authenticated
      USING (is_enabled = TRUE AND deleted_at IS NULL);
  END IF;
END $$;

-- Admin manage (insert/update/delete)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage trust signals') THEN
    CREATE POLICY "Admins manage trust signals"
      ON public.homepage_trust_signals
      FOR ALL
      TO authenticated
      USING (public.is_homepage_admin())
      WITH CHECK (public.is_homepage_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage featured categories') THEN
    CREATE POLICY "Admins manage featured categories"
      ON public.homepage_featured_categories
      FOR ALL
      TO authenticated
      USING (public.is_homepage_admin())
      WITH CHECK (public.is_homepage_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage flash sales') THEN
    CREATE POLICY "Admins manage flash sales"
      ON public.homepage_flash_sales
      FOR ALL
      TO authenticated
      USING (public.is_homepage_admin())
      WITH CHECK (public.is_homepage_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage flash sale products') THEN
    CREATE POLICY "Admins manage flash sale products"
      ON public.homepage_flash_sale_products
      FOR ALL
      TO authenticated
      USING (public.is_homepage_admin())
      WITH CHECK (public.is_homepage_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage content blocks') THEN
    CREATE POLICY "Admins manage content blocks"
      ON public.homepage_content_blocks
      FOR ALL
      TO authenticated
      USING (public.is_homepage_admin())
      WITH CHECK (public.is_homepage_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage newsletter config') THEN
    CREATE POLICY "Admins manage newsletter config"
      ON public.homepage_newsletter_config
      FOR ALL
      TO authenticated
      USING (public.is_homepage_admin())
      WITH CHECK (public.is_homepage_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage featured reviews') THEN
    CREATE POLICY "Admins manage featured reviews"
      ON public.homepage_featured_reviews
      FOR ALL
      TO authenticated
      USING (public.is_homepage_admin())
      WITH CHECK (public.is_homepage_admin());
  END IF;
END $$;
