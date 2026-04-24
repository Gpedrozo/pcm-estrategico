-- Migration: Reagendamento cron vencimentos 06:00 BRT (09:00 UTC) 2026-04-24
DO $block$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'enforce-subscription-expiry') THEN
    PERFORM cron.unschedule('enforce-subscription-expiry');
    RAISE NOTICE '[cron] Job removido.';
  END IF;
END; $block$;

CREATE OR REPLACE FUNCTION public.cron_enforce_subscription_expiry()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE grace_days integer := 15; blocked_count integer := 0; rec record; system_actor uuid;
BEGIN
  SELECT (valor::text)::integer INTO grace_days FROM configuracoes_sistema
  WHERE chave = 'platform.grace_period_days' AND empresa_id IS NULL LIMIT 1;
  grace_days := COALESCE(grace_days, 15);
  SELECT ur.user_id INTO system_actor FROM user_roles ur
  WHERE ur.role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN') ORDER BY ur.created_at ASC LIMIT 1;
  FOR rec IN SELECT s.id AS subscription_id, s.empresa_id, s.ends_at, e.nome AS empresa_nome
    FROM subscriptions s JOIN empresas e ON e.id = s.empresa_id
    WHERE s.ends_at IS NOT NULL
      AND s.ends_at + (grace_days || ' days')::interval < CURRENT_DATE
      AND s.status IN ('ativa', 'teste', 'active', 'trial')
      AND e.status NOT IN ('blocked', 'deleted')
  LOOP
    UPDATE subscriptions SET status = 'atrasada', payment_status = 'late', updated_at = now() WHERE id = rec.subscription_id;
    UPDATE empresas SET status = 'blocked', updated_at = now() WHERE id = rec.empresa_id;
    blocked_count := blocked_count + 1;
  END LOOP;
  BEGIN
    INSERT INTO enterprise_audit_logs (usuario_id, usuario_email, empresa_id, acao, tabela, dados_depois, resultado, created_at)
    VALUES (COALESCE(system_actor, '00000000-0000-0000-0000-000000000000'::uuid),
      'cron@system', NULL, 'CRON_ENFORCE_SUBSCRIPTION_EXPIRY', 'system',
      jsonb_build_object('blocked_companies', blocked_count, 'grace_days', grace_days,
        'executed_at', now(), 'scheduled_time', '06:00 BRT (09:00 UTC)', 'severity', 'info', 'source', 'pg_cron'),
      'sucesso', now());
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[cron] Falha ao gravar audit log: %', SQLERRM;
  END;
END; $func$;

-- 09:00 UTC = 06:00 BRT (UTC-3, Brasil sem horario de verao desde 2019)
SELECT cron.schedule('enforce-subscription-expiry', '0 9 * * *', 'SELECT public.cron_enforce_subscription_expiry()');
