-- Enforce domain-bound tenant resolution to prevent cross-company data leakage.
-- This hardening makes current_empresa_id follow the accessed domain when mapped,
-- and only allows it if the authenticated user belongs to that company.

CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_empresa_id uuid;
  v_jwt_empresa_id uuid;
  v_headers_raw text;
  v_headers jsonb := '{}'::jsonb;
  v_host text;
  v_domain_empresa_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_jwt_empresa_id := NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid;
  EXCEPTION
    WHEN others THEN
      v_jwt_empresa_id := NULL;
  END;

  BEGIN
    v_headers_raw := current_setting('request.headers', true);
    IF COALESCE(v_headers_raw, '') <> '' THEN
      v_headers := v_headers_raw::jsonb;
    END IF;
  EXCEPTION
    WHEN others THEN
      v_headers := '{}'::jsonb;
  END;

  v_host := lower(split_part(COALESCE(v_headers ->> 'x-forwarded-host', v_headers ->> 'host', ''), ':', 1));

  IF v_host <> '' AND to_regclass('public.empresa_config') IS NOT NULL THEN
    SELECT ec.empresa_id
      INTO v_domain_empresa_id
      FROM public.empresa_config ec
     WHERE lower(ec.dominio_custom) = v_host
     LIMIT 1;
  END IF;

  IF v_domain_empresa_id IS NOT NULL THEN
    IF to_regclass('public.user_roles') IS NOT NULL AND EXISTS (
      SELECT 1
        FROM public.user_roles ur
       WHERE ur.user_id = v_user_id
         AND upper(ur.role::text) IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN', 'MASTER_TI')
    ) THEN
      RETURN v_domain_empresa_id;
    END IF;

    IF to_regclass('public.membros_empresa') IS NOT NULL AND EXISTS (
      SELECT 1
        FROM public.membros_empresa me
       WHERE me.user_id = v_user_id
         AND me.empresa_id = v_domain_empresa_id
         AND COALESCE(me.status, 'active') = 'active'
    ) THEN
      RETURN v_domain_empresa_id;
    END IF;

    IF to_regclass('public.user_roles') IS NOT NULL AND EXISTS (
      SELECT 1
        FROM public.user_roles ur
       WHERE ur.user_id = v_user_id
         AND ur.empresa_id = v_domain_empresa_id
    ) THEN
      RETURN v_domain_empresa_id;
    END IF;

    IF to_regclass('public.profiles') IS NOT NULL AND EXISTS (
      SELECT 1
        FROM public.profiles p
       WHERE p.id = v_user_id
         AND p.empresa_id = v_domain_empresa_id
    ) THEN
      RETURN v_domain_empresa_id;
    END IF;

    -- Domain is mapped, but user has no membership in that company: block tenant resolution.
    RETURN NULL;
  END IF;

  IF v_jwt_empresa_id IS NOT NULL THEN
    RETURN v_jwt_empresa_id;
  END IF;

  IF to_regclass('public.membros_empresa') IS NOT NULL THEN
    SELECT me.empresa_id
      INTO v_empresa_id
      FROM public.membros_empresa me
     WHERE me.user_id = v_user_id
       AND me.status = 'active'
     ORDER BY me.created_at
     LIMIT 1;

    IF v_empresa_id IS NOT NULL THEN
      RETURN v_empresa_id;
    END IF;
  END IF;

  IF to_regclass('public.user_roles') IS NOT NULL THEN
    SELECT ur.empresa_id
      INTO v_empresa_id
      FROM public.user_roles ur
     WHERE ur.user_id = v_user_id
       AND ur.empresa_id IS NOT NULL
     ORDER BY ur.created_at
     LIMIT 1;

    IF v_empresa_id IS NOT NULL THEN
      RETURN v_empresa_id;
    END IF;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    SELECT p.empresa_id
      INTO v_empresa_id
      FROM public.profiles p
     WHERE p.id = v_user_id
     LIMIT 1;
  END IF;

  RETURN v_empresa_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_empresa_id();
$$;

GRANT EXECUTE ON FUNCTION public.current_empresa_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_empresa_id() TO authenticated;
