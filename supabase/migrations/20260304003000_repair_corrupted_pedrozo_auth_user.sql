-- Repair corrupted auth user that triggers `Database error querying schema`
-- during password grant for pedrozo@gppis.com.br.

DO $$
DECLARE
  v_email constant text := 'pedrozo@gppis.com.br';
  v_user_id uuid;
BEGIN
  SELECT id
    INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No auth user found for %, nothing to cleanup.', v_email;
    RETURN;
  END IF;

  -- Remove app-side bindings first to avoid FK conflicts.
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- Remove auth identities and user row to eliminate corrupted records.
  DELETE FROM auth.identities WHERE user_id = v_user_id;
  DELETE FROM auth.sessions WHERE user_id = v_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = v_user_id::text;
  DELETE FROM auth.users WHERE id = v_user_id;

  RAISE NOTICE 'Removed corrupted auth user % (%).', v_email, v_user_id;
END;
$$;