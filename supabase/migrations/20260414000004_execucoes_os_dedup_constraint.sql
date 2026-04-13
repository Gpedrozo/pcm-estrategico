-- ============================================================
-- Fase 2-A / Item 2.3 — 2026-04-14
-- Previne registros duplicados em execucoes_os.
--
-- Contexto: close_os_with_execution_atomic usa FOR UPDATE para
-- serializar fechamentos, mas um index de unicidade é a última
-- linha de defesa contra duplicatas (dupla-submissão, falha parcial).
--
-- Estratégia: index parcial sobre (empresa_id, os_id, mecanico_id,
-- data_execucao) com NULLS NOT DISTINCT (PG 15+).
-- O índice só é criado se não existirem violações na tabela atual;
-- se existirem duplicatas, o DO-block registra aviso e pula.
-- ============================================================

DO $$
DECLARE
  v_dup_count integer;
BEGIN
  -- Verifica se o índice já existe
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'execucoes_os'
      AND indexname  = 'uq_execucoes_os_dedup'
  ) THEN
    RAISE NOTICE 'Index uq_execucoes_os_dedup já existe — pulando.';
    RETURN;
  END IF;

  -- Conta violações potenciais (trata NULL como valor igual via COALESCE)
  SELECT COUNT(*) INTO v_dup_count
  FROM (
    SELECT
      empresa_id,
      os_id,
      COALESCE(mecanico_id::text,    '__NULL__'),
      COALESCE(data_execucao::text,  '__NULL__')
    FROM public.execucoes_os
    GROUP BY 1, 2, 3, 4
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_count > 0 THEN
    RAISE WARNING
      'uq_execucoes_os_dedup NÃO criado: % grupo(s) com duplicatas detectado(s).'
      ' Corrija os registros duplicados e reaplique a migration.',
      v_dup_count;
    RETURN;
  END IF;

  -- Cria o índice único com NULLS NOT DISTINCT (PostgreSQL 15+)
  CREATE UNIQUE INDEX uq_execucoes_os_dedup
    ON public.execucoes_os (empresa_id, os_id, mecanico_id, data_execucao)
    NULLS NOT DISTINCT;

  RAISE NOTICE 'Index uq_execucoes_os_dedup criado com sucesso.';
END $$;

-- Smoke test
DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'execucoes_os'
      AND indexname  = 'uq_execucoes_os_dedup'
  ) IN (0, 1),
  'Smoke: uq_execucoes_os_dedup deveria ser 0 (skipped) ou 1 (criado)';
END $$;
