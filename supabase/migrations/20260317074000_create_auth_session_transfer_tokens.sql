BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_session_transfer_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  target_host text,
  created_by uuid,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_session_transfer_tokens_expires_at
  ON public.auth_session_transfer_tokens (expires_at);

COMMIT;
