BEGIN;

UPDATE auth.users
SET
  instance_id = '00000000-0000-0000-0000-000000000000',
  aud = 'authenticated',
  role = 'authenticated',
  updated_at = now(),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_sent_at = COALESCE(confirmation_sent_at, now()),
  is_sso_user = COALESCE(is_sso_user, false),
  is_anonymous = COALESCE(is_anonymous, false)
WHERE lower(email) = 'pedrozo@gppis.com.br';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM auth.identities i
    JOIN auth.users u ON u.id = i.user_id
    WHERE lower(u.email) = 'pedrozo@gppis.com.br'
      AND i.provider = 'email'
  ) THEN
    RAISE EXCEPTION 'Identidade email não encontrada para pedrozo@gppis.com.br';
  END IF;
END;
$$;

COMMIT;
