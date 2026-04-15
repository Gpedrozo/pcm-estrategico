-- ============================================================
-- Fix P1 — enterprise_audit_logs: archival automático + TTL
--
-- Problema: tabela cresce indefinidamente. Projeção:
--   100 empresas × 50 ações/dia = 1,8M registros/ano
--   500 empresas = 9M/ano → degradação de performance
--
-- Solução:
--   1. Tabela de arquivo (enterprise_audit_logs_archive)
--   2. Função de archival: move registros > 90 dias
--   3. pg_cron: executa toda segunda-feira às 03h
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Tabela de arquivo (mesma estrutura, sem PK unique overflow)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs_archive (
  LIKE public.enterprise_audit_logs INCLUDING DEFAULTS INCLUDING CONSTRAINTS
);

-- Índice para consultas de auditoria histórica por empresa/período
CREATE INDEX IF NOT EXISTS idx_audit_archive_empresa_data
  ON public.enterprise_audit_logs_archive (empresa_id, created_at);

-- RLS: mesmas regras da tabela principal
ALTER TABLE public.enterprise_audit_logs_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_archive_empresa_isolation
  ON public.enterprise_audit_logs_archive;

CREATE POLICY audit_archive_empresa_isolation
  ON public.enterprise_audit_logs_archive
  FOR SELECT
  USING (
    empresa_id = public.current_empresa_id()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('SYSTEM_ADMIN', 'SYSTEM_OWNER', 'MASTER_TI')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 2. Função de archival
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.archive_old_audit_logs(
  p_retention_days integer DEFAULT 90
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived integer;
BEGIN
  -- Mover registros antigos para o arquivo
  WITH moved AS (
    DELETE FROM public.enterprise_audit_logs
    WHERE created_at < now() - make_interval(days => p_retention_days)
    RETURNING *
  )
  INSERT INTO public.enterprise_audit_logs_archive
  SELECT * FROM moved;

  GET DIAGNOSTICS v_archived = ROW_COUNT;

  RETURN v_archived;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_old_audit_logs(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_old_audit_logs(integer) TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 3. pg_cron: rodar toda segunda-feira às 03h00
--    (job idempotente — cron.schedule substitui job existente)
-- ─────────────────────────────────────────────────────────────
DO $pgcron$
BEGIN
  EXECUTE 'SELECT cron.schedule(''archive-audit-logs-weekly'', ''0 3 * * 1'', ''SELECT public.archive_old_audit_logs(90)'')';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[cron] archive-audit-logs-weekly não agendado: %', SQLERRM;
END $pgcron$;

COMMIT;
