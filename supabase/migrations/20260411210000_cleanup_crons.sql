-- Migration: Cleanup Crons para Tabelas de Log
-- Data: 2026-04-11
-- Propósito: Configurar pg_cron para limpeza automática de registros antigos
--   - mecanico_login_attempts: retém últimos 30 dias
--   - log_mecanicos_login: retém últimos 90 dias
--   - webhook_events: retém últimos 60 dias
--   - auth_session_transfer_tokens: expirados há mais de 24 horas

BEGIN;

-- ===========================================================================
-- 1. Funções de limpeza
-- ===========================================================================

-- 1.1 mecanico_login_attempts — manter 30 dias
CREATE OR REPLACE FUNCTION public.cleanup_mecanico_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  IF to_regclass('public.mecanico_login_attempts') IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.mecanico_login_attempts
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE '[cleanup_mecanico_login_attempts] Removidos % registros antigos (>30d).', deleted_count;
  END IF;
END;
$$;

-- 1.2 log_mecanicos_login — manter 90 dias
CREATE OR REPLACE FUNCTION public.cleanup_log_mecanicos_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  IF to_regclass('public.log_mecanicos_login') IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.log_mecanicos_login
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE '[cleanup_log_mecanicos_login] Removidos % registros antigos (>90d).', deleted_count;
  END IF;
END;
$$;

-- 1.3 webhook_events — manter 60 dias
CREATE OR REPLACE FUNCTION public.cleanup_webhook_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  IF to_regclass('public.webhook_events') IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.webhook_events
  WHERE processed_at < NOW() - INTERVAL '60 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE '[cleanup_webhook_events] Removidos % registros antigos (>60d).', deleted_count;
  END IF;
END;
$$;

-- 1.4 auth_session_transfer_tokens — expirados há mais de 24h
CREATE OR REPLACE FUNCTION public.cleanup_auth_session_transfer_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  IF to_regclass('public.auth_session_transfer_tokens') IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.auth_session_transfer_tokens
  WHERE expires_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE '[cleanup_auth_session_transfer_tokens] Removidos % tokens expirados (>24h).', deleted_count;
  END IF;
END;
$$;

-- ===========================================================================
-- 2. Agendamentos pg_cron
--    Todos os jobs rodam verificando se a extensão cron está disponível,
--    para evitar falha em ambientes sem pg_cron.
-- ===========================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

    -- mecanico_login_attempts: diário às 03:15 UTC
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-mecanico-login-attempts') THEN
      PERFORM cron.unschedule('cleanup-mecanico-login-attempts');
    END IF;
    PERFORM cron.schedule(
      'cleanup-mecanico-login-attempts',
      '15 3 * * *',
      $$SELECT public.cleanup_mecanico_login_attempts()$$
    );

    -- log_mecanicos_login: diário às 03:30 UTC
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-log-mecanicos-login') THEN
      PERFORM cron.unschedule('cleanup-log-mecanicos-login');
    END IF;
    PERFORM cron.schedule(
      'cleanup-log-mecanicos-login',
      '30 3 * * *',
      $$SELECT public.cleanup_log_mecanicos_login()$$
    );

    -- webhook_events: diário às 03:45 UTC
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-webhook-events') THEN
      PERFORM cron.unschedule('cleanup-webhook-events');
    END IF;
    PERFORM cron.schedule(
      'cleanup-webhook-events',
      '45 3 * * *',
      $$SELECT public.cleanup_webhook_events()$$
    );

    -- auth_session_transfer_tokens: de hora em hora
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-session-transfer-tokens') THEN
      PERFORM cron.unschedule('cleanup-session-transfer-tokens');
    END IF;
    PERFORM cron.schedule(
      'cleanup-session-transfer-tokens',
      '0 * * * *',
      $$SELECT public.cleanup_auth_session_transfer_tokens()$$
    );

    RAISE NOTICE '[migration] 4 cron jobs de limpeza agendados com sucesso.';

  ELSE
    RAISE NOTICE '[migration] pg_cron não disponível — funções de limpeza criadas mas não agendadas.';
  END IF;
END;
$$;

-- ===========================================================================
-- 3. Permissões — somente service_role pode invocar diretamente
-- ===========================================================================
REVOKE EXECUTE ON FUNCTION public.cleanup_mecanico_login_attempts()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_log_mecanicos_login()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_webhook_events()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_auth_session_transfer_tokens() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cleanup_mecanico_login_attempts()     TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_log_mecanicos_login()          TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_webhook_events()               TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_auth_session_transfer_tokens() TO service_role;

COMMIT;
