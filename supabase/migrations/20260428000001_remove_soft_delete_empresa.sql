-- ============================================================
-- 2026-04-28 — Remove soft-delete em empresas
-- O botão "Excluir empresa" no owner passa a fazer hard-delete
-- imediato. Não há período de carência de 30 dias.
-- ============================================================

BEGIN;

-- 1. Remove pg_cron job de hard-delete automático (não é mais necessário)
DO $pgcron$
BEGIN
  EXECUTE 'SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = ''purge_soft_deleted_empresas''';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[cron] job purge_soft_deleted_empresas nao encontrado ou ja removido: %', SQLERRM;
END $pgcron$;

-- 2. Remove policy restritiva de soft-delete (não é mais necessária)
DROP POLICY IF EXISTS deny_soft_deleted_empresas ON public.empresas;

-- 3. Remove funções de soft-delete (não são mais utilizadas)
DROP FUNCTION IF EXISTS public.soft_delete_empresa(uuid, uuid);
DROP FUNCTION IF EXISTS public.restore_empresa(uuid, uuid);
DROP FUNCTION IF EXISTS public.purge_soft_deleted_empresas();

-- Nota: as colunas deleted_at e deleted_by permanecem na tabela empresas
-- para compatibilidade de schema, mas não são mais usadas pelo sistema.

COMMIT;