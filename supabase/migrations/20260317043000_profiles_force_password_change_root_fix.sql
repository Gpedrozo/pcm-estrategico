BEGIN;

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS force_password_change boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'must_change_password'
  ) THEN
    EXECUTE '
      UPDATE public.profiles
      SET force_password_change = true
      WHERE COALESCE(must_change_password, false) = true
    ';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_force_password_change
  ON public.profiles (force_password_change);

COMMIT;
