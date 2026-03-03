BEGIN;

DO $$
DECLARE
  v_user_id uuid;
  v_empresa_id uuid;
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

  SELECT id INTO v_empresa_id
  FROM public.empresas
  WHERE slug = 'gppis'
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Empresa gppis não encontrada';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = v_user_id;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'empresa_id'
  ) INTO v_has_user_roles_empresa_id;

  IF v_has_user_roles_empresa_id THEN
    INSERT INTO public.user_roles (user_id, empresa_id, role)
    VALUES (v_user_id, v_empresa_id, 'SYSTEM_OWNER'::public.app_role);
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'SYSTEM_OWNER'::public.app_role);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = v_user_id
      AND role = 'SYSTEM_OWNER'::public.app_role
  ) THEN
    RAISE EXCEPTION 'Falha ao criar role SYSTEM_OWNER para pedrozo@gppis.com.br';
  END IF;
END
$$;

COMMIT;
