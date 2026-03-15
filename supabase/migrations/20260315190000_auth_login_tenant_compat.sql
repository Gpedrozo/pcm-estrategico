BEGIN;

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_users_tenant_user
  ON public.tenant_users (tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id
  ON public.tenant_users (user_id);

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

COMMIT;
