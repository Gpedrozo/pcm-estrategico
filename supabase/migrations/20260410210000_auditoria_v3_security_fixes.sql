-- ============================================================================
-- MIGRATION: Correções de Segurança — Auditoria Extrema V3 (10/04/2026)
-- Propósito: Corrigir vulnerabilidades CRÍTICAS encontradas na auditoria
-- VULN-EF-02, VULN-EF-06, VULN-EF-14, Schema Gaps, Billing Enforcement
-- ============================================================================

-- ============================================================================
-- 1. TABELA CRÍTICA FALTANTE: solicitacoes
-- (VULN-OFF / useOfflineSync.ts:49 → .from('solicitacoes').insert() FALHA)
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

CREATE INDEX IF NOT EXISTS idx_solicitacoes_empresa_id ON public.solicitacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON public.solicitacoes(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_data ON public.solicitacoes(data_solicitacao DESC);

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes TO authenticated;

CREATE OR REPLACE TRIGGER solicitacoes_updated_at
  BEFORE UPDATE ON public.solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================================
-- 2. TABELA: webhook_events — Idempotency para Asaas/Stripe (VULN-EF-14)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('asaas','stripe')),
  event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}',
  processed_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT uk_webhook_event UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON public.webhook_events(provider, event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON public.webhook_events(processed_at DESC);

-- RLS: apenas service_role deve inserir
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE public.webhook_events IS
  'Idempotency table for webhook dedup. VULN-EF-14: sem isto, replay attacks são possíveis.';


-- ============================================================================
-- 3. HASH DE SENHAS DE MECÂNICOS (VULN-EF-06)
-- Migração: cria coluna hash e função de verificação
-- ============================================================================

-- Coluna para armazenar hash bcrypt (função nativa do Postgres via pgcrypto)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mecanicos' AND column_name = 'senha_hash'
  ) THEN
    ALTER TABLE public.mecanicos ADD COLUMN senha_hash text;
  END IF;
END $$;

-- Habilitar pgcrypto para bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Migrar senhas existentes para hash (one-time)
UPDATE public.mecanicos
SET senha_hash = crypt(senha_acesso, gen_salt('bf', 10))
WHERE senha_acesso IS NOT NULL
  AND senha_acesso != ''
  AND (senha_hash IS NULL OR senha_hash = '');

-- Função para validar senha com hash (substituir comparação plaintext)
CREATE OR REPLACE FUNCTION public.verificar_senha_mecanico(
  p_mecanico_id uuid,
  p_senha text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT senha_hash INTO v_hash
  FROM mecanicos
  WHERE id = p_mecanico_id AND ativo = true;

  IF v_hash IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_hash = crypt(p_senha, v_hash);
END;
$$;

REVOKE ALL ON FUNCTION public.verificar_senha_mecanico FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verificar_senha_mecanico TO authenticated;
GRANT EXECUTE ON FUNCTION public.verificar_senha_mecanico TO anon;

COMMENT ON FUNCTION public.verificar_senha_mecanico IS
  'VULN-EF-06: Substituir comparação plaintext por bcrypt. Usar no mecanico-device-auth.';


-- ============================================================================
-- 4. RATE LIMITING PARA VALIDAÇÃO DE SENHA DE MECÂNICO (VULN-EF-05/06)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mecanico_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mecanico_id uuid REFERENCES public.mecanicos(id) ON DELETE CASCADE,
  device_id text,
  ip_address text,
  success boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mec_login_attempts_recent
  ON public.mecanico_login_attempts(mecanico_id, created_at DESC);

ALTER TABLE public.mecanico_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mecanico_login_attempts FORCE ROW LEVEL SECURITY;

-- Função: verificar rate limit (5 tentativas / 5 min)
CREATE OR REPLACE FUNCTION public.check_mecanico_rate_limit(
  p_mecanico_id uuid,
  p_window_minutes int DEFAULT 5,
  p_max_attempts int DEFAULT 5
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM mecanico_login_attempts
  WHERE mecanico_id = p_mecanico_id
    AND success = false
    AND created_at > now() - (p_window_minutes || ' minutes')::interval;

  RETURN v_count < p_max_attempts;
END;
$$;


-- ============================================================================
-- 5. QR CODE BIND ATÔMICO (VULN-EF-02 — Race Condition)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.qr_bind_device_atomic(
  p_qr_token text,
  p_device_id text,
  p_device_name text DEFAULT NULL,
  p_empresa_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr record;
  v_max_usos int;
BEGIN
  -- SELECT FOR UPDATE previne race condition
  SELECT * INTO v_qr
  FROM qrcodes_vinculacao
  WHERE token = p_qr_token AND ativo = true
  FOR UPDATE SKIP LOCKED;

  IF v_qr IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'QR code inválido ou em uso');
  END IF;

  -- Definir limite
  v_max_usos := CASE
    WHEN v_qr.tipo = 'UNICO' THEN 1
    WHEN v_qr.max_usos IS NOT NULL THEN v_qr.max_usos
    ELSE 999999
  END;

  IF v_qr.usos >= v_max_usos THEN
    RETURN jsonb_build_object('ok', false, 'error', 'QR code atingiu limite de usos');
  END IF;

  -- Verificar expiração
  IF v_qr.expira_em IS NOT NULL AND v_qr.expira_em < now() THEN
    UPDATE qrcodes_vinculacao SET ativo = false WHERE id = v_qr.id;
    RETURN jsonb_build_object('ok', false, 'error', 'QR code expirado');
  END IF;

  -- Incrementar usos ATOMICAMENTE
  UPDATE qrcodes_vinculacao
  SET usos = usos + 1,
      ativo = CASE WHEN (usos + 1) >= v_max_usos THEN false ELSE true END
  WHERE id = v_qr.id;

  RETURN jsonb_build_object(
    'ok', true,
    'empresa_id', v_qr.empresa_id,
    'qr_id', v_qr.id,
    'tipo', v_qr.tipo
  );
END;
$$;

REVOKE ALL ON FUNCTION public.qr_bind_device_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qr_bind_device_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.qr_bind_device_atomic TO anon;

COMMENT ON FUNCTION public.qr_bind_device_atomic IS
  'VULN-EF-02 FIX: SELECT FOR UPDATE previne race condition em QR codes de uso único.';


-- ============================================================================
-- 6. RLS ENFORCEMENT PARA SUBSCRIPTION EXPIRY (BILLING)
-- ============================================================================

-- Função: verificar se tenant tem subscription ativa
CREATE OR REPLACE FUNCTION public.is_subscription_active(p_empresa_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_active boolean;
BEGIN
  -- Verificar na tabela subscriptions (se existir)
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE empresa_id = p_empresa_id
      AND status IN ('active', 'trialing')
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_active;

  -- Se não encontrou subscription, verificar company_subscriptions
  IF NOT v_active THEN
    SELECT EXISTS (
      SELECT 1 FROM company_subscriptions
      WHERE empresa_id = p_empresa_id
        AND status IN ('active', 'trialing')
        AND (current_period_end IS NULL OR current_period_end > now())
    ) INTO v_active;
  END IF;

  RETURN v_active;
EXCEPTION WHEN undefined_table THEN
  -- Tabela não existe = sem controle de subscription = permitir
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.is_subscription_active IS
  'Billing enforcement via RLS. Verificar antes de INSERT em tabelas críticas.';


-- ============================================================================
-- 7. VERIFICAÇÃO DE INTEGRIDADE: Views
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_dashboard_kpis') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW public.v_dashboard_kpis AS
      SELECT e.id AS empresa_id,
        (SELECT count(*) FROM ordens_servico os WHERE os.empresa_id = e.id) AS total_os,
        (SELECT count(*) FROM ordens_servico os WHERE os.empresa_id = e.id AND os.status = ''aberta'') AS os_abertas,
        (SELECT count(*) FROM ordens_servico os WHERE os.empresa_id = e.id AND os.status = ''fechada'') AS os_fechadas,
        (SELECT count(*) FROM equipamentos eq WHERE eq.empresa_id = e.id AND eq.ativo = true) AS total_equipamentos,
        (SELECT count(*) FROM mecanicos m WHERE m.empresa_id = e.id AND m.ativo = true) AS total_mecanicos
      FROM empresas e WHERE e.status = ''ativo''
    ';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_audit_logs_recent') THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.v_audit_logs_recent AS
      SELECT * FROM enterprise_audit_logs ORDER BY created_at DESC LIMIT 500';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_mecanicos_online_agora') THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.v_mecanicos_online_agora AS
      SELECT l.id AS session_id, l.mecanico_id, m.nome AS mecanico_nome,
        l.empresa_id, l.ip_address, l.user_agent, l.device_name, l.login_em
      FROM log_mecanicos_login l JOIN mecanicos m ON m.id = l.mecanico_id
      WHERE l.logout_em IS NULL AND l.login_em > now() - interval ''24 hours''';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_relatorio_mecanicos_sessoes') THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.v_relatorio_mecanicos_sessoes AS
      SELECT l.id AS session_id, l.mecanico_id, m.nome AS mecanico_nome,
        l.empresa_id, l.login_em, l.logout_em, l.motivo_logout,
        EXTRACT(EPOCH FROM (COALESCE(l.logout_em, now()) - l.login_em)) / 60 AS duracao_minutos
      FROM log_mecanicos_login l JOIN mecanicos m ON m.id = l.mecanico_id';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_devices_bloqueados') THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.v_devices_bloqueados AS
      SELECT d.id AS dispositivo_id, d.empresa_id, d.device_name,
        d.status, d.bloqueado_em, d.motivo_bloqueio
      FROM dispositivos_moveis d WHERE d.status = ''bloqueado''';
  END IF;
END $$;

GRANT SELECT ON public.v_dashboard_kpis TO authenticated;
GRANT SELECT ON public.v_audit_logs_recent TO authenticated;
GRANT SELECT ON public.v_mecanicos_online_agora TO authenticated;
GRANT SELECT ON public.v_relatorio_mecanicos_sessoes TO authenticated;
GRANT SELECT ON public.v_devices_bloqueados TO authenticated;


-- ============================================================================
-- 8. TABELAS BACKEND-ONLY (garantir existência)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.log_mecanicos_login (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  mecanico_id uuid NOT NULL REFERENCES public.mecanicos(id) ON DELETE CASCADE,
  dispositivo_id uuid,
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
      FOR ALL USING (public.can_access_empresa(empresa_id))
      WITH CHECK (public.can_access_empresa(empresa_id));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.log_mecanicos_login TO authenticated;
GRANT INSERT ON public.log_mecanicos_login TO anon;

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

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  ip_address text,
  success boolean DEFAULT false,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

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
-- 9. SMOKE TEST FINAL
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
    'ai_root_cause_analysis','app_versao','empresa_config','lubrificantes',
    'movimentacoes_lubrificante','qrcodes_vinculacao','requisicoes_material',
    'paradas_equipamento','solicitacoes_manutencao','rotas_lubrificacao',
    'rotas_lubrificacao_pontos','treinamentos_ssma','support_tickets',
    'dispositivos_moveis','solicitacoes','log_mecanicos_login',
    'subscriptions','subscription_payments','operational_logs','login_attempts',
    'platform_metrics','webhook_events','mecanico_login_attempts'
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
    RAISE WARNING '[AUDITORIA V3] Tabelas faltantes: %', array_to_string(v_missing, ', ');
  ELSE
    RAISE NOTICE '[AUDITORIA V3] ✅ Todas as 68 tabelas verificadas existem.';
  END IF;
END $$;

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
    RAISE WARNING '[AUDITORIA V3] Views faltantes: %', array_to_string(v_missing_views, ', ');
  ELSE
    RAISE NOTICE '[AUDITORIA V3] ✅ Todas as 5 views verificadas existem.';
  END IF;
END $$;

DO $$
DECLARE
  v_funcs text[] := ARRAY[
    'verificar_senha_mecanico','check_mecanico_rate_limit',
    'qr_bind_device_atomic','is_subscription_active'
  ];
  v_func text;
  v_missing text[] := '{}';
BEGIN
  FOREACH v_func IN ARRAY v_funcs
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_name = v_func
    ) THEN
      v_missing := array_append(v_missing, v_func);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE WARNING '[AUDITORIA V3] Funções faltantes: %', array_to_string(v_missing, ', ');
  ELSE
    RAISE NOTICE '[AUDITORIA V3] ✅ Todas as 4 funções de segurança criadas.';
  END IF;
END $$;

-- ============================================================================
-- FIM — Auditoria Extrema V3 — Correção de Schema + Segurança
-- ============================================================================
