BEGIN;

CREATE TABLE IF NOT EXISTS public.login_attempts (
  email text NOT NULL,
  ip_address text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT login_attempts_pk PRIMARY KEY (email, ip_address),
  CONSTRAINT login_attempts_attempt_count_non_negative CHECK (attempt_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_blocked_until
  ON public.login_attempts (blocked_until);

CREATE INDEX IF NOT EXISTS idx_login_attempts_window_start
  ON public.login_attempts (window_start);

CREATE OR REPLACE FUNCTION public.touch_login_attempts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_login_attempts_updated_at ON public.login_attempts;
CREATE TRIGGER trg_login_attempts_updated_at
BEFORE UPDATE ON public.login_attempts
FOR EACH ROW
EXECUTE FUNCTION public.touch_login_attempts_updated_at();

COMMIT;
