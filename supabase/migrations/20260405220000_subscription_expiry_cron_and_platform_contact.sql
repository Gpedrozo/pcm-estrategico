-- ============================================================================
-- Migration: Subscription expiry enforcement (pg_cron) + platform contact config
-- Date: 2026-04-05
-- Description:
--   1. Seeds platform contact configuration in configuracoes_sistema
--   2. Creates pg_cron job to auto-block companies 15 days after subscription ends
-- ============================================================================

-- ── 1. Platform contact config (global, empresa_id IS NULL) ─────────────────

INSERT INTO public.configuracoes_sistema (id, empresa_id, chave, valor, descricao, tipo, categoria)
VALUES
  (gen_random_uuid(), NULL, 'platform.contact_email', '"comercial@pcmestrategico.com.br"', 'Email do representante comercial da plataforma', 'STRING', 'platform'),
  (gen_random_uuid(), NULL, 'platform.contact_whatsapp', '"+55 51 99999-9999"', 'WhatsApp do representante comercial da plataforma', 'STRING', 'platform'),
  (gen_random_uuid(), NULL, 'platform.contact_name', '"Representante Comercial"', 'Nome do representante comercial da plataforma', 'STRING', 'platform'),
  (gen_random_uuid(), NULL, 'platform.expiry_custom_message', '""', 'Mensagem personalizada de vencimento (opcional)', 'STRING', 'platform'),
  (gen_random_uuid(), NULL, 'platform.grace_period_days', '15', 'Dias de carência após vencimento antes de bloquear', 'NUMBER', 'platform'),
  (gen_random_uuid(), NULL, 'platform.alert_days_before', '7', 'Dias de antecedência para alertar sobre vencimento', 'NUMBER', 'platform')
ON CONFLICT (empresa_id, chave) DO NOTHING;

-- ── 2. Enable pg_cron extension (available on Supabase by default) ──────────

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- ── 3. Cron function: enforce subscription expiry with 15-day grace period ──

CREATE OR REPLACE FUNCTION public.cron_enforce_subscription_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  grace_days integer := 15;
  blocked_count integer := 0;
  rec record;
BEGIN
  -- Read grace period from config (default 15)
  SELECT (valor::text)::integer INTO grace_days
  FROM configuracoes_sistema
  WHERE chave = 'platform.grace_period_days' AND empresa_id IS NULL
  LIMIT 1;

  grace_days := COALESCE(grace_days, 15);

  -- Find subscriptions where ends_at + grace_period < today and still active
  FOR rec IN
    SELECT s.id AS subscription_id, s.empresa_id, s.ends_at, e.nome AS empresa_nome
    FROM subscriptions s
    JOIN empresas e ON e.id = s.empresa_id
    WHERE s.ends_at IS NOT NULL
      AND s.ends_at + (grace_days || ' days')::interval < CURRENT_DATE
      AND s.status IN ('ativa', 'teste', 'active', 'trial')
      AND e.status NOT IN ('blocked', 'deleted')
  LOOP
    -- Block the subscription
    UPDATE subscriptions
    SET status = 'atrasada', payment_status = 'late', updated_at = now()
    WHERE id = rec.subscription_id;

    -- Block the company
    UPDATE empresas
    SET status = 'blocked', updated_at = now()
    WHERE id = rec.empresa_id;

    blocked_count := blocked_count + 1;

    RAISE NOTICE '[cron_enforce_expiry] Blocked empresa % (%) - subscription ended %',
      rec.empresa_id, rec.empresa_nome, rec.ends_at;
  END LOOP;

  IF blocked_count > 0 THEN
    RAISE NOTICE '[cron_enforce_expiry] Total blocked: %', blocked_count;
  END IF;
END;
$$;

-- ── 4. Schedule: run daily at 03:00 UTC ─────────────────────────────────────

SELECT cron.schedule(
  'enforce-subscription-expiry',
  '0 3 * * *',
  $$SELECT public.cron_enforce_subscription_expiry()$$
);

-- ── 5. Allow NULL empresa_id in configuracoes_sistema unique constraint ──────
-- The existing UNIQUE(empresa_id, chave) does not match NULLs.
-- We need a partial unique index for platform-level configs.

CREATE UNIQUE INDEX IF NOT EXISTS idx_configuracoes_sistema_platform_chave
  ON public.configuracoes_sistema (chave)
  WHERE empresa_id IS NULL;
