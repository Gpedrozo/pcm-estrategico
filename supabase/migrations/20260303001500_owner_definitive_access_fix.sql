BEGIN;

CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  RETURN event;
END;
$$;

REVOKE ALL ON FUNCTION auth.custom_access_token_hook(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook(jsonb) TO postgres;
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook(jsonb) TO supabase_admin;
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook(jsonb) TO service_role;

DO $$
BEGIN
  IF to_regclass('auth.instances') IS NULL THEN
    RETURN;
  END IF;

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
END;
$$;

INSERT INTO public.permissoes (codigo, descricao, escopo)
VALUES
  ('control_plane.read', 'Acesso ao painel owner/control plane', 'global'),
  ('tenant.admin', 'Administração completa de tenant', 'tenant')
ON CONFLICT (codigo) DO UPDATE
SET
  descricao = EXCLUDED.descricao,
  escopo = EXCLUDED.escopo;

INSERT INTO public.role_permissions (role, permissao_codigo)
VALUES
  ('SYSTEM_OWNER', 'control_plane.read'),
  ('SYSTEM_OWNER', 'tenant.admin'),
  ('SYSTEM_ADMIN', 'control_plane.read'),
  ('SYSTEM_ADMIN', 'tenant.admin'),
  ('MASTER_TI', 'control_plane.read'),
  ('MASTER_TI', 'tenant.admin'),
  ('ADMIN', 'tenant.admin')
ON CONFLICT (role, permissao_codigo) DO NOTHING;

DO $$
DECLARE
  v_user_id uuid;
  v_empresa_id uuid;
  v_has_empresa_id boolean;
BEGIN
  SELECT id
    INTO v_user_id
  FROM auth.users
  WHERE lower(email) = 'pedrozo@gppis.com.br'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário pedrozo@gppis.com.br não encontrado em auth.users';
  END IF;

  IF to_regclass('public.system_owner_allowlist') IS NOT NULL THEN
    INSERT INTO public.system_owner_allowlist (email)
    VALUES ('pedrozo@gppis.com.br')
    ON CONFLICT (email) DO NOTHING;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_roles'
      AND column_name = 'empresa_id'
  ) INTO v_has_empresa_id;

  IF v_has_empresa_id THEN
    SELECT id
      INTO v_empresa_id
    FROM public.empresas
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_empresa_id IS NULL THEN
      RAISE EXCEPTION 'Nenhuma empresa encontrada para vínculo de role SYSTEM_OWNER';
    END IF;

    DELETE FROM public.user_roles
    WHERE user_id = v_user_id
      AND role::text IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN');

    INSERT INTO public.user_roles (user_id, empresa_id, role)
    VALUES (v_user_id, v_empresa_id, 'SYSTEM_OWNER'::public.app_role)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = v_user_id
      AND role::text IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN');

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'SYSTEM_OWNER'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_permission(
  p_permission_code text,
  p_empresa_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_permission_code text := lower(trim(COALESCE(p_permission_code, '')));
  v_exists boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_system_operator(auth.uid()) THEN
    RETURN true;
  END IF;

  IF v_permission_code = 'control_plane.read' THEN
    v_permission_code := 'platform.read';
  ELSIF v_permission_code = 'tenant.admin' THEN
    v_permission_code := 'company.write';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role::text
    WHERE ur.user_id = auth.uid()
      AND lower(rp.permissao_codigo) = v_permission_code
      AND (
        p_empresa_id IS NULL
        OR ur.empresa_id IS NULL
        OR ur.empresa_id = p_empresa_id
      )
  ) INTO v_exists;

  RETURN COALESCE(v_exists, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(text, uuid) TO anon, authenticated, service_role;

COMMIT;
