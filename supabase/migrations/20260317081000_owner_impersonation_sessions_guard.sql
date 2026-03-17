BEGIN;

CREATE TABLE IF NOT EXISTS public.owner_impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_owner_impersonation_sessions_owner_empresa_active
  ON public.owner_impersonation_sessions (owner_user_id, empresa_id, active, expires_at);

COMMIT;
