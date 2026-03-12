-- TENANT FIX: master policy adaptativa para ai_root_cause_analysis
-- Data: 2026-03-12
-- Objetivo: criar master_ti_global_access usando a melhor funcao disponivel no schema.

BEGIN;

DO $$
DECLARE
  v_expr text;
BEGIN
  IF to_regclass('public.ai_root_cause_analysis') IS NULL THEN
    RAISE NOTICE 'Tabela public.ai_root_cause_analysis nao existe. Nada a fazer.';
    RETURN;
  END IF;

  -- Garante RLS habilitado
  EXECUTE 'ALTER TABLE public.ai_root_cause_analysis ENABLE ROW LEVEL SECURITY';

  -- Remove policy antiga, se houver
  EXECUTE 'DROP POLICY IF EXISTS master_ti_global_access ON public.ai_root_cause_analysis';

  -- Escolhe expressao conforme funcoes disponiveis
  IF to_regprocedure('public.is_master_ti()') IS NOT NULL THEN
    v_expr := 'public.is_master_ti()';
  ELSIF to_regprocedure('public.is_control_plane_operator()') IS NOT NULL THEN
    v_expr := 'public.is_control_plane_operator()';
  ELSIF to_regprocedure('public.has_role(uuid, public.app_role)') IS NOT NULL THEN
    v_expr := 'public.has_role(auth.uid(), ''MASTER_TI''::public.app_role) OR public.has_role(auth.uid(), ''SYSTEM_OWNER''::public.app_role)';
  ELSE
    RAISE NOTICE 'Nenhuma funcao de privilegio global encontrada (is_master_ti/is_control_plane_operator/has_role). Policy master nao criada.';
    RETURN;
  END IF;

  EXECUTE format(
    'CREATE POLICY master_ti_global_access ON public.ai_root_cause_analysis FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
    v_expr,
    v_expr
  );

  RAISE NOTICE 'Policy master_ti_global_access criada com expressao: %', v_expr;
END
$$;

COMMIT;

-- Prova final
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'ai_root_cause_analysis'
  AND policyname IN ('tenant_isolation', 'master_ti_global_access')
ORDER BY policyname;
