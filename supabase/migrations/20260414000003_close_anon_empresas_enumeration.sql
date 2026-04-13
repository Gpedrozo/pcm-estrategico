-- =============================================================================
-- ETAPA 1.10: Fechar enumeração de tenant por anon
-- O anon não precisa mais de SELECT direto em empresas — as RPCs SECURITY
-- DEFINER (resolve_empresa_id_by_slug, get_empresa_info_by_id) criadas na
-- Etapa 1.8 substituem o acesso direto sem perder funcionalidade.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Dropar a policy que permitia anon enumerar TODAS as empresas com slug
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "empresas_anon_slug_resolve" ON public.empresas;

-- Também dropar a policy legada da migration original (20260317)
DROP POLICY IF EXISTS "empresas_select_by_slug_anon" ON public.empresas;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Revogar SELECT de anon diretamente na tabela empresas
--    As RPCs SECURITY DEFINER continuam funcionando sem precisar deste grant.
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE SELECT ON public.empresas FROM anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Recriar policy anon bloqueadora explícita (defense-in-depth)
--    Mesmo que um grant seja reapplied por outro path, esta policy nega acesso.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "empresas_anon_deny_all" ON public.empresas;
CREATE POLICY "empresas_anon_deny_all"
  ON public.empresas
  FOR SELECT TO anon
  USING (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Smoke check: confirmar que policy de bloqueio está ativa
--    (neutraliza o check do V8 que verificava a existência da policy antiga)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'empresas'
    AND policyname = 'empresas_anon_deny_all';
  IF v_count = 0 THEN
    RAISE EXCEPTION '[ETAPA-1.10] SMOKE FAIL: empresas_anon_deny_all não foi criada';
  END IF;

  -- Confirmar que a policy permissiva antiga foi removida
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'empresas'
    AND policyname IN ('empresas_anon_slug_resolve', 'empresas_select_by_slug_anon');
  IF v_count > 0 THEN
    RAISE EXCEPTION '[ETAPA-1.10] SMOKE FAIL: policy anon permissiva ainda existe';
  END IF;

  RAISE NOTICE '[ETAPA-1.10] Enumeração anon de empresas fechada com sucesso.';
END $$;

COMMIT;
