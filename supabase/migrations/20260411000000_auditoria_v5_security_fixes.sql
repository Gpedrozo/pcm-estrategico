-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  AUDITORIA V5 — Security Fixes (10 de Abril de 2026)          ║
-- ║  Complementa V4 (20260410220000) com correções remanescentes  ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════
-- FIX-1: Revogar funções de diagnóstico de anon
-- Motivo: SECURITY DEFINER + anon = qualquer pessoa sem login
--         pode mapear schema, enumerar users, ver policies
-- Segurança: Auth engine usa supabase_auth_admin (não anon)
-- ═══════════════════════════════════════════

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.auth_runtime_deep_probe(text)   FROM anon;
  REVOKE EXECUTE ON FUNCTION public.auth_rls_policy_probe()         FROM anon;
  REVOKE EXECUTE ON FUNCTION public.auth_role_attributes_probe()    FROM anon;
  REVOKE EXECUTE ON FUNCTION public.auth_instances_snapshot()       FROM anon;
  REVOKE EXECUTE ON FUNCTION public.auth_core_counts()              FROM anon;
  REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM anon;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE SELECT ON public.schema_inventory_tables    FROM anon;
  REVOKE SELECT ON public.schema_inventory_columns   FROM anon;
  REVOKE SELECT ON public.schema_inventory_fks       FROM anon;
  REVOKE SELECT ON public.schema_inventory_functions  FROM anon;
  REVOKE SELECT ON public.auth_instances_snapshot_v   FROM anon;
  REVOKE SELECT ON public.auth_core_counts_v          FROM anon;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ═══════════════════════════════════════════
-- FIX-2: Revogar SELECT de anon em tabelas sensíveis (targeted)
-- NOTA: NÃO fazemos REVOKE ALL TABLES — portal mecânico depende de anon
-- Cada tabela verificada: nenhuma acessada como anon pelo frontend/edge
-- ═══════════════════════════════════════════

DO $$
DECLARE v_table TEXT;
BEGIN
  FOR v_table IN SELECT unnest(ARRAY[
    'enterprise_audit_logs', 'company_subscriptions', 'subscriptions',
    'platform_metrics', 'system_owner_allowlist', 'saas_metrics_daily',
    'ip_rate_limits', 'user_roles', 'permissoes_granulares'
  ])
  LOOP
    BEGIN
      EXECUTE format('REVOKE SELECT, INSERT, UPDATE, DELETE ON public.%I FROM anon', v_table);
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END LOOP;
END $$;

-- analytics schema: revogar de anon (somente authenticated/service_role acessam)
DO $$ BEGIN
  REVOKE SELECT ON ALL TABLES IN SCHEMA analytics FROM anon;
EXCEPTION WHEN invalid_schema_name THEN NULL;
END $$;

-- ═══════════════════════════════════════════
-- FIX-3: Corrigir policies USING(true) sem TO scope
-- Problema: policies FOR ALL USING(true) sem TO = qualquer role pode tudo
-- Afeta: login_attempts, auth_session_transfer_tokens
-- Validação: Edge functions acessam via adminClient() (service_role)
-- ═══════════════════════════════════════════

DROP POLICY IF EXISTS "service_role_all_login_attempts" ON public.login_attempts;
CREATE POLICY "service_role_all_login_attempts"
  ON public.login_attempts FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_auth_session_transfer_tokens" ON public.auth_session_transfer_tokens;
CREATE POLICY "service_role_all_auth_session_transfer_tokens"
  ON public.auth_session_transfer_tokens FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════
-- FIX-4: FORCE RLS + service_role policies em tabelas não cobertas pela V4
-- service_role tem BYPASSRLS no Supabase → FORCE RLS NÃO quebra edge functions
-- INCLUI as 6 tabelas que ficaram sem FORCE RLS na V4 (plans, planos,
--   ip_rate_limits, saas_metrics_daily, platform_metrics, system_owner_allowlist)
-- EXCLUI login_attempts e auth_session_transfer_tokens do loop (já cobertos pelo FIX-3)
-- ═══════════════════════════════════════════

DO $$
DECLARE
  v_table TEXT;
  v_policy TEXT;
BEGIN
  FOR v_table IN SELECT unnest(ARRAY[
    'enterprise_audit_logs', 'empresas', 'profiles',
    'subscriptions', 'company_subscriptions', 'support_tickets',
    'plans', 'planos', 'ip_rate_limits',
    'saas_metrics_daily', 'platform_metrics', 'system_owner_allowlist',
    'areas', 'sistemas', 'fornecedores',
    'atividades_preventivas', 'servicos_preventivos', 'execucoes_preventivas',
    'inspecoes', 'anomalias_inspecao', 'fmea', 'acoes_corretivas',
    'analise_causa_raiz', 'melhorias', 'document_layouts',
    'componentes_equipamento', 'movimentacoes_materiais',
    'materiais_os', 'historico_manutencao', 'permissoes_trabalho',
    'operational_logs', 'execucoes_os_pausas', 'incidentes_ssma',
    'indicadores_kpi'
  ])
  LOOP
    -- FORCE RLS (idempotente se já forçado)
    EXECUTE format('ALTER TABLE IF EXISTS public.%I FORCE ROW LEVEL SECURITY', v_table);

    -- Service_role policy (defesa em profundidade)
    v_policy := 'v5_service_role_' || v_table;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy, v_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      v_policy, v_table
    );
  END LOOP;
END $$;

-- ═══════════════════════════════════════════
-- FIX-5: Smoke test V5
-- ═══════════════════════════════════════════

DO $$
DECLARE
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- 1. Verifica que anon NÃO pode executar auth_runtime_deep_probe
  IF EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_name = 'auth_runtime_deep_probe'
      AND routine_schema = 'public'
      AND grantee = 'anon'
      AND privilege_type = 'EXECUTE'
  ) THEN
    v_errors := array_append(v_errors, 'FAIL: anon still has EXECUTE on auth_runtime_deep_probe');
  END IF;

  -- 2. Verifica que login_attempts tem policy TO service_role
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'login_attempts'
      AND policyname = 'service_role_all_login_attempts'
  ) THEN
    v_errors := array_append(v_errors, 'FAIL: login_attempts missing service_role policy');
  END IF;

  -- 3. Verifica FORCE RLS em enterprise_audit_logs
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'enterprise_audit_logs'
      AND c.relforcerowsecurity = false
  ) THEN
    v_errors := array_append(v_errors, 'FAIL: enterprise_audit_logs not FORCE RLS');
  END IF;

  -- 4. Verifica FORCE RLS em empresas
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'empresas'
      AND c.relforcerowsecurity = false
  ) THEN
    v_errors := array_append(v_errors, 'FAIL: empresas not FORCE RLS');
  END IF;

  -- 5. Verifica policy em auth_session_transfer_tokens
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'auth_session_transfer_tokens'
      AND policyname = 'service_role_all_auth_session_transfer_tokens'
  ) THEN
    v_errors := array_append(v_errors, 'FAIL: auth_session_transfer_tokens missing scoped policy');
  END IF;

  IF array_length(v_errors, 1) > 0 THEN
    RAISE EXCEPTION 'V5 smoke test failures: %', array_to_string(v_errors, '; ');
  END IF;

  RAISE NOTICE '✅ V5 smoke test OK — all checks passed';
END $$;
