-- ==============================================================================
-- MIGRATION 003: SEED DATA (FIXED UUIDs)
-- ==============================================================================
-- Purpose: Insert sample data with proper UUID format
-- Author: System
-- Date: 2024
-- Dependencies: 001_initial_schema.sql
-- ==============================================================================

-- Use deterministic but valid UUIDs (all hex characters)
-- Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

-- =====================================================
-- FEATURE FLAGS
-- =====================================================

INSERT INTO feature_flags (key, name, description, is_enabled, environment) VALUES
  ('enable_wishlist', 'Enable Wishlist', 'Allow users to save products to wishlist', true, 'production'),
  ('enable_reviews', 'Enable Product Reviews', 'Allow users to review products', true, 'production'),
  ('enable_coupons', 'Enable Coupon System', 'Allow users to use discount coupons', true, 'production'),
  ('enable_guest_checkout', 'Enable Guest Checkout', 'Allow checkout without registration', true, 'production'),
  ('enable_cod', 'Enable Cash on Delivery', 'Allow COD payment method', true, 'production'),
  ('enable_card_payments', 'Enable Card Payments', 'Allow credit/debit card payments', false, 'development'),
  ('show_stock_levels', 'Show Stock Levels', 'Display available quantity to customers', true, 'production'),
  ('enable_product_recommendations', 'Product Recommendations', 'Show related products', true, 'production')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- CATEGORIES
-- =====================================================

INSERT INTO categories (id, name, slug, description, parent_id, image_url, display_order, is_active, meta_title, meta_description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Electronics', 'electronics', 'Latest electronic devices and gadgets', NULL, 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800', 1, true, 'Electronics | ShopName', 'Browse our wide selection of electronics'),
  ('22222222-2222-2222-2222-222222222222', 'Fashion', 'fashion', 'Trending fashion for men and women', NULL, 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800', 2, true, 'Fashion | ShopName', 'Discover the latest fashion trends'),
  ('33333333-3333-3333-3333-333333333333', 'Home & Living', 'home-living', 'Everything for your home', NULL, 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=800', 3, true, 'Home & Living | ShopName', 'Quality home goods and decor'),
  ('44444444-4444-4444-4444-444444444444', 'Sports & Outdoors', 'sports-outdoors', 'Gear for active lifestyle', NULL, 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800', 4, true, 'Sports & Outdoors | ShopName', 'Sports equipment and outdoor gear'),
  ('55555555-5555-5555-5555-555555555555', 'Books & Media', 'books-media', 'Books, music, and entertainment', NULL, 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800', 5, true, 'Books & Media | ShopName', 'Books, magazines, and digital media')
ON CONFLICT (id) DO NOTHING;

-- Subcategories
INSERT INTO categories (id, name, slug, description, parent_id, display_order, is_active) VALUES
  ('11111111-1111-1111-1111-111111111112', 'Smartphones', 'smartphones', 'Latest smartphones and accessories', '11111111-1111-1111-1111-111111111111', 1, true),
  ('11111111-1111-1111-1111-111111111113', 'Laptops', 'laptops', 'Laptops and notebooks', '11111111-1111-1111-1111-111111111111', 2, true),
  ('11111111-1111-1111-1111-111111111114', 'Headphones', 'headphones', 'Headphones and earbuds', '11111111-1111-1111-1111-111111111111', 3, true),
  ('22222222-2222-2222-2222-222222222223', 'Men''s Clothing', 'mens-clothing', 'Clothing for men', '22222222-2222-2222-2222-222222222222', 1, true),
  ('22222222-2222-2222-2222-222222222224', 'Women''s Clothing', 'womens-clothing', 'Clothing for women', '22222222-2222-2222-2222-222222222222', 2, true),
  ('22222222-2222-2222-2222-222222222225', 'Shoes', 'shoes', 'Footwear for all', '22222222-2222-2222-2222-222222222222', 3, true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PRODUCTS
-- =====================================================

INSERT INTO products (id, name, slug, sku, description, short_description, category_id, base_price, compare_at_price, cost_price, is_active, is_featured, weight_grams, meta_title, meta_description) VALUES
  ('aaaaaaaa-0001-0000-0000-000000000001', 'Premium Wireless Headphones', 'premium-wireless-headphones', 'ELEC-HEAD-001', 'Experience crystal-clear audio with our premium wireless headphones.', 'Premium audio quality with ANC', '11111111-1111-1111-1111-111111111114', 8999.00, 12999.00, 4500.00, true, true, 250, 'Premium Wireless Headphones', 'Buy premium wireless headphones'),
  ('aaaaaaaa-0002-0000-0000-000000000001', 'Ultra-Slim Laptop 14"', 'ultra-slim-laptop-14', 'ELEC-LAP-001', 'Powerful yet portable. Intel Core i7, 16GB RAM, 512GB SSD.', 'Powerful 14" laptop with i7', '11111111-1111-1111-1111-111111111113', 75999.00, 89999.00, 52000.00, true, true, 1200, 'Ultra-Slim 14" Laptop', 'Ultra-slim laptop with Intel i7'),
  ('aaaaaaaa-0003-0000-0000-000000000001', 'Smart Phone Pro Max', 'smart-phone-pro-max', 'ELEC-PHO-001', '6.7" Super AMOLED display, 5G connectivity, 128GB storage.', 'Flagship smartphone with 5G', '11111111-1111-1111-1111-111111111112', 65999.00, 79999.00, 42000.00, true, true, 200, 'Smart Phone Pro Max', 'Latest flagship smartphone'),
  ('aaaaaaaa-0004-0000-0000-000000000001', 'Classic Cotton T-Shirt', 'classic-cotton-tshirt', 'FASH-TSH-001', '100% premium cotton t-shirt. Soft and breathable.', 'Comfortable 100% cotton t-shirt', '22222222-2222-2222-2222-222222222223', 599.00, 999.00, 250.00, true, false, 200, 'Classic Cotton T-Shirt', 'Premium cotton t-shirt'),
  ('aaaaaaaa-0005-0000-0000-000000000001', 'Slim Fit Jeans', 'slim-fit-jeans', 'FASH-JEA-001', 'Modern slim fit jeans with stretch denim.', 'Comfortable slim fit jeans', '22222222-2222-2222-2222-222222222223', 1999.00, 2999.00, 900.00, true, true, 500, 'Slim Fit Jeans', 'Comfortable slim fit jeans'),
  ('aaaaaaaa-0006-0000-0000-000000000001', 'Running Shoes Pro', 'running-shoes-pro', 'FASH-SHO-001', 'Professional running shoes with advanced cushioning.', 'Pro running shoes', '22222222-2222-2222-2222-222222222225', 3999.00, 5499.00, 2000.00, true, true, 350, 'Running Shoes Pro', 'Professional running shoes'),
  ('aaaaaaaa-0007-0000-0000-000000000001', 'Summer Dress', 'summer-dress', 'FASH-DRE-001', 'Light and airy summer dress perfect for warm weather.', 'Comfortable summer dress', '22222222-2222-2222-2222-222222222224', 1799.00, 2499.00, 800.00, true, false, 300, 'Summer Dress', 'Light summer dress'),
  ('aaaaaaaa-0008-0000-0000-000000000001', 'Ceramic Coffee Mug Set', 'ceramic-coffee-mug-set', 'HOME-MUG-001', 'Set of 4 premium ceramic coffee mugs. 350ml each.', 'Set of 4 ceramic mugs', '33333333-3333-3333-3333-333333333333', 899.00, 1299.00, 400.00, true, false, 1200, 'Ceramic Coffee Mug Set', 'Premium ceramic mug set'),
  ('aaaaaaaa-0009-0000-0000-000000000001', 'Yoga Mat Premium', 'yoga-mat-premium', 'SPOR-YOG-001', 'Non-slip premium yoga mat. Extra thick for comfort.', 'Premium non-slip yoga mat', '44444444-4444-4444-4444-444444444444', 1299.00, 1899.00, 600.00, true, false, 900, 'Premium Yoga Mat', 'Non-slip premium yoga mat'),
  ('aaaaaaaa-0010-0000-0000-000000000001', 'The Art of Clean Code', 'the-art-of-clean-code', 'BOOK-PRO-001', 'Learn best practices for writing clean code.', 'Essential coding guide', '55555555-5555-5555-5555-555555555555', 899.00, 1299.00, 400.00, true, false, 450, 'The Art of Clean Code', 'Learn clean code practices')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PRODUCT IMAGES
-- =====================================================

INSERT INTO product_images (product_id, url, alt_text, position, is_primary) VALUES
  ('aaaaaaaa-0001-0000-0000-000000000001', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', 'Premium Wireless Headphones', 1, true),
  ('aaaaaaaa-0002-0000-0000-000000000001', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800', 'Ultra-Slim Laptop', 1, true),
  ('aaaaaaaa-0003-0000-0000-000000000001', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800', 'Smart Phone Pro Max', 1, true),
  ('aaaaaaaa-0004-0000-0000-000000000001', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', 'Classic Cotton T-Shirt', 1, true),
  ('aaaaaaaa-0005-0000-0000-000000000001', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800', 'Slim Fit Jeans', 1, true),
  ('aaaaaaaa-0006-0000-0000-000000000001', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', 'Running Shoes Pro', 1, true),
  ('aaaaaaaa-0007-0000-0000-000000000001', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800', 'Summer Dress', 1, true),
  ('aaaaaaaa-0008-0000-0000-000000000001', 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800', 'Ceramic Coffee Mug Set', 1, true),
  ('aaaaaaaa-0009-0000-0000-000000000001', 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800', 'Yoga Mat Premium', 1, true),
  ('aaaaaaaa-0010-0000-0000-000000000001', 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800', 'The Art of Clean Code', 1, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- INVENTORY
-- =====================================================

INSERT INTO inventory (product_id, variant_id, quantity, reserved_quantity, low_stock_threshold, warehouse_location) VALUES
  ('aaaaaaaa-0001-0000-0000-000000000001', NULL, 50, 0, 10, 'WH-A-01'),
  ('aaaaaaaa-0002-0000-0000-000000000001', NULL, 25, 0, 8, 'WH-A-02'),
  ('aaaaaaaa-0003-0000-0000-000000000001', NULL, 40, 0, 10, 'WH-A-03'),
  ('aaaaaaaa-0004-0000-0000-000000000001', NULL, 100, 0, 20, 'WH-B-01'),
  ('aaaaaaaa-0005-0000-0000-000000000001', NULL, 60, 0, 15, 'WH-B-02'),
  ('aaaaaaaa-0006-0000-0000-000000000001', NULL, 45, 0, 10, 'WH-B-03'),
  ('aaaaaaaa-0007-0000-0000-000000000001', NULL, 35, 0, 10, 'WH-B-04'),
  ('aaaaaaaa-0008-0000-0000-000000000001', NULL, 80, 0, 15, 'WH-C-01'),
  ('aaaaaaaa-0009-0000-0000-000000000001', NULL, 55, 0, 12, 'WH-D-01'),
  ('aaaaaaaa-0010-0000-0000-000000000001', NULL, 120, 0, 25, 'WH-E-01')
ON CONFLICT DO NOTHING;

-- =====================================================
-- COUPONS
-- =====================================================

INSERT INTO coupons (code, description, type, discount_percentage, discount_value, min_purchase_amount, max_discount_amount, usage_limit, per_user_limit, valid_from, valid_until, is_active) VALUES
  ('WELCOME10', 'Welcome discount for new customers', 'percentage', 10.00, NULL, 1000.00, 500.00, 1000, 1, NOW(), NOW() + INTERVAL '30 days', true),
  ('SAVE500', 'Save 500 BDT on orders above 5000', 'fixed_amount', NULL, 500.00, 5000.00, NULL, 500, 3, NOW(), NOW() + INTERVAL '60 days', true),
  ('FREESHIP', 'Free shipping on all orders', 'free_shipping', NULL, NULL, 2000.00, NULL, NULL, 5, NOW(), NOW() + INTERVAL '90 days', true)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- BANNERS
-- =====================================================

INSERT INTO banners (title, subtitle, image_url, link_url, button_text, position, is_active, valid_from, valid_until) VALUES
  ('Summer Sale 2024', 'Up to 50% off on selected items', 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600', '/products', 'Shop Now', 1, true, NOW(), NOW() + INTERVAL '30 days'),
  ('New Arrivals', 'Discover our latest collection', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600', '/products', 'Explore', 2, true, NOW(), NOW() + INTERVAL '60 days')
ON CONFLICT DO NOTHING;

-- =====================================================
-- PAGES
-- =====================================================

INSERT INTO pages (title, slug, content, meta_title, meta_description, is_published, published_at) VALUES
  ('About Us', 'about', 'Learn more about our company and mission.', 'About Us | ShopName', 'Learn about our eCommerce platform', true, NOW()),
  ('Privacy Policy', 'privacy', 'Our commitment to protecting your privacy.', 'Privacy Policy | ShopName', 'Read our privacy policy', true, NOW()),
  ('Terms & Conditions', 'terms', 'Terms and conditions for using our platform.', 'Terms & Conditions | ShopName', 'Platform terms and conditions', true, NOW()),
  ('Shipping Policy', 'shipping', 'Information about our shipping and delivery.', 'Shipping Policy | ShopName', 'Shipping and delivery information', true, NOW()),
  ('Return Policy', 'returns', 'Our return and refund policy.', 'Return Policy | ShopName', 'Return and refund policy', true, NOW())
ON CONFLICT (slug) DO NOTHING;
