-- REPARO EMERGENCIAL: esquema Auth + acesso Owner sem quebrar o sistema
--
-- Objetivo:
-- 1) Diagnosticar se o schema auth esta consistente
-- 2) Neutralizar custom_access_token_hook (causa comum do erro "Database error querying schema")
-- 3) Desabilitar hook em auth.config / auth.instances / auth.hooks (quando existir)
-- 4) Garantir empresa GPPIS e criar um novo owner de contingencia
--
-- Ajuste apenas:
--   target_email
--   target_nome
--   target_password

BEGIN;

DO $$
DECLARE
  target_email text := 'owner.emergencial@gppis.com.br';
  target_nome text := 'Owner Emergencial';
  target_password text := 'Troque@123456';

  target_slug text := 'gppis';
  target_empresa_nome text := 'GPPIS';

  v_empresa_id uuid;
  v_user_id uuid;

  v_has_user_roles_empresa_id boolean;
  v_has_profiles_email boolean;
  v_has_profiles_nome boolean;
  v_has_profiles_empresa_id boolean;

  v_has_system_owner boolean;
  v_has_system_admin boolean;

  v_auth_users_exists boolean := to_regclass('auth.users') IS NOT NULL;
  v_auth_identities_exists boolean := to_regclass('auth.identities') IS NOT NULL;
  v_auth_sessions_exists boolean := to_regclass('auth.sessions') IS NOT NULL;
  v_auth_refresh_tokens_exists boolean := to_regclass('auth.refresh_tokens') IS NOT NULL;
  v_auth_config_exists boolean := to_regclass('auth.config') IS NOT NULL;
  v_auth_instances_exists boolean := to_regclass('auth.instances') IS NOT NULL;
  v_auth_hooks_table_exists boolean := to_regclass('auth.hooks') IS NOT NULL;
BEGIN
  -- A) Diagnostico estrutural minimo
  RAISE NOTICE 'diag.auth.users.exists=%', v_auth_users_exists;
  RAISE NOTICE 'diag.auth.identities.exists=%', v_auth_identities_exists;
  RAISE NOTICE 'diag.auth.sessions.exists=%', v_auth_sessions_exists;
  RAISE NOTICE 'diag.auth.refresh_tokens.exists=%', v_auth_refresh_tokens_exists;
  RAISE NOTICE 'diag.auth.config.exists=%', v_auth_config_exists;
  RAISE NOTICE 'diag.auth.instances.exists=%', v_auth_instances_exists;
  RAISE NOTICE 'diag.auth.hooks.exists=%', v_auth_hooks_table_exists;

  IF NOT v_auth_users_exists OR NOT v_auth_identities_exists THEN
    RAISE EXCEPTION 'Schema auth incompleto: auth.users/auth.identities ausentes';
  END IF;

  -- B) Neutraliza hooks customizados (auth/public)
  BEGIN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event jsonb)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = auth, public
      AS $hook$
      BEGIN
        RETURN event;
      END;
      $hook$
    $fn$;
  EXCEPTION
    WHEN insufficient_privilege OR undefined_table OR invalid_schema_name THEN
      RAISE NOTICE 'Nao foi possivel alterar auth.custom_access_token_hook';
  END;

  BEGIN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $hook$
      BEGIN
        RETURN event;
      END;
      $hook$
    $fn$;
  EXCEPTION
    WHEN insufficient_privilege OR undefined_table OR invalid_schema_name THEN
      RAISE NOTICE 'Nao foi possivel alterar public.custom_access_token_hook';
  END;

  -- C) Desabilita hook em config/auth instances/hook table (best effort)
  IF v_auth_config_exists THEN
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'auth' AND table_name = 'config' AND column_name = 'hook_custom_access_token_enabled'
      ) THEN
        EXECUTE 'UPDATE auth.config SET hook_custom_access_token_enabled = false';
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'auth' AND table_name = 'config' AND column_name = 'hook_custom_access_token_uri'
      ) THEN
        EXECUTE 'UPDATE auth.config SET hook_custom_access_token_uri = NULL';
      END IF;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'Sem privilegio para alterar auth.config';
    END;
  END IF;

  IF v_auth_instances_exists THEN
    BEGIN
      UPDATE auth.instances
      SET raw_base_config = (
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    COALESCE(NULLIF(raw_base_config, '')::jsonb, '{}'::jsonb),
                    '{HOOK_CUSTOM_ACCESS_TOKEN_ENABLED}',
                    'false'::jsonb,
                    true
                  ),
                  '{hook_custom_access_token_enabled}',
                  'false'::jsonb,
                  true
                ),
                '{HOOK_CUSTOM_ACCESS_TOKEN_URI}',
                'null'::jsonb,
                true
              ),
              '{hook_custom_access_token_uri}',
              'null'::jsonb,
              true
            ),
            '{hooks}',
            '{}'::jsonb,
            true
          ),
          '{hook}',
          '{}'::jsonb,
          true
        )::text
      );
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'Sem privilegio para alterar auth.instances';
    END;
  END IF;

  IF v_auth_hooks_table_exists THEN
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'auth' AND table_name = 'hooks' AND column_name = 'enabled'
      ) THEN
        EXECUTE 'UPDATE auth.hooks SET enabled = false';
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'auth' AND table_name = 'hooks' AND column_name = 'uri'
      ) THEN
        EXECUTE 'UPDATE auth.hooks SET uri = NULL';
      END IF;
    EXCEPTION
      WHEN insufficient_privilege OR undefined_table OR undefined_column THEN
        RAISE NOTICE 'Nao foi possivel alterar auth.hooks';
    END;
  END IF;

  -- D) Garante empresa GPPIS
  SELECT id INTO v_empresa_id
  FROM public.empresas
  WHERE lower(slug) = lower(target_slug)
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    INSERT INTO public.empresas (nome, slug)
    VALUES (target_empresa_nome, lower(target_slug))
    RETURNING id INTO v_empresa_id;
  END IF;

  -- E) Recriacao limpa do owner de contingencia
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(target_email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
    DELETE FROM public.profiles WHERE id = v_user_id;

    IF to_regclass('public.rbac_user_roles') IS NOT NULL THEN
      DELETE FROM public.rbac_user_roles WHERE user_id = v_user_id;
    END IF;

    IF v_auth_sessions_exists THEN
      DELETE FROM auth.sessions WHERE user_id = v_user_id;
    END IF;

    IF v_auth_refresh_tokens_exists THEN
      DELETE FROM auth.refresh_tokens WHERE user_id = v_user_id::text;
    END IF;

    DELETE FROM auth.identities WHERE user_id = v_user_id OR lower(provider_id) = lower(target_email);
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    lower(target_email),
    extensions.crypt(target_password, extensions.gen_salt('bf')),
    now(),
    now(),
    jsonb_build_object(
      'provider','email',
      'providers', jsonb_build_array('email'),
      'role', 'SYSTEM_OWNER',
      'roles', jsonb_build_array('SYSTEM_OWNER','SYSTEM_ADMIN')
    ),
    jsonb_build_object('nome', target_nome),
    now(),
    now()
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    lower(target_email),
    jsonb_build_object('sub', v_user_id::text, 'email', lower(target_email)),
    'email',
    now(),
    now(),
    now()
  );

  -- F) Profile
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) INTO v_has_profiles_email;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'nome'
  ) INTO v_has_profiles_nome;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'empresa_id'
  ) INTO v_has_profiles_empresa_id;

  IF v_has_profiles_empresa_id AND v_has_profiles_email AND v_has_profiles_nome THEN
    INSERT INTO public.profiles (id, email, nome, empresa_id)
    VALUES (v_user_id, lower(target_email), target_nome, v_empresa_id)
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          nome = EXCLUDED.nome,
          empresa_id = EXCLUDED.empresa_id;
  ELSIF v_has_profiles_empresa_id AND v_has_profiles_nome THEN
    INSERT INTO public.profiles (id, nome, empresa_id)
    VALUES (v_user_id, target_nome, v_empresa_id)
    ON CONFLICT (id) DO UPDATE
      SET nome = EXCLUDED.nome,
          empresa_id = EXCLUDED.empresa_id;
  ELSIF v_has_profiles_email AND v_has_profiles_nome THEN
    INSERT INTO public.profiles (id, email, nome)
    VALUES (v_user_id, lower(target_email), target_nome)
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          nome = EXCLUDED.nome;
  ELSE
    INSERT INTO public.profiles (id)
    VALUES (v_user_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- G) Roles maximas no user_roles
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'empresa_id'
  ) INTO v_has_user_roles_empresa_id;

  SELECT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'app_role' AND e.enumlabel = 'SYSTEM_OWNER'
  ) INTO v_has_system_owner;

  SELECT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'app_role' AND e.enumlabel = 'SYSTEM_ADMIN'
  ) INTO v_has_system_admin;

  IF v_has_user_roles_empresa_id THEN
    IF v_has_system_owner THEN
      INSERT INTO public.user_roles (user_id, empresa_id, role)
      VALUES (v_user_id, v_empresa_id, 'SYSTEM_OWNER'::public.app_role)
      ON CONFLICT DO NOTHING;
    END IF;
    IF v_has_system_admin THEN
      INSERT INTO public.user_roles (user_id, empresa_id, role)
      VALUES (v_user_id, v_empresa_id, 'SYSTEM_ADMIN'::public.app_role)
      ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    IF v_has_system_owner THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'SYSTEM_OWNER'::public.app_role)
      ON CONFLICT DO NOTHING;
    END IF;
    IF v_has_system_admin THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'SYSTEM_ADMIN'::public.app_role)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF to_regclass('public.system_owner_allowlist') IS NOT NULL THEN
    INSERT INTO public.system_owner_allowlist (email)
    VALUES (lower(target_email))
    ON CONFLICT (email) DO NOTHING;
  END IF;

  RAISE NOTICE 'REPARO CONCLUIDO: owner=%, user_id=%, empresa_id=%', lower(target_email), v_user_id, v_empresa_id;
END;
$$;

-- Validacao final
SELECT e.id AS empresa_id, e.nome, e.slug
FROM public.empresas e
WHERE lower(e.slug) = 'gppis';

SELECT u.id AS user_id, u.email, u.email_confirmed_at, u.raw_app_meta_data
FROM auth.users u
WHERE lower(u.email) = lower('owner.emergencial@gppis.com.br');

SELECT p.id, p.email, p.nome, p.empresa_id
FROM public.profiles p
WHERE p.id = (
  SELECT id FROM auth.users WHERE lower(email) = lower('owner.emergencial@gppis.com.br') LIMIT 1
);

SELECT ur.user_id, ur.empresa_id, ur.role
FROM public.user_roles ur
WHERE ur.user_id = (
  SELECT id FROM auth.users WHERE lower(email) = lower('owner.emergencial@gppis.com.br') LIMIT 1
)
ORDER BY ur.role;

COMMIT;
