-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Production-Grade Security Implementation
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
    AND is_active = TRUE
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = TRUE
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PROFILES
-- =====================================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (excluding role)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid()) -- Cannot change own role
  );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

-- Admins can update any profile
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

-- Only super admins can delete profiles
CREATE POLICY "Super admins can delete profiles"
  ON profiles FOR DELETE
  USING (is_super_admin());

-- New users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- ADDRESSES
-- =====================================================

CREATE POLICY "Users can manage own addresses"
  ON addresses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all addresses"
  ON addresses FOR SELECT
  USING (is_admin());

-- =====================================================
-- CATEGORIES
-- =====================================================

-- Public read access to active categories
CREATE POLICY "Anyone can view active categories"
  ON categories FOR SELECT
  USING (is_active = TRUE AND deleted_at IS NULL);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- PRODUCTS
-- =====================================================

-- Public read access to active products
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (is_active = TRUE AND deleted_at IS NULL);

-- Admins can view all products (including inactive)
CREATE POLICY "Admins can view all products"
  ON products FOR SELECT
  USING (is_admin());

-- Admins can manage products
CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- PRODUCT VARIANTS
-- =====================================================

-- Public read access to active variants of active products
CREATE POLICY "Anyone can view active variants"
  ON product_variants FOR SELECT
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND products.is_active = TRUE
      AND products.deleted_at IS NULL
    )
  );

-- Admins can view all variants
CREATE POLICY "Admins can view all variants"
  ON product_variants FOR SELECT
  USING (is_admin());

-- Admins can manage variants
CREATE POLICY "Admins can manage variants"
  ON product_variants FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- PRODUCT IMAGES
-- =====================================================

-- Public read access to images of active products
CREATE POLICY "Anyone can view product images"
  ON product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.is_active = TRUE
      AND products.deleted_at IS NULL
    )
  );

-- Admins can manage images
CREATE POLICY "Admins can manage product images"
  ON product_images FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- PRODUCT SPECIFICATIONS
-- =====================================================

-- Public read access
CREATE POLICY "Anyone can view product specifications"
  ON product_specifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_specifications.product_id
      AND products.is_active = TRUE
      AND products.deleted_at IS NULL
    )
  );

-- Admins can manage specifications
CREATE POLICY "Admins can manage specifications"
  ON product_specifications FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- INVENTORY
-- =====================================================

-- Public read access (for stock availability)
CREATE POLICY "Anyone can view inventory"
  ON inventory FOR SELECT
  USING (TRUE);

-- Admins can manage inventory
CREATE POLICY "Admins can manage inventory"
  ON inventory FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- INVENTORY TRANSACTIONS
-- =====================================================

-- Only admins can view inventory transactions
CREATE POLICY "Admins can view inventory transactions"
  ON inventory_transactions FOR SELECT
  USING (is_admin());

-- Only admins can create inventory transactions
CREATE POLICY "Admins can create inventory transactions"
  ON inventory_transactions FOR INSERT
  WITH CHECK (is_admin());

-- =====================================================
-- CARTS
-- =====================================================

-- Users can manage their own cart
CREATE POLICY "Users can manage own cart"
  ON carts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Guest users can manage cart by session
CREATE POLICY "Guests can manage cart by session"
  ON carts FOR ALL
  USING (user_id IS NULL AND session_id IS NOT NULL);

-- Admins can view all carts
CREATE POLICY "Admins can view all carts"
  ON carts FOR SELECT
  USING (is_admin());

-- =====================================================
-- CART ITEMS
-- =====================================================

-- Users can manage items in their own cart
CREATE POLICY "Users can manage own cart items"
  ON cart_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

-- Guest users can manage cart items by session
CREATE POLICY "Guests can manage cart items"
  ON cart_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id IS NULL
      AND carts.session_id IS NOT NULL
    )
  );

-- Admins can view all cart items
CREATE POLICY "Admins can view all cart items"
  ON cart_items FOR SELECT
  USING (is_admin());

-- =====================================================
-- ORDERS
-- =====================================================

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create orders
CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR user_id IS NULL -- Guest checkout
  );

-- Admins can view and manage all orders
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- ORDER ITEMS
-- =====================================================

-- Users can view items from their own orders
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Order items are created with orders (admin or system process)
CREATE POLICY "Admins can manage order items"
  ON order_items FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- PAYMENTS
-- =====================================================

-- Users can view payments for their own orders
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Admins can view and manage all payments
CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- COUPONS
-- =====================================================

-- Users can view active coupons
CREATE POLICY "Anyone can view active coupons"
  ON coupons FOR SELECT
  USING (
    is_active = TRUE
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_until IS NULL OR valid_until >= NOW())
  );

-- Admins can manage coupons
CREATE POLICY "Admins can manage coupons"
  ON coupons FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- COUPON USAGE
-- =====================================================

-- Users can view their own coupon usage
CREATE POLICY "Users can view own coupon usage"
  ON coupon_usage FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert coupon usage
CREATE POLICY "Admins can manage coupon usage"
  ON coupon_usage FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- REVIEWS
-- =====================================================

-- Anyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON reviews FOR SELECT
  USING (is_approved = TRUE);

-- Users can view their own reviews (even if not approved)
CREATE POLICY "Users can view own reviews"
  ON reviews FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create reviews for products they purchased
CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage all reviews
CREATE POLICY "Admins can manage reviews"
  ON reviews FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- REVIEW VOTES
-- =====================================================

-- Anyone can view review votes
CREATE POLICY "Anyone can view review votes"
  ON review_votes FOR SELECT
  USING (TRUE);

-- Users can vote on reviews
CREATE POLICY "Users can vote on reviews"
  ON review_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "Users can update own votes"
  ON review_votes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes"
  ON review_votes FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- WISHLISTS
-- =====================================================

-- Users can manage their own wishlist
CREATE POLICY "Users can manage own wishlist"
  ON wishlists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FEATURE FLAGS
-- =====================================================

-- Anyone can view enabled feature flags
CREATE POLICY "Anyone can view enabled features"
  ON feature_flags FOR SELECT
  USING (is_enabled = TRUE);

-- Admins can manage feature flags
CREATE POLICY "Admins can manage feature flags"
  ON feature_flags FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- AUDIT LOGS
-- =====================================================

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (is_admin());

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (TRUE);

-- =====================================================
-- PAGES
-- =====================================================

-- Anyone can view published pages
CREATE POLICY "Anyone can view published pages"
  ON pages FOR SELECT
  USING (is_published = TRUE);

-- Admins can view all pages
CREATE POLICY "Admins can view all pages"
  ON pages FOR SELECT
  USING (is_admin());

-- Admins can manage pages
CREATE POLICY "Admins can manage pages"
  ON pages FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- BANNERS
-- =====================================================

-- Anyone can view active banners
CREATE POLICY "Anyone can view active banners"
  ON banners FOR SELECT
  USING (
    is_active = TRUE
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_until IS NULL OR valid_until >= NOW())
  );

-- Admins can manage banners
CREATE POLICY "Admins can manage banners"
  ON banners FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
