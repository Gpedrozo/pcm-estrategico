-- RESET DE HOMOLOGACAO: manter somente usuario owner
-- Data: 2026-03-12
-- ATENCAO: script destrutivo de dados
-- Mantem apenas auth.users com email pedrozo@gppis.com.br

BEGIN;

-- 0) Guardrail: owner precisa existir
DO $$
DECLARE
  v_owner_id uuid;
  v_owner_empresa_id uuid;
BEGIN
  SELECT id
  INTO v_owner_id
  FROM auth.users
  WHERE lower(email) = lower('pedrozo@gppis.com.br')
  LIMIT 1;

  -- Em alguns ambientes existe trigger exigindo empresa_id em user_roles.
  -- Tentamos resolver a empresa do owner via profile e fallback na primeira empresa existente.
  IF to_regclass('public.profiles') IS NOT NULL THEN
    SELECT p.empresa_id
    INTO v_owner_empresa_id
    FROM public.profiles p
    WHERE p.id = v_owner_id
    LIMIT 1;
  END IF;

  IF v_owner_empresa_id IS NULL AND to_regclass('public.empresas') IS NOT NULL THEN
    SELECT e.id
    INTO v_owner_empresa_id
    FROM public.empresas e
    ORDER BY e.created_at NULLS LAST
    LIMIT 1;
  END IF;

  IF v_owner_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Nao foi possivel resolver empresa_id para o owner. Crie ao menos uma empresa antes do reset owner-only.';
  END IF;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner pedrozo@gppis.com.br nao encontrado em auth.users. Abortando reset.';
  END IF;
END $$;

-- 1) Limpar dados de negocio no schema public (preserva tabelas de identidade/permissao base)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT t.tablename
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.tablename NOT IN (
        'empresas',
        'profiles',
        'user_roles',
        'rbac_roles',
        'rbac_permissions',
        'rbac_role_permissions'
      )
  LOOP
    EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', r.tablename);
  END LOOP;
END $$;

-- 2) Manter apenas profile/roles do owner
DO $$
DECLARE
  v_owner_id uuid;
  v_owner_empresa_id uuid;
BEGIN
  SELECT id
  INTO v_owner_id
  FROM auth.users
  WHERE lower(email) = lower('pedrozo@gppis.com.br')
  LIMIT 1;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    SELECT p.empresa_id
    INTO v_owner_empresa_id
    FROM public.profiles p
    WHERE p.id = v_owner_id
    LIMIT 1;
  END IF;

  IF v_owner_empresa_id IS NULL AND to_regclass('public.empresas') IS NOT NULL THEN
    SELECT e.id
    INTO v_owner_empresa_id
    FROM public.empresas e
    ORDER BY e.created_at NULLS LAST
    LIMIT 1;
  END IF;

  IF v_owner_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Nao foi possivel resolver empresa_id para o owner no bloco de role.';
  END IF;

  IF to_regclass('public.user_roles') IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id <> v_owner_id;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    DELETE FROM public.profiles WHERE id <> v_owner_id;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'status'
    ) THEN
      EXECUTE format(
        'UPDATE public.profiles SET status = %L WHERE id = %L::uuid',
        'ativo',
        v_owner_id::text
      );
    END IF;
  END IF;
END $$;

-- 3) Remover todos os usuarios auth, exceto owner
DELETE FROM auth.users
WHERE lower(email) <> lower('pedrozo@gppis.com.br');

-- 4) Garantir role global do owner
DO $$
DECLARE
  v_owner_id uuid;
  v_owner_empresa_id uuid;
BEGIN
  SELECT id
  INTO v_owner_id
  FROM auth.users
  WHERE lower(email) = lower('pedrozo@gppis.com.br')
  LIMIT 1;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    SELECT p.empresa_id
    INTO v_owner_empresa_id
    FROM public.profiles p
    WHERE p.id = v_owner_id
    LIMIT 1;
  END IF;

  IF v_owner_empresa_id IS NULL AND to_regclass('public.empresas') IS NOT NULL THEN
    SELECT e.id
    INTO v_owner_empresa_id
    FROM public.empresas e
    ORDER BY e.created_at NULLS LAST
    LIMIT 1;
  END IF;

  IF v_owner_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Nao foi possivel resolver empresa_id para o owner no bloco de role.';
  END IF;

  IF to_regclass('public.user_roles') IS NOT NULL THEN
    -- remove papeis nao globais do owner
    DELETE FROM public.user_roles
    WHERE user_id = v_owner_id
      AND role::text NOT IN ('SYSTEM_OWNER', 'MASTER_TI');

    -- garante SYSTEM_OWNER
    IF NOT EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = v_owner_id
        AND role::text = 'SYSTEM_OWNER'
    ) THEN
      INSERT INTO public.user_roles (user_id, empresa_id, role, created_at)
      VALUES (v_owner_id, v_owner_empresa_id, 'SYSTEM_OWNER'::public.app_role, now())
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

COMMIT;

-- 5) Validacao pos-reset
SELECT count(*)::int AS total_auth_users FROM auth.users;

SELECT
  u.id,
  u.email,
  u.created_at
FROM auth.users u
WHERE lower(u.email) = lower('pedrozo@gppis.com.br');

SELECT
  count(*)::int AS total_profiles
FROM public.profiles;

SELECT
  count(*)::int AS total_user_roles
FROM public.user_roles;

SELECT
  relname AS table_name,
  n_live_tup::bigint AS estimated_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC, relname;
