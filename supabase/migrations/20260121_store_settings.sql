-- Store settings key/value registry (Phase 1)

CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings (used for storefront theming, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'store_settings'
      AND policyname = 'Public can read store settings'
  ) THEN
    CREATE POLICY "Public can read store settings"
      ON store_settings FOR SELECT
      USING (true);
  END IF;
END $$;

-- Only admins can manage settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'store_settings'
      AND policyname = 'Admin can manage store settings'
  ) THEN
    CREATE POLICY "Admin can manage store settings"
      ON store_settings FOR ALL
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- Seed defaults if missing
INSERT INTO store_settings (key, value)
VALUES
  ('site', '{"storeName":"Manaf Zone","storeEmail":"support@manafzone.com","storePhone":"+880 1XXX-XXXXXX","storeAddress":"Dhaka, Bangladesh","currency":"BDT","timezone":"Asia/Dhaka"}'::jsonb),
  ('theme', '{"primaryColor":"#2563eb","secondaryColor":"#16a34a","fontFamily":"Inter","darkMode":false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
