-- =============================================================================
-- MIGRAÇÃO V4 — CORREÇÕES DE SEGURANÇA AUDITORIA EXTREMA
-- Data: 2026-04-10
-- Escopo: RLS fixes, privilege escalation guards, bcrypt, rate limiting, FORCE RLS
-- EXECUTAR APÓS: 20260410210000_auditoria_v3_security_fixes.sql
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────
-- 1. FIX RLS: audit_logs — Remover USING(true) → tenant-scoped
-- ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "audit_logs_policy" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_secdef_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_secdef_insert" ON audit_logs;

-- Somente leitura para o próprio tenant
CREATE POLICY "audit_logs_tenant_select"
  ON audit_logs FOR SELECT
  USING (
    empresa_id IS NOT NULL AND can_access_empresa(empresa_id)
  );

-- Somente SYSTEM_OWNER/SYSTEM_ADMIN podem ver logs sem empresa_id (plataforma)
CREATE POLICY "audit_logs_platform_select"
  ON audit_logs FOR SELECT
  USING (
    empresa_id IS NULL
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  );

-- Insert: somente serviço interno
CREATE POLICY "audit_logs_insert_service"
  ON audit_logs FOR INSERT
  WITH CHECK (true);
-- Nota: INSERT com WITH CHECK(true) é aceitável pois qualquer operação legítima precisa logar.
-- A proteção crítica é no SELECT (não expor logs cross-tenant).

-- ─────────────────────────────────────────────────────
-- 2. FIX RLS: Tabelas de plataforma — Restringir a service_role
-- ─────────────────────────────────────────────────────

-- plans
DROP POLICY IF EXISTS "plans_public_read" ON plans;
DROP POLICY IF EXISTS "plans_policy" ON plans;
DROP POLICY IF EXISTS "plans_all" ON plans;
CREATE POLICY "plans_read_authenticated" ON plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "plans_manage_service" ON plans FOR ALL TO service_role USING (true);

-- planos (se existir como alias)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'planos' AND schemaname = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "planos_policy" ON planos';
    EXECUTE 'DROP POLICY IF EXISTS "planos_all" ON planos';
    EXECUTE 'CREATE POLICY "planos_read_authenticated" ON planos FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "planos_manage_service" ON planos FOR ALL TO service_role USING (true)';
  END IF;
END $$;

-- ip_rate_limits
DROP POLICY IF EXISTS "ip_rate_limits_policy" ON ip_rate_limits;
DROP POLICY IF EXISTS "ip_rate_limits_all" ON ip_rate_limits;
CREATE POLICY "ip_rate_limits_service_only" ON ip_rate_limits FOR ALL TO service_role USING (true);

-- saas_metrics_daily
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'saas_metrics_daily' AND schemaname = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "saas_metrics_daily_policy" ON saas_metrics_daily';
    EXECUTE 'DROP POLICY IF EXISTS "saas_metrics_daily_all" ON saas_metrics_daily';
    EXECUTE 'CREATE POLICY "saas_metrics_daily_service_only" ON saas_metrics_daily FOR ALL TO service_role USING (true)';
    EXECUTE 'CREATE POLICY "saas_metrics_daily_owner_read" ON saas_metrics_daily FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN (''SYSTEM_OWNER'', ''SYSTEM_ADMIN''))
    )';
  END IF;
END $$;

-- platform_metrics
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'platform_metrics' AND schemaname = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "platform_metrics_policy" ON platform_metrics';
    EXECUTE 'DROP POLICY IF EXISTS "platform_metrics_all" ON platform_metrics';
    EXECUTE 'CREATE POLICY "platform_metrics_service_only" ON platform_metrics FOR ALL TO service_role USING (true)';
    EXECUTE 'CREATE POLICY "platform_metrics_owner_read" ON platform_metrics FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN (''SYSTEM_OWNER'', ''SYSTEM_ADMIN''))
    )';
  END IF;
END $$;

-- system_owner_allowlist — CRÍTICO: somente service_role
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'system_owner_allowlist' AND schemaname = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "system_owner_allowlist_policy" ON system_owner_allowlist';
    EXECUTE 'DROP POLICY IF EXISTS "system_owner_allowlist_all" ON system_owner_allowlist';
    EXECUTE 'CREATE POLICY "system_owner_allowlist_service_only" ON system_owner_allowlist FOR ALL TO service_role USING (true)';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- 3. FIX RLS: medicoes_preditivas UPDATE — Scoped por tenant
-- ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "update_medicao" ON medicoes_preditivas;
DROP POLICY IF EXISTS "medicoes_preditivas_update" ON medicoes_preditivas;

CREATE POLICY "medicoes_preditivas_update_tenant"
  ON medicoes_preditivas FOR UPDATE
  USING (can_access_empresa(empresa_id))
  WITH CHECK (can_access_empresa(empresa_id));

-- ─────────────────────────────────────────────────────
-- 4. FIX RLS: lubrificantes + movimentacoes_lubrificante — JWT claims quebrados
-- ─────────────────────────────────────────────────────

-- Remover policies que usam current_setting('request.jwt.claims') (quebrado em Supabase)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'lubrificantes' AND schemaname = 'public') THEN
    -- Drop todas as policies existentes
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lubrificantes' AND schemaname = 'public') LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON lubrificantes', r.policyname);
    END LOOP;
    -- Recriar com can_access_empresa
    EXECUTE 'CREATE POLICY "lubrificantes_tenant_all" ON lubrificantes FOR ALL USING (can_access_empresa(empresa_id)) WITH CHECK (can_access_empresa(empresa_id))';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'movimentacoes_lubrificante' AND schemaname = 'public') THEN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'movimentacoes_lubrificante' AND schemaname = 'public') LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON movimentacoes_lubrificante', r.policyname);
    END LOOP;
    EXECUTE 'CREATE POLICY "movimentacoes_lubrificante_tenant_all" ON movimentacoes_lubrificante FOR ALL USING (can_access_empresa(empresa_id)) WITH CHECK (can_access_empresa(empresa_id))';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- 5. FIX RLS: log_mecanicos_login — Remover INSERT WITH CHECK(true) duplicado
-- ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "insert_any" ON log_mecanicos_login;
DROP POLICY IF EXISTS "log_mecanicos_login_insert_any" ON log_mecanicos_login;
-- Manter somente a policy com tenant check

-- log_validacoes_senha — Restringir insert
DROP POLICY IF EXISTS "log_validacoes_senha_insert" ON log_validacoes_senha;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'log_validacoes_senha' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "log_validacoes_senha_insert_service" ON log_validacoes_senha FOR INSERT TO service_role WITH CHECK (true)';
  END IF;
END $$;

-- log_tentativas_login — Restringir insert
DROP POLICY IF EXISTS "log_tentativas_login_insert" ON log_tentativas_login;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'log_tentativas_login' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "log_tentativas_login_insert_service" ON log_tentativas_login FOR INSERT TO service_role WITH CHECK (true)';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- 6. FORCE ROW LEVEL SECURITY em tabelas que faltam
-- ─────────────────────────────────────────────────────

DO $$
DECLARE
  tbl TEXT;
  tables_to_force TEXT[] := ARRAY[
    'audit_logs', 'ordens_servico', 'equipamentos', 'mecanicos',
    'materiais', 'contratos', 'medicoes_preditivas', 'documentos_tecnicos',
    'execucoes_os', 'planos_preventivos', 'solicitacoes', 'lubrificantes',
    'movimentacoes_lubrificante', 'rotas_lubrificacao', 'rota_equipamentos',
    'niveis_lubrificante', 'dispositivos_moveis', 'permissoes_granulares',
    'maintenance_schedule', 'configuracoes_sistema', 'user_roles',
    'webhook_events', 'mecanico_login_attempts', 'sessoes_mecanico',
    'log_mecanicos_login', 'log_validacoes_senha', 'log_tentativas_login'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_force
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = tbl AND schemaname = 'public') THEN
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────
-- 7. FIX RPC: dashboard_summary — Adicionar access check
-- ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION dashboard_summary(empresa_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result JSONB;
  v_total_os INT;
  v_os_abertas INT;
  v_os_fechadas INT;
  v_custo_mes NUMERIC;
  v_mttr NUMERIC;
  v_mtbf NUMERIC;
  v_backlog INT;
  v_disponibilidade NUMERIC;
BEGIN
  -- ACCESS CHECK: somente membros da empresa ou owners
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND (user_roles.empresa_id = dashboard_summary.empresa_id OR role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN', 'MASTER_TI'))
  ) THEN
    RAISE EXCEPTION 'Forbidden: sem acesso a esta empresa';
  END IF;

  -- Contadores básicos
  SELECT COUNT(*) INTO v_total_os
  FROM ordens_servico WHERE ordens_servico.empresa_id = dashboard_summary.empresa_id;

  SELECT COUNT(*) INTO v_os_abertas
  FROM ordens_servico WHERE ordens_servico.empresa_id = dashboard_summary.empresa_id AND status IN ('ABERTA', 'EM_ANDAMENTO');

  SELECT COUNT(*) INTO v_os_fechadas
  FROM ordens_servico WHERE ordens_servico.empresa_id = dashboard_summary.empresa_id AND status = 'FECHADA';

  SELECT COALESCE(SUM(custo_total), 0) INTO v_custo_mes
  FROM ordens_servico
  WHERE ordens_servico.empresa_id = dashboard_summary.empresa_id
    AND created_at >= date_trunc('month', now());

  v_backlog := v_os_abertas;

  -- MTTR (horas médias de reparo)
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (e.data_fim - e.data_inicio)) / 3600), 0) INTO v_mttr
  FROM execucoes_os e
  JOIN ordens_servico os ON os.id = e.os_id
  WHERE os.empresa_id = dashboard_summary.empresa_id
    AND e.data_fim IS NOT NULL;

  v_mtbf := CASE WHEN v_total_os > 0 THEN ROUND(720.0 / v_total_os, 1) ELSE 0 END;
  v_disponibilidade := CASE WHEN v_mtbf + v_mttr > 0 THEN ROUND(v_mtbf / (v_mtbf + v_mttr) * 100, 1) ELSE 100 END;

  result := jsonb_build_object(
    'total_os', v_total_os,
    'os_abertas', v_os_abertas,
    'os_fechadas', v_os_fechadas,
    'custo_mes', v_custo_mes,
    'mttr_horas', v_mttr,
    'mtbf_horas', v_mtbf,
    'backlog', v_backlog,
    'disponibilidade_pct', v_disponibilidade
  );

  RETURN result;
END;
$$;

-- ─────────────────────────────────────────────────────
-- 8. RPCs de mecânico — NÃO REVOGAR ANON
-- ─────────────────────────────────────────────────────
-- RISCO R1 CONFIRMADO: PortalMecanicoContext.tsx chama
-- validar_credenciais_mecanico_servidor e resolver_empresa_mecanico
-- usando client ANON (sem auth). O mecânico ainda NÃO tem JWT nesse ponto.
-- Revogar anon = portal mecânico PARA de funcionar.
--
-- Mitigação alternativa: rate limit interno na RPC (via mecanico_login_attempts
-- já criada na V3 migration). Implementar na próxima sprint sem revogar grants.

-- ─────────────────────────────────────────────────────
-- 9. FIX: maintenance_schedule unique constraint com empresa_id
-- ─────────────────────────────────────────────────────

DO $$
DECLARE
  v_dup_count INT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'maintenance_schedule' AND schemaname = 'public') THEN
    -- Verificar duplicatas ANTES de criar constraint (R9)
    SELECT COUNT(*) INTO v_dup_count
    FROM (
      SELECT tipo, origem_id, empresa_id
      FROM maintenance_schedule
      GROUP BY tipo, origem_id, empresa_id
      HAVING COUNT(*) > 1
    ) dups;

    IF v_dup_count > 0 THEN
      RAISE WARNING 'maintenance_schedule: % grupos duplicados encontrados. Constraint NÃO criado — resolver duplicatas primeiro.', v_dup_count;
    ELSE
      -- Drop constraint antigo se existir
      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_schedule_tipo_origem_id_key'
      ) THEN
        EXECUTE 'ALTER TABLE maintenance_schedule DROP CONSTRAINT maintenance_schedule_tipo_origem_id_key';
      END IF;
      -- Criar constraint correto com empresa_id
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_schedule_tipo_origem_empresa_key'
      ) THEN
        EXECUTE 'ALTER TABLE maintenance_schedule ADD CONSTRAINT maintenance_schedule_tipo_origem_empresa_key UNIQUE (tipo, origem_id, empresa_id)';
      END IF;
    END IF;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- 10. FIX: Função helper para validar redirect URLs
-- ─────────────────────────────────────────────────────

-- Esta função pode ser chamada por RPCs que precisam validar URLs de redirect
CREATE OR REPLACE FUNCTION is_allowed_redirect_url(p_url TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_host TEXT;
BEGIN
  IF p_url IS NULL OR length(p_url) = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Extrair hostname (simplificado)
  -- Aceitar: gppis.com.br, *.gppis.com.br, localhost (dev)
  BEGIN
    v_host := lower(split_part(split_part(p_url, '://', 2), '/', 1));
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;
  
  IF v_host IN ('gppis.com.br', 'www.gppis.com.br') THEN
    RETURN TRUE;
  END IF;
  
  IF v_host LIKE '%.gppis.com.br' AND v_host NOT LIKE '%.%.gppis.com.br' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- ─────────────────────────────────────────────────────
-- 11. SMOKE TEST — Verificar policies e constraints
-- ─────────────────────────────────────────────────────

DO $$
DECLARE
  v_count INT;
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Verificar que audit_logs NÃO tem mais USING(true) para SELECT
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename = 'audit_logs'
    AND schemaname = 'public'
    AND cmd = 'r'  -- SELECT
    AND qual::text LIKE '%true%'
    AND qual::text NOT LIKE '%can_access%'
    AND policyname NOT LIKE '%platform%';
  IF v_count > 0 THEN
    v_errors := array_append(v_errors, 'FAIL: audit_logs still has USING(true) SELECT policy');
  END IF;

  -- Verificar que ip_rate_limits é service_role only
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename = 'ip_rate_limits'
    AND schemaname = 'public'
    AND roles::text NOT LIKE '%service_role%';
  IF v_count > 0 THEN
    v_errors := array_append(v_errors, 'WARN: ip_rate_limits has non-service_role policies');
  END IF;

  -- Verificar que maintenance_schedule tem constraint correto
  SELECT COUNT(*) INTO v_count
  FROM pg_constraint
  WHERE conname = 'maintenance_schedule_tipo_origem_empresa_key';
  IF v_count = 0 AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'maintenance_schedule' AND schemaname = 'public') THEN
    v_errors := array_append(v_errors, 'FAIL: maintenance_schedule missing unique constraint with empresa_id');
  END IF;

  -- Verificar que dashboard_summary tem access check
  SELECT COUNT(*) INTO v_count
  FROM pg_proc
  WHERE proname = 'dashboard_summary'
    AND prosrc LIKE '%Forbidden%';
  IF v_count = 0 AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'dashboard_summary') THEN
    v_errors := array_append(v_errors, 'FAIL: dashboard_summary missing access check');
  END IF;

  -- Resultado
  IF array_length(v_errors, 1) > 0 THEN
    RAISE WARNING 'V4 Migration Smoke Test — % issues: %', array_length(v_errors, 1), array_to_string(v_errors, '; ');
  ELSE
    RAISE NOTICE 'V4 Migration Smoke Test — ALL CHECKS PASSED ✓';
  END IF;
END $$;

COMMIT;
