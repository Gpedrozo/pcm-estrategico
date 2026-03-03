BEGIN;

DO $$
DECLARE
  v_user_id uuid;
  v_empresa_id uuid;
  v_system_owner_role_id uuid;
  v_has_user_roles_empresa_id boolean;
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

  SELECT id
    INTO v_empresa_id
  FROM public.empresas
  WHERE slug = 'gppis'
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Empresa base gppis não encontrada';
  END IF;

  DELETE FROM public.rbac_user_roles WHERE user_id <> v_user_id;
  DELETE FROM public.user_roles WHERE user_id <> v_user_id;
  DELETE FROM public.profiles WHERE id <> v_user_id;
  DELETE FROM auth.identities WHERE user_id <> v_user_id;
  DELETE FROM auth.users WHERE id <> v_user_id;

  INSERT INTO public.profiles (id, empresa_id, nome, email)
  VALUES (v_user_id, v_empresa_id, 'Pedrozo', 'pedrozo@gppis.com.br')
  ON CONFLICT (id) DO UPDATE
  SET
    empresa_id = EXCLUDED.empresa_id,
    nome = EXCLUDED.nome,
    email = EXCLUDED.email;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'empresa_id'
  ) INTO v_has_user_roles_empresa_id;

  IF v_has_user_roles_empresa_id THEN
    INSERT INTO public.user_roles (user_id, empresa_id, role)
    VALUES (v_user_id, v_empresa_id, 'SYSTEM_OWNER'::public.app_role)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'SYSTEM_OWNER'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_system_owner_role_id
  FROM public.rbac_roles
  WHERE code = 'SYSTEM_OWNER'
  LIMIT 1;

  IF v_system_owner_role_id IS NOT NULL THEN
    INSERT INTO public.rbac_user_roles (user_id, empresa_id, role_id, granted_by)
    VALUES (v_user_id, v_empresa_id, v_system_owner_role_id, v_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = v_user_id
      AND ur.role = 'SYSTEM_OWNER'::public.app_role
  ) THEN
    RAISE EXCEPTION 'Role SYSTEM_OWNER não vinculada ao usuário único';
  END IF;
END
$$;

COMMIT;
