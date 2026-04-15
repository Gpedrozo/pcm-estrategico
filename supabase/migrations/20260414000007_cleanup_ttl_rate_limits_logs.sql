-- ============================================================
-- Fase 2-C / Item 2.9 — 2026-04-14
-- pg_cron TTL para tabelas que crescem indefinidamente:
--   - rate_limits          → retém 30 dias
--   - log_validacoes_senha → retém 90 dias
--   - login_attempts       → retém 30 dias (tabela da edge auth-login)
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Funções de limpeza
-- ─────────────────────────────────────────────────────────────

-- 1.1 rate_limits — manter 30 dias
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  IF to_regclass('public.rate_limits') IS NULL THEN
    RETURN;
  END IF;

  -- Registros bloqueados: limpeza após 30 dias
  DELETE FROM public.rate_limits
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE '[cleanup_rate_limits] Removidos % registros antigos (>30d).', deleted_count;
  END IF;
END;
$$;

-- 1.2 log_validacoes_senha — manter 90 dias
CREATE OR REPLACE FUNCTION public.cleanup_log_validacoes_senha()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  IF to_regclass('public.log_validacoes_senha') IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.log_validacoes_senha
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE '[cleanup_log_validacoes_senha] Removidos % registros antigos (>90d).', deleted_count;
  END IF;
END;
$$;

-- 1.3 login_attempts — manter 30 dias
CREATE OR REPLACE FUNCTION public.cleanup_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  IF to_regclass('public.login_attempts') IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.login_attempts
  WHERE last_attempt < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE '[cleanup_login_attempts] Removidos % registros antigos (>30d).', deleted_count;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. Permissões
-- ─────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_log_validacoes_senha() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_login_attempts()        FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits()           TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_log_validacoes_senha()  TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_login_attempts()         TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 3. pg_cron schedule (respeita ambientes sem pg_cron)
-- ─────────────────────────────────────────────────────────────
DO $pgcron$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE '[migration] pg_cron não disponível — funções criadas mas não agendadas.';
    RETURN;
  END IF;

  EXECUTE 'SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = ''cleanup-rate-limits''';
  EXECUTE 'SELECT cron.schedule(''cleanup-rate-limits'', ''0 2 * * *'', ''SELECT public.cleanup_rate_limits()'')';

  EXECUTE 'SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = ''cleanup-log-validacoes-senha''';
  EXECUTE 'SELECT cron.schedule(''cleanup-log-validacoes-senha'', ''15 2 * * *'', ''SELECT public.cleanup_log_validacoes_senha()'')';

  EXECUTE 'SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = ''cleanup-login-attempts''';
  EXECUTE 'SELECT cron.schedule(''cleanup-login-attempts'', ''30 2 * * *'', ''SELECT public.cleanup_login_attempts()'')';

  RAISE NOTICE '[migration] 3 cron jobs de TTL agendados (rate_limits, log_validacoes_senha, login_attempts).';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[migration] pg_cron não disponível: %', SQLERRM;
END $pgcron$;

-- ─────────────────────────────────────────────────────────────
-- 4. Smoke test
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM pg_proc
    WHERE proname IN ('cleanup_rate_limits', 'cleanup_log_validacoes_senha', 'cleanup_login_attempts')
      AND pronamespace = 'public'::regnamespace
  ) = 3,
  'Smoke: as 3 funções de cleanup TTL devem existir';
END $$;

COMMIT;
