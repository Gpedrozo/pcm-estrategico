BEGIN;

DO $$
DECLARE
  v_email text := 'pedrozo@gppis.com.br';
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Nenhum usuário encontrado para %, purge ignorado.', v_email;
    RETURN;
  END IF;

  DELETE FROM public.rbac_user_roles WHERE user_id = v_user_id;
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE id = v_user_id;

  DELETE FROM auth.identities WHERE user_id = v_user_id OR lower(provider_id) = lower(v_email);
  DELETE FROM auth.sessions WHERE user_id = v_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = v_user_id::text;
  DELETE FROM auth.users WHERE id = v_user_id;

  RAISE NOTICE 'Conta % purgada do auth/public.', v_email;
END;
$$;

COMMIT;
