BEGIN;

DO $$
DECLARE
  v_email constant text := 'pedrozo@gppis.com.br';
  v_password constant text := '@Gpp280693';
  v_user_id uuid;
  v_identity_id uuid;
  v_empresa_id uuid;
BEGIN
  SELECT id INTO v_empresa_id
  FROM public.empresas
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma empresa encontrada para vincular o usuário owner.';
  END IF;

  SELECT id
  INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

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
      v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(),
      now(),
      jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
      jsonb_build_object('nome','Pedrozo'),
      now(),
      now()
    );

    v_identity_id := gen_random_uuid();
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
      v_email,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email',
      now(),
      now(),
      now()
    );
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmation_sent_at = COALESCE(confirmation_sent_at, now()),
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('nome','Pedrozo'),
      updated_at = now()
    WHERE id = v_user_id;

    IF NOT EXISTS (
      SELECT 1 FROM auth.identities
      WHERE user_id = v_user_id AND lower(provider_id) = lower(v_email)
    ) THEN
      v_identity_id := gen_random_uuid();
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
        v_email,
        jsonb_build_object('sub', v_user_id::text, 'email', v_email),
        'email',
        now(),
        now(),
        now()
      );
    END IF;
  END IF;

  INSERT INTO public.profiles (id, empresa_id, nome, email)
  VALUES (v_user_id, v_empresa_id, 'Pedrozo', v_email)
  ON CONFLICT (id) DO UPDATE
  SET empresa_id = EXCLUDED.empresa_id,
      nome = EXCLUDED.nome,
      email = EXCLUDED.email,
      updated_at = now();

  INSERT INTO public.user_roles (user_id, empresa_id, role)
  VALUES (v_user_id, v_empresa_id, 'SYSTEM_OWNER'::public.app_role)
  ON CONFLICT DO NOTHING;

  IF to_regclass('public.system_owner_allowlist') IS NOT NULL THEN
    INSERT INTO public.system_owner_allowlist (email)
    VALUES (lower(v_email))
    ON CONFLICT (email) DO NOTHING;
  END IF;

  RAISE NOTICE 'Owner pronto para login: % (user_id=%)', v_email, v_user_id;
END;
$$;

COMMIT;
