BEGIN;

-- =====================================================
-- 1) FIRST LOGIN PASSWORD CHANGE
-- =====================================================

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS force_password_change boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'must_change_password'
  ) THEN
    EXECUTE '
      UPDATE public.profiles
      SET force_password_change = true
      WHERE COALESCE(must_change_password, false) = true
    ';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_force_password_change
  ON public.profiles (force_password_change);

-- =====================================================
-- 2) COMPANY SLUG HARDENING
-- =====================================================

WITH base_slug AS (
  SELECT
    e.id,
    COALESCE(
      NULLIF(regexp_replace(lower(COALESCE(e.slug, e.nome, '''')), '[^a-z0-9]+', '-', 'g'), ''),
      'empresa-' || left(e.id::text, 8)
    ) AS normalized_slug
  FROM public.empresas e
), ranked_slug AS (
  SELECT
    b.id,
    b.normalized_slug,
    row_number() OVER (PARTITION BY b.normalized_slug ORDER BY b.id) AS seq
  FROM base_slug b
)
UPDATE public.empresas e
SET slug = CASE
  WHEN r.seq = 1 THEN r.normalized_slug
  ELSE r.normalized_slug || '-' || r.seq::text
END
FROM ranked_slug r
WHERE e.id = r.id
  AND (
    e.slug IS NULL
    OR trim(e.slug) = ''
    OR e.slug <> CASE WHEN r.seq = 1 THEN r.normalized_slug ELSE r.normalized_slug || '-' || r.seq::text END
  );

ALTER TABLE public.empresas
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_slug_unique
  ON public.empresas (slug);

-- =====================================================
-- 3) LOGIN TENANT CONTEXT LOOKUP
-- =====================================================

CREATE OR REPLACE FUNCTION public.resolve_user_tenant_context(
  p_user_id uuid
)
RETURNS TABLE (
  empresa_id uuid,
  empresa_slug text,
  user_role public.app_role,
  force_password_change boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.empresa_id,
    e.slug,
    COALESCE(
      (
        SELECT ur.role
        FROM public.user_roles ur
        WHERE ur.user_id = p_user_id
          AND ur.empresa_id = p.empresa_id
        ORDER BY CASE
          WHEN ur.role = 'SYSTEM_OWNER' THEN 1
          WHEN ur.role = 'SYSTEM_ADMIN' THEN 2
          WHEN ur.role = 'MASTER_TI' THEN 3
          WHEN ur.role = 'ADMIN' THEN 4
          ELSE 5
        END
        LIMIT 1
      ),
      'USUARIO'::public.app_role
    ) AS user_role,
    COALESCE(p.force_password_change, false) AS force_password_change
  FROM public.profiles p
  JOIN public.empresas e ON e.id = p.empresa_id
  WHERE p.id = p_user_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_user_tenant_context(uuid)
TO authenticated, service_role;

COMMIT;
