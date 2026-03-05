BEGIN;

DO $$
DECLARE
  v_empresa_id uuid;
  v_user_id uuid;
  v_email text;
BEGIN
  SELECT id INTO v_empresa_id
  FROM public.empresas
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma empresa encontrada para vínculo SYSTEM_OWNER';
  END IF;

  FOR v_user_id, v_email IN
    SELECT id, lower(email)
    FROM auth.users
    WHERE email IS NOT NULL
      AND (
        lower(email) = 'pedrozo@gppis.com.br'
        OR id IN (
          SELECT id
          FROM auth.users
          WHERE last_sign_in_at IS NOT NULL
          ORDER BY last_sign_in_at DESC
          LIMIT 1
        )
      )
  LOOP
    UPDATE auth.users
    SET
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmation_sent_at = COALESCE(confirmation_sent_at, now()),
      updated_at = now()
    WHERE id = v_user_id;

    INSERT INTO public.profiles (id, empresa_id, nome, email)
    VALUES (v_user_id, v_empresa_id, split_part(v_email, '@', 1), v_email)
    ON CONFLICT (id) DO UPDATE
    SET
      empresa_id = EXCLUDED.empresa_id,
      email = EXCLUDED.email,
      updated_at = now();

    INSERT INTO public.user_roles (user_id, empresa_id, role)
    VALUES (v_user_id, v_empresa_id, 'SYSTEM_OWNER'::public.app_role)
    ON CONFLICT DO NOTHING;

    IF to_regclass('public.system_owner_allowlist') IS NOT NULL THEN
      INSERT INTO public.system_owner_allowlist (email)
      VALUES (v_email)
      ON CONFLICT (email) DO NOTHING;
    END IF;

    RAISE NOTICE 'SYSTEM_OWNER garantido para % (%).', v_email, v_user_id;
  END LOOP;
END;
$$;

COMMIT;
