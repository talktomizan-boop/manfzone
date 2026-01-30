-- Coupons / Promotions (server-side support without UI changes)
-- Adds a minimal coupon system and cart linkage.
-- Safe to re-run: uses IF NOT EXISTS where possible.

BEGIN;

-- 1) Coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value >= 0),
  min_subtotal DECIMAL(10,2) DEFAULT 0 CHECK (min_subtotal >= 0),
  max_discount DECIMAL(10,2), -- optional cap for percent
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_uses INTEGER, -- optional global usage limit
  used_count INTEGER DEFAULT 0 CHECK (used_count >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Coupon redemptions (written by server/service role only)
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email TEXT,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Link coupons to carts and orders
ALTER TABLE carts ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE carts ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL;

-- 4) RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Public can read active coupons (needed for validation by anon key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='coupons' AND policyname='Coupons are publicly readable'
  ) THEN
    CREATE POLICY "Coupons are publicly readable" ON coupons
      FOR SELECT USING (true);
  END IF;
END $$;

-- Only admins can mutate coupons from the client (optional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='coupons' AND policyname='Admins manage coupons'
  ) THEN
    CREATE POLICY "Admins manage coupons" ON coupons
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin' AND p.is_active = true AND p.deleted_at IS NULL
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin' AND p.is_active = true AND p.deleted_at IS NULL
        )
      );
  END IF;
END $$;

-- Redemptions are service/server written; deny by default for clients.
-- (Service role bypasses RLS.)
-- Helper RPC to increment used_count (callable by service role / server only)
CREATE OR REPLACE FUNCTION increment_coupon_use(coupon_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE coupons
    SET used_count = COALESCE(used_count, 0) + 1,
        updated_at = NOW()
  WHERE id = coupon_id_input;
END;
$$;

REVOKE ALL ON FUNCTION increment_coupon_use(UUID) FROM PUBLIC;

COMMIT;
