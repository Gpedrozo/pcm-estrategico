BEGIN;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS unread_owner_messages integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unread_client_messages integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notification_email_pending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_whatsapp_pending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_message_sender text,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'support_tickets_last_message_sender_check'
  ) THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_last_message_sender_check
      CHECK (last_message_sender IS NULL OR last_message_sender IN ('client', 'owner', 'system'));
  END IF;
END;
$$;

UPDATE public.support_tickets st
SET
  messages = CASE
    WHEN jsonb_array_length(COALESCE(st.messages, '[]'::jsonb)) > 0 THEN st.messages
    ELSE (
      jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'sender', 'client',
          'message', st.message,
          'channel', 'in_app',
          'created_at', COALESCE(st.created_at, now()),
          'sender_user_id', st.user_id
        )
      )
      || CASE
        WHEN NULLIF(trim(COALESCE(st.owner_response, '')), '') IS NULL THEN '[]'::jsonb
        ELSE jsonb_build_array(
          jsonb_build_object(
            'id', gen_random_uuid()::text,
            'sender', 'owner',
            'message', st.owner_response,
            'channel', 'in_app',
            'created_at', COALESCE(st.responded_at, st.updated_at, now()),
            'sender_user_id', st.owner_responder_id
          )
        )
      END
    )
  END,
  unread_owner_messages = CASE
    WHEN NULLIF(trim(COALESCE(st.owner_response, '')), '') IS NULL THEN GREATEST(COALESCE(st.unread_owner_messages, 0), 1)
    ELSE COALESCE(st.unread_owner_messages, 0)
  END,
  unread_client_messages = CASE
    WHEN NULLIF(trim(COALESCE(st.owner_response, '')), '') IS NULL THEN COALESCE(st.unread_client_messages, 0)
    ELSE GREATEST(COALESCE(st.unread_client_messages, 0), 1)
  END,
  last_message_sender = CASE
    WHEN NULLIF(trim(COALESCE(st.owner_response, '')), '') IS NULL THEN 'client'
    ELSE 'owner'
  END,
  last_message_at = CASE
    WHEN NULLIF(trim(COALESCE(st.owner_response, '')), '') IS NULL THEN COALESCE(st.updated_at, st.created_at, now())
    ELSE COALESCE(st.responded_at, st.updated_at, now())
  END,
  notification_email_pending = COALESCE(st.notification_email_pending, false)
    OR (NULLIF(trim(COALESCE(st.owner_response, '')), '') IS NULL),
  notification_whatsapp_pending = COALESCE(st.notification_whatsapp_pending, false)
    OR (NULLIF(trim(COALESCE(st.owner_response, '')), '') IS NULL)
WHERE st.id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_unread_owner
  ON public.support_tickets (unread_owner_messages DESC, updated_at DESC)
  WHERE unread_owner_messages > 0;

CREATE INDEX IF NOT EXISTS idx_support_tickets_unread_client
  ON public.support_tickets (unread_client_messages DESC, updated_at DESC)
  WHERE unread_client_messages > 0;

COMMIT;
