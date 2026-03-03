-- AUTO-GENERATED FULL RESET MIGRATION


-- ===== BEGIN supabase\rebuild\00_drop_all_project_objects.sql =====

-- FASE 0/6 - LIMPEZA CONTROLADA DO BACKEND (PROJETO)
-- Execute no SQL Editor do Supabase para remover objetos do projeto no schema public/analytics.
-- Não remove schemas auth, storage, realtime, extensions.

BEGIN;

DROP SCHEMA IF EXISTS analytics CASCADE;

DO $$
DECLARE
  v record;
BEGIN
  FOR v IN
    SELECT schemaname, matviewname AS obj
    FROM pg_matviews
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I.%I CASCADE', v.schemaname, v.obj);
  END LOOP;

  FOR v IN
    SELECT schemaname, viewname AS obj
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname NOT IN ('geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews')
  LOOP
    EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', v.schemaname, v.obj);
  END LOOP;

  FOR v IN
    SELECT n.nspname AS schema_name, p.proname AS fn_name, oidvectortypes(p.proargtypes) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE', v.schema_name, v.fn_name, v.args);
  END LOOP;

  FOR v IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', v.schemaname, v.tablename);
  END LOOP;

  FOR v IN
    SELECT sequence_schema, sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS %I.%I CASCADE', v.sequence_schema, v.sequence_name);
  END LOOP;
END $$;

COMMIT;

-- ===== END supabase\rebuild\00_drop_all_project_objects.sql =====


-- ===== BEGIN supabase\rebuild\01_create_backend_v2.sql =====

-- FASE 1 - SCHEMA V2 CANÔNICO (100% módulos)

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('USUARIO', 'ADMIN', 'MASTER_TI', 'SYSTEM_OWNER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Empresas e acesso
CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text UNIQUE,
  cnpj text,
  status text NOT NULL DEFAULT 'active',
  plano text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  nome text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, empresa_id, role)
);

-- Cadastros base
CREATE TABLE IF NOT EXISTS public.plantas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  planta_id uuid NOT NULL REFERENCES public.plantas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, planta_id, codigo)
);

CREATE TABLE IF NOT EXISTS public.sistemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  area_id uuid NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, area_id, codigo)
);

CREATE TABLE IF NOT EXISTS public.equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  sistema_id uuid REFERENCES public.sistemas(id) ON DELETE SET NULL,
  tag text NOT NULL,
  nome text NOT NULL,
  criticidade text DEFAULT 'C' NOT NULL,
  nivel_risco text DEFAULT 'BAIXO' NOT NULL,
  localizacao text,
  fabricante text,
  modelo text,
  numero_serie text,
  data_instalacao date,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, tag)
);

CREATE TABLE IF NOT EXISTS public.componentes_equipamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  criticidade text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- OS e execução
CREATE TABLE IF NOT EXISTS public.ordens_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  numero_os bigint GENERATED BY DEFAULT AS IDENTITY,
  tipo text NOT NULL,
  prioridade text NOT NULL,
  status text NOT NULL,
  tag text,
  equipamento text,
  problema text,
  solicitante text,
  usuario_abertura uuid,
  tempo_estimado integer,
  data_solicitacao timestamptz NOT NULL DEFAULT now(),
  data_fechamento timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mecanicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  nome text NOT NULL,
  tipo text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.execucoes_os (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  mecanico_id uuid REFERENCES public.mecanicos(id),
  mecanico_nome text,
  hora_inicio time,
  hora_fim time,
  tempo_execucao integer,
  servico_executado text,
  custo_mao_obra numeric(12,2) DEFAULT 0,
  custo_materiais numeric(12,2) DEFAULT 0,
  custo_terceiros numeric(12,2) DEFAULT 0,
  custo_total numeric(12,2) DEFAULT 0,
  data_execucao date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
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

CREATE TABLE IF NOT EXISTS public.materiais_os (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  quantidade numeric(14,4) NOT NULL DEFAULT 0,
  custo_unitario numeric(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.movimentacoes_materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  material_id uuid NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  tipo_movimentacao text NOT NULL,
  quantidade numeric(14,4) NOT NULL,
  custo_unitario numeric(12,2),
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Preventiva
CREATE TABLE IF NOT EXISTS public.planos_preventivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
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

CREATE TABLE IF NOT EXISTS public.atividades_preventivas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  plano_id uuid NOT NULL REFERENCES public.planos_preventivos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  responsavel text,
  ordem integer NOT NULL DEFAULT 1,
  tempo_total_min integer NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.servicos_preventivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  atividade_id uuid NOT NULL REFERENCES public.atividades_preventivas(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  tempo_estimado_min integer NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 1,
  concluido boolean NOT NULL DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.templates_preventivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  nome text NOT NULL,
  descricao text,
  estrutura jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.execucoes_preventivas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
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

-- Lubrificação
CREATE TABLE IF NOT EXISTS public.planos_lubrificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  ponto_lubrificacao text,
  lubrificante text,
  periodicidade integer,
  tipo_periodicidade text,
  proxima_execucao timestamptz,
  ultima_execucao timestamptz,
  tempo_estimado integer,
  prioridade text,
  status text,
  responsavel_nome text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS public.atividades_lubrificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  plano_id uuid NOT NULL REFERENCES public.planos_lubrificacao(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 1,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.execucoes_lubrificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  plano_id uuid NOT NULL REFERENCES public.planos_lubrificacao(id) ON DELETE CASCADE,
  executor_nome text NOT NULL,
  data_execucao timestamptz NOT NULL DEFAULT now(),
  status text,
  observacoes text,
  os_gerada_id uuid REFERENCES public.ordens_servico(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Preditiva / Inspeção / Eng. confiabilidade
CREATE TABLE IF NOT EXISTS public.medicoes_preditivas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  tag text,
  tipo_medicao text,
  valor numeric(14,4),
  limite_alerta numeric(14,4),
  limite_critico numeric(14,4),
  status text,
  observacoes text,
  responsavel_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inspecoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  numero_inspecao text,
  rota_nome text,
  descricao text,
  data_inspecao date,
  status text,
  inspetor_id uuid,
  inspetor_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anomalias_inspecao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  inspecao_id uuid NOT NULL REFERENCES public.inspecoes(id) ON DELETE CASCADE,
  descricao text,
  criticidade text,
  status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fmea (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  equipamento_id uuid REFERENCES public.equipamentos(id),
  modo_falha text,
  efeito text,
  causa text,
  severidade integer,
  ocorrencia integer,
  deteccao integer,
  rpn integer,
  status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analise_causa_raiz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  problema text,
  causa_raiz text,
  metodologia text,
  status text,
  preventive_actions jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.acoes_corretivas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  rca_id uuid REFERENCES public.analise_causa_raiz(id) ON DELETE CASCADE,
  descricao text,
  responsavel text,
  prazo date,
  status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.melhorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  titulo text,
  descricao text,
  status text,
  ganho_estimado numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Suprimentos / contratos / ssma
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  nome text NOT NULL,
  cnpj text,
  contato text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  numero text,
  descricao text,
  valor numeric(14,2),
  data_inicio date,
  data_fim date,
  status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.avaliacoes_fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  nota numeric(5,2),
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissoes_trabalho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  numero text,
  status text,
  riscos_identificados text,
  medidas_controle text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.incidentes_ssma (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  rca_id uuid REFERENCES public.analise_causa_raiz(id) ON DELETE SET NULL,
  descricao text,
  gravidade text,
  status text,
  data_incidente timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Config / docs / sequências
CREATE TABLE IF NOT EXISTS public.documentos_tecnicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  tipo text,
  arquivo_url text,
  revisao text,
  status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  chave text NOT NULL,
  valor jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, chave)
);

CREATE TABLE IF NOT EXISTS public.dados_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) UNIQUE,
  razao_social text,
  nome_fantasia text,
  cnpj text,
  logo_url text,
  logo_os_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  tipo_documento text NOT NULL,
  prefixo text NOT NULL,
  proximo_numero bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, tipo_documento)
);

CREATE TABLE IF NOT EXISTS public.document_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  tipo_documento text NOT NULL,
  versao text NOT NULL,
  nome text,
  configuracao jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Permissões granulares / segurança / rate-limit
CREATE TABLE IF NOT EXISTS public.permissoes_granulares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  user_id uuid NOT NULL,
  modulo text NOT NULL,
  visualizar boolean DEFAULT false,
  criar boolean DEFAULT false,
  editar boolean DEFAULT false,
  excluir boolean DEFAULT false,
  alterar_status boolean DEFAULT false,
  imprimir boolean DEFAULT false,
  exportar boolean DEFAULT false,
  importar boolean DEFAULT false,
  acessar_indicadores boolean DEFAULT false,
  acessar_historico boolean DEFAULT false,
  ver_valores boolean DEFAULT false,
  ver_custos boolean DEFAULT false,
  ver_criticidade boolean DEFAULT false,
  ver_status boolean DEFAULT false,
  ver_obs_internas boolean DEFAULT false,
  ver_dados_financeiros boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, user_id, modulo)
);

CREATE TABLE IF NOT EXISTS public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id),
  actor_user_id uuid,
  actor_email text,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  source text NOT NULL DEFAULT 'app',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id),
  key text NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, key)
);

-- Agenda única
CREATE TABLE IF NOT EXISTS public.maintenance_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  tipo text NOT NULL CHECK (tipo IN ('preventiva', 'lubrificacao', 'inspecao', 'preditiva')),
  origem_id uuid NOT NULL,
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text,
  data_programada timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'programado',
  responsavel text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, origem_id)
);

-- Auditoria unificada
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  source text NOT NULL DEFAULT 'app',
  severity text NOT NULL DEFAULT 'info',
  actor_user_id uuid,
  actor_email text,
  correlation_id uuid DEFAULT gen_random_uuid(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id),
  table_name text,
  operation text,
  record_id text,
  actor_id uuid,
  action_type text,
  severity text NOT NULL DEFAULT 'info',
  source text NOT NULL DEFAULT 'system',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_ordens_servico_empresa_status ON public.ordens_servico (empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_planos_preventivos_empresa_proxima ON public.planos_preventivos (empresa_id, proxima_execucao);
CREATE INDEX IF NOT EXISTS idx_planos_lubrificacao_empresa_proxima ON public.planos_lubrificacao (empresa_id, proxima_execucao);
CREATE INDEX IF NOT EXISTS idx_medicoes_preditivas_empresa_status ON public.medicoes_preditivas (empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_empresa_data ON public.maintenance_schedule (empresa_id, data_programada);
CREATE INDEX IF NOT EXISTS idx_audit_logs_empresa_created ON public.audit_logs (empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_audit_logs_empresa_created ON public.enterprise_audit_logs (empresa_id, created_at DESC);

COMMIT;

-- ===== END supabase\rebuild\01_create_backend_v2.sql =====


-- ===== BEGIN supabase\rebuild\02_security_rbac_rls_v2.sql =====

-- FASE 2 - SEGURANÇA / RBAC / RLS / RPC de auditoria

BEGIN;

-- Tipo app_role (caso não exista)
DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('USUARIO', 'ADMIN', 'MASTER_TI', 'SYSTEM_OWNER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Funções de apoio
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid,
    (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1),
    (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(p_user_id uuid, p_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role = p_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_control_plane_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT coalesce(public.has_role(auth.uid(), 'MASTER_TI'::public.app_role), false)
      OR coalesce(public.has_role(auth.uid(), 'SYSTEM_OWNER'::public.app_role), false);
$$;

-- RBAC tabelas
CREATE TABLE IF NOT EXISTS public.rbac_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rbac_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rbac_role_permissions (
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.rbac_permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.rbac_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, empresa_id, role_id)
);

INSERT INTO public.rbac_roles (code, description, is_system)
VALUES
  ('USUARIO', 'Usuário padrão do tenant', true),
  ('ADMIN', 'Administrador do tenant', true),
  ('MASTER_TI', 'Operador técnico global', true),
  ('SYSTEM_OWNER', 'Control plane owner', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.rbac_permissions (code, description)
VALUES
  ('tenant.read', 'Ler recursos do tenant'),
  ('tenant.write', 'Escrever recursos do tenant'),
  ('tenant.admin', 'Administrar tenant'),
  ('control_plane.read', 'Ler control plane'),
  ('control_plane.write', 'Administrar control plane'),
  ('security.manage', 'Gerenciar segurança e auditoria'),
  ('billing.manage', 'Gerenciar billing')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
JOIN public.rbac_permissions p ON (
  (r.code = 'USUARIO' AND p.code IN ('tenant.read')) OR
  (r.code = 'ADMIN' AND p.code IN ('tenant.read', 'tenant.write', 'tenant.admin')) OR
  (r.code = 'MASTER_TI' AND p.code IN ('tenant.read', 'tenant.write', 'control_plane.read', 'security.manage')) OR
  (r.code = 'SYSTEM_OWNER' AND p.code IN ('tenant.read', 'tenant.write', 'tenant.admin', 'control_plane.read', 'control_plane.write', 'security.manage', 'billing.manage'))
)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_permission(
  p_permission_code text,
  p_empresa_id uuid DEFAULT public.get_current_empresa_id()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rbac_user_roles uur
    JOIN public.rbac_role_permissions urp ON urp.role_id = uur.role_id
    JOIN public.rbac_permissions p ON p.id = urp.permission_id
    WHERE uur.user_id = auth.uid()
      AND p.code = p_permission_code
      AND (
        uur.empresa_id IS NULL
        OR uur.empresa_id = p_empresa_id
        OR public.is_control_plane_operator()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.app_write_audit_log(
  p_action text,
  p_table text,
  p_record_id text DEFAULT NULL,
  p_empresa_id uuid DEFAULT public.get_current_empresa_id(),
  p_severity text DEFAULT 'info',
  p_source text DEFAULT 'app',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_correlation_id uuid DEFAULT gen_random_uuid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  INSERT INTO public.audit_logs (
    action,
    table_name,
    record_id,
    empresa_id,
    severity,
    source,
    actor_user_id,
    actor_email,
    correlation_id,
    metadata,
    created_at
  )
  VALUES (
    p_action,
    p_table,
    p_record_id,
    p_empresa_id,
    p_severity,
    p_source,
    auth.uid(),
    auth.jwt() ->> 'email',
    p_correlation_id,
    p_metadata,
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Trigger updated_at em lote
DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'empresas','profiles','plantas','areas','sistemas','equipamentos','componentes_equipamento',
    'ordens_servico','mecanicos','materiais','planos_preventivos','atividades_preventivas','servicos_preventivos',
    'templates_preventivos','execucoes_preventivas','planos_lubrificacao','atividades_lubrificacao','execucoes_lubrificacao',
    'medicoes_preditivas','inspecoes','anomalias_inspecao','fmea','analise_causa_raiz','acoes_corretivas','melhorias',
    'fornecedores','contratos','avaliacoes_fornecedores','permissoes_trabalho','incidentes_ssma',
    'documentos_tecnicos','configuracoes_sistema','dados_empresa','document_sequences','document_layouts',
    'permissoes_granulares'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_update_%I ON public.%I', v_table, v_table);
    EXECUTE format('CREATE TRIGGER trg_update_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', v_table, v_table);
  END LOOP;
END $$;

-- RLS padrão por tenant
DO $$
DECLARE
  v_table text;
  v_policy record;
  v_has_empresa_id boolean;
  v_tables text[] := ARRAY[
    'empresas','profiles','user_roles','plantas','areas','sistemas','equipamentos','componentes_equipamento',
    'ordens_servico','mecanicos','execucoes_os','materiais','materiais_os','movimentacoes_materiais',
    'planos_preventivos','atividades_preventivas','servicos_preventivos','templates_preventivos','execucoes_preventivas',
    'planos_lubrificacao','atividades_lubrificacao','execucoes_lubrificacao','medicoes_preditivas','inspecoes',
    'anomalias_inspecao','fmea','analise_causa_raiz','acoes_corretivas','melhorias','fornecedores','contratos',
    'avaliacoes_fornecedores','permissoes_trabalho','incidentes_ssma','documentos_tecnicos','configuracoes_sistema',
    'dados_empresa','document_sequences','document_layouts','permissoes_granulares','security_logs','rate_limits',
    'maintenance_schedule','audit_logs','enterprise_audit_logs','rbac_user_roles'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = v_table
        AND column_name = 'empresa_id'
    ) INTO v_has_empresa_id;

    FOR v_policy IN
      SELECT polname
      FROM pg_policy
      WHERE polrelid = format('public.%I', v_table)::regclass
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy.polname, v_table);
    END LOOP;

    IF v_has_empresa_id THEN
      EXECUTE format('CREATE POLICY tenant_select ON public.%I FOR SELECT USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id())', v_table);
      EXECUTE format('CREATE POLICY tenant_insert ON public.%I FOR INSERT WITH CHECK (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id())', v_table);
      EXECUTE format('CREATE POLICY tenant_update ON public.%I FOR UPDATE USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id()) WITH CHECK (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id())', v_table);
      EXECUTE format('CREATE POLICY tenant_delete ON public.%I FOR DELETE USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id())', v_table);
    ELSE
      EXECUTE format('CREATE POLICY control_plane_select ON public.%I FOR SELECT USING (public.is_control_plane_operator())', v_table);
      EXECUTE format('CREATE POLICY control_plane_insert ON public.%I FOR INSERT WITH CHECK (public.is_control_plane_operator())', v_table);
      EXECUTE format('CREATE POLICY control_plane_update ON public.%I FOR UPDATE USING (public.is_control_plane_operator()) WITH CHECK (public.is_control_plane_operator())', v_table);
      EXECUTE format('CREATE POLICY control_plane_delete ON public.%I FOR DELETE USING (public.is_control_plane_operator())', v_table);
    END IF;
  END LOOP;
END $$;

-- RLS exclusivo control-plane para meta-RBAC
ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rbac_roles_read ON public.rbac_roles;
DROP POLICY IF EXISTS rbac_roles_manage ON public.rbac_roles;
CREATE POLICY rbac_roles_read ON public.rbac_roles FOR SELECT USING (public.is_control_plane_operator());
CREATE POLICY rbac_roles_manage ON public.rbac_roles FOR ALL USING (public.is_control_plane_operator()) WITH CHECK (public.is_control_plane_operator());

DROP POLICY IF EXISTS rbac_permissions_read ON public.rbac_permissions;
DROP POLICY IF EXISTS rbac_permissions_manage ON public.rbac_permissions;
CREATE POLICY rbac_permissions_read ON public.rbac_permissions FOR SELECT USING (public.is_control_plane_operator());
CREATE POLICY rbac_permissions_manage ON public.rbac_permissions FOR ALL USING (public.is_control_plane_operator()) WITH CHECK (public.is_control_plane_operator());

DROP POLICY IF EXISTS rbac_role_permissions_read ON public.rbac_role_permissions;
DROP POLICY IF EXISTS rbac_role_permissions_manage ON public.rbac_role_permissions;
CREATE POLICY rbac_role_permissions_read ON public.rbac_role_permissions FOR SELECT USING (public.is_control_plane_operator());
CREATE POLICY rbac_role_permissions_manage ON public.rbac_role_permissions FOR ALL USING (public.is_control_plane_operator()) WITH CHECK (public.is_control_plane_operator());

COMMIT;

-- ===== END supabase\rebuild\02_security_rbac_rls_v2.sql =====


-- ===== BEGIN supabase\rebuild\03_front_compat_views.sql =====

-- FASE 4 - COMPATIBILIDADE TEMPORÁRIA PARA FRONTEND LEGADO
-- Mantém módulos antigos funcionando durante migração gradual.

BEGIN;

CREATE OR REPLACE VIEW public.auditoria AS
SELECT
  al.id,
  al.actor_user_id AS usuario_id,
  COALESCE(al.actor_email, 'SISTEMA') AS usuario_nome,
  al.action AS acao,
  COALESCE(al.metadata ->> 'descricao', al.action) AS descricao,
  al.metadata ->> 'tag' AS tag,
  al.created_at AS data_hora,
  al.empresa_id
FROM public.audit_logs al;

-- Auditoria de banco legada -> enterprise_audit_logs
CREATE OR REPLACE VIEW public.auditoria_logs AS
SELECT
  eal.id,
  COALESCE(eal.table_name, eal.details ->> 'table') AS tabela,
  COALESCE(eal.operation, eal.action_type, 'UNKNOWN') AS operacao,
  COALESCE(eal.record_id, eal.details ->> 'record_id') AS registro_id,
  eal.actor_id AS usuario_id,
  eal.old_data,
  eal.new_data,
  eal.created_at,
  eal.empresa_id
FROM public.enterprise_audit_logs eal;

COMMIT;

-- ===== END supabase\rebuild\03_front_compat_views.sql =====


-- ===== BEGIN supabase\rebuild\04_edge_refactor_contract.sql =====

-- FASE 3 - CONTRATO DE REFATORAÇÃO DAS EDGE FUNCTIONS
-- Este arquivo documenta e fixa as regras de integração obrigatórias para edge functions.

BEGIN;

CREATE TABLE IF NOT EXISTS public.edge_refactor_contract (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL UNIQUE,
  must_require_jwt boolean NOT NULL DEFAULT true,
  must_use_enterprise_audit boolean NOT NULL DEFAULT true,
  must_use_tenant_scope boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.edge_refactor_contract (function_name, status)
VALUES
  ('generate-preventive-os', 'pending'),
  ('kpi-report', 'pending'),
  ('system-health-check', 'in_progress'),
  ('stripe-webhook', 'in_progress'),
  ('analisar-causa-raiz', 'pending')
ON CONFLICT (function_name) DO UPDATE
SET updated_at = now();

COMMIT;

-- ===== END supabase\rebuild\04_edge_refactor_contract.sql =====


-- ===== BEGIN supabase\rebuild\05_analytics_layer_v2.sql =====

-- FASE 5 - CAMADA ANALÍTICA (BI READY)

BEGIN;

CREATE SCHEMA IF NOT EXISTS analytics;

CREATE OR REPLACE VIEW analytics.dim_empresa AS
SELECT
  id AS empresa_id,
  nome,
  slug,
  status,
  plano,
  created_at
FROM public.empresas;

CREATE OR REPLACE VIEW analytics.dim_equipamento AS
SELECT
  e.id AS equipamento_id,
  e.empresa_id,
  e.tag,
  e.nome,
  e.criticidade,
  e.nivel_risco,
  e.ativo
FROM public.equipamentos e;

CREATE OR REPLACE VIEW analytics.fato_os AS
SELECT
  os.id AS os_id,
  os.empresa_id,
  os.numero_os,
  os.tipo,
  os.prioridade,
  os.status,
  os.data_solicitacao,
  os.data_fechamento,
  os.tempo_estimado,
  EXTRACT(EPOCH FROM (COALESCE(os.data_fechamento, now()) - os.data_solicitacao)) / 3600.0 AS lead_time_horas
FROM public.ordens_servico os;

CREATE OR REPLACE VIEW analytics.fato_execucoes_os AS
SELECT
  eo.id AS execucao_id,
  eo.empresa_id,
  eo.os_id,
  eo.data_execucao,
  eo.tempo_execucao,
  eo.custo_mao_obra,
  eo.custo_materiais,
  eo.custo_terceiros,
  eo.custo_total
FROM public.execucoes_os eo;

CREATE OR REPLACE VIEW analytics.fato_agenda_manutencao AS
SELECT
  ms.id,
  ms.empresa_id,
  ms.tipo,
  ms.origem_id,
  ms.equipamento_id,
  ms.data_programada,
  ms.status,
  ms.responsavel
FROM public.maintenance_schedule ms;

CREATE OR REPLACE VIEW analytics.fato_alertas_criticos AS
SELECT
  eal.id,
  eal.empresa_id,
  eal.created_at,
  COALESCE(eal.action_type, eal.operation) AS evento,
  eal.source,
  eal.severity,
  eal.details
FROM public.enterprise_audit_logs eal
WHERE eal.severity = 'critical';

COMMIT;

-- ===== END supabase\rebuild\05_analytics_layer_v2.sql =====


-- ===== BEGIN supabase\rebuild\08_cleanup_legacy_objects.sql =====

-- FASE 8 - LIMPEZA DEFINITIVA DE LEGADO (PÓS-REFACTOR)
-- Remove objetos legados que não são mais usados pelo sistema refatorado.

BEGIN;

-- Desliga temporariamente o bloqueio para permitir limpeza inicial de legado
DROP EVENT TRIGGER IF EXISTS trg_prevent_legacy_auditoria;

-- Remover views de compatibilidade legadas
DROP VIEW IF EXISTS public.auditoria_logs;
DROP VIEW IF EXISTS public.auditoria;

-- Remover triggers antigos que apontam para registrar_auditoria
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name, t.tgname AS trigger_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
      AND p.proname = 'registrar_auditoria'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I', r.trigger_name, r.schema_name, r.table_name);
  END LOOP;
END
$$;

-- Remover função legado de auditoria (se existir)
DROP FUNCTION IF EXISTS public.registrar_auditoria() CASCADE;

-- Remover tabelas legadas de auditoria
DROP TABLE IF EXISTS public.auditoria_logs;
DROP TABLE IF EXISTS public.auditoria;

-- Reativar bloqueio anti-regressão para impedir volta de objetos legados
CREATE OR REPLACE FUNCTION public.prevent_legacy_auditoria_table()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF lower(cmd.object_identity) LIKE '%public.auditoria%' THEN
      RAISE EXCEPTION 'Tabela/objeto legado auditoria é proibido no backend v2';
    END IF;
  END LOOP;
END;
$$;

CREATE EVENT TRIGGER trg_prevent_legacy_auditoria
ON ddl_command_end
EXECUTE FUNCTION public.prevent_legacy_auditoria_table();

COMMIT;

-- Smoke check pós-limpeza
SELECT to_regclass('public.auditoria') AS legacy_auditoria;
SELECT to_regclass('public.auditoria_logs') AS legacy_auditoria_logs;
SELECT proname FROM pg_proc WHERE proname = 'registrar_auditoria';

-- ===== END supabase\rebuild\08_cleanup_legacy_objects.sql =====


-- ===== BEGIN supabase\rebuild\09_seed_owner_master_users.sql =====

-- FASE 9 - SEED CRÍTICO PÓS-REBUILD
-- Objetivo: manter o banco limpo e já provisionar usuários de governança (SYSTEM_OWNER e MASTER_TI)
-- Pré-requisitos:
--   1) As fases 00..08 já executadas
--   2) Usuários já existentes em auth.users (criados via Auth > Users)
--
-- Ajuste os e-mails abaixo se necessário.

BEGIN;

DO $$
DECLARE
  v_owner_email text := 'pedrozo@gppis.com.br';
  v_master_ti_email text := 'gustavus82@gmail.com';

  v_owner_id uuid;
  v_master_id uuid;
  v_empresa_id uuid;

  v_owner_name text;
  v_master_name text;
BEGIN
  -- Garantir valores de enum esperados
  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'MASTER_TI';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'SYSTEM_OWNER';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  -- Buscar usuário OWNER
  SELECT u.id,
         COALESCE(
           NULLIF(trim(COALESCE(u.raw_user_meta_data->>'name', '')), ''),
           NULLIF(trim(COALESCE(u.email, '')), ''),
           'System Owner'
         )
    INTO v_owner_id, v_owner_name
  FROM auth.users u
  WHERE lower(u.email) = lower(v_owner_email)
  ORDER BY u.created_at DESC
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Usuário OWNER não encontrado em auth.users: %', v_owner_email;
  END IF;

  -- Buscar usuário MASTER_TI
  SELECT u.id,
         COALESCE(
           NULLIF(trim(COALESCE(u.raw_user_meta_data->>'name', '')), ''),
           NULLIF(trim(COALESCE(u.email, '')), ''),
           'Master TI'
         )
    INTO v_master_id, v_master_name
  FROM auth.users u
  WHERE lower(u.email) = lower(v_master_ti_email)
  ORDER BY u.created_at DESC
  LIMIT 1;

  IF v_master_id IS NULL THEN
    v_master_id := v_owner_id;
    v_master_name := COALESCE(v_owner_name, 'Master TI');
    RAISE NOTICE 'MASTER_TI não encontrado (%). Usando OWNER como fallback temporário.', v_master_ti_email;
  END IF;

  -- Garantir empresa padrão para vínculo multi-tenant
  SELECT e.id
    INTO v_empresa_id
  FROM public.empresas e
  ORDER BY e.created_at ASC
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    INSERT INTO public.empresas (nome, slug, status, plano)
    VALUES ('GPPIS', 'gppis', 'active', 'enterprise')
    RETURNING id INTO v_empresa_id;
  END IF;

  -- Garantir allowlist de owner
  IF to_regclass('public.system_owner_allowlist') IS NOT NULL THEN
    INSERT INTO public.system_owner_allowlist (email)
    VALUES (lower(v_owner_email))
    ON CONFLICT (email) DO NOTHING;
  END IF;

  -- Evitar bloqueios de trigger durante seed administrativo
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    BEGIN
      EXECUTE 'ALTER TABLE public.user_roles DISABLE TRIGGER guard_system_owner_role_changes';
    EXCEPTION WHEN undefined_object THEN NULL;
    END;

    BEGIN
      EXECUTE 'ALTER TABLE public.user_roles DISABLE TRIGGER trg_prevent_master_ti_promotion';
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
  END IF;

  -- Enforce: somente este owner fica como SYSTEM_OWNER
  DELETE FROM public.user_roles
  WHERE role = 'SYSTEM_OWNER'::public.app_role
    AND user_id <> v_owner_id;

  -- OWNER profile
  INSERT INTO public.profiles (id, empresa_id, nome, email)
  VALUES (v_owner_id, v_empresa_id, v_owner_name, lower(v_owner_email))
  ON CONFLICT (id) DO UPDATE
    SET empresa_id = EXCLUDED.empresa_id,
        nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        updated_at = now();

  -- MASTER_TI profile
  INSERT INTO public.profiles (id, empresa_id, nome, email)
  VALUES (v_master_id, v_empresa_id, v_master_name, lower(v_master_ti_email))
  ON CONFLICT (id) DO UPDATE
    SET empresa_id = EXCLUDED.empresa_id,
        nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        updated_at = now();

  -- Limpar roles conflitantes desses usuários e reaplicar padrão
  DELETE FROM public.user_roles
  WHERE user_id IN (v_owner_id, v_master_id)
    AND role IN ('SYSTEM_OWNER'::public.app_role, 'MASTER_TI'::public.app_role);

  INSERT INTO public.user_roles (user_id, empresa_id, role)
  VALUES (v_owner_id, v_empresa_id, 'SYSTEM_OWNER'::public.app_role)
  ON CONFLICT (user_id, empresa_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, empresa_id, role)
  VALUES (v_master_id, v_empresa_id, 'MASTER_TI'::public.app_role)
  ON CONFLICT (user_id, empresa_id, role) DO NOTHING;

  -- Reabilitar triggers
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    BEGIN
      EXECUTE 'ALTER TABLE public.user_roles ENABLE TRIGGER guard_system_owner_role_changes';
    EXCEPTION WHEN undefined_object THEN NULL;
    END;

    BEGIN
      EXECUTE 'ALTER TABLE public.user_roles ENABLE TRIGGER trg_prevent_master_ti_promotion';
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
  END IF;
END;
$$;

COMMIT;

-- Verificação rápida (retorna registros esperados)
SELECT p.id, p.nome, p.email, p.empresa_id
FROM public.profiles p
WHERE lower(p.email) IN ('pedrozo@gppis.com.br', 'gustavus82@gmail.com')
ORDER BY p.email;

SELECT ur.user_id, ur.empresa_id, ur.role
FROM public.user_roles ur
WHERE ur.role IN ('SYSTEM_OWNER'::public.app_role, 'MASTER_TI'::public.app_role)
ORDER BY ur.role, ur.user_id;

DO $$
BEGIN
  IF to_regclass('public.system_owner_allowlist') IS NOT NULL THEN
    PERFORM 1 FROM public.system_owner_allowlist;
  END IF;
END;
$$;

-- ===== END supabase\rebuild\09_seed_owner_master_users.sql =====

