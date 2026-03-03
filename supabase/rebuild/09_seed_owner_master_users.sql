-- FASE 9 - SEED CRÍTICO PÓS-REBUILD
-- Objetivo: manter o banco limpo e já provisionar usuários de governança (SYSTEM_OWNER e MASTER_TI)
-- Pré-requisitos:
--   1) As fases 00..08 já executadas
--   2) Usuários já existentes em auth.users (criados via Auth > Users)
--
-- Ajuste os e-mails abaixo se necessário.

BEGIN;

DO $$
DECLARE
  v_owner_email text := 'pedrozo@gppis.com.br';
  v_master_ti_email text := 'gustavus82@gmail.com';

  v_owner_id uuid;
  v_master_id uuid;
  v_empresa_id uuid;

  v_owner_name text;
  v_master_name text;
BEGIN
  -- Garantir valores de enum esperados
  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'MASTER_TI';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'SYSTEM_OWNER';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  -- Buscar usuário OWNER
  SELECT u.id,
         COALESCE(
           NULLIF(trim(COALESCE(u.raw_user_meta_data->>'name', '')), ''),
           NULLIF(trim(COALESCE(u.email, '')), ''),
           'System Owner'
         )
    INTO v_owner_id, v_owner_name
  FROM auth.users u
  WHERE lower(u.email) = lower(v_owner_email)
  ORDER BY u.created_at DESC
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Usuário OWNER não encontrado em auth.users: %', v_owner_email;
  END IF;

  -- Buscar usuário MASTER_TI
  SELECT u.id,
         COALESCE(
           NULLIF(trim(COALESCE(u.raw_user_meta_data->>'name', '')), ''),
           NULLIF(trim(COALESCE(u.email, '')), ''),
           'Master TI'
         )
    INTO v_master_id, v_master_name
  FROM auth.users u
  WHERE lower(u.email) = lower(v_master_ti_email)
  ORDER BY u.created_at DESC
  LIMIT 1;

  IF v_master_id IS NULL THEN
    RAISE EXCEPTION 'Usuário MASTER_TI não encontrado em auth.users: %', v_master_ti_email;
  END IF;

  -- Garantir empresa padrão para vínculo multi-tenant
  SELECT e.id
    INTO v_empresa_id
  FROM public.empresas e
  ORDER BY e.created_at ASC
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    INSERT INTO public.empresas (nome, slug, status, plano)
    VALUES ('GPPIS', 'gppis', 'active', 'enterprise')
    RETURNING id INTO v_empresa_id;
  END IF;

  -- Garantir allowlist de owner
  IF to_regclass('public.system_owner_allowlist') IS NOT NULL THEN
    INSERT INTO public.system_owner_allowlist (email)
    VALUES (lower(v_owner_email))
    ON CONFLICT (email) DO NOTHING;
  END IF;

  -- Evitar bloqueios de trigger durante seed administrativo
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    BEGIN
      EXECUTE 'ALTER TABLE public.user_roles DISABLE TRIGGER guard_system_owner_role_changes';
    EXCEPTION WHEN undefined_object THEN NULL;
    END;

    BEGIN
      EXECUTE 'ALTER TABLE public.user_roles DISABLE TRIGGER trg_prevent_master_ti_promotion';
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
  END IF;

  -- Enforce: somente este owner fica como SYSTEM_OWNER
  DELETE FROM public.user_roles
  WHERE role = 'SYSTEM_OWNER'::public.app_role
    AND user_id <> v_owner_id;

  -- OWNER profile
  INSERT INTO public.profiles (id, empresa_id, nome, email)
  VALUES (v_owner_id, v_empresa_id, v_owner_name, lower(v_owner_email))
  ON CONFLICT (id) DO UPDATE
    SET empresa_id = EXCLUDED.empresa_id,
        nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        updated_at = now();

  -- MASTER_TI profile
  INSERT INTO public.profiles (id, empresa_id, nome, email)
  VALUES (v_master_id, v_empresa_id, v_master_name, lower(v_master_ti_email))
  ON CONFLICT (id) DO UPDATE
    SET empresa_id = EXCLUDED.empresa_id,
        nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        updated_at = now();

  -- Limpar roles conflitantes desses usuários e reaplicar padrão
  DELETE FROM public.user_roles
  WHERE user_id IN (v_owner_id, v_master_id)
    AND role IN ('SYSTEM_OWNER'::public.app_role, 'MASTER_TI'::public.app_role);

  INSERT INTO public.user_roles (user_id, empresa_id, role)
  VALUES (v_owner_id, v_empresa_id, 'SYSTEM_OWNER'::public.app_role)
  ON CONFLICT (user_id, empresa_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, empresa_id, role)
  VALUES (v_master_id, v_empresa_id, 'MASTER_TI'::public.app_role)
  ON CONFLICT (user_id, empresa_id, role) DO NOTHING;

  -- Reabilitar triggers
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    BEGIN
      EXECUTE 'ALTER TABLE public.user_roles ENABLE TRIGGER guard_system_owner_role_changes';
    EXCEPTION WHEN undefined_object THEN NULL;
    END;

    BEGIN
      EXECUTE 'ALTER TABLE public.user_roles ENABLE TRIGGER trg_prevent_master_ti_promotion';
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
  END IF;
END;
$$;

COMMIT;

-- Verificação rápida (retorna registros esperados)
SELECT p.id, p.nome, p.email, p.empresa_id
FROM public.profiles p
WHERE lower(p.email) IN ('pedrozo@gppis.com.br', 'gustavus82@gmail.com')
ORDER BY p.email;

SELECT ur.user_id, ur.empresa_id, ur.role
FROM public.user_roles ur
WHERE ur.role IN ('SYSTEM_OWNER'::public.app_role, 'MASTER_TI'::public.app_role)
ORDER BY ur.role, ur.user_id;

SELECT email FROM public.system_owner_allowlist ORDER BY email;
