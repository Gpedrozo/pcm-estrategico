BEGIN;

UPDATE auth.users
SET
  encrypted_password = extensions.crypt('@Gpp280693', extensions.gen_salt('bf')),
  updated_at = now(),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_sent_at = COALESCE(confirmation_sent_at, now())
WHERE email = 'pedrozo@gppis.com.br';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email = 'pedrozo@gppis.com.br'
  ) THEN
    RAISE EXCEPTION 'Usuário pedrozo@gppis.com.br não encontrado em auth.users';
  END IF;
END;
$$;

COMMIT;
