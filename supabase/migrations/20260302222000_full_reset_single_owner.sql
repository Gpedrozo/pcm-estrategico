-- 20260302222000_full_reset_single_owner.sql
-- RESET TOTAL DE DADOS + USUÁRIO ÚNICO SYSTEM_OWNER

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Limpar TODOS os dados do schema public (mantendo estrutura)
DO $$
DECLARE
  v_sql text;
BEGIN
  SELECT
    'TRUNCATE TABLE ' ||
    string_agg(format('%I.%I', schemaname, tablename), ', ' ORDER BY tablename) ||
    ' RESTART IDENTITY CASCADE;'
  INTO v_sql
  FROM pg_tables
  WHERE schemaname = 'public';

  IF v_sql IS NOT NULL THEN
    EXECUTE v_sql;
  END IF;
END
$$;

-- 2) Limpar usuários/auth (sem derrubar estrutura do auth)
DELETE FROM auth.users;

-- 3) Seed mínimo de empresa
INSERT INTO public.empresas (id, nome, slug, status, plano)
VALUES (
  gen_random_uuid(),
  'GPPIS',
  'gppis',
  'active',
  'enterprise'
)
ON CONFLICT (slug) DO UPDATE
SET nome = EXCLUDED.nome,
    status = EXCLUDED.status,
    plano = EXCLUDED.plano;

-- 4) Seed RBAC (roles/permissões) para garantir has_permission
INSERT INTO public.rbac_roles (code, description, is_system)
VALUES
  ('USUARIO', 'Usuário padrão do tenant', true),
  ('ADMIN', 'Administrador do tenant', true),
  ('MASTER_TI', 'Operador técnico global', true),
  ('SYSTEM_OWNER', 'Control plane owner', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.rbac_permissions (code, description)
VALUES
  ('tenant.read', 'Ler recursos do tenant'),
  ('tenant.write', 'Escrever recursos do tenant'),
  ('tenant.admin', 'Administrar tenant'),
  ('control_plane.read', 'Ler control plane'),
  ('control_plane.write', 'Administrar control plane'),
  ('security.manage', 'Gerenciar segurança e auditoria'),
  ('billing.manage', 'Gerenciar billing')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
JOIN public.rbac_permissions p ON (
  (r.code = 'USUARIO' AND p.code IN ('tenant.read')) OR
  (r.code = 'ADMIN' AND p.code IN ('tenant.read', 'tenant.write', 'tenant.admin')) OR
  (r.code = 'MASTER_TI' AND p.code IN ('tenant.read', 'tenant.write', 'control_plane.read', 'security.manage')) OR
  (r.code = 'SYSTEM_OWNER' AND p.code IN ('tenant.read', 'tenant.write', 'tenant.admin', 'control_plane.read', 'control_plane.write', 'security.manage', 'billing.manage'))
)
ON CONFLICT DO NOTHING;

-- 5) Criar usuário único no Auth + profile + roles
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_empresa_id uuid;
  v_identity_id uuid := gen_random_uuid();
  v_has_profiles_empresa_id boolean;
  v_has_profiles_email boolean;
  v_has_user_roles_empresa_id boolean;
  v_system_owner_role_id uuid;
  v_user_exists boolean;
  v_role_exists boolean;
BEGIN
  SELECT id INTO v_empresa_id
  FROM public.empresas
  WHERE slug = 'gppis'
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Empresa base não encontrada para seed';
  END IF;

  -- remover eventual usuário antigo com esse e-mail
  DELETE FROM auth.users WHERE lower(email) = 'pedrozo@gppis.com.br';

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    (SELECT id FROM auth.instances LIMIT 1),
    'authenticated',
    'authenticated',
    'pedrozo@gppis.com.br',
    '$2b$10$wQHOMtgSzXAdL27Leq3tUuaq6lh7sqC9xVm2f2vkGOJDMio/FDInK',
    now(),
    jsonb_build_object('provider','email','providers', jsonb_build_array('email')),
    jsonb_build_object('nome','Pedrozo'),
    now(),
    now()
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    created_at,
    updated_at,
    last_sign_in_at
  )
  VALUES (
    v_identity_id,
    v_user_id,
    'pedrozo@gppis.com.br',
    jsonb_build_object('sub', v_user_id::text, 'email', 'pedrozo@gppis.com.br'),
    'email',
    now(),
    now(),
    now()
  );

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'empresa_id'
  ) INTO v_has_profiles_empresa_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) INTO v_has_profiles_email;

  IF v_has_profiles_empresa_id AND v_has_profiles_email THEN
    INSERT INTO public.profiles (id, empresa_id, nome, email)
    VALUES (v_user_id, v_empresa_id, 'Pedrozo', 'pedrozo@gppis.com.br');
  ELSIF v_has_profiles_empresa_id THEN
    INSERT INTO public.profiles (id, empresa_id, nome)
    VALUES (v_user_id, v_empresa_id, 'Pedrozo');
  ELSIF v_has_profiles_email THEN
    INSERT INTO public.profiles (id, nome, email)
    VALUES (v_user_id, 'Pedrozo', 'pedrozo@gppis.com.br');
  ELSE
    INSERT INTO public.profiles (id, nome)
    VALUES (v_user_id, 'Pedrozo');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'empresa_id'
  ) INTO v_has_user_roles_empresa_id;

  IF v_has_user_roles_empresa_id THEN
    INSERT INTO public.user_roles (user_id, empresa_id, role)
    VALUES (v_user_id, v_empresa_id, 'SYSTEM_OWNER'::public.app_role);
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'SYSTEM_OWNER'::public.app_role);
  END IF;

  -- papel RBAC equivalente para has_permission
  SELECT id INTO v_system_owner_role_id
  FROM public.rbac_roles
  WHERE code = 'SYSTEM_OWNER'
  LIMIT 1;

  IF v_system_owner_role_id IS NOT NULL THEN
    INSERT INTO public.rbac_user_roles (user_id, empresa_id, role_id, granted_by)
    VALUES (v_user_id, v_empresa_id, v_system_owner_role_id, v_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM auth.users u WHERE lower(u.email) = 'pedrozo@gppis.com.br'
  ) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'Usuário pedrozo@gppis.com.br não foi criado em auth.users';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    WHERE lower(u.email) = 'pedrozo@gppis.com.br'
      AND ur.role = 'SYSTEM_OWNER'::public.app_role
  ) INTO v_role_exists;

  IF NOT v_role_exists THEN
    RAISE EXCEPTION 'Role SYSTEM_OWNER não foi atribuída ao usuário pedrozo@gppis.com.br';
  END IF;
END
$$;

COMMIT;
