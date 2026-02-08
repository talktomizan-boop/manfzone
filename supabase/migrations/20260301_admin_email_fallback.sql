-- =====================================================
-- Admin email allowlist + JWT role fallback for is_admin()
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_emails (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage admin emails"
  ON public.admin_emails
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  jwt_role TEXT;
  jwt_email TEXT;
BEGIN
  jwt_role := COALESCE(
    auth.jwt() ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role'
  );

  IF jwt_role IN ('admin', 'super_admin') THEN
    RETURN TRUE;
  END IF;

  jwt_email := LOWER(auth.jwt() ->> 'email');
  IF jwt_email IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.admin_emails WHERE email = jwt_email) THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
    AND is_active = TRUE
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

INSERT INTO public.admin_emails (email)
VALUES ('admin@manafzone.com')
ON CONFLICT (email) DO NOTHING;
