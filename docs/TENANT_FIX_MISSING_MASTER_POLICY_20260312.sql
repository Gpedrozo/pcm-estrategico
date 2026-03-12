-- TENANT FIX: policy master faltante em ai_root_cause_analysis
-- Data: 2026-03-12

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.ai_root_cause_analysis') IS NOT NULL THEN
    DROP POLICY IF EXISTS master_ti_global_access ON public.ai_root_cause_analysis;

    IF to_regprocedure('public.is_master_ti()') IS NOT NULL THEN
      CREATE POLICY master_ti_global_access
      ON public.ai_root_cause_analysis
      FOR ALL
      TO authenticated
      USING (public.is_master_ti())
      WITH CHECK (public.is_master_ti());
    ELSE
      RAISE NOTICE 'Funcao public.is_master_ti() nao encontrada. Policy master_ti_global_access nao foi criada.';
    END IF;
  END IF;
END
$$;

COMMIT;

-- Prova final
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'ai_root_cause_analysis'
  AND policyname IN ('tenant_isolation', 'master_ti_global_access')
ORDER BY policyname;
