-- =====================================================
-- Role Permissions + RPC helpers
--
-- The application primarily uses `profiles.role` (enum user_role) for
-- role-based access control. Some admin tooling/services also call
-- `check_user_permission` and expect a `role_permissions` mapping table.
--
-- Earlier migrations intentionally commented out `role_permissions`. This
-- migration adds it back in a way that is compatible with the existing
-- `user_role` enum and the current security model.
--
-- This is additive and safe to apply on existing databases.
-- =====================================================

-- -----------------------------------------------------
-- COMPATIBILITY HARDENING
--
-- Some earlier migrations define `admin_permissions` without an `is_active`
-- column. This migration seeds permissions using `ap.is_active`, so we ensure
-- the column exists before any inserts.
-- -----------------------------------------------------

ALTER TABLE public.admin_permissions
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE public.admin_permissions
  SET is_active = TRUE
  WHERE is_active IS NULL;

-- -----------------------------------------------------
-- ROLE PERMISSIONS
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.admin_permissions(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role
  ON public.role_permissions(role);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission
  ON public.role_permissions(permission_id);

-- Enable RLS (admins only)
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins view role permissions') THEN
    CREATE POLICY "Admins view role permissions"
      ON public.role_permissions
      FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage role permissions') THEN
    CREATE POLICY "Admins manage role permissions"
      ON public.role_permissions
      FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- Seed: give admin all currently-defined permissions (safe, idempotent)
INSERT INTO public.role_permissions(role, permission_id)
SELECT 'admin'::user_role, ap.id
FROM public.admin_permissions ap
WHERE ap.is_active = TRUE
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions(role, permission_id)
SELECT 'super_admin'::user_role, ap.id
FROM public.admin_permissions ap
WHERE ap.is_active = TRUE
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------
-- RPC: check_user_permission(user_id, resource, action)
--
-- Returned boolean is used by optional admin tooling.
-- SECURITY DEFINER so it can reliably inspect roles/permissions.
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_user_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effective_role user_role;
  elevated user_role;
  has_mapping BOOLEAN;
BEGIN
  IF p_user_id IS NULL OR p_resource IS NULL OR p_action IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role INTO effective_role
  FROM public.profiles
  WHERE id = p_user_id
    AND is_active = TRUE
    AND deleted_at IS NULL;

  IF effective_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Optional: apply active role elevation if present
  SELECT elevated_to_role INTO elevated
  FROM public.role_elevations
  WHERE user_id = p_user_id
    AND is_active = TRUE
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY elevated_at DESC
  LIMIT 1;

  IF elevated IS NOT NULL THEN
    effective_role := elevated;
  END IF;

  -- Super admin always allowed
  IF effective_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  -- If no mapping rows exist for this role, default admin = allow-all
  SELECT EXISTS(
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role = effective_role
  ) INTO has_mapping;

  IF effective_role = 'admin' AND has_mapping = FALSE THEN
    RETURN TRUE;
  END IF;

  -- Check explicit permission mapping
  RETURN EXISTS (
    SELECT 1
    FROM public.admin_permissions ap
    JOIN public.role_permissions rp ON rp.permission_id = ap.id
    WHERE rp.role = effective_role
      AND ap.resource = p_resource
      AND ap.action = p_action
      AND ap.is_active = TRUE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_user_permission(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_user_permission(UUID, TEXT, TEXT) TO authenticated;
