<<<<<<< HEAD
-- =============================================================================
-- MIGRATION: Criação de todas as tabelas faltantes no schema public
-- Data: 2026-03-23
-- Descrição: Cria tabelas referenciadas pelo frontend e edge functions 
--            que ainda não existem no banco de dados.
-- Ordem: Respeita dependências de FK (tabelas-pai primeiro)
-- =============================================================================
=======
BEGIN;
>>>>>>> 1f995f32433f8675a9c7838b44570da06aa6247c

<<<<<<< HEAD
BEGIN;

-- ===================== NÍVEL 0: Tabelas sem FK para outras tabelas faltantes =====================

-- PLANOS (planos de manutenção legado - português)
CREATE TABLE IF NOT EXISTS public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  limite_usuarios integer NOT NULL DEFAULT 5,
  limite_os_mes integer NOT NULL DEFAULT 200,
  limite_ativos integer NOT NULL DEFAULT 500,
  limite_storage_mb integer NOT NULL DEFAULT 1024,
  max_users integer,
  max_companies integer,
  max_storage bigint,
  max_orders_per_month integer,
  user_limit integer NOT NULL DEFAULT 10,
  asset_limit integer NOT NULL DEFAULT 1000,
  os_limit integer NOT NULL DEFAULT 2000,
  storage_limit_mb integer NOT NULL DEFAULT 2048,
  price_month numeric(12,2) NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  features_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- PLANS (planos SaaS Owner Portal - inglês)
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  user_limit integer NOT NULL DEFAULT 10,
  module_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_limit_mb integer NOT NULL DEFAULT 2048,
  premium_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  company_limit integer,
  price_month numeric(12,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- AREAS
CREATE TABLE IF NOT EXISTS public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  planta_id uuid NOT NULL REFERENCES public.plantas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, planta_id, codigo)
);

-- FORNECEDORES
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- MATERIAIS
CREATE TABLE IF NOT EXISTS public.materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  unidade text,
  estoque_atual numeric(14,4) DEFAULT 0,
  estoque_minimo numeric(14,4) DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

-- AUDITORIA
CREATE TABLE IF NOT EXISTS public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid,
  usuario_nome text NOT NULL,
  acao text NOT NULL,
  descricao text NOT NULL,
  tag text,
  data_hora timestamptz NOT NULL DEFAULT now()
);

-- PLATFORM_METRICS
CREATE TABLE IF NOT EXISTS public.platform_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL,
  empresas_ativas integer NOT NULL DEFAULT 0,
  usuarios_ativos integer NOT NULL DEFAULT 0,
  os_abertas integer NOT NULL DEFAULT 0,
  os_fechadas integer NOT NULL DEFAULT 0,
  mtbf_horas numeric(14,4),
  mttr_horas numeric(14,4),
  disponibilidade_pct numeric(8,4),
  backlog_horas numeric(14,2),
  cumprimento_plano_pct numeric(8,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (metric_date)
);

-- SYSTEM_OWNER_ALLOWLIST
CREATE TABLE IF NOT EXISTS public.system_owner_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ENTERPRISE_AUDIT_LOGS
CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  operation text NOT NULL,
  record_id text,
  actor_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- OPERATIONAL_LOGS
CREATE TABLE IF NOT EXISTS public.operational_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  user_id uuid,
  scope text NOT NULL,
  action text,
  endpoint text,
  status_code integer,
  duration_ms integer,
  request_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- SYSTEM_ERROR_EVENTS
CREATE TABLE IF NOT EXISTS public.system_error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  user_id uuid,
  request_id text,
  endpoint text,
  source text NOT NULL DEFAULT 'edge',
  error_name text,
  error_message text NOT NULL,
  stack_trace text,
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- IP_RATE_LIMITS
CREATE TABLE IF NOT EXISTS public.ip_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  ip_address text NOT NULL,
  identifier text NOT NULL DEFAULT '*',
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  last_request_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, ip_address, identifier, window_start)
);

-- LOGIN_ATTEMPTS
CREATE TABLE IF NOT EXISTS public.login_attempts (
  email text NOT NULL,
  ip_address text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (email, ip_address)
);

-- SAAS_METRICS_DAILY
CREATE TABLE IF NOT EXISTS public.saas_metrics_daily (
  metric_date date PRIMARY KEY,
  empresas_ativas integer NOT NULL DEFAULT 0,
  usuarios_ativos integer NOT NULL DEFAULT 0,
  ordens_criadas integer NOT NULL DEFAULT 0,
  execucoes_realizadas integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- FEATURE_FLAGS
CREATE TABLE IF NOT EXISTS public.feature_flags (
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, feature_key)
);

-- TEMPLATES_PREVENTIVOS
CREATE TABLE IF NOT EXISTS public.templates_preventivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  estrutura jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- DOCUMENT_LAYOUTS
CREATE TABLE IF NOT EXISTS public.document_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo_documento text NOT NULL,
  versao text NOT NULL,
  nome text,
  configuracao jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- DOCUMENTOS_TECNICOS
CREATE TABLE IF NOT EXISTS public.documentos_tecnicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  tipo text,
  arquivo_url text,
  revisao text,
  status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- MEDICOES_PREDITIVAS
CREATE TABLE IF NOT EXISTS public.medicoes_preditivas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  tag text,
  tipo_medicao text,
  valor numeric(14,4),
  limite_alerta numeric(14,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- MELHORIAS
CREATE TABLE IF NOT EXISTS public.melhorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- COMPONENTES_EQUIPAMENTO
CREATE TABLE IF NOT EXISTS public.componentes_equipamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  criticidade text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- FMEA
CREATE TABLE IF NOT EXISTS public.fmea (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- PERMISSOES_TRABALHO
CREATE TABLE IF NOT EXISTS public.permissoes_trabalho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- PERMISSOES_GRANULARES
CREATE TABLE IF NOT EXISTS public.permissoes_granulares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  modulo text NOT NULL,
  visualizar boolean,
  criar boolean,
  editar boolean,
  excluir boolean,
  alterar_status boolean,
  imprimir boolean,
  exportar boolean,
  importar boolean,
  acessar_indicadores boolean,
  acessar_historico boolean,
  ver_valores boolean,
  ver_custos boolean,
  ver_criticidade boolean,
  ver_status boolean,
  ver_obs_internas boolean,
  ver_dados_financeiros boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, user_id, modulo)
);

-- SUPPORT_TICKETS
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  requester_user_id uuid,
  user_id uuid,
  owner_responder_id uuid,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  subject text NOT NULL,
  message text NOT NULL,
  owner_notes text,
  owner_response text,
  assigned_to uuid,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  unread_owner_messages integer NOT NULL DEFAULT 0,
  unread_client_messages integer NOT NULL DEFAULT 0,
  notification_email_pending boolean NOT NULL DEFAULT false,
  notification_whatsapp_pending boolean NOT NULL DEFAULT false,
  last_message_sender text,
  last_message_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_tickets_last_message_sender_check CHECK (last_message_sender IS NULL OR last_message_sender IN ('client', 'owner', 'system'))
);

-- MAINTENANCE_SCHEDULE
CREATE TABLE IF NOT EXISTS public.maintenance_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('preventiva', 'lubrificacao', 'inspecao', 'preditiva')),
  origem_id uuid NOT NULL,
  equipamento_id uuid,
  titulo text NOT NULL,
  descricao text,
  data_programada timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'programado',
  responsavel text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- INDICADORES_KPI
CREATE TABLE IF NOT EXISTS public.indicadores_kpi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  referencia date NOT NULL,
  mtbf_horas numeric(14,4),
  mttr_horas numeric(14,4),
  disponibilidade_pct numeric(8,4),
  backlog_horas numeric(14,2),
  cumprimento_plano_pct numeric(8,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, referencia)
);

-- PERMISSOES (tabela de permissões RBAC)
CREATE TABLE IF NOT EXISTS public.permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  descricao text,
  escopo text NOT NULL DEFAULT 'tenant' CHECK (escopo IN ('global', 'tenant')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- MEMBROS_EMPRESA
CREATE TABLE IF NOT EXISTS public.membros_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','inactive','blocked')),
  cargo text,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, user_id)
);

-- BILLING_CUSTOMERS
CREATE TABLE IF NOT EXISTS public.billing_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  gateway_customer_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'delinquent', 'blocked', 'canceled')),
  gateway_provider text NOT NULL DEFAULT 'manual',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- AUTH_SESSION_TRANSFER_TOKENS
CREATE TABLE IF NOT EXISTS public.auth_session_transfer_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  target_host text,
  created_by uuid,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===================== NÍVEL 1: Dependem de tabelas do nível 0 =====================

-- SISTEMAS (depende de areas)
CREATE TABLE IF NOT EXISTS public.sistemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  funcao_principal text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, area_id, codigo)
);

-- CONTRATOS (depende de fornecedores)
CREATE TABLE IF NOT EXISTS public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- MATERIAIS_OS (depende de materiais, ordens_servico)
CREATE TABLE IF NOT EXISTS public.materiais_os (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  quantidade numeric(14,4) NOT NULL DEFAULT 0,
  custo_unitario numeric(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- MOVIMENTACOES_MATERIAIS (depende de materiais, ordens_servico)
CREATE TABLE IF NOT EXISTS public.movimentacoes_materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  tipo_movimentacao text NOT NULL,
  quantidade numeric(14,4) NOT NULL,
  custo_unitario numeric(12,2),
  usuario_id uuid,
  usuario_nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ASSINATURAS (depende de planos)
CREATE TABLE IF NOT EXISTS public.assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES public.planos(id),
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','canceled','suspended')),
  inicio_em timestamptz NOT NULL DEFAULT now(),
  fim_em timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  limites jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id)
);

-- SUBSCRIPTIONS (depende de planos)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.planos(id),
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'suspended')),
  renewal_at timestamptz,
  trial_ends_at timestamptz,
  payment_status text,
  stripe_customer_id text,
  stripe_subscription_id text,
  period text,
  starts_at date,
  ends_at date,
  amount numeric(14,2),
  billing_provider text NOT NULL DEFAULT 'manual',
  asaas_customer_id text,
  asaas_subscription_id text,
  asaas_last_event_at timestamptz,
  billing_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id),
  CONSTRAINT subscriptions_billing_provider_check CHECK (billing_provider IN ('manual', 'stripe', 'asaas'))
);

-- COMPANY_SUBSCRIPTIONS (depende de plans)
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'past_due', 'canceled', 'suspended')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'custom')),
  renewal_date date,
  starts_at date NOT NULL DEFAULT CURRENT_DATE,
  ends_at date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- COMPANY_USAGE_METRICS
CREATE TABLE IF NOT EXISTS public.company_usage_metrics (
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  metric_month date NOT NULL,
  users_count integer NOT NULL DEFAULT 0,
  orders_created integer NOT NULL DEFAULT 0,
  storage_used bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, metric_month)
);

-- ROLE_PERMISSIONS (depende de permissoes)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permissao_codigo text NOT NULL REFERENCES public.permissoes(codigo) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permissao_codigo)
);

-- PLANOS_PREVENTIVOS (depende de equipamentos)
CREATE TABLE IF NOT EXISTS public.planos_preventivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  tag text,
  tipo_gatilho text,
  frequencia_dias integer,
  frequencia_ciclos integer,
  condicao_disparo text,
  ultima_execucao timestamptz,
  proxima_execucao timestamptz,
  tempo_estimado_min integer,
  especialidade text,
  instrucoes text,
  checklist jsonb DEFAULT '[]'::jsonb,
  materiais_previstos jsonb DEFAULT '[]'::jsonb,
  responsavel_nome text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

-- ANALISE_CAUSA_RAIZ
CREATE TABLE IF NOT EXISTS public.analise_causa_raiz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- INSPECOES (depende de equipamentos, profiles)
CREATE TABLE IF NOT EXISTS public.inspecoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  inspetor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  descricao text,
  data_inspecao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- EXECUCOES_OS (depende de ordens_servico, mecanicos)
CREATE TABLE IF NOT EXISTS public.execucoes_os (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  mecanico_id uuid REFERENCES public.mecanicos(id),
  mecanico_nome text,
  hora_inicio time,
  hora_fim time,
  tempo_execucao integer,
  tempo_execucao_bruto integer,
  tempo_pausas integer NOT NULL DEFAULT 0,
  tempo_execucao_liquido integer,
  servico_executado text,
  custo_mao_obra numeric(12,2) DEFAULT 0,
  custo_materiais numeric(12,2) DEFAULT 0,
  custo_terceiros numeric(12,2) DEFAULT 0,
  custo_total numeric(12,2) DEFAULT 0,
  data_execucao date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- HISTORICO_MANUTENCAO
CREATE TABLE IF NOT EXISTS public.historico_manutencao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  descricao text,
  data_evento timestamptz NOT NULL DEFAULT now(),
  custo_total numeric(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- AVALIACOES_FORNECEDORES (depende de contratos)
CREATE TABLE IF NOT EXISTS public.avaliacoes_fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  nota numeric(5,2),
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- BILLING_INVOICES (depende de plans, company_subscriptions)
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id),
  company_subscription_id uuid REFERENCES public.company_subscriptions(id) ON DELETE SET NULL,
  gateway_invoice_id text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'voided', 'refunded', 'failed')),
  due_date date NOT NULL,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===================== NÍVEL 2: Dependem de tabelas do nível 1 =====================

-- ATIVIDADES_PREVENTIVAS (depende de planos_preventivos)
CREATE TABLE IF NOT EXISTS public.atividades_preventivas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES public.planos_preventivos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  responsavel text,
  ordem integer NOT NULL DEFAULT 1,
  tempo_total_min integer NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- EXECUCOES_PREVENTIVAS (depende de planos_preventivos, ordens_servico)
CREATE TABLE IF NOT EXISTS public.execucoes_preventivas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES public.planos_preventivos(id) ON DELETE CASCADE,
  executor_nome text NOT NULL,
  executor_id uuid,
  data_execucao timestamptz NOT NULL DEFAULT now(),
  tempo_real_min integer,
  status text,
  checklist jsonb DEFAULT '[]'::jsonb,
  observacoes text,
  os_gerada_id uuid REFERENCES public.ordens_servico(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ANOMALIAS_INSPECAO (depende de inspecoes)
CREATE TABLE IF NOT EXISTS public.anomalias_inspecao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  inspecao_id uuid REFERENCES public.inspecoes(id) ON DELETE CASCADE,
  descricao text,
  severidade text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ACOES_CORRETIVAS (depende de analise_causa_raiz)
CREATE TABLE IF NOT EXISTS public.acoes_corretivas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  rca_id uuid REFERENCES public.analise_causa_raiz(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- INCIDENTES_SSMA (depende de analise_causa_raiz)
CREATE TABLE IF NOT EXISTS public.incidentes_ssma (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  rca_id uuid REFERENCES public.analise_causa_raiz(id) ON DELETE CASCADE,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- EXECUCOES_OS_PAUSAS (depende de execucoes_os, ordens_servico)
CREATE TABLE IF NOT EXISTS public.execucoes_os_pausas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  execucao_id uuid NOT NULL REFERENCES public.execucoes_os(id) ON DELETE CASCADE,
  inicio time NOT NULL,
  fim time NOT NULL,
  duracao_min integer NOT NULL CHECK (duracao_min > 0),
  motivo text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (fim > inicio)
);

-- SUBSCRIPTION_PAYMENTS (depende de subscriptions)
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  due_at timestamptz,
  paid_at timestamptz,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  method text,
  status text NOT NULL DEFAULT 'pendente',
  notes text,
  provider text NOT NULL DEFAULT 'manual',
  provider_payment_id text,
  provider_event text,
  raw_payload jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscription_payments_provider_check CHECK (provider IN ('manual', 'stripe', 'asaas'))
);

-- ===================== NÍVEL 3: Dependem de tabelas do nível 2 =====================

-- SERVICOS_PREVENTIVOS (depende de atividades_preventivas)
CREATE TABLE IF NOT EXISTS public.servicos_preventivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  atividade_id uuid NOT NULL REFERENCES public.atividades_preventivas(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  tempo_estimado_min integer NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 1,
  concluido boolean NOT NULL DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===================== HABILITAR RLS EM TODAS AS TABELAS COM empresa_id =====================

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sistemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais_os ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execucoes_os ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execucoes_os_pausas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_preventivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades_preventivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos_preventivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_preventivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execucoes_preventivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicoes_preditivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspecoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomalias_inspecao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmea ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acoes_corretivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analise_causa_raiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.melhorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.componentes_equipamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_trabalho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_granulares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidentes_ssma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_error_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes_fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicadores_kpi ENABLE ROW LEVEL SECURITY;

-- Tabelas sem empresa_id (globais/owner-only)
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_owner_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_session_transfer_tokens ENABLE ROW LEVEL SECURITY;

-- ===================== POLÍTICAS RLS POR TENANT (empresa_id) =====================

-- Macro: para cada tabela com empresa_id, criar policy de tenant isolation
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'areas','sistemas','materiais','materiais_os','contratos','fornecedores',
      'execucoes_os','execucoes_os_pausas','historico_manutencao',
      'planos_preventivos','atividades_preventivas','servicos_preventivos',
      'templates_preventivos','execucoes_preventivas',
      'medicoes_preditivas','inspecoes','anomalias_inspecao','fmea',
      'acoes_corretivas','analise_causa_raiz','melhorias',
      'documentos_tecnicos','document_layouts','componentes_equipamento',
      'movimentacoes_materiais','permissoes_trabalho','permissoes_granulares',
      'incidentes_ssma','maintenance_schedule','support_tickets',
      'enterprise_audit_logs','operational_logs','system_error_events',
      'assinaturas','subscriptions','company_subscriptions',
      'subscription_payments','billing_customers','billing_invoices',
      'company_usage_metrics','feature_flags','membros_empresa',
      'avaliacoes_fornecedores','indicadores_kpi'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_select_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (empresa_id IN (SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()))',
      'tenant_select_' || t, t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_insert_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (empresa_id IN (SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()))',
      'tenant_insert_' || t, t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_update_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (empresa_id IN (SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()))',
      'tenant_update_' || t, t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_delete_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (empresa_id IN (SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()))',
      'tenant_delete_' || t, t
    );
  END LOOP;
END $$;

-- Policies para tabelas globais (somente service_role / SYSTEM_OWNER)
DROP POLICY IF EXISTS "service_role_all_planos" ON public.planos;
CREATE POLICY "service_role_all_planos" ON public.planos FOR ALL USING (true);
DROP POLICY IF EXISTS "service_role_all_plans" ON public.plans;
CREATE POLICY "service_role_all_plans" ON public.plans FOR ALL USING (true);
DROP POLICY IF EXISTS "service_role_all_platform_metrics" ON public.platform_metrics;
CREATE POLICY "service_role_all_platform_metrics" ON public.platform_metrics FOR ALL USING (true);
DROP POLICY IF EXISTS "service_role_all_system_owner_allowlist" ON public.system_owner_allowlist;
CREATE POLICY "service_role_all_system_owner_allowlist" ON public.system_owner_allowlist FOR ALL USING (true);
DROP POLICY IF EXISTS "service_role_all_ip_rate_limits" ON public.ip_rate_limits;
CREATE POLICY "service_role_all_ip_rate_limits" ON public.ip_rate_limits FOR ALL USING (true);
DROP POLICY IF EXISTS "service_role_all_login_attempts" ON public.login_attempts;
CREATE POLICY "service_role_all_login_attempts" ON public.login_attempts FOR ALL USING (true);
DROP POLICY IF EXISTS "service_role_all_saas_metrics_daily" ON public.saas_metrics_daily;
CREATE POLICY "service_role_all_saas_metrics_daily" ON public.saas_metrics_daily FOR ALL USING (true);
DROP POLICY IF EXISTS "service_role_all_auth_session_transfer_tokens" ON public.auth_session_transfer_tokens;
CREATE POLICY "service_role_all_auth_session_transfer_tokens" ON public.auth_session_transfer_tokens FOR ALL USING (true);

-- ===================== ÍNDICES PARA PERFORMANCE =====================

CREATE INDEX IF NOT EXISTS idx_areas_empresa_id ON public.areas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sistemas_empresa_id ON public.sistemas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_materiais_empresa_id ON public.materiais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_materiais_os_empresa_id ON public.materiais_os(empresa_id);
CREATE INDEX IF NOT EXISTS idx_materiais_os_os_id ON public.materiais_os(os_id);
CREATE INDEX IF NOT EXISTS idx_contratos_empresa_id ON public.contratos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa_id ON public.fornecedores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_os_empresa_id ON public.execucoes_os(empresa_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_os_os_id ON public.execucoes_os(os_id);
CREATE INDEX IF NOT EXISTS idx_historico_manutencao_empresa_id ON public.historico_manutencao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_planos_preventivos_empresa_id ON public.planos_preventivos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_atividades_preventivas_plano_id ON public.atividades_preventivas(plano_id);
CREATE INDEX IF NOT EXISTS idx_servicos_preventivos_atividade_id ON public.servicos_preventivos(atividade_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_preventivas_empresa_id ON public.execucoes_preventivas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_medicoes_preditivas_empresa_id ON public.medicoes_preditivas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_inspecoes_empresa_id ON public.inspecoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_anomalias_inspecao_inspecao_id ON public.anomalias_inspecao(inspecao_id);
CREATE INDEX IF NOT EXISTS idx_fmea_empresa_id ON public.fmea(empresa_id);
CREATE INDEX IF NOT EXISTS idx_acoes_corretivas_empresa_id ON public.acoes_corretivas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_analise_causa_raiz_empresa_id ON public.analise_causa_raiz(empresa_id);
CREATE INDEX IF NOT EXISTS idx_melhorias_empresa_id ON public.melhorias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tecnicos_empresa_id ON public.documentos_tecnicos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_document_layouts_empresa_id ON public.document_layouts(empresa_id);
CREATE INDEX IF NOT EXISTS idx_componentes_equipamento_empresa_id ON public.componentes_equipamento(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_materiais_empresa_id ON public.movimentacoes_materiais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_granulares_user_id ON public.permissoes_granulares(user_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_trabalho_empresa_id ON public.permissoes_trabalho(empresa_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_empresa_id ON public.support_tickets(empresa_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_empresa_id ON public.maintenance_schedule(empresa_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_data ON public.maintenance_schedule(data_programada);
CREATE INDEX IF NOT EXISTS idx_enterprise_audit_logs_empresa_id ON public.enterprise_audit_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_operational_logs_empresa_id ON public.operational_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_empresa_id ON public.company_subscriptions(empresa_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_empresa_id ON public.subscriptions(empresa_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_os_pausas_execucao_id ON public.execucoes_os_pausas(execucao_id);
CREATE INDEX IF NOT EXISTS idx_incidentes_ssma_empresa_id ON public.incidentes_ssma(empresa_id);
CREATE INDEX IF NOT EXISTS idx_indicadores_kpi_empresa_id ON public.indicadores_kpi(empresa_id);

-- ===================== SEED: Plano padrão "free" =====================

INSERT INTO public.plans (code, name, description, user_limit, data_limit_mb, price_month)
VALUES ('free', 'Free', 'Plano gratuito inicial', 5, 512, 0)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.planos (codigo, nome, descricao, limite_usuarios, limite_os_mes, price_month)
VALUES ('free', 'Free', 'Plano gratuito inicial', 5, 200, 0)
ON CONFLICT (codigo) DO NOTHING;

-- ===================== VIEW: v_dashboard_kpis =====================

CREATE OR REPLACE VIEW public.v_dashboard_kpis AS
SELECT
  e.id AS empresa_id,
  e.nome AS empresa_nome,
  COALESCE(os_total.total, 0) AS total_os,
  COALESCE(os_abertas.total, 0) AS os_abertas,
  COALESCE(os_fechadas.total, 0) AS os_fechadas,
  COALESCE(equip_total.total, 0) AS total_equipamentos,
  COALESCE(prev_total.total, 0) AS total_planos_preventivos
FROM public.empresas e
LEFT JOIN LATERAL (
  SELECT count(*) AS total FROM public.ordens_servico os WHERE os.empresa_id = e.id
) os_total ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS total FROM public.ordens_servico os WHERE os.empresa_id = e.id AND os.status NOT IN ('FECHADA', 'CANCELADA')
) os_abertas ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS total FROM public.ordens_servico os WHERE os.empresa_id = e.id AND os.status = 'FECHADA'
) os_fechadas ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS total FROM public.equipamentos eq WHERE eq.empresa_id = e.id
) equip_total ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS total FROM public.planos_preventivos pp WHERE pp.empresa_id = e.id
) prev_total ON true;

-- ===================== GRANTS =====================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

COMMIT;

=======
CREATE TABLE IF NOT EXISTS public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  limite_usuarios integer NOT NULL DEFAULT 5,
  limite_os_mes integer NOT NULL DEFAULT 200,
  limite_ativos integer NOT NULL DEFAULT 500,
  limite_storage_mb integer NOT NULL DEFAULT 1024,
  max_users integer,
  max_companies integer,
  max_storage bigint,
  max_orders_per_month integer,
  user_limit integer NOT NULL DEFAULT 10,
  asset_limit integer NOT NULL DEFAULT 1000,
  os_limit integer NOT NULL DEFAULT 2000,
  storage_limit_mb integer NOT NULL DEFAULT 2048,
  price_month numeric(12,2) NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  features_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  user_limit integer NOT NULL DEFAULT 10,
  module_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_limit_mb integer NOT NULL DEFAULT 2048,
  premium_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  company_limit integer,
  price_month numeric(12,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  planta_id uuid NOT NULL REFERENCES public.plantas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, planta_id, codigo)
);

CREATE TABLE IF NOT EXISTS public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  unidade text,
  estoque_atual numeric(14,4) DEFAULT 0,
  estoque_minimo numeric(14,4) DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

-- auditoria table skipped (blocked by backend v2 event trigger)

CREATE TABLE IF NOT EXISTS public.platform_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL,
  empresas_ativas integer NOT NULL DEFAULT 0,
  usuarios_ativos integer NOT NULL DEFAULT 0,
  os_abertas integer NOT NULL DEFAULT 0,
  os_fechadas integer NOT NULL DEFAULT 0,
  mtbf_horas numeric(14,4),
  mttr_horas numeric(14,4),
  disponibilidade_pct numeric(8,4),
  backlog_horas numeric(14,2),
  cumprimento_plano_pct numeric(8,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (metric_date)
);

CREATE TABLE IF NOT EXISTS public.system_owner_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  operation text NOT NULL,
  record_id text,
  actor_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operational_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  user_id uuid,
  scope text NOT NULL,
  action text,
  endpoint text,
  status_code integer,
  duration_ms integer,
  request_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  user_id uuid,
  request_id text,
  endpoint text,
  source text NOT NULL DEFAULT 'edge',
  error_name text,
  error_message text NOT NULL,
  stack_trace text,
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ip_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  ip_address text NOT NULL,
  identifier text NOT NULL DEFAULT '*',
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  last_request_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, ip_address, identifier, window_start)
);

CREATE TABLE IF NOT EXISTS public.login_attempts (
  email text NOT NULL,
  ip_address text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (email, ip_address)
);

CREATE TABLE IF NOT EXISTS public.saas_metrics_daily (
  metric_date date PRIMARY KEY,
  empresas_ativas integer NOT NULL DEFAULT 0,
  usuarios_ativos integer NOT NULL DEFAULT 0,
  ordens_criadas integer NOT NULL DEFAULT 0,
  execucoes_realizadas integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.templates_preventivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  estrutura jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo_documento text NOT NULL,
  versao text NOT NULL,
  nome text,
  configuracao jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documentos_tecnicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  tipo text,
  arquivo_url text,
  revisao text,
  status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medicoes_preditivas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  tag text,
  tipo_medicao text,
  valor numeric(14,4),
  limite_alerta numeric(14,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.melhorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.componentes_equipamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  criticidade text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fmea (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissoes_trabalho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissoes_granulares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  modulo text NOT NULL,
  visualizar boolean,
  criar boolean,
  editar boolean,
  excluir boolean,
  alterar_status boolean,
  imprimir boolean,
  exportar boolean,
  importar boolean,
  acessar_indicadores boolean,
  acessar_historico boolean,
  ver_valores boolean,
  ver_custos boolean,
  ver_criticidade boolean,
  ver_status boolean,
  ver_obs_internas boolean,
  ver_dados_financeiros boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, user_id, modulo)
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  requester_user_id uuid,
  user_id uuid,
  owner_responder_id uuid,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  subject text NOT NULL,
  message text NOT NULL,
  owner_notes text,
  owner_response text,
  assigned_to uuid,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  unread_owner_messages integer NOT NULL DEFAULT 0,
  unread_client_messages integer NOT NULL DEFAULT 0,
  notification_email_pending boolean NOT NULL DEFAULT false,
  notification_whatsapp_pending boolean NOT NULL DEFAULT false,
  last_message_sender text,
  last_message_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_tickets_last_message_sender_check CHECK (last_message_sender IS NULL OR last_message_sender IN ('client', 'owner', 'system'))
);

CREATE TABLE IF NOT EXISTS public.maintenance_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('preventiva', 'lubrificacao', 'inspecao', 'preditiva')),
  origem_id uuid NOT NULL,
  equipamento_id uuid,
  titulo text NOT NULL,
  descricao text,
  data_programada timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'programado',
  responsavel text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.indicadores_kpi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  referencia date NOT NULL,
  mtbf_horas numeric(14,4),
  mttr_horas numeric(14,4),
  disponibilidade_pct numeric(8,4),
  backlog_horas numeric(14,2),
  cumprimento_plano_pct numeric(8,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, referencia)
);

CREATE TABLE IF NOT EXISTS public.permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  descricao text,
  escopo text NOT NULL DEFAULT 'tenant' CHECK (escopo IN ('global', 'tenant')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.membros_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','inactive','blocked')),
  cargo text,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.billing_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  gateway_customer_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'delinquent', 'blocked', 'canceled')),
  gateway_provider text NOT NULL DEFAULT 'manual',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.auth_session_transfer_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  target_host text,
  created_by uuid,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- NIVEL 1

CREATE TABLE IF NOT EXISTS public.sistemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  funcao_principal text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, area_id, codigo)
);

CREATE TABLE IF NOT EXISTS public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.materiais_os (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  quantidade numeric(14,4) NOT NULL DEFAULT 0,
  custo_unitario numeric(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.movimentacoes_materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  tipo_movimentacao text NOT NULL,
  quantidade numeric(14,4) NOT NULL,
  custo_unitario numeric(12,2),
  usuario_id uuid,
  usuario_nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES public.planos(id),
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','canceled','suspended')),
  inicio_em timestamptz NOT NULL DEFAULT now(),
  fim_em timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  limites jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.planos(id),
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'suspended')),
  renewal_at timestamptz,
  trial_ends_at timestamptz,
  payment_status text,
  stripe_customer_id text,
  stripe_subscription_id text,
  period text,
  starts_at date,
  ends_at date,
  amount numeric(14,2),
  billing_provider text NOT NULL DEFAULT 'manual',
  asaas_customer_id text,
  asaas_subscription_id text,
  asaas_last_event_at timestamptz,
  billing_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id),
  CONSTRAINT subscriptions_billing_provider_check CHECK (billing_provider IN ('manual', 'stripe', 'asaas'))
);

CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'past_due', 'canceled', 'suspended')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'custom')),
  renewal_date date,
  starts_at date NOT NULL DEFAULT CURRENT_DATE,
  ends_at date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_usage_metrics (
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  metric_month date NOT NULL,
  users_count integer NOT NULL DEFAULT 0,
  orders_created integer NOT NULL DEFAULT 0,
  storage_used bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, metric_month)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permissao_codigo text NOT NULL REFERENCES public.permissoes(codigo) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permissao_codigo)
);

CREATE TABLE IF NOT EXISTS public.planos_preventivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  tag text,
  tipo_gatilho text,
  frequencia_dias integer,
  frequencia_ciclos integer,
  condicao_disparo text,
  ultima_execucao timestamptz,
  proxima_execucao timestamptz,
  tempo_estimado_min integer,
  especialidade text,
  instrucoes text,
  checklist jsonb DEFAULT '[]'::jsonb,
  materiais_previstos jsonb DEFAULT '[]'::jsonb,
  responsavel_nome text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS public.analise_causa_raiz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inspecoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  inspetor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  descricao text,
  data_inspecao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.execucoes_os (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  mecanico_id uuid REFERENCES public.mecanicos(id),
  mecanico_nome text,
  hora_inicio time,
  hora_fim time,
  tempo_execucao integer,
  tempo_execucao_bruto integer,
  tempo_pausas integer NOT NULL DEFAULT 0,
  tempo_execucao_liquido integer,
  servico_executado text,
  custo_mao_obra numeric(12,2) DEFAULT 0,
  custo_materiais numeric(12,2) DEFAULT 0,
  custo_terceiros numeric(12,2) DEFAULT 0,
  custo_total numeric(12,2) DEFAULT 0,
  data_execucao date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.historico_manutencao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  descricao text,
  data_evento timestamptz NOT NULL DEFAULT now(),
  custo_total numeric(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.avaliacoes_fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  nota numeric(5,2),
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id),
  company_subscription_id uuid REFERENCES public.company_subscriptions(id) ON DELETE SET NULL,
  gateway_invoice_id text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'voided', 'refunded', 'failed')),
  due_date date NOT NULL,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- NIVEL 2

CREATE TABLE IF NOT EXISTS public.atividades_preventivas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES public.planos_preventivos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  responsavel text,
  ordem integer NOT NULL DEFAULT 1,
  tempo_total_min integer NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.execucoes_preventivas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES public.planos_preventivos(id) ON DELETE CASCADE,
  executor_nome text NOT NULL,
  executor_id uuid,
  data_execucao timestamptz NOT NULL DEFAULT now(),
  tempo_real_min integer,
  status text,
  checklist jsonb DEFAULT '[]'::jsonb,
  observacoes text,
  os_gerada_id uuid REFERENCES public.ordens_servico(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anomalias_inspecao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  inspecao_id uuid REFERENCES public.inspecoes(id) ON DELETE CASCADE,
  descricao text,
  severidade text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.acoes_corretivas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  rca_id uuid REFERENCES public.analise_causa_raiz(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.incidentes_ssma (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  rca_id uuid REFERENCES public.analise_causa_raiz(id) ON DELETE CASCADE,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.execucoes_os_pausas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  execucao_id uuid NOT NULL REFERENCES public.execucoes_os(id) ON DELETE CASCADE,
  inicio time NOT NULL,
  fim time NOT NULL,
  duracao_min integer NOT NULL CHECK (duracao_min > 0),
  motivo text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (fim > inicio)
);

CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  due_at timestamptz,
  paid_at timestamptz,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  method text,
  status text NOT NULL DEFAULT 'pendente',
  notes text,
  provider text NOT NULL DEFAULT 'manual',
  provider_payment_id text,
  provider_event text,
  raw_payload jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscription_payments_provider_check CHECK (provider IN ('manual', 'stripe', 'asaas'))
);

-- NIVEL 3

CREATE TABLE IF NOT EXISTS public.servicos_preventivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  atividade_id uuid NOT NULL REFERENCES public.atividades_preventivas(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  tempo_estimado_min integer NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 1,
  concluido boolean NOT NULL DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sistemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais_os ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execucoes_os ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execucoes_os_pausas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_preventivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades_preventivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos_preventivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_preventivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execucoes_preventivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicoes_preditivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspecoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomalias_inspecao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmea ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acoes_corretivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analise_causa_raiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.melhorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.componentes_equipamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_trabalho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_granulares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidentes_ssma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_error_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes_fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicadores_kpi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_owner_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_session_transfer_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'areas','sistemas','materiais','materiais_os','contratos','fornecedores',
      'execucoes_os','execucoes_os_pausas','historico_manutencao',
      'planos_preventivos','atividades_preventivas','servicos_preventivos',
      'templates_preventivos','execucoes_preventivas',
      'medicoes_preditivas','inspecoes','anomalias_inspecao','fmea',
      'acoes_corretivas','analise_causa_raiz','melhorias',
      'documentos_tecnicos','document_layouts','componentes_equipamento',
      'movimentacoes_materiais','permissoes_trabalho','permissoes_granulares',
      'incidentes_ssma','maintenance_schedule','support_tickets',
      'enterprise_audit_logs','operational_logs','system_error_events',
      'assinaturas','subscriptions','company_subscriptions',
      'billing_customers','billing_invoices',
      'company_usage_metrics','feature_flags','membros_empresa',
      'avaliacoes_fornecedores','indicadores_kpi'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_select_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (empresa_id IN (SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()))',
      'tenant_select_' || t, t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_insert_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (empresa_id IN (SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()))',
      'tenant_insert_' || t, t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_update_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (empresa_id IN (SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()))',
      'tenant_update_' || t, t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_delete_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (empresa_id IN (SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()))',
      'tenant_delete_' || t, t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "service_role_all_planos" ON public.planos;
CREATE POLICY "service_role_all_planos" ON public.planos FOR ALL USING (true);
DROP POLICY IF EXISTS "service_role_all_plans" ON public.plans;
CREATE POLICY "service_role_all_plans" ON public.plans FOR ALL USING (true);
DROP POLICY IF EXISTS "service_role_all_platform_metrics" ON public.platform_metrics;
CREATE POLICY "service_role_all_platform_metrics" ON public.platform_metrics FOR ALL USING (true);
DROP POLICY IF EXISTS "service_role_all_system_owner_allowlist" ON public.system_owner_allowlist;
CREATE POLICY "service_role_all_system_owner_allowlist" ON public.system_owner_allowlist FOR ALL USING (true);
DROP POLICY IF EXISTS "service_role_all_ip_rate_limits" ON public.ip_rate_limits;
CREATE POLICY "service_role_all_ip_rate_limits" ON public.ip_rate_limits FOR ALL USING (true);
DROP POLICY IF EXISTS "service_role_all_login_attempts" ON public.login_attempts;
CREATE POLICY "service_role_all_login_attempts" ON public.login_attempts FOR ALL USING (true);
DROP POLICY IF EXISTS "service_role_all_saas_metrics_daily" ON public.saas_metrics_daily;
CREATE POLICY "service_role_all_saas_metrics_daily" ON public.saas_metrics_daily FOR ALL USING (true);
DROP POLICY IF EXISTS "service_role_all_auth_session_transfer_tokens" ON public.auth_session_transfer_tokens;
CREATE POLICY "service_role_all_auth_session_transfer_tokens" ON public.auth_session_transfer_tokens FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_areas_empresa_id ON public.areas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sistemas_empresa_id ON public.sistemas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_materiais_empresa_id ON public.materiais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_materiais_os_empresa_id ON public.materiais_os(empresa_id);
CREATE INDEX IF NOT EXISTS idx_materiais_os_os_id ON public.materiais_os(os_id);
CREATE INDEX IF NOT EXISTS idx_contratos_empresa_id ON public.contratos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa_id ON public.fornecedores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_os_empresa_id ON public.execucoes_os(empresa_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_os_os_id ON public.execucoes_os(os_id);
CREATE INDEX IF NOT EXISTS idx_historico_manutencao_empresa_id ON public.historico_manutencao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_planos_preventivos_empresa_id ON public.planos_preventivos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_atividades_preventivas_plano_id ON public.atividades_preventivas(plano_id);
CREATE INDEX IF NOT EXISTS idx_servicos_preventivos_atividade_id ON public.servicos_preventivos(atividade_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_preventivas_empresa_id ON public.execucoes_preventivas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_medicoes_preditivas_empresa_id ON public.medicoes_preditivas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_inspecoes_empresa_id ON public.inspecoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_anomalias_inspecao_inspecao_id ON public.anomalias_inspecao(inspecao_id);
CREATE INDEX IF NOT EXISTS idx_fmea_empresa_id ON public.fmea(empresa_id);
CREATE INDEX IF NOT EXISTS idx_acoes_corretivas_empresa_id ON public.acoes_corretivas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_analise_causa_raiz_empresa_id ON public.analise_causa_raiz(empresa_id);
CREATE INDEX IF NOT EXISTS idx_melhorias_empresa_id ON public.melhorias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tecnicos_empresa_id ON public.documentos_tecnicos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_document_layouts_empresa_id ON public.document_layouts(empresa_id);
CREATE INDEX IF NOT EXISTS idx_componentes_equipamento_empresa_id ON public.componentes_equipamento(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_materiais_empresa_id ON public.movimentacoes_materiais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_granulares_user_id ON public.permissoes_granulares(user_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_trabalho_empresa_id ON public.permissoes_trabalho(empresa_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_empresa_id ON public.support_tickets(empresa_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_empresa_id ON public.maintenance_schedule(empresa_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_data ON public.maintenance_schedule(data_programada);
CREATE INDEX IF NOT EXISTS idx_enterprise_audit_logs_empresa_id ON public.enterprise_audit_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_operational_logs_empresa_id ON public.operational_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_empresa_id ON public.company_subscriptions(empresa_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_empresa_id ON public.subscriptions(empresa_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_os_pausas_execucao_id ON public.execucoes_os_pausas(execucao_id);
CREATE INDEX IF NOT EXISTS idx_incidentes_ssma_empresa_id ON public.incidentes_ssma(empresa_id);
CREATE INDEX IF NOT EXISTS idx_indicadores_kpi_empresa_id ON public.indicadores_kpi(empresa_id);

-- Seed
INSERT INTO public.plans (code, name, description, user_limit, data_limit_mb, price_month)
VALUES ('free', 'Free', 'Plano gratuito inicial', 5, 512, 0)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.planos (codigo, nome, descricao, limite_usuarios, limite_os_mes, price_month)
VALUES ('free', 'Free', 'Plano gratuito inicial', 5, 200, 0)
ON CONFLICT (codigo) DO NOTHING;

-- View
CREATE OR REPLACE VIEW public.v_dashboard_kpis AS
SELECT
  e.id AS empresa_id,
  e.nome AS empresa_nome,
  COALESCE(os_total.total, 0) AS total_os,
  COALESCE(os_abertas.total, 0) AS os_abertas,
  COALESCE(os_fechadas.total, 0) AS os_fechadas,
  COALESCE(equip_total.total, 0) AS total_equipamentos,
  COALESCE(prev_total.total, 0) AS total_planos_preventivos
FROM public.empresas e
LEFT JOIN LATERAL (
  SELECT count(*) AS total FROM public.ordens_servico os WHERE os.empresa_id = e.id
) os_total ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS total FROM public.ordens_servico os WHERE os.empresa_id = e.id AND os.status NOT IN ('FECHADA', 'CANCELADA')
) os_abertas ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS total FROM public.ordens_servico os WHERE os.empresa_id = e.id AND os.status = 'FECHADA'
) os_fechadas ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS total FROM public.equipamentos eq WHERE eq.empresa_id = e.id
) equip_total ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS total FROM public.planos_preventivos pp WHERE pp.empresa_id = e.id
) prev_total ON true;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

COMMIT;

>>>>>>> 1f995f32433f8675a9c7838b44570da06aa6247c