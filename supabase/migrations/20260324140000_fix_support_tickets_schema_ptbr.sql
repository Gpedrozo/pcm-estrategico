BEGIN;

-- 1) Ensure helper trigger function exists
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 2) Ensure support_tickets table exists in the shape expected by frontend/hooks
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  requester_user_id uuid,
  user_id uuid,
  owner_responder_id uuid,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'aberto',
  priority text NOT NULL DEFAULT 'media',
  owner_response text,
  owner_notes text,
  assigned_to uuid,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  unread_owner_messages integer NOT NULL DEFAULT 0,
  unread_client_messages integer NOT NULL DEFAULT 0,
  notification_email_pending boolean NOT NULL DEFAULT false,
  notification_whatsapp_pending boolean NOT NULL DEFAULT false,
  last_message_sender text,
  last_message_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Add missing columns for partially-created environments
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS requester_user_id uuid,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS owner_responder_id uuid,
  ADD COLUMN IF NOT EXISTS owner_response text,
  ADD COLUMN IF NOT EXISTS owner_notes text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS unread_owner_messages integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unread_client_messages integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notification_email_pending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_whatsapp_pending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_message_sender text,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

-- 4) Backfill user_id from requester_user_id when needed
UPDATE public.support_tickets
SET user_id = requester_user_id
WHERE user_id IS NULL
  AND requester_user_id IS NOT NULL;

-- 5) Normalize status/priority values from legacy English to PT-BR used by app
UPDATE public.support_tickets
SET status = CASE lower(trim(status))
  WHEN 'open' THEN 'aberto'
  WHEN 'in_progress' THEN 'em_analise'
  WHEN 'resolved' THEN 'resolvido'
  WHEN 'closed' THEN 'resolvido'
  WHEN 'aberto' THEN 'aberto'
  WHEN 'em_analise' THEN 'em_analise'
  WHEN 'resolvido' THEN 'resolvido'
  ELSE 'aberto'
END;

UPDATE public.support_tickets
SET priority = CASE lower(trim(priority))
  WHEN 'low' THEN 'baixa'
  WHEN 'medium' THEN 'media'
  WHEN 'high' THEN 'alta'
  WHEN 'critical' THEN 'critica'
  WHEN 'baixa' THEN 'baixa'
  WHEN 'media' THEN 'media'
  WHEN 'alta' THEN 'alta'
  WHEN 'critica' THEN 'critica'
  ELSE 'media'
END;

-- 6) Drop any existing status/priority check constraints and recreate canonical ones
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.support_tickets'::regclass
      AND contype = 'c'
      AND (
        conname ILIKE '%support_tickets_status%'
        OR conname ILIKE '%support_tickets_priority%'
        OR conname IN ('support_tickets_status_check', 'support_tickets_priority_check')
      )
  LOOP
    EXECUTE format('ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_status_check
  CHECK (status IN ('aberto','em_analise','resolvido'));

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_priority_check
  CHECK (priority IN ('baixa','media','alta','critica'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'support_tickets_last_message_sender_check'
      AND conrelid = 'public.support_tickets'::regclass
  ) THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_last_message_sender_check
      CHECK (last_message_sender IS NULL OR last_message_sender IN ('client', 'owner', 'system'));
  END IF;
END $$;

-- 7) Ensure updated_at trigger exists
DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 8) Ensure RLS and policies
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_select ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_manage ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_write ON public.support_tickets;

CREATE POLICY support_tickets_select ON public.support_tickets
  FOR SELECT TO authenticated
  USING (
    public.is_control_plane_operator()
    OR empresa_id IN (SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  );

CREATE POLICY support_tickets_manage ON public.support_tickets
  FOR ALL TO authenticated
  USING (
    public.is_control_plane_operator()
    OR empresa_id IN (SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  )
  WITH CHECK (
    public.is_control_plane_operator()
    OR empresa_id IN (SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  );

-- 9) Ensure indexes for list/filter performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_empresa_status_updated
  ON public.support_tickets (empresa_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_updated
  ON public.support_tickets (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_unread_owner
  ON public.support_tickets (unread_owner_messages DESC, updated_at DESC)
  WHERE unread_owner_messages > 0;

CREATE INDEX IF NOT EXISTS idx_support_tickets_unread_client
  ON public.support_tickets (unread_client_messages DESC, updated_at DESC)
  WHERE unread_client_messages > 0;

COMMIT;
