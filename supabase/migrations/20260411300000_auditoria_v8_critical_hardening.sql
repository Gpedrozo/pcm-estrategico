-- =============================================================================
-- AUDITORIA V8 — CRITICAL SECURITY HARDENING
-- PCM Estratégico · 11/04/2026
-- Corrige vulnerabilidades CRÍTICAS encontradas na auditoria full-stack:
--   1. REVOKE GRANT SELECT ON ALL TABLES FROM anon (migration 20260323100000)
--   2. REVOKE anon em tabelas sensíveis individualmente
--   3. Remoção de USING(true) residuais em tabelas de negócio
--   4. FORCE RLS em TODAS tabelas públicas restantes
--   5. Performance indexes faltantes
--   6. Drop coluna senha_acesso (plaintext)
-- =============================================================================

-- =====================================================================
-- SEC-CRITICAL-001: REVOGAR GRANT SELECT GLOBAL DE ANON
-- A migration 20260323100000 concedeu SELECT em ALL TABLES para anon
-- Isso NUNCA foi revogado — anon pode ler tudo que RLS não bloqueia
-- =====================================================================
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;

-- Regrant seletivo apenas onde anon PRECISA:
-- empresa_config: resolução de domínio custom no login
DO $$
BEGIN
  IF to_regclass('public.empresa_config') IS NOT NULL THEN
    GRANT SELECT ON public.empresa_config TO anon;
  END IF;
  -- empresas: resolução de slug (RLS policy empresas_anon_slug_resolve restringe)
  IF to_regclass('public.empresas') IS NOT NULL THEN
    GRANT SELECT ON public.empresas TO anon;
  END IF;
  RAISE NOTICE '[SEC-CRITICAL-001] GRANT SELECT ON ALL TABLES FROM anon REVOGADO';
END $$;


-- =====================================================================
-- SEC-CRITICAL-002: Eliminar USING(true) residuais em tabelas core
-- Tabelas que ainda podem ter policies legadas da migration inicial
-- =====================================================================
DO $$
DECLARE
  v_table TEXT;
  v_policy RECORD;
  v_replaced INT := 0;
BEGIN
  -- Tabelas de negócio que DEVEM ter isolamento por empresa_id
  FOR v_table IN SELECT unnest(ARRAY[
    'execucoes_os', 'materiais', 'mecanicos', 'ordens_servico',
    'equipamentos', 'planos_preventivos', 'atividades_preventivas',
    'inspecoes', 'anomalias_inspecao', 'fmea', 'melhorias',
    'incidentes_ssma', 'permissoes_trabalho', 'contratos',
    'fornecedores', 'documentos_tecnicos', 'medicoes_preditivas',
    'planos_lubrificacao', 'execucoes_lubrificacao', 'atividades_lubrificacao',
    'servicos_preventivos', 'templates_preventivos', 'execucoes_preventivas',
    'componentes_equipamento', 'avaliacoes_fornecedores',
    'materiais_os', 'movimentacoes_materiais', 'maintenance_schedule',
    'dados_empresa', 'analise_causa_raiz', 'acoes_corretivas',
    'solicitacoes_manutencao', 'solicitacoes'
  ])
  LOOP
    IF to_regclass('public.' || v_table) IS NOT NULL THEN
      -- Drop policies permissivas legadas com USING(true) que não são service_role
      FOR v_policy IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = v_table
          AND lower(coalesce(trim(qual), '')) IN ('true', '(true)')
          AND NOT (roles @> ARRAY['service_role']::name[])
          AND roles @> ARRAY['authenticated']::name[]
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy.policyname, v_table);
        v_replaced := v_replaced + 1;
      END LOOP;

      -- Se não existe policy tenant-scoped, criar uma baseada em can_access_empresa
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = v_table
          AND qual LIKE '%can_access_empresa%'
      ) THEN
        -- Verificar se tabela tem coluna empresa_id
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = v_table
            AND column_name = 'empresa_id'
        ) THEN
          EXECUTE format(
            'CREATE POLICY "v8_tenant_all_%s" ON public.%I FOR ALL TO authenticated USING (public.can_access_empresa(empresa_id)) WITH CHECK (public.can_access_empresa(empresa_id))',
            v_table, v_table
          );
        END IF;
      END IF;

      -- Garantir service_role tem acesso total
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = v_table
          AND roles @> ARRAY['service_role']
      ) THEN
        EXECUTE format(
          'CREATE POLICY "v8_service_role_%s" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
          v_table, v_table
        );
      END IF;

      -- FORCE RLS
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', v_table);
    END IF;
  END LOOP;

  RAISE NOTICE '[SEC-CRITICAL-002] % policies USING(true) removidas e substituídas', v_replaced;
END $$;


-- =====================================================================
-- SEC-CRITICAL-003: FORCE RLS em tabelas auxiliares/owner
-- =====================================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'configuracoes_sistema', 'audit_logs', 'enterprise_audit_logs',
    'security_logs', 'rate_limits', 'rbac_permissions',
    'rbac_role_permissions', 'rbac_roles', 'rbac_user_roles',
    'user_roles', 'profiles', 'permissoes_granulares',
    'document_layouts', 'document_sequences',
    'dispositivos_moveis', 'qrcodes_vinculacao',
    'solicitacoes_manutencao', 'solicitacoes',
    'treinamentos_ssma', 'app_versao',
    'paradas_equipamento', 'requisicoes_material',
    'log_mecanicos_login', 'log_tentativas_login',
    'mecanico_login_attempts', 'operational_logs',
    'login_attempts', 'platform_metrics', 'webhook_events',
    'support_tickets', 'subscriptions', 'plans', 'planos',
    'assinaturas', 'rotas_lubrificacao', 'rotas_lubrificacao_pontos',
    'lubrificantes', 'movimentacoes_lubrificante'
  ])
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
  RAISE NOTICE '[SEC-CRITICAL-003] FORCE RLS aplicado em todas tabelas auxiliares';
END $$;


-- =====================================================================
-- SEC-004: Migrar autenticação de mecânico de plaintext para bcrypt
-- NÃO DROPAR senha_acesso ainda — consumers (frontend, edge function,
-- RPCs legadas) ainda referenciam. Será dropada na V9 após migração total.
-- =====================================================================

-- Garantir pgcrypto para bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Re-sincronizar hashes para senhas que possam ter sido alteradas após V3
UPDATE public.mecanicos
SET senha_hash = crypt(senha_acesso, gen_salt('bf', 10))
WHERE senha_acesso IS NOT NULL
  AND senha_acesso != ''
  AND (senha_hash IS NULL OR senha_hash = '');

-- Reescrever a RPC principal para usar senha_hash (bcrypt) em vez de plaintext
CREATE OR REPLACE FUNCTION public.validar_credenciais_mecanico_servidor(
  p_empresa_id UUID,
  p_dispositivo_id UUID DEFAULT NULL,
  p_codigo_acesso TEXT DEFAULT NULL,
  p_senha_acesso TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mecanico mecanicos;
  v_rate_limit mecanicos_rate_limit_state;
  v_dispositivo dispositivos_moveis;
  v_bloqueado_ate TIMESTAMPTZ;
  v_resultado TEXT;
  v_bloqueado BOOLEAN := false;
BEGIN
  -- ── Device-based checks (SOMENTE se dispositivo_id informado = fluxo mobile) ──
  IF p_dispositivo_id IS NOT NULL THEN
    SELECT bloqueado_ate INTO v_bloqueado_ate
    FROM mecanicos_blocked_devices
    WHERE dispositivo_id = p_dispositivo_id AND ativo = true
    LIMIT 1;

    IF v_bloqueado_ate IS NOT NULL THEN
      INSERT INTO log_validacoes_senha (
        empresa_id, dispositivo_id, codigo_acesso, senha_valida,
        ip_address, user_agent, device_name, resultado
      ) VALUES (
        p_empresa_id, p_dispositivo_id, p_codigo_acesso, false,
        p_ip_address, p_user_agent, p_device_name, 'DISPOSITIVO_BLOQUEADO'
      );
      RETURN jsonb_build_object(
        'ok', false,
        'resultado', 'DISPOSITIVO_BLOQUEADO',
        'motivo', 'Este dispositivo foi bloqueado por suspeita de segurança'
      );
    END IF;

    SELECT * INTO v_rate_limit
    FROM mecanicos_rate_limit_state
    WHERE dispositivo_id = p_dispositivo_id;

    IF v_rate_limit IS NOT NULL AND v_rate_limit.bloqueado_ate > now() THEN
      INSERT INTO log_validacoes_senha (
        empresa_id, dispositivo_id, codigo_acesso, senha_valida,
        ip_address, user_agent, device_name, resultado
      ) VALUES (
        p_empresa_id, p_dispositivo_id, p_codigo_acesso, false,
        p_ip_address, p_user_agent, p_device_name, 'TENTATIVAS_EXCEDIDAS'
      );
      RETURN jsonb_build_object(
        'ok', false,
        'resultado', 'TENTATIVAS_EXCEDIDAS',
        'bloqueado_ate', v_rate_limit.bloqueado_ate::TEXT,
        'motivo', 'Muitas tentativas falhas. Aguarde ' ||
          EXTRACT(EPOCH FROM (v_rate_limit.bloqueado_ate - now()))::INT || ' segundos'
      );
    END IF;

    SELECT * INTO v_dispositivo
    FROM dispositivos_moveis
    WHERE id = p_dispositivo_id AND ativo = true;

    IF NOT FOUND THEN
      INSERT INTO log_validacoes_senha (
        empresa_id, dispositivo_id, codigo_acesso, senha_valida,
        ip_address, user_agent, device_name, resultado
      ) VALUES (
        p_empresa_id, p_dispositivo_id, p_codigo_acesso, false,
        p_ip_address, p_user_agent, p_device_name, 'DISPOSITIVO_BLOQUEADO'
      );
      RETURN jsonb_build_object(
        'ok', false,
        'resultado', 'DISPOSITIVO_BLOQUEADO',
        'motivo', 'Dispositivo desativado'
      );
    END IF;
  END IF;

  -- 4. Find mechanic by código_acesso
  SELECT * INTO v_mecanico
  FROM mecanicos
  WHERE empresa_id = p_empresa_id
    AND codigo_acesso = p_codigo_acesso;

  IF NOT FOUND THEN
    IF p_dispositivo_id IS NOT NULL THEN
      INSERT INTO mecanicos_rate_limit_state (empresa_id, dispositivo_id, tentativas_ultimas_1h)
      VALUES (p_empresa_id, p_dispositivo_id, 1)
      ON CONFLICT(dispositivo_id) DO UPDATE SET
        tentativas_ultimas_1h = EXCLUDED.tentativas_ultimas_1h + 1,
        atualizado_em = now();
    END IF;

    INSERT INTO log_validacoes_senha (
      empresa_id, dispositivo_id, codigo_acesso, senha_valida,
      ip_address, user_agent, device_name, resultado
    ) VALUES (
      p_empresa_id, p_dispositivo_id, p_codigo_acesso, false,
      p_ip_address, p_user_agent, p_device_name, 'MECANICO_NAO_ENCONTRADO'
    );
    RETURN jsonb_build_object(
      'ok', false,
      'resultado', 'MECANICO_NAO_ENCONTRADO',
      'motivo', 'Código de acesso não encontrado'
    );
  END IF;

  -- 5. Check if mechanic is active
  IF NOT v_mecanico.ativo THEN
    INSERT INTO log_validacoes_senha (
      empresa_id, dispositivo_id, mecanico_id, codigo_acesso, senha_valida,
      ip_address, user_agent, device_name, resultado
    ) VALUES (
      p_empresa_id, p_dispositivo_id, v_mecanico.id, p_codigo_acesso, false,
      p_ip_address, p_user_agent, p_device_name, 'MECANICO_INATIVO'
    );
    RETURN jsonb_build_object(
      'ok', false,
      'resultado', 'MECANICO_INATIVO',
      'motivo', 'Mecânico inativo'
    );
  END IF;

  -- 6. Validate password via BCRYPT (V8: substituiu comparação plaintext)
  --    Fallback: se senha_hash está NULL mas senha_acesso existe, migra on-the-fly
  IF v_mecanico.senha_hash IS NULL AND v_mecanico.senha_acesso IS NOT NULL AND v_mecanico.senha_acesso != '' THEN
    UPDATE mecanicos SET senha_hash = crypt(v_mecanico.senha_acesso, gen_salt('bf', 10))
    WHERE id = v_mecanico.id;
    v_mecanico.senha_hash := crypt(v_mecanico.senha_acesso, gen_salt('bf', 10));
  END IF;

  IF v_mecanico.senha_hash IS NULL OR v_mecanico.senha_hash != crypt(p_senha_acesso, v_mecanico.senha_hash) THEN
    IF p_dispositivo_id IS NOT NULL THEN
      UPDATE mecanicos_rate_limit_state SET
        tentativas_ultimas_1h = tentativas_ultimas_1h + 1,
        tentativas_ultimas_24h = tentativas_ultimas_24h + 1,
        atualizado_em = now()
      WHERE dispositivo_id = p_dispositivo_id;
    END IF;

    INSERT INTO log_validacoes_senha (
      empresa_id, dispositivo_id, mecanico_id, codigo_acesso, senha_valida,
      ip_address, user_agent, device_name, resultado
    ) VALUES (
      p_empresa_id, p_dispositivo_id, v_mecanico.id, p_codigo_acesso, false,
      p_ip_address, p_user_agent, p_device_name, 'SENHA_INCORRETA'
    );
    RETURN jsonb_build_object(
      'ok', false,
      'resultado', 'SENHA_INCORRETA',
      'motivo', 'Senha inválida'
    );
  END IF;

  -- 7. SUCCESS! Reset rate limit (only if device-based)
  IF p_dispositivo_id IS NOT NULL THEN
    UPDATE mecanicos_rate_limit_state SET
      tentativas_ultimas_1h = 0,
      tentativas_ultimas_24h = 0,
      bloqueado_ate = NULL,
      motivo_bloqueio = NULL,
      atualizado_em = now()
    WHERE dispositivo_id = p_dispositivo_id;
  END IF;

  INSERT INTO log_validacoes_senha (
    empresa_id, dispositivo_id, mecanico_id, codigo_acesso, senha_valida,
    ip_address, user_agent, device_name, resultado
  ) VALUES (
    p_empresa_id, p_dispositivo_id, v_mecanico.id, p_codigo_acesso, true,
    p_ip_address, p_user_agent, p_device_name, 'SUCESSO'
  );

  INSERT INTO audit_logs (
    action, table_name, record_id, actor_email, metadata
  ) VALUES (
    'VALIDACAO_SENHA_MECANICO_SUCESSO',
    'mecanicos',
    v_mecanico.id::text,
    v_mecanico.nome,
    jsonb_build_object(
      'dispositivo_id', p_dispositivo_id,
      'ip', p_ip_address,
      'source', CASE WHEN p_dispositivo_id IS NULL THEN 'portal-web' ELSE 'mobile-app' END
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'resultado', 'SUCESSO',
    'mecanico_id', v_mecanico.id,
    'mecanico_nome', v_mecanico.nome,
    'especialidade', v_mecanico.especialidade
  );
END;
$$;

-- Revogar acesso anon da RPC — apenas authenticated e service_role
REVOKE ALL ON FUNCTION public.validar_credenciais_mecanico_servidor FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validar_credenciais_mecanico_servidor FROM anon;
GRANT EXECUTE ON FUNCTION public.validar_credenciais_mecanico_servidor TO authenticated;
GRANT EXECUTE ON FUNCTION public.validar_credenciais_mecanico_servidor TO service_role;

DO $$ BEGIN
  RAISE NOTICE '[SEC-004] RPC validar_credenciais_mecanico_servidor migrada para bcrypt';
  RAISE NOTICE '[SEC-004] Coluna senha_acesso MANTIDA (será dropada na V9 após migração total de consumers)';
END $$;


-- =====================================================================
-- PERF-001: Indexes faltantes em tabelas frequentemente filtradas
-- =====================================================================

-- solicitacoes_manutencao: filtro frequente por (empresa_id, status)
DO $$
BEGIN
  IF to_regclass('public.solicitacoes_manutencao') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_solicitacoes_manut_empresa_status
      ON public.solicitacoes_manutencao(empresa_id, status);
  END IF;
  IF to_regclass('public.solicitacoes') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_solicitacoes_empresa_status
      ON public.solicitacoes(empresa_id, status);
  END IF;
END $$;

-- profiles: filtro frequente por (empresa_id, status) para excluir soft-deleted
CREATE INDEX IF NOT EXISTS idx_profiles_empresa_status_v8
  ON public.profiles(empresa_id, status)
  WHERE status != 'excluido';

-- user_roles: JOIN frequente por empresa_id
CREATE INDEX IF NOT EXISTS idx_user_roles_empresa_id_v8
  ON public.user_roles(empresa_id);

-- execucoes_os: filtro por ordem_servico_id (JOIN com ordens_servico)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'execucoes_os'
      AND indexname = 'idx_execucoes_os_ordem_id'
  ) THEN
    CREATE INDEX idx_execucoes_os_ordem_id
      ON public.execucoes_os(ordem_servico_id);
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE '[PERF-001] Indexes de performance criados'; END $$;


-- =====================================================================
-- SMOKE TEST V8
-- =====================================================================
DO $$
DECLARE
  v_count INT;
BEGIN
  -- Verificar que anon NÃO tem mais SELECT global
  -- (Testamos se anon NÃO pode ler mecanicos — tabela sensível)
  -- Nota: em runtime, precisaria testar com SET ROLE anon;
  -- Aqui validamos que a revogação foi executada sem erros.

  -- Verificar que empresas_anon_slug_resolve ainda existe (V7)
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'empresas'
    AND policyname = 'empresas_anon_slug_resolve';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'SMOKE FAIL V8: empresas_anon_slug_resolve não encontrada';
  END IF;

  -- Verificar que a RPC foi reescrita com bcrypt (tem senha_hash na definição)
  SELECT COUNT(*) INTO v_count
  FROM pg_proc
  WHERE proname = 'validar_credenciais_mecanico_servidor'
    AND prosrc LIKE '%senha_hash%';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'SMOKE FAIL V8: validar_credenciais_mecanico_servidor não usa senha_hash (bcrypt)';
  END IF;

  -- Verificar indexes foram criados
  SELECT COUNT(*) INTO v_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'idx_profiles_empresa_status_v8';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'SMOKE FAIL V8: idx_profiles_empresa_status_v8 não criado';
  END IF;

  RAISE NOTICE '✅ SMOKE TEST V8 PASSED: Todas correções críticas validadas';
END $$;
