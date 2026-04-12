-- =============================================================================
-- Migration: 20260411200000_plano_acao_zero_falhas.sql
-- Etapa 10 / Fase 1 — Correções críticas de segurança, RLS e índices
-- Data: 2026-04-11
-- =============================================================================

BEGIN;

-- =============================================================================
-- SEC-HARDENING-01 — Revogar funções de diagnóstico de `authenticated`
-- V5 (20260411000000) revogou de `anon`; aqui completamos revogando de `authenticated`
-- =============================================================================

DO $$ BEGIN
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.auth_runtime_deep_probe(text) FROM authenticated;
  EXCEPTION WHEN undefined_function OR undefined_object THEN NULL;
  END;
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.auth_rls_policy_probe() FROM authenticated;
  EXCEPTION WHEN undefined_function OR undefined_object THEN NULL;
  END;
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.auth_role_attributes_probe() FROM authenticated;
  EXCEPTION WHEN undefined_function OR undefined_object THEN NULL;
  END;
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.auth_instances_snapshot() FROM authenticated;
  EXCEPTION WHEN undefined_function OR undefined_object THEN NULL;
  END;
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.auth_core_counts() FROM authenticated;
  EXCEPTION WHEN undefined_function OR undefined_object THEN NULL;
  END;
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.auth_runtime_privilege_probe() FROM authenticated;
  EXCEPTION WHEN undefined_function OR undefined_object THEN NULL;
  END;
END $$;

-- =============================================================================
-- SEC-HARDENING-02 — Nulificar mecanicos.senha_acesso (plaintext)
-- Mecânicos autenticam via bcrypt (senha_hash); plaintext deve ser removido
-- =============================================================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'mecanicos'
      AND column_name  = 'senha_acesso'
  ) THEN
    UPDATE public.mecanicos
      SET senha_acesso = NULL
    WHERE senha_acesso IS NOT NULL;

    RAISE NOTICE 'mecanicos.senha_acesso: plaintext nullificado em todos os registros';
  END IF;
END $$;

-- =============================================================================
-- RLS-FIX-01 — contracts e contract_versions: usar can_access_empresa em vez de
--              join direto com profiles.empresa_id (isolamento mais robusto)
-- =============================================================================

-- contracts
ALTER TABLE IF EXISTS public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contracts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contracts_tenant_select" ON public.contracts;
CREATE POLICY "contracts_tenant_select"
  ON public.contracts
  FOR SELECT
  USING ( public.can_access_empresa(empresa_id) );

DROP POLICY IF EXISTS "contracts_service_role_all" ON public.contracts;
CREATE POLICY "contracts_service_role_all"
  ON public.contracts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- contract_versions
ALTER TABLE IF EXISTS public.contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contract_versions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_versions_tenant_select" ON public.contract_versions;
CREATE POLICY "contract_versions_tenant_select"
  ON public.contract_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_versions.contract_id
        AND public.can_access_empresa(c.empresa_id)
    )
  );

DROP POLICY IF EXISTS "contract_versions_service_role_all" ON public.contract_versions;
CREATE POLICY "contract_versions_service_role_all"
  ON public.contract_versions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS-FIX-02 — paradas_equipamento e requisicoes_material: usar can_access_empresa
-- =============================================================================

-- paradas_equipamento
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'paradas_equipamento'
  ) THEN
    EXECUTE 'ALTER TABLE public.paradas_equipamento ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.paradas_equipamento FORCE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "paradas_equipamento_tenant_select" ON public.paradas_equipamento';
    EXECUTE $pol$
      CREATE POLICY "paradas_equipamento_tenant_select"
        ON public.paradas_equipamento
        FOR SELECT
        USING ( public.can_access_empresa(empresa_id) )
    $pol$;

    EXECUTE 'DROP POLICY IF EXISTS "paradas_equipamento_tenant_write" ON public.paradas_equipamento';
    EXECUTE $pol$
      CREATE POLICY "paradas_equipamento_tenant_write"
        ON public.paradas_equipamento
        FOR ALL
        USING ( public.can_access_empresa(empresa_id) )
        WITH CHECK ( public.can_access_empresa(empresa_id) )
    $pol$;

    EXECUTE 'DROP POLICY IF EXISTS "paradas_equipamento_service_role" ON public.paradas_equipamento';
    EXECUTE $pol$
      CREATE POLICY "paradas_equipamento_service_role"
        ON public.paradas_equipamento
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true)
    $pol$;

    RAISE NOTICE 'RLS aplicado em paradas_equipamento via can_access_empresa';
  END IF;
END $$;

-- requisicoes_material
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'requisicoes_material'
  ) THEN
    EXECUTE 'ALTER TABLE public.requisicoes_material ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.requisicoes_material FORCE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "requisicoes_material_tenant_select" ON public.requisicoes_material';
    EXECUTE $pol$
      CREATE POLICY "requisicoes_material_tenant_select"
        ON public.requisicoes_material
        FOR SELECT
        USING ( public.can_access_empresa(empresa_id) )
    $pol$;

    EXECUTE 'DROP POLICY IF EXISTS "requisicoes_material_tenant_write" ON public.requisicoes_material';
    EXECUTE $pol$
      CREATE POLICY "requisicoes_material_tenant_write"
        ON public.requisicoes_material
        FOR ALL
        USING ( public.can_access_empresa(empresa_id) )
        WITH CHECK ( public.can_access_empresa(empresa_id) )
    $pol$;

    EXECUTE 'DROP POLICY IF EXISTS "requisicoes_material_service_role" ON public.requisicoes_material';
    EXECUTE $pol$
      CREATE POLICY "requisicoes_material_service_role"
        ON public.requisicoes_material
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true)
    $pol$;

    RAISE NOTICE 'RLS aplicado em requisicoes_material via can_access_empresa';
  END IF;
END $$;

-- =============================================================================
-- RLS-FIX-03 — empresa_config: FORCE RLS e unicidade por empresa
-- =============================================================================

ALTER TABLE IF EXISTS public.empresa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.empresa_config FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresa_config_tenant_select" ON public.empresa_config;
CREATE POLICY "empresa_config_tenant_select"
  ON public.empresa_config
  FOR SELECT
  USING ( public.can_access_empresa(empresa_id) );

DROP POLICY IF EXISTS "empresa_config_tenant_write" ON public.empresa_config;
CREATE POLICY "empresa_config_tenant_write"
  ON public.empresa_config
  FOR ALL
  USING ( public.can_access_empresa(empresa_id) )
  WITH CHECK ( public.can_access_empresa(empresa_id) );

DROP POLICY IF EXISTS "empresa_config_service_role" ON public.empresa_config;
CREATE POLICY "empresa_config_service_role"
  ON public.empresa_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy pública de leitura para resolução de domínio (necessária para login por subdomínio)
DROP POLICY IF EXISTS "empresa_config_public_domain_lookup" ON public.empresa_config;
CREATE POLICY "empresa_config_public_domain_lookup"
  ON public.empresa_config
  FOR SELECT
  TO anon, authenticated
  USING ( dominio_custom IS NOT NULL );

-- Garantir unicidade: uma config por empresa
-- (somente se não há duplicatas existentes)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT empresa_id FROM public.empresa_config
    GROUP BY empresa_id HAVING count(*) > 1
  ) THEN
    BEGIN
      ALTER TABLE IF EXISTS public.empresa_config
        DROP CONSTRAINT IF EXISTS uk_empresa_config_empresa_id;
      ALTER TABLE IF EXISTS public.empresa_config
        ADD CONSTRAINT uk_empresa_config_empresa_id UNIQUE (empresa_id);
      RAISE NOTICE 'Constraint uk_empresa_config_empresa_id aplicado';
    EXCEPTION WHEN others THEN
      RAISE WARNING 'uk_empresa_config_empresa_id: %', SQLERRM;
    END;
  ELSE
    RAISE WARNING 'uk_empresa_config_empresa_id nao aplicado: existem empresa_ids duplicados';
  END IF;
END $$;

-- =============================================================================
-- DB-02 — Constraints de integridade
-- =============================================================================

-- 1. ordens_servico: status válido (somente se não há dados violando)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.ordens_servico
    WHERE status NOT IN ('ABERTA','EM_ANDAMENTO','AGUARDANDO','FECHADA','CANCELADA')
  ) THEN
    BEGIN
      ALTER TABLE public.ordens_servico
        DROP CONSTRAINT IF EXISTS chk_os_status;
      ALTER TABLE public.ordens_servico
        ADD CONSTRAINT chk_os_status
        CHECK (status IN ('ABERTA','EM_ANDAMENTO','AGUARDANDO','FECHADA','CANCELADA'));
      RAISE NOTICE 'Constraint chk_os_status criado com sucesso';
    EXCEPTION WHEN others THEN
      RAISE WARNING 'chk_os_status: %', SQLERRM;
    END;
  ELSE
    RAISE WARNING 'chk_os_status nao criado: existem registros com status fora do enum esperado';
  END IF;
END $$;

-- 2. avaliacoes_fornecedores: nota entre 1 e 10
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'avaliacoes_fornecedores'
  ) THEN
    EXECUTE $c$
      ALTER TABLE public.avaliacoes_fornecedores
        DROP CONSTRAINT IF EXISTS chk_avaliacao_nota
    $c$;
    EXECUTE $c$
      ALTER TABLE public.avaliacoes_fornecedores
        ADD CONSTRAINT chk_avaliacao_nota
        CHECK (nota IS NULL OR (nota >= 1 AND nota <= 10))
    $c$;
  END IF;
END $$;

-- 3. solicitacoes: prioridade normalizada
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'solicitacoes'
      AND column_name  = 'prioridade'
  ) THEN
    EXECUTE $c$
      ALTER TABLE public.solicitacoes
        DROP CONSTRAINT IF EXISTS solicitacoes_prioridade_check
    $c$;
    EXECUTE $c$
      ALTER TABLE public.solicitacoes
        ADD CONSTRAINT solicitacoes_prioridade_check
        CHECK (lower(prioridade) IN ('baixa','media','alta','urgente'))
    $c$;
  END IF;
END $$;

-- =============================================================================
-- DB-03 — Índices estratégicos (alta frequência)
-- =============================================================================

-- Resolução de tenant por domínio personalizado (every request)
CREATE INDEX IF NOT EXISTS idx_empresa_config_dominio_not_null
  ON public.empresa_config(dominio_custom)
  WHERE dominio_custom IS NOT NULL;

-- Listagem e backlog de OS
CREATE INDEX IF NOT EXISTS idx_os_backlog_sort
  ON public.ordens_servico(empresa_id, status, prioridade, data_solicitacao)
  WHERE status NOT IN ('FECHADA', 'CANCELADA');

-- Solicitações abertas por empresa
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'solicitacoes'
  ) THEN
    -- Adicionar coluna os_id se ausente (necessária para vínculo com ordens_servico)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'solicitacoes' AND column_name = 'os_id'
    ) THEN
      EXECUTE $a$
        ALTER TABLE public.solicitacoes
          ADD COLUMN os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL
      $a$;
      RAISE NOTICE 'Coluna os_id adicionada a public.solicitacoes';
    END IF;

    EXECUTE $i$
      CREATE INDEX IF NOT EXISTS idx_solicitacoes_empresa_abertas
        ON public.solicitacoes(empresa_id, status, created_at DESC)
        WHERE status NOT IN ('concluida','cancelada')
    $i$;

    EXECUTE $i$
      CREATE INDEX IF NOT EXISTS idx_solicitacoes_os_id
        ON public.solicitacoes(os_id)
        WHERE os_id IS NOT NULL
    $i$;
  END IF;
END $$;

-- Índice equivalente na tabela legada
CREATE INDEX IF NOT EXISTS idx_solicitacoes_manutencao_os_id
  ON public.solicitacoes_manutencao(os_id)
  WHERE os_id IS NOT NULL;

-- Execuções em andamento por mecânico
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'execucoes_os'
      AND column_name  = 'status'
  ) THEN
    EXECUTE $i$
      CREATE INDEX IF NOT EXISTS idx_execucoes_os_em_andamento
        ON public.execucoes_os(empresa_id, mecanico_id)
        WHERE status = 'em_andamento'
    $i$;
  END IF;
END $$;

-- Dispositivos por empresa e status
CREATE INDEX IF NOT EXISTS idx_dispositivos_empresa_status
  ON public.dispositivos_moveis(empresa_id, status);

-- Support tickets abertos
DROP INDEX IF EXISTS idx_support_tickets_empresa_status;
CREATE INDEX IF NOT EXISTS idx_support_tickets_empresa_status
  ON public.support_tickets(empresa_id, status, created_at DESC)
  WHERE status != 'fechado';

-- Planos preventivos ativos para scheduling
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'planos_preventivos'
      AND column_name  = 'proxima_execucao'
  ) THEN
    EXECUTE $i$
      CREATE INDEX IF NOT EXISTS idx_planos_preventivos_ativos
        ON public.planos_preventivos(empresa_id, proxima_execucao)
        WHERE ativo = true
    $i$;
  END IF;
END $$;

-- Treinamentos SSMA próximos do vencimento
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'treinamentos_ssma'
  ) THEN
    EXECUTE $i$
      CREATE INDEX IF NOT EXISTS idx_treinamentos_alerta
        ON public.treinamentos_ssma(empresa_id, data_validade, status)
        WHERE data_validade IS NOT NULL AND status != 'VENCIDO'
    $i$;
  END IF;
END $$;

-- =============================================================================
-- DB-04 — Garantias de unicidade adicionais
-- =============================================================================

-- document_sequences: um sequenciador por tipo por empresa
ALTER TABLE IF EXISTS public.document_sequences
  DROP CONSTRAINT IF EXISTS uk_document_sequences_empresa_tipo;
ALTER TABLE IF EXISTS public.document_sequences
  ADD CONSTRAINT uk_document_sequences_empresa_tipo
  UNIQUE (empresa_id, tipo_documento);

-- =============================================================================
-- SMOKE TEST
-- =============================================================================

DO $$
DECLARE
  v_count INT;
BEGIN
  -- Verificar que FORCE RLS está ativo nas tabelas críticas
  SELECT count(*) INTO v_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relforcerowsecurity = true
    AND c.relname IN ('contracts','contract_versions','empresa_config');

  IF v_count < 3 THEN
    RAISE EXCEPTION 'SMOKE FAIL: FORCE RLS não aplicado em todas as tabelas críticas (esperado 3, encontrado %)', v_count;
  END IF;

  -- Verificar que senha_acesso foi nullificada
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'mecanicos'
      AND column_name  = 'senha_acesso'
  ) THEN
    SELECT count(*) INTO v_count
    FROM public.mecanicos
    WHERE senha_acesso IS NOT NULL;

    IF v_count > 0 THEN
      RAISE EXCEPTION 'SMOKE FAIL: % registros de mecanicos ainda com senha_acesso preenchida', v_count;
    END IF;
  END IF;

  RAISE NOTICE '✅ Migration 20260411200000 — smoke tests passed';
END $$;

COMMIT;
