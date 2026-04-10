-- ============================================================================
-- MIGRATION: Correção de Lacunas do Schema - Auditoria 10/04/2026
-- Propósito: Criar tabela `solicitacoes` ausente e garantir completude
-- ============================================================================

-- ============================================================================
-- 1. TABELA CRÍTICA FALTANTE: solicitacoes
-- Referenciada em: src/hooks/useOfflineSync.ts:49
-- Problema: .from('solicitacoes').insert() FALHA em produção
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  numero_solicitacao text,
  tipo text DEFAULT 'corretiva',
  descricao text,
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  solicitante text,
  prioridade text DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta','urgente')),
  status text DEFAULT 'aberta' CHECK (status IN ('aberta','em_analise','aprovada','recusada','concluida','cancelada')),
  data_solicitacao timestamptz DEFAULT now(),
  data_conclusao timestamptz,
  observacoes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_solicitacoes_empresa_id ON public.solicitacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON public.solicitacoes(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_data ON public.solicitacoes(data_solicitacao DESC);

-- RLS
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'solicitacoes' AND policyname = 'solicitacoes_tenant_isolation'
  ) THEN
    CREATE POLICY solicitacoes_tenant_isolation ON public.solicitacoes
      FOR ALL
      USING (public.can_access_empresa(empresa_id))
      WITH CHECK (public.can_access_empresa(empresa_id));
  END IF;
END $$;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes TO authenticated;
GRANT SELECT ON public.solicitacoes TO anon;

-- Trigger updated_at
CREATE OR REPLACE TRIGGER solicitacoes_updated_at
  BEFORE UPDATE ON public.solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 2. VERIFICAÇÃO DE INTEGRIDADE: Views referenciadas pelo código
-- Garantir que todas as views existem
-- ============================================================================

-- 2.1 v_dashboard_kpis (já deve existir via 20260323100000)
-- Verificação: se não existir, cria uma versão mínima
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_dashboard_kpis') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW public.v_dashboard_kpis AS
      SELECT
        e.id AS empresa_id,
        (SELECT count(*) FROM ordens_servico os WHERE os.empresa_id = e.id) AS total_os,
        (SELECT count(*) FROM ordens_servico os WHERE os.empresa_id = e.id AND os.status = ''aberta'') AS os_abertas,
        (SELECT count(*) FROM ordens_servico os WHERE os.empresa_id = e.id AND os.status = ''fechada'') AS os_fechadas,
        (SELECT count(*) FROM equipamentos eq WHERE eq.empresa_id = e.id AND eq.ativo = true) AS total_equipamentos,
        (SELECT count(*) FROM mecanicos m WHERE m.empresa_id = e.id AND m.ativo = true) AS total_mecanicos
      FROM empresas e
      WHERE e.status = ''ativo''
    ';
  END IF;
END $$;

-- 2.2 v_audit_logs_recent (já deve existir via 20260402120000)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_audit_logs_recent') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW public.v_audit_logs_recent AS
      SELECT * FROM enterprise_audit_logs
      ORDER BY created_at DESC
      LIMIT 500
    ';
  END IF;
END $$;

-- 2.3 v_mecanicos_online_agora (já deve existir via 20260401000000)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_mecanicos_online_agora') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW public.v_mecanicos_online_agora AS
      SELECT
        l.id AS session_id,
        l.mecanico_id,
        m.nome AS mecanico_nome,
        l.empresa_id,
        l.ip_address,
        l.user_agent,
        l.device_name,
        l.login_em
      FROM log_mecanicos_login l
      JOIN mecanicos m ON m.id = l.mecanico_id
      WHERE l.logout_em IS NULL
        AND l.login_em > now() - interval ''24 hours''
    ';
  END IF;
END $$;

-- 2.4 v_relatorio_mecanicos_sessoes (já deve existir via 20260401000000)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_relatorio_mecanicos_sessoes') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW public.v_relatorio_mecanicos_sessoes AS
      SELECT
        l.id AS session_id,
        l.mecanico_id,
        m.nome AS mecanico_nome,
        l.empresa_id,
        l.login_em,
        l.logout_em,
        l.motivo_logout,
        EXTRACT(EPOCH FROM (COALESCE(l.logout_em, now()) - l.login_em)) / 60 AS duracao_minutos
      FROM log_mecanicos_login l
      JOIN mecanicos m ON m.id = l.mecanico_id
    ';
  END IF;
END $$;

-- 2.5 v_devices_bloqueados (já deve existir via 20260401100000)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_devices_bloqueados') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW public.v_devices_bloqueados AS
      SELECT
        d.id AS dispositivo_id,
        d.empresa_id,
        d.device_name,
        d.status,
        d.bloqueado_em,
        d.motivo_bloqueio
      FROM dispositivos_moveis d
      WHERE d.status = ''bloqueado''
    ';
  END IF;
END $$;

-- Grants para views
GRANT SELECT ON public.v_dashboard_kpis TO authenticated;
GRANT SELECT ON public.v_audit_logs_recent TO authenticated;
GRANT SELECT ON public.v_mecanicos_online_agora TO authenticated;
GRANT SELECT ON public.v_relatorio_mecanicos_sessoes TO authenticated;
GRANT SELECT ON public.v_devices_bloqueados TO authenticated;

-- ============================================================================
-- 3. VERIFICAÇÃO DE TABELAS BACKEND-ONLY (garantir existência)
-- ============================================================================

-- 3.1 log_mecanicos_login (usada pelas RPCs e views)
CREATE TABLE IF NOT EXISTS public.log_mecanicos_login (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  mecanico_id uuid NOT NULL REFERENCES public.mecanicos(id) ON DELETE CASCADE,
  dispositivo_id uuid REFERENCES public.dispositivos_moveis(id),
  ip_address text,
  user_agent text,
  device_name text,
  login_em timestamptz DEFAULT now() NOT NULL,
  logout_em timestamptz,
  motivo_logout text,
  device_token text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_log_mecanicos_login_empresa ON public.log_mecanicos_login(empresa_id);
CREATE INDEX IF NOT EXISTS idx_log_mecanicos_login_mecanico ON public.log_mecanicos_login(mecanico_id);
CREATE INDEX IF NOT EXISTS idx_log_mecanicos_login_active ON public.log_mecanicos_login(empresa_id, logout_em DESC NULLS FIRST);

ALTER TABLE public.log_mecanicos_login ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_mecanicos_login FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'log_mecanicos_login' AND policyname = 'log_mecanicos_login_tenant'
  ) THEN
    CREATE POLICY log_mecanicos_login_tenant ON public.log_mecanicos_login
      FOR ALL
      USING (public.can_access_empresa(empresa_id))
      WITH CHECK (public.can_access_empresa(empresa_id));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.log_mecanicos_login TO authenticated;
GRANT INSERT ON public.log_mecanicos_login TO anon;

-- 3.2 operational_logs
CREATE TABLE IF NOT EXISTS public.operational_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  level text DEFAULT 'info',
  source text,
  message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.operational_logs ENABLE ROW LEVEL SECURITY;

-- 3.3 login_attempts (rate limiting)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  ip_address text,
  success boolean DEFAULT false,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- 3.4 platform_metrics
CREATE TABLE IF NOT EXISTS public.platform_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id),
  metric_name text NOT NULL,
  metric_value numeric,
  metadata jsonb DEFAULT '{}',
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. VERIFICAÇÃO FINAL: Smoke test
-- ============================================================================

DO $$
DECLARE
  v_missing text[] := '{}';
  v_table text;
  v_tables text[] := ARRAY[
    'acoes_corretivas','analise_causa_raiz','anomalias_inspecao','areas',
    'atividades_lubrificacao','atividades_preventivas','audit_logs',
    'avaliacoes_fornecedores','componentes_equipamento','configuracoes_sistema',
    'contratos','dados_empresa','document_layouts','document_sequences',
    'documentos_tecnicos','empresas','enterprise_audit_logs','equipamentos',
    'execucoes_lubrificacao','execucoes_os','execucoes_preventivas','fmea',
    'fornecedores','incidentes_ssma','inspecoes','maintenance_schedule',
    'materiais','materiais_os','mecanicos','medicoes_preditivas','melhorias',
    'movimentacoes_materiais','ordens_servico','permissoes_granulares',
    'permissoes_trabalho','planos_lubrificacao','planos_preventivos','plantas',
    'profiles','rate_limits','security_logs','servicos_preventivos','sistemas',
    'templates_preventivos','user_roles',
    -- Tabelas adicionais referenciadas pelo código
    'ai_root_cause_analysis','app_versao','empresa_config','lubrificantes',
    'movimentacoes_lubrificante','qrcodes_vinculacao','requisicoes_material',
    'paradas_equipamento','solicitacoes_manutencao','rotas_lubrificacao',
    'rotas_lubrificacao_pontos','treinamentos_ssma','support_tickets',
    'dispositivos_moveis','solicitacoes','log_mecanicos_login',
    -- Tabelas backend
    'subscriptions','subscription_payments','operational_logs','login_attempts',
    'platform_metrics'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table
    ) THEN
      v_missing := array_append(v_missing, v_table);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE WARNING '[AUDITORIA] Tabelas ainda faltantes: %', array_to_string(v_missing, ', ');
  ELSE
    RAISE NOTICE '[AUDITORIA] ✅ Todas as 66 tabelas verificadas existem no schema public.';
  END IF;
END $$;

-- Verificação de views
DO $$
DECLARE
  v_missing_views text[] := '{}';
  v_view text;
  v_views text[] := ARRAY[
    'v_dashboard_kpis','v_audit_logs_recent','v_mecanicos_online_agora',
    'v_relatorio_mecanicos_sessoes','v_devices_bloqueados'
  ];
BEGIN
  FOREACH v_view IN ARRAY v_views
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_schema = 'public' AND table_name = v_view
    ) THEN
      v_missing_views := array_append(v_missing_views, v_view);
    END IF;
  END LOOP;

  IF array_length(v_missing_views, 1) > 0 THEN
    RAISE WARNING '[AUDITORIA] Views ainda faltantes: %', array_to_string(v_missing_views, ', ');
  ELSE
    RAISE NOTICE '[AUDITORIA] ✅ Todas as 5 views verificadas existem.';
  END IF;
END $$;

-- ============================================================================
-- FIM DA MIGRATION DE AUDITORIA
-- ============================================================================
