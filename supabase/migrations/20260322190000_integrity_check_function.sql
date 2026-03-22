-- ============================================================================
-- Migration: Função de verificação de integridade auth <-> profiles/roles
-- Data: 2026-03-22
-- Motivo: Prevenir cenário onde auth.users existem sem profile/roles,
--         ou profiles/roles existem sem auth.users correspondente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_auth_integrity()
RETURNS TABLE (
  check_name text,
  severity text,
  count bigint,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  -- 1. Auth users sem profile
  RETURN QUERY
  SELECT
    'auth_users_without_profile'::text,
    'critical'::text,
    count(*)::bigint,
    jsonb_agg(jsonb_build_object('user_id', u.id, 'email', u.email))
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL;

  -- 2. Auth users sem roles
  RETURN QUERY
  SELECT
    'auth_users_without_roles'::text,
    'critical'::text,
    count(*)::bigint,
    jsonb_agg(jsonb_build_object('user_id', u.id, 'email', u.email))
  FROM auth.users u
  LEFT JOIN public.user_roles r ON r.user_id = u.id
  WHERE r.id IS NULL;

  -- 3. Profiles órfãos (sem auth.users)
  RETURN QUERY
  SELECT
    'orphan_profiles'::text,
    'warning'::text,
    count(*)::bigint,
    jsonb_agg(jsonb_build_object('profile_id', p.id, 'email', p.email))
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE u.id IS NULL;

  -- 4. Roles órfãos (sem auth.users)
  RETURN QUERY
  SELECT
    'orphan_roles'::text,
    'warning'::text,
    count(*)::bigint,
    jsonb_agg(jsonb_build_object('user_id', r.user_id, 'role', r.role::text))
  FROM public.user_roles r
  LEFT JOIN auth.users u ON u.id = r.user_id
  WHERE u.id IS NULL;

  -- 5. Auth users sem empresa_id no metadata
  RETURN QUERY
  SELECT
    'auth_users_missing_empresa_metadata'::text,
    'warning'::text,
    count(*)::bigint,
    jsonb_agg(jsonb_build_object('user_id', u.id, 'email', u.email))
  FROM auth.users u
  WHERE (u.raw_app_meta_data ->> 'empresa_id') IS NULL
    AND (u.raw_user_meta_data ->> 'empresa_id') IS NULL;

  RETURN;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.check_auth_integrity() TO service_role;
