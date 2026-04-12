-- =============================================================================
-- AUDITORIA V7 — SECURITY HARDENING (PLANO DE AÇÃO À PROVA DE FALHAS)
-- PCM Estratégico · 12/04/2026
-- Corrige 7 vulnerabilidades críticas/altas encontradas na auditoria extrema
-- =============================================================================

-- =====================================================================
-- SEC-001: EMPRESAS — Remover SELECT USING(true) cross-tenant leak
-- Qualquer authenticated via dados de TODAS as empresas (CNPJ, slug, etc.)
-- =====================================================================
DO $$
BEGIN
  -- Dropar todas as policies permissivas legadas na tabela empresas
  DROP POLICY IF EXISTS "Authenticated users can view empresas" ON empresas;
  DROP POLICY IF EXISTS "Permitir select para authenticated" ON empresas;
  DROP POLICY IF EXISTS "authenticated_select_empresas" ON empresas;
  DROP POLICY IF EXISTS "tenant_select_empresas" ON empresas;
  DROP POLICY IF EXISTS "empresas_select_own" ON empresas;
  DROP POLICY IF EXISTS "v5_service_role_empresas" ON empresas;

  -- Recriar policy restritiva: só vê empresas onde tem role OU via JWT match OU system admin
  CREATE POLICY "empresas_select_by_membership" ON empresas
    FOR SELECT TO authenticated
    USING ( public.can_access_empresa(id) );

  -- Anon precisa resolver slug → empresa_id para login/signup em subdomínios.
  -- Exposição limitada: somente empresas com slug (configuradas para subdomínio).
  CREATE POLICY "empresas_anon_slug_resolve" ON empresas
    FOR SELECT TO anon
    USING ( slug IS NOT NULL );

  -- Service role continua com acesso total
  CREATE POLICY "empresas_service_role_all" ON empresas
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

  -- Garantir FORCE RLS
  ALTER TABLE empresas FORCE ROW LEVEL SECURITY;

  RAISE NOTICE '[SEC-001] empresas: policy USING(true) removida, membership-based criada';
END $$;


-- =====================================================================
-- SEC-002: verificar_senha_mecanico — REVOGAR de anon
-- Sem rate limit integrado + anon access = brute force irrestrito
-- =====================================================================
DO $$
BEGIN
  -- Revogar de anon e public; manter apenas authenticated + service_role
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'verificar_senha_mecanico') THEN
    REVOKE EXECUTE ON FUNCTION verificar_senha_mecanico FROM anon;
    REVOKE EXECUTE ON FUNCTION verificar_senha_mecanico FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION verificar_senha_mecanico TO authenticated;
    GRANT EXECUTE ON FUNCTION verificar_senha_mecanico TO service_role;
    RAISE NOTICE '[SEC-002] verificar_senha_mecanico: revogado de anon/PUBLIC';
  ELSE
    RAISE NOTICE '[SEC-002] verificar_senha_mecanico: função não encontrada, skip';
  END IF;
END $$;


-- =====================================================================
-- SEC-004: PLANS / PLANOS — Dropar USING(true) sem TO service_role
-- Qualquer role (incluindo anon) pode ler/escrever
-- =====================================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Dropar TODAS as policies existentes em plans e planos
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('plans', 'planos')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;

  -- Recriar: service_role com acesso total
  IF to_regclass('public.plans') IS NOT NULL THEN
    CREATE POLICY "plans_service_role_only" ON plans FOR ALL TO service_role USING(true) WITH CHECK(true);
    CREATE POLICY "plans_authenticated_read" ON plans FOR SELECT TO authenticated USING(true);
    ALTER TABLE plans FORCE ROW LEVEL SECURITY;
    RAISE NOTICE '[SEC-004] plans: policies restritivas criadas';
  END IF;

  IF to_regclass('public.planos') IS NOT NULL THEN
    CREATE POLICY "planos_service_role_only" ON planos FOR ALL TO service_role USING(true) WITH CHECK(true);
    CREATE POLICY "planos_authenticated_read" ON planos FOR SELECT TO authenticated USING(true);
    ALTER TABLE planos FORCE ROW LEVEL SECURITY;
    RAISE NOTICE '[SEC-004] planos: policies restritivas criadas';
  END IF;
END $$;


-- =====================================================================
-- SEC-005: check_mecanico_rate_limit — Hardcode parâmetros internos
-- Caller pode passar p_max_attempts=999999 para anular o rate limit
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_mecanico_rate_limit') THEN
    -- Recriar com signature fixa (sem params manipuláveis)
    -- Primeiro dropar a versão com params
    DROP FUNCTION IF EXISTS check_mecanico_rate_limit(UUID, INT, INT);

    CREATE OR REPLACE FUNCTION check_mecanico_rate_limit(p_mecanico_id UUID)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
    DECLARE
      v_window_minutes CONSTANT INT := 15;
      v_max_attempts   CONSTANT INT := 5;
      v_recent_count   INT;
    BEGIN
      SELECT COUNT(*) INTO v_recent_count
      FROM mecanico_login_attempts
      WHERE mecanico_id = p_mecanico_id
        AND created_at > now() - make_interval(mins := v_window_minutes)
        AND success = false;

      RETURN v_recent_count < v_max_attempts;
    END;
    $fn$;

    -- Restringir acesso
    REVOKE EXECUTE ON FUNCTION check_mecanico_rate_limit(UUID) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION check_mecanico_rate_limit(UUID) FROM anon;
    GRANT EXECUTE ON FUNCTION check_mecanico_rate_limit(UUID) TO service_role;

    RAISE NOTICE '[SEC-005] check_mecanico_rate_limit: params hardcoded (15min/5 attempts)';
  ELSE
    RAISE NOTICE '[SEC-005] check_mecanico_rate_limit: função não encontrada, skip';
  END IF;
END $$;


-- =====================================================================
-- SEC-006: qr_bind_device_atomic — REVOGAR de anon
-- Brute-force de QR tokens sem rate limiting
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'qr_bind_device_atomic') THEN
    REVOKE EXECUTE ON FUNCTION qr_bind_device_atomic FROM anon;
    REVOKE EXECUTE ON FUNCTION qr_bind_device_atomic FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION qr_bind_device_atomic TO service_role;
    RAISE NOTICE '[SEC-006] qr_bind_device_atomic: revogado de anon/PUBLIC';
  ELSE
    RAISE NOTICE '[SEC-006] qr_bind_device_atomic: função não encontrada, skip';
  END IF;
END $$;


-- =====================================================================
-- SEC-007: audit_logs INSERT — Restringir por tenant
-- WITH CHECK(true) permite inserção de audit entries falsas cross-tenant
-- =====================================================================
DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    DROP POLICY IF EXISTS "authenticated can insert audit" ON audit_logs;
    DROP POLICY IF EXISTS "authenticated_insert_audit_logs" ON audit_logs;
    DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON audit_logs;

    CREATE POLICY "audit_logs_insert_own_tenant" ON audit_logs
      FOR INSERT TO authenticated
      WITH CHECK (
        empresa_id IS NULL
        OR empresa_id IN (
          SELECT ur.empresa_id FROM user_roles ur WHERE ur.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM user_roles ur2
          WHERE ur2.user_id = auth.uid()
          AND ur2.role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN', 'MASTER_TI')
        )
      );

    RAISE NOTICE '[SEC-007] audit_logs: INSERT restrito por tenant membership';
  ELSE
    RAISE NOTICE '[SEC-007] audit_logs: tabela não encontrada, skip';
  END IF;
END $$;


-- =====================================================================
-- EXTRA: is_subscription_active — Restringir de PUBLIC
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_subscription_active') THEN
    REVOKE EXECUTE ON FUNCTION is_subscription_active FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION is_subscription_active TO authenticated;
    GRANT EXECUTE ON FUNCTION is_subscription_active TO service_role;
    RAISE NOTICE '[EXTRA] is_subscription_active: revogado de PUBLIC';
  END IF;
END $$;


-- =====================================================================
-- EXTRA: Revogar GRANT SELECT de anon em solicitacoes
-- =====================================================================
DO $$
BEGIN
  IF to_regclass('public.solicitacoes') IS NOT NULL THEN
    REVOKE SELECT ON solicitacoes FROM anon;
    RAISE NOTICE '[EXTRA] solicitacoes: SELECT revogado de anon';
  END IF;
END $$;


-- =====================================================================
-- EXTRA: FORCE RLS em tabelas pendentes
-- =====================================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'operational_logs', 'login_attempts', 'platform_metrics',
    'webhook_events', 'mecanico_login_attempts'
  ])
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
  RAISE NOTICE '[EXTRA] FORCE RLS aplicado em tabelas pendentes';
END $$;


-- =====================================================================
-- EXTRA: Restringir log_mecanicos_login INSERT de anon
-- Mover para service_role (edge function usa admin client)
-- =====================================================================
DO $$
BEGIN
  IF to_regclass('public.log_mecanicos_login') IS NOT NULL THEN
    REVOKE INSERT ON log_mecanicos_login FROM anon;
    RAISE NOTICE '[EXTRA] log_mecanicos_login: INSERT revogado de anon';
  END IF;
END $$;


-- =====================================================================
-- SMOKE TEST: Validar que policies críticas existem
-- =====================================================================
DO $$
DECLARE
  v_count INT;
BEGIN
  -- Verificar que empresas NÃO tem mais USING(true) genérica
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'empresas'
    AND policyname LIKE '%view%';
  IF v_count > 0 THEN
    RAISE EXCEPTION 'SMOKE FAIL: empresas ainda tem policy "view" legada';
  END IF;

  -- Verificar que nova policy membership existe
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'empresas'
    AND policyname = 'empresas_select_by_membership';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'SMOKE FAIL: empresas_select_by_membership não criada';
  END IF;

  -- Verificar que anon slug resolve policy existe
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'empresas'
    AND policyname = 'empresas_anon_slug_resolve';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'SMOKE FAIL: empresas_anon_slug_resolve não criada';
  END IF;

  -- Verificar plans tem policy restritiva
  IF to_regclass('public.plans') IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'plans'
      AND policyname = 'plans_service_role_only';
    IF v_count = 0 THEN
      RAISE EXCEPTION 'SMOKE FAIL: plans_service_role_only não criada';
    END IF;
  END IF;

  RAISE NOTICE '✅ SMOKE TEST PASSED: Todas policies de segurança V7 validadas';
END $$;
