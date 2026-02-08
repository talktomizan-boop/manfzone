-- =====================================================
-- MIGRATION 008: Homepage CMS RLS Policies (FIXED)
-- =====================================================
-- Description: Row Level Security policies for homepage CMS tables
-- Dependencies: 007_homepage_cms_system_fixed.sql
-- Fixed: Removed references to admin_users, roles tables
-- =====================================================

-- =====================================================
-- ENABLE RLS ON HOMEPAGE TABLES
-- =====================================================

ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_featured_products ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTION (Simplified)
-- =====================================================

-- Check if user is admin (simplified version)
CREATE OR REPLACE FUNCTION is_homepage_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- For now, check if user is authenticated
  -- This will be enhanced when roles system is implemented
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HOMEPAGE SECTIONS
-- =====================================================

-- Public can read enabled sections
CREATE POLICY "Public read active homepage sections"
  ON homepage_sections
  FOR SELECT
  USING (is_enabled = TRUE);

-- Authenticated users can manage sections
CREATE POLICY "Admins manage homepage sections"
  ON homepage_sections
  FOR ALL
  USING (is_homepage_admin());

-- =====================================================
-- HERO SLIDES
-- =====================================================

CREATE POLICY "Public read active hero slides"
  ON homepage_hero_slides
  FOR SELECT
  USING (is_enabled = TRUE);

CREATE POLICY "Admins manage hero slides"
  ON homepage_hero_slides
  FOR ALL
  USING (is_homepage_admin());

-- =====================================================
-- BANNERS
-- =====================================================

CREATE POLICY "Public read active banners"
  ON homepage_banners
  FOR SELECT
  USING (is_enabled = TRUE);

CREATE POLICY "Admins manage banners"
  ON homepage_banners
  FOR ALL
  USING (is_homepage_admin());

-- =====================================================
-- FEATURED PRODUCTS
-- =====================================================

CREATE POLICY "Public read active featured products"
  ON homepage_featured_products
  FOR SELECT
  USING (is_enabled = TRUE);

CREATE POLICY "Admins manage featured products"
  ON homepage_featured_products
  FOR ALL
  USING (is_homepage_admin());

-- =====================================================
-- NEWSLETTER SUBSCRIPTIONS
-- =====================================================

-- Anyone can subscribe
CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscriptions
  FOR INSERT
  WITH CHECK (TRUE);

-- Users can read their own subscriptions
CREATE POLICY "Users read own newsletter subscriptions"
  ON newsletter_subscriptions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR email IN (
      SELECT email FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can update their own subscriptions (unsubscribe)
CREATE POLICY "Users update own newsletter subscriptions"
  ON newsletter_subscriptions
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR email IN (
      SELECT email FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- GRANT EXECUTE ON FUNCTIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION increment_banner_click(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_banner_impression(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_homepage_admin() TO authenticated, anon;

-- =====================================================
-- END MIGRATION 008 (FIXED)
-- =====================================================
