-- =====================================================
-- MIGRATION 007: Homepage CMS System (FIXED)
-- =====================================================
-- Description: Comprehensive homepage content management system
-- Dependencies: 001_initial_schema.sql, 002_row_level_security.sql
-- Fixed: auth.users -> profiles, customer_segments references
-- =====================================================

-- Note: This migration is OPTIONAL for basic e-commerce functionality
-- It provides advanced CMS features for homepage customization
-- Can be run after user management and customer segmentation is implemented

-- For now, we'll create only the essential tables without foreign key constraints
-- that reference non-existent tables

-- =====================================================
-- SIMPLE NEWSLETTER SUBSCRIPTIONS (Essential)
-- =====================================================

CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  subscribed_from VARCHAR(50) DEFAULT 'homepage',
  consent_given BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(100),
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  unsubscribed_at TIMESTAMPTZ,
  user_id UUID, -- Will reference profiles when auth is set up
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_newsletter_email ON newsletter_subscriptions(email) WHERE is_active = TRUE;
CREATE INDEX idx_newsletter_verified ON newsletter_subscriptions(is_verified) WHERE is_active = TRUE;

-- =====================================================
-- HOMEPAGE SECTIONS (Simplified)
-- =====================================================

CREATE TABLE IF NOT EXISTS homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type VARCHAR(50) NOT NULL CHECK (section_type IN (
    'hero',
    'trust_signals',
    'featured_categories',
    'best_sellers',
    'trending_products',
    'promotional_banner',
    'new_arrivals',
    'custom'
  )),
  title VARCHAR(200),
  subtitle TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN DEFAULT TRUE,
  layout_type VARCHAR(50) DEFAULT 'grid' CHECK (layout_type IN ('grid', 'carousel', 'list')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_homepage_sections_order ON homepage_sections(display_order) WHERE is_enabled = TRUE;

-- =====================================================
-- HERO SLIDES (Simplified)
-- =====================================================

CREATE TABLE IF NOT EXISTS homepage_hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES homepage_sections(id) ON DELETE CASCADE,
  headline VARCHAR(200) NOT NULL,
  subheadline TEXT,
  cta_text VARCHAR(100),
  cta_link VARCHAR(500),
  background_image_url VARCHAR(1000),
  text_alignment VARCHAR(20) DEFAULT 'left' CHECK (text_alignment IN ('left', 'center', 'right')),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_hero_slides_section ON homepage_hero_slides(section_id) WHERE is_enabled = TRUE;

-- =====================================================
-- PROMOTIONAL BANNERS (Simplified)
-- =====================================================

CREATE TABLE IF NOT EXISTS homepage_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES homepage_sections(id) ON DELETE CASCADE,
  title VARCHAR(200),
  subtitle TEXT,
  image_url VARCHAR(1000) NOT NULL,
  cta_text VARCHAR(100),
  cta_link VARCHAR(500),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN DEFAULT TRUE,
  click_count INTEGER DEFAULT 0,
  impression_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_banners_section ON homepage_banners(section_id) WHERE is_enabled = TRUE;

-- =====================================================
-- FEATURED PRODUCTS (Simplified)
-- =====================================================

CREATE TABLE IF NOT EXISTS homepage_featured_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES homepage_sections(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_featured_products_section ON homepage_featured_products(section_id) WHERE is_enabled = TRUE;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to track banner clicks
CREATE OR REPLACE FUNCTION increment_banner_click(p_banner_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE homepage_banners
  SET click_count = click_count + 1
  WHERE id = p_banner_id;
END;
$$;

-- Function to track banner impressions
CREATE OR REPLACE FUNCTION increment_banner_impression(p_banner_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE homepage_banners
  SET impression_count = impression_count + 1
  WHERE id = p_banner_id;
END;
$$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE newsletter_subscriptions IS 'Newsletter email subscriptions with double opt-in support';
COMMENT ON TABLE homepage_sections IS 'Main homepage section configuration (simplified version)';
COMMENT ON TABLE homepage_hero_slides IS 'Hero carousel slides with CTA buttons';
COMMENT ON TABLE homepage_banners IS 'Promotional banners with click tracking';
COMMENT ON TABLE homepage_featured_products IS 'Admin-curated featured products for homepage';

-- =====================================================
-- END MIGRATION 007 (FIXED)
-- =====================================================
