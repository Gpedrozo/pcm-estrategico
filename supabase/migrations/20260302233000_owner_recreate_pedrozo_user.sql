BEGIN;

DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_identity_id uuid := gen_random_uuid();
  v_empresa_id uuid;
  v_has_profiles_empresa_id boolean;
  v_has_profiles_email boolean;
  v_has_user_roles_empresa_id boolean;
BEGIN
  SELECT id INTO v_empresa_id
  FROM public.empresas
  WHERE slug = 'gppis'
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    SELECT id INTO v_empresa_id
    FROM public.empresas
    ORDER BY created_at
    LIMIT 1;
  END IF;

  DELETE FROM public.rbac_user_roles
  WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'pedrozo@gppis.com.br');

  DELETE FROM public.user_roles
  WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'pedrozo@gppis.com.br');

  DELETE FROM public.profiles
  WHERE id IN (SELECT id FROM auth.users WHERE lower(email) = 'pedrozo@gppis.com.br');

  DELETE FROM auth.identities
  WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'pedrozo@gppis.com.br')
     OR lower(provider_id) = 'pedrozo@gppis.com.br';

  DELETE FROM auth.users WHERE lower(email) = 'pedrozo@gppis.com.br';

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'pedrozo@gppis.com.br',
    extensions.crypt('@Gpp280693', extensions.gen_salt('bf')),
    now(),
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

  IF v_has_profiles_empresa_id AND v_has_profiles_email AND v_empresa_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, empresa_id, nome, email)
    VALUES (v_user_id, v_empresa_id, 'Pedrozo', 'pedrozo@gppis.com.br')
    ON CONFLICT (id) DO UPDATE SET empresa_id = EXCLUDED.empresa_id, nome = EXCLUDED.nome, email = EXCLUDED.email;
  ELSIF v_has_profiles_empresa_id AND v_empresa_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, empresa_id, nome)
    VALUES (v_user_id, v_empresa_id, 'Pedrozo')
    ON CONFLICT (id) DO UPDATE SET empresa_id = EXCLUDED.empresa_id, nome = EXCLUDED.nome;
  ELSIF v_has_profiles_email THEN
    INSERT INTO public.profiles (id, nome, email)
    VALUES (v_user_id, 'Pedrozo', 'pedrozo@gppis.com.br')
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, email = EXCLUDED.email;
  ELSE
    INSERT INTO public.profiles (id, nome)
    VALUES (v_user_id, 'Pedrozo')
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'empresa_id'
  ) INTO v_has_user_roles_empresa_id;

  IF v_has_user_roles_empresa_id AND v_empresa_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, empresa_id, role)
    VALUES (v_user_id, v_empresa_id, 'SYSTEM_OWNER'::public.app_role)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'SYSTEM_OWNER'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
END
$$;

COMMIT;
