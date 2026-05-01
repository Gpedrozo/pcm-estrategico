-- ============================================================
-- 2026-05-01 — Correção definitiva: exclusão imediata de empresas
-- Remove todo o sistema de soft-delete de empresas.
-- Empresas que já estão em estado soft-deleted (deleted_at IS NOT NULL)
-- têm seus marcadores removidos para que possam ser hard-deletadas
-- imediatamente via o botão "Excluir empresa" no portal Owner.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Remove pg_cron job de hard-delete automático (idempotente)
-- ─────────────────────────────────────────────────────────────
DO $pgcron$
BEGIN
  EXECUTE 'SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = ''purge_soft_deleted_empresas''';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[cron] job purge_soft_deleted_empresas nao encontrado ou ja removido: %', SQLERRM;
END $pgcron$;

-- ─────────────────────────────────────────────────────────────
-- 2. Remove policy restritiva de soft-delete (idempotente)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS deny_soft_deleted_empresas ON public.empresas;

-- ─────────────────────────────────────────────────────────────
-- 3. Remove funções de soft-delete (idempotente)
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.soft_delete_empresa(uuid, uuid);
DROP FUNCTION IF EXISTS public.restore_empresa(uuid, uuid);
DROP FUNCTION IF EXISTS public.purge_soft_deleted_empresas();

-- ─────────────────────────────────────────────────────────────
-- 4. CRÍTICO: Limpa estado soft-deleted de todas as empresas
--    existentes. Empresas com deleted_at IS NOT NULL ficavam
--    bloqueadas e retornavam HTTP 409 ao tentar excluí-las.
--    Ao limpar deleted_at, elas voltam a aparecer normalmente
--    na lista do portal Owner e podem ser hard-deletadas via
--    o botão "Excluir empresa".
-- ─────────────────────────────────────────────────────────────
UPDATE public.empresas
SET
  deleted_at = NULL,
  deleted_by = NULL
WHERE deleted_at IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 5. Restaura status de empresas que foram marcadas como
--    'deleted' pelo soft-delete. Status 'deleted' impede
--    operações normais e o botão de exclusão.
--    Revertemos para 'blocked' para indicar que a empresa
--    está inativa mas pode ser gerenciada pelo Owner.
-- ─────────────────────────────────────────────────────────────
UPDATE public.empresas
SET status = 'blocked'
WHERE status = 'deleted';

COMMIT;
