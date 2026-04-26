-- ============================================================================
-- Migration: Reagendamento do cron de vencimentos para 06:00 BRT (09:00 UTC)
-- Data: 2026-04-24
-- Descrição:
--   1. Remove o job pg_cron existente (agendado na 20260405220000 para 03:00 UTC)
--   2. Recria o job para 09:00 UTC = 06:00 BRT (Horário de Brasília, UTC-3)
--   3. Atualiza a função cron_enforce_subscription_expiry() para gravar
--      registro de auditoria em enterprise_audit_logs a cada execução automática
--      (o painel Owner Portal já monitora a ação CRON_ENFORCE_SUBSCRIPTION_EXPIRY)
-- ============================================================================

-- ── 1. Remove o job antigo com segurança (idempotente) ───────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'enforce-subscription-expiry') THEN
    PERFORM cron.unschedule('enforce-subscription-expiry');
    RAISE NOTICE '[cron] Job enforce-subscription-expiry removido.';
  ELSE
    RAISE NOTICE '[cron] Job enforce-subscription-expiry nao encontrado, nenhuma acao necessaria.';
  END IF;
END;
$$;

-- ── 2. Atualiza a função com audit log automático ────────────────────────────

CREATE OR REPLACE FUNCTION public.cron_enforce_subscription_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  grace_days    integer := 15;
  blocked_count integer := 0;
  rec           record;
  system_actor  uuid;
BEGIN
  -- Lê período de carência configurado (padrão 15 dias)
  SELECT (valor::text)::integer INTO grace_days
  FROM configuracoes_sistema
  WHERE chave = 'platform.grace_period_days'
    AND empresa_id IS NULL
  LIMIT 1;

  grace_days := COALESCE(grace_days, 15);

  -- Busca ID do usuário SYSTEM_OWNER para usar como ator nos logs de auditoria
  SELECT ur.user_id INTO system_actor
  FROM user_roles ur
  WHERE ur.role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
  ORDER BY ur.created_at ASC
  LIMIT 1;

  -- Processa assinaturas vencidas além do período de carência
  FOR rec IN
    SELECT
      s.id          AS subscription_id,
      s.empresa_id,
      s.ends_at,
      e.nome        AS empresa_nome
    FROM subscriptions s
    JOIN empresas e ON e.id = s.empresa_id
    WHERE s.ends_at IS NOT NULL
      AND s.ends_at + (grace_days || ' days')::interval < CURRENT_DATE
      AND s.status IN ('ativa', 'teste', 'active', 'trial')
      AND e.status NOT IN ('blocked', 'deleted')
  LOOP
    -- Bloqueia a assinatura
    UPDATE subscriptions
    SET
      status          = 'atrasada',
      payment_status  = 'late',
      updated_at      = now()
    WHERE id = rec.subscription_id;

    -- Bloqueia a empresa
    UPDATE empresas
    SET
      status     = 'blocked',
      updated_at = now()
    WHERE id = rec.empresa_id;

    blocked_count := blocked_count + 1;

    RAISE NOTICE '[cron_enforce_expiry] Bloqueada empresa % (%) - assinatura encerrou em %',
      rec.empresa_id, rec.empresa_nome, rec.ends_at;
  END LOOP;

  -- ── Registra execução no audit log (monitorado pelo Owner Portal) ──────────
  BEGIN
    INSERT INTO enterprise_audit_logs (
      usuario_id,
      usuario_email,
      empresa_id,
      acao,
      tabela,
      dados_depois,
      resultado,
      created_at
    )
    VALUES (
      COALESCE(system_actor, '00000000-0000-0000-0000-000000000000'::uuid),
      'cron@system',
      NULL,
      'CRON_ENFORCE_SUBSCRIPTION_EXPIRY',
      'system',
      jsonb_build_object(
        'blocked_companies',  blocked_count,
        'grace_days',         grace_days,
        'executed_at',        now(),
        'scheduled_time',     '06:00 BRT (09:00 UTC)',
        'severity',           'info',
        'source',             'pg_cron'
      ),
      'sucesso',
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Falha no log não deve interromper o processo de bloqueio
    RAISE WARNING '[cron_enforce_expiry] Falha ao gravar audit log: %', SQLERRM;
  END;

  IF blocked_count > 0 THEN
    RAISE NOTICE '[cron_enforce_expiry] Total bloqueadas: %', blocked_count;
  ELSE
    RAISE NOTICE '[cron_enforce_expiry] Nenhuma assinatura vencida encontrada.';
  END IF;
END;
$$;

-- ── 3. Agenda o job no novo horário: 09:00 UTC = 06:00 BRT ──────────────────
-- Brasil não adota horário de verão desde 2019 → BRT sempre = UTC-3
-- 06:00 BRT = 09:00 UTC → expressão cron: '0 9 * * *'

SELECT cron.schedule(
  'enforce-subscription-expiry',   -- nome do job (mesmo de antes)
  '0 9 * * *',                     -- 09:00 UTC = 06:00 BRT todos os dias
  $$SELECT public.cron_enforce_subscription_expiry()$$
);

-- ── 4. Confirma o agendamento ────────────────────────────────────────────────

DO $$
DECLARE
  scheduled_at text;
BEGIN
  SELECT schedule INTO scheduled_at
  FROM cron.job
  WHERE jobname = 'enforce-subscription-expiry'
  LIMIT 1;

  IF scheduled_at IS NOT NULL THEN
    RAISE NOTICE '[cron] Job enforce-subscription-expiry agendado com sucesso: %', scheduled_at;
  ELSE
    RAISE WARNING '[cron] ATENCAO: Job enforce-subscription-expiry NAO foi encontrado apos criacao!';
  END IF;
END;
$$;