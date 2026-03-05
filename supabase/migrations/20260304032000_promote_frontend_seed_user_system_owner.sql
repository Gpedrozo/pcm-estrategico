BEGIN;

DO $$
DECLARE
  v_email text := 'authtest1772676008706@gmail.com';
  v_user_id uuid;
  v_empresa_id uuid;
  v_has_profiles_empresa_id boolean;
  v_has_profiles_email boolean;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado em auth.users: %', v_email;
  END IF;

  UPDATE auth.users
  SET
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmation_sent_at = COALESCE(confirmation_sent_at, now()),
    updated_at = now()
  WHERE id = v_user_id;

  SELECT id INTO v_empresa_id
  FROM public.empresas
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma empresa encontrada para vínculo do usuário SYSTEM_OWNER';
  END IF;

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
    VALUES (v_user_id, v_empresa_id, 'Owner Frontend Bot', v_email)
    ON CONFLICT (id) DO UPDATE
    SET empresa_id = EXCLUDED.empresa_id, nome = EXCLUDED.nome, email = EXCLUDED.email;
  ELSIF v_has_profiles_empresa_id THEN
    INSERT INTO public.profiles (id, empresa_id, nome)
    VALUES (v_user_id, v_empresa_id, 'Owner Frontend Bot')
    ON CONFLICT (id) DO UPDATE
    SET empresa_id = EXCLUDED.empresa_id, nome = EXCLUDED.nome;
  ELSIF v_has_profiles_email THEN
    INSERT INTO public.profiles (id, nome, email)
    VALUES (v_user_id, 'Owner Frontend Bot', v_email)
    ON CONFLICT (id) DO UPDATE
    SET nome = EXCLUDED.nome, email = EXCLUDED.email;
  ELSE
    INSERT INTO public.profiles (id, nome)
    VALUES (v_user_id, 'Owner Frontend Bot')
    ON CONFLICT (id) DO UPDATE
    SET nome = EXCLUDED.nome;
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = v_user_id
    AND role::text IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN');

  INSERT INTO public.user_roles (user_id, empresa_id, role)
  VALUES (v_user_id, v_empresa_id, 'SYSTEM_OWNER'::public.app_role)
  ON CONFLICT DO NOTHING;

  IF to_regclass('public.system_owner_allowlist') IS NOT NULL THEN
    INSERT INTO public.system_owner_allowlist (email)
    VALUES (lower(v_email))
    ON CONFLICT (email) DO NOTHING;
  END IF;
END;
$$;

COMMIT;
