-- Hardening for user visibility consistency across auth.users, profiles and user_roles

-- 1) Normalize roles to exactly one row per user (highest privilege wins)
WITH ranked_roles AS (
  SELECT
    ur.id,
    ur.user_id,
    ur.role,
    ROW_NUMBER() OVER (
      PARTITION BY ur.user_id
      ORDER BY
        CASE ur.role
          WHEN 'MASTER_TI'::public.app_role THEN 3
          WHEN 'ADMIN'::public.app_role THEN 2
          ELSE 1
        END DESC,
        ur.created_at DESC,
        ur.id DESC
    ) AS rn
  FROM public.user_roles ur
),
to_delete AS (
  SELECT id
  FROM ranked_roles
  WHERE rn > 1
)
DELETE FROM public.user_roles ur
USING to_delete d
WHERE ur.id = d.id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_user_id_key'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 2) Reconciliation function (anti-drift)
CREATE OR REPLACE FUNCTION public.reconcile_user_identity_drift()
RETURNS TABLE(missing_profiles_inserted integer, missing_roles_inserted integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_profiles integer := 0;
  v_roles integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (
    public.has_role(auth.uid(), 'ADMIN'::public.app_role)
    OR public.has_role(auth.uid(), 'MASTER_TI'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas ADMIN/MASTER_TI podem reconciliar usuários';
  END IF;

  INSERT INTO public.profiles (id, nome)
  SELECT
    u.id,
    COALESCE(u.raw_user_meta_data ->> 'nome', u.email, 'Usuário')
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_profiles = ROW_COUNT;

  INSERT INTO public.user_roles (user_id, role)
  SELECT
    u.id,
    'USUARIO'::public.app_role
  FROM auth.users u
  LEFT JOIN public.user_roles r ON r.user_id = u.id
  WHERE r.user_id IS NULL
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS v_roles = ROW_COUNT;

  RETURN QUERY SELECT v_profiles, v_roles;
END;
$$;

-- 3) Trigger diagnostics function
CREATE OR REPLACE FUNCTION public.user_sync_trigger_diagnostics()
RETURNS TABLE(
  trigger_name text,
  trigger_enabled text,
  trigger_function text,
  trigger_exists boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    t.tgname::text AS trigger_name,
    t.tgenabled::text AS trigger_enabled,
    p.proname::text AS trigger_function,
    true AS trigger_exists
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE n.nspname = 'auth'
    AND c.relname = 'users'
    AND t.tgname = 'on_auth_user_created'
    AND NOT t.tgisinternal
  UNION ALL
  SELECT
    'on_auth_user_created'::text,
    NULL::text,
    'handle_new_user'::text,
    false
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND t.tgname = 'on_auth_user_created'
      AND NOT t.tgisinternal
  );
$$;

-- 4) Data diagnostics function
CREATE OR REPLACE FUNCTION public.user_sync_data_diagnostics()
RETURNS TABLE(metric text, total bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT 'auth_users_without_profile', COUNT(*)
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL

  UNION ALL

  SELECT 'profiles_without_role', COUNT(*)
  FROM public.profiles p
  LEFT JOIN public.user_roles r ON r.user_id = p.id
  WHERE r.user_id IS NULL

  UNION ALL

  SELECT 'users_with_multiple_roles', COUNT(*)
  FROM (
    SELECT user_id
    FROM public.user_roles
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) x;
$$;

-- 5) Consolidated view used by frontend
DROP VIEW IF EXISTS public.users_full;
CREATE VIEW public.users_full AS
SELECT
  p.id,
  p.nome,
  COALESCE(au.email, ''::text) AS email,
  COALESCE(r.role, 'USUARIO'::public.app_role) AS role,
  p.created_at,
  p.updated_at
FROM public.profiles p
LEFT JOIN auth.users au ON au.id = p.id
LEFT JOIN LATERAL (
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = p.id
  ORDER BY
    CASE ur.role
      WHEN 'MASTER_TI'::public.app_role THEN 3
      WHEN 'ADMIN'::public.app_role THEN 2
      ELSE 1
    END DESC,
    ur.created_at DESC,
    ur.id DESC
  LIMIT 1
) r ON true;

GRANT SELECT ON public.users_full TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_user_identity_drift() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_sync_trigger_diagnostics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_sync_data_diagnostics() TO authenticated;

-- 6) Run one reconciliation immediately at migration time
-- Intencionalmente executado sem auth.uid() (contexto de migration) para bootstrap inicial.
DO $$
DECLARE
  v_profiles integer;
  v_roles integer;
BEGIN
  SELECT missing_profiles_inserted, missing_roles_inserted
  INTO v_profiles, v_roles
  FROM public.reconcile_user_identity_drift();

  RAISE NOTICE 'reconcile_user_identity_drift -> profiles: %, roles: %', v_profiles, v_roles;
END $$;
