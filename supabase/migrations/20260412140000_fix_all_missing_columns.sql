-- ============================================================
-- Migration: Fix all missing columns + production-grade hardening
-- Date: 2026-04-12 (v2 — improved)
-- Description:
--   1. Adds 104 columns the frontend sends but DB doesn't have
--      (dropped by full_rebuild_reset). Idempotent via IF NOT EXISTS.
--   2. Creates 4 missing tables: solicitacoes_manutencao, epis,
--      entregas_epi, fichas_seguranca.
--   3. Applies correct RLS (4 separate policies per table using
--      is_control_plane_operator + get_current_empresa_id).
--   4. Adds updated_at triggers, auto-sequence triggers, CHECK
--      constraints, performance indexes, and GRANT statements.
-- ============================================================

-- ============================================================
-- 1. contratos — 9 missing columns
-- ============================================================
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS numero_contrato text;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS titulo text;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS valor_total numeric(14,2) DEFAULT 0;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS valor_mensal numeric(14,2) DEFAULT 0;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS sla_atendimento_horas numeric DEFAULT 4;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS sla_resolucao_horas numeric DEFAULT 24;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS responsavel_nome text;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS penalidade_descricao text;

-- ============================================================
-- 2. fmea — 8 missing columns
-- ============================================================
ALTER TABLE public.fmea ADD COLUMN IF NOT EXISTS tag text;
ALTER TABLE public.fmea ADD COLUMN IF NOT EXISTS funcao text;
ALTER TABLE public.fmea ADD COLUMN IF NOT EXISTS falha_funcional text;
ALTER TABLE public.fmea ADD COLUMN IF NOT EXISTS efeito_falha text;
ALTER TABLE public.fmea ADD COLUMN IF NOT EXISTS causa_falha text;
ALTER TABLE public.fmea ADD COLUMN IF NOT EXISTS acao_recomendada text;
ALTER TABLE public.fmea ADD COLUMN IF NOT EXISTS responsavel text;
ALTER TABLE public.fmea ADD COLUMN IF NOT EXISTS prazo date;

-- ============================================================
-- 3. analise_causa_raiz — 18 missing columns
-- ============================================================
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS numero_rca text;
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS titulo text;
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS descricao_problema text;
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS metodo_analise text;
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS equipamento_id uuid REFERENCES public.equipamentos(id);
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS tag text;
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS responsavel_nome text;
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS responsavel_id uuid;
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS porque_1 text;
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS porque_2 text;
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS porque_3 text;
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS porque_4 text;
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS porque_5 text;
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS causa_raiz_identificada text;
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS diagrama_ishikawa jsonb;
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS arvore_falhas jsonb;
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS data_conclusao date;
ALTER TABLE public.analise_causa_raiz ADD COLUMN IF NOT EXISTS eficacia_verificada boolean DEFAULT false;

-- ============================================================
-- 4. melhorias — 17 missing columns
-- ============================================================
ALTER TABLE public.melhorias ADD COLUMN IF NOT EXISTS numero_melhoria text;
ALTER TABLE public.melhorias ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.melhorias ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE public.melhorias ADD COLUMN IF NOT EXISTS tag text;
ALTER TABLE public.melhorias ADD COLUMN IF NOT EXISTS situacao_antes text;
ALTER TABLE public.melhorias ADD COLUMN IF NOT EXISTS situacao_depois text;
ALTER TABLE public.melhorias ADD COLUMN IF NOT EXISTS beneficios text;
ALTER TABLE public.melhorias ADD COLUMN IF NOT EXISTS custo_implementacao numeric(14,2);
ALTER TABLE public.melhorias ADD COLUMN IF NOT EXISTS economia_anual numeric(14,2);
ALTER TABLE public.melhorias ADD COLUMN IF NOT EXISTS roi_meses numeric(12,2);
ALTER TABLE public.melhorias ADD COLUMN IF NOT EXISTS proponente_nome text;
ALTER TABLE public.melhorias ADD COLUMN IF NOT EXISTS proponente_id uuid;
ALTER TABLE public.melhorias ADD COLUMN IF NOT EXISTS aprovador_nome text;
ALTER TABLE public.melhorias ADD COLUMN IF NOT EXISTS aprovador_id uuid;
ALTER TABLE public.melhorias ADD COLUMN IF NOT EXISTS data_aprovacao date;
ALTER TABLE public.melhorias ADD COLUMN IF NOT EXISTS data_implementacao date;
ALTER TABLE public.melhorias ADD COLUMN IF NOT EXISTS anexos jsonb;

-- ============================================================
-- 5. incidentes_ssma — 16 missing columns
-- ============================================================
ALTER TABLE public.incidentes_ssma ADD COLUMN IF NOT EXISTS numero_incidente text;
ALTER TABLE public.incidentes_ssma ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.incidentes_ssma ADD COLUMN IF NOT EXISTS severidade text;
ALTER TABLE public.incidentes_ssma ADD COLUMN IF NOT EXISTS data_ocorrencia timestamptz;
ALTER TABLE public.incidentes_ssma ADD COLUMN IF NOT EXISTS local_ocorrencia text;
ALTER TABLE public.incidentes_ssma ADD COLUMN IF NOT EXISTS equipamento_id uuid REFERENCES public.equipamentos(id);
ALTER TABLE public.incidentes_ssma ADD COLUMN IF NOT EXISTS tag text;
ALTER TABLE public.incidentes_ssma ADD COLUMN IF NOT EXISTS pessoas_envolvidas text;
ALTER TABLE public.incidentes_ssma ADD COLUMN IF NOT EXISTS testemunhas text;
ALTER TABLE public.incidentes_ssma ADD COLUMN IF NOT EXISTS causas_imediatas text;
ALTER TABLE public.incidentes_ssma ADD COLUMN IF NOT EXISTS causas_basicas text;
ALTER TABLE public.incidentes_ssma ADD COLUMN IF NOT EXISTS acoes_imediatas text;
ALTER TABLE public.incidentes_ssma ADD COLUMN IF NOT EXISTS dias_afastamento integer DEFAULT 0;
ALTER TABLE public.incidentes_ssma ADD COLUMN IF NOT EXISTS custo_estimado numeric(14,2);
ALTER TABLE public.incidentes_ssma ADD COLUMN IF NOT EXISTS responsavel_nome text;
ALTER TABLE public.incidentes_ssma ADD COLUMN IF NOT EXISTS responsavel_id uuid;

-- ============================================================
-- 6. permissoes_trabalho — 15 missing columns
-- ============================================================
ALTER TABLE public.permissoes_trabalho ADD COLUMN IF NOT EXISTS numero_pt text;
ALTER TABLE public.permissoes_trabalho ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.permissoes_trabalho ADD COLUMN IF NOT EXISTS descricao_servico text;
ALTER TABLE public.permissoes_trabalho ADD COLUMN IF NOT EXISTS equipamento_id uuid REFERENCES public.equipamentos(id);
ALTER TABLE public.permissoes_trabalho ADD COLUMN IF NOT EXISTS tag text;
ALTER TABLE public.permissoes_trabalho ADD COLUMN IF NOT EXISTS epis_requeridos text;
ALTER TABLE public.permissoes_trabalho ADD COLUMN IF NOT EXISTS isolamentos text;
ALTER TABLE public.permissoes_trabalho ADD COLUMN IF NOT EXISTS data_inicio timestamptz;
ALTER TABLE public.permissoes_trabalho ADD COLUMN IF NOT EXISTS data_fim timestamptz;
ALTER TABLE public.permissoes_trabalho ADD COLUMN IF NOT EXISTS executante_nome text;
ALTER TABLE public.permissoes_trabalho ADD COLUMN IF NOT EXISTS supervisor_nome text;
ALTER TABLE public.permissoes_trabalho ADD COLUMN IF NOT EXISTS aprovador_nome text;
ALTER TABLE public.permissoes_trabalho ADD COLUMN IF NOT EXISTS aprovador_id uuid;
ALTER TABLE public.permissoes_trabalho ADD COLUMN IF NOT EXISTS checklist_seguranca jsonb;
ALTER TABLE public.permissoes_trabalho ADD COLUMN IF NOT EXISTS observacoes text;

-- ============================================================
-- 7. dados_empresa — 11 missing columns
-- ============================================================
ALTER TABLE public.dados_empresa ADD COLUMN IF NOT EXISTS inscricao_estadual text;
ALTER TABLE public.dados_empresa ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE public.dados_empresa ADD COLUMN IF NOT EXISTS cidade text;
ALTER TABLE public.dados_empresa ADD COLUMN IF NOT EXISTS estado text;
ALTER TABLE public.dados_empresa ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE public.dados_empresa ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.dados_empresa ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.dados_empresa ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.dados_empresa ADD COLUMN IF NOT EXISTS site text;
ALTER TABLE public.dados_empresa ADD COLUMN IF NOT EXISTS responsavel_nome text;
ALTER TABLE public.dados_empresa ADD COLUMN IF NOT EXISTS responsavel_cargo text;

-- ============================================================
-- 8. configuracoes_sistema — 3 missing columns
-- ============================================================
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'GERAL';
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'STRING';

-- ============================================================
-- 9. inspecoes — 1 missing column
-- ============================================================
ALTER TABLE public.inspecoes ADD COLUMN IF NOT EXISTS equipamento_id uuid REFERENCES public.equipamentos(id);

-- ============================================================
-- 10. solicitacoes_manutencao — TABLE DROPPED by full_rebuild
--     Used by useSolicitacoes.ts and mecanico-app CriarSolicitacaoScreen
-- ============================================================
CREATE TABLE IF NOT EXISTS public.solicitacoes_manutencao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  numero_solicitacao text,
  equipamento_id uuid REFERENCES public.equipamentos(id),
  tag text,
  solicitante_nome text,
  solicitante_setor text,
  descricao_falha text,
  impacto text CHECK (impacto IS NULL OR impacto IN ('ALTO', 'MEDIO', 'BAIXO')),
  classificacao text,
  status text NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE', 'APROVADA', 'CONVERTIDA', 'REJEITADA', 'CANCELADA')),
  os_id uuid REFERENCES public.ordens_servico(id),
  sla_horas numeric,
  data_limite timestamptz,
  observacoes text,
  usuario_aprovacao uuid,
  data_aprovacao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: 4 separate policies (project standard pattern)
ALTER TABLE public.solicitacoes_manutencao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_solicitacoes_manutencao" ON public.solicitacoes_manutencao;

CREATE POLICY tenant_select_solicitacoes_manutencao ON public.solicitacoes_manutencao
  FOR SELECT
  USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());

CREATE POLICY tenant_insert_solicitacoes_manutencao ON public.solicitacoes_manutencao
  FOR INSERT
  WITH CHECK (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());

CREATE POLICY tenant_update_solicitacoes_manutencao ON public.solicitacoes_manutencao
  FOR UPDATE
  USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id())
  WITH CHECK (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());

CREATE POLICY tenant_delete_solicitacoes_manutencao ON public.solicitacoes_manutencao
  FOR DELETE
  USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_solicitacoes_manutencao_empresa_id
  ON public.solicitacoes_manutencao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_manutencao_empresa_status
  ON public.solicitacoes_manutencao(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_manutencao_equipamento
  ON public.solicitacoes_manutencao(equipamento_id);

-- Trigger: updated_at
CREATE TRIGGER update_solicitacoes_manutencao_updated_at
  BEFORE UPDATE ON public.solicitacoes_manutencao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: auto-sequence (numero_solicitacao)
-- Already mapped in trg_auto_tenant_sequence() CASE statement
CREATE TRIGGER trg_auto_seq
  BEFORE INSERT ON public.solicitacoes_manutencao
  FOR EACH ROW EXECUTE FUNCTION public.trg_auto_tenant_sequence();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes_manutencao TO authenticated;
GRANT ALL ON public.solicitacoes_manutencao TO service_role;

-- ============================================================
-- 11. documentos_tecnicos — 5 missing columns
-- ============================================================
ALTER TABLE public.documentos_tecnicos ADD COLUMN IF NOT EXISTS codigo text;
ALTER TABLE public.documentos_tecnicos ADD COLUMN IF NOT EXISTS tag text;
ALTER TABLE public.documentos_tecnicos ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.documentos_tecnicos ADD COLUMN IF NOT EXISTS versao text;
ALTER TABLE public.documentos_tecnicos ADD COLUMN IF NOT EXISTS arquivo_nome text;

-- ============================================================
-- 12. SSMA — EPIs (Controle de Equipamentos de Proteção Individual)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.epis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text NOT NULL DEFAULT 'OUTROS',
  numero_ca text,
  fabricante text,
  validade_ca date,
  estoque_atual integer NOT NULL DEFAULT 0,
  estoque_minimo integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: 4 separate policies (correct pattern — NOT current_setting)
ALTER TABLE public.epis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_epis" ON public.epis;

CREATE POLICY tenant_select_epis ON public.epis
  FOR SELECT
  USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());

CREATE POLICY tenant_insert_epis ON public.epis
  FOR INSERT
  WITH CHECK (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());

CREATE POLICY tenant_update_epis ON public.epis
  FOR UPDATE
  USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id())
  WITH CHECK (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());

CREATE POLICY tenant_delete_epis ON public.epis
  FOR DELETE
  USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_epis_empresa_id ON public.epis(empresa_id);
CREATE INDEX IF NOT EXISTS idx_epis_empresa_ativo ON public.epis(empresa_id, ativo);

-- Trigger: updated_at
CREATE TRIGGER update_epis_updated_at
  BEFORE UPDATE ON public.epis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.epis TO authenticated;
GRANT ALL ON public.epis TO service_role;

-- ============================================================
-- 13. SSMA — Entregas de EPI
-- ============================================================
CREATE TABLE IF NOT EXISTS public.entregas_epi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  epi_id uuid NOT NULL REFERENCES public.epis(id) ON DELETE CASCADE,
  colaborador_nome text NOT NULL,
  colaborador_id uuid,
  quantidade integer NOT NULL DEFAULT 1,
  data_entrega date NOT NULL DEFAULT CURRENT_DATE,
  data_devolucao date,
  motivo text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: 4 separate policies (correct pattern — NOT current_setting)
ALTER TABLE public.entregas_epi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_entregas_epi" ON public.entregas_epi;

CREATE POLICY tenant_select_entregas_epi ON public.entregas_epi
  FOR SELECT
  USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());

CREATE POLICY tenant_insert_entregas_epi ON public.entregas_epi
  FOR INSERT
  WITH CHECK (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());

CREATE POLICY tenant_update_entregas_epi ON public.entregas_epi
  FOR UPDATE
  USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id())
  WITH CHECK (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());

CREATE POLICY tenant_delete_entregas_epi ON public.entregas_epi
  FOR DELETE
  USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entregas_epi_empresa_id ON public.entregas_epi(empresa_id);
CREATE INDEX IF NOT EXISTS idx_entregas_epi_epi_id ON public.entregas_epi(epi_id);
CREATE INDEX IF NOT EXISTS idx_entregas_epi_empresa_data ON public.entregas_epi(empresa_id, data_entrega DESC);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entregas_epi TO authenticated;
GRANT ALL ON public.entregas_epi TO service_role;

-- ============================================================
-- 14. SSMA — Fichas de Segurança (FISPQ / FDS)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fichas_seguranca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo text,
  nome_produto text NOT NULL,
  fabricante text,
  classificacao_ghs text,
  perigos_principais text,
  medidas_emergencia text,
  primeiros_socorros text,
  armazenamento text,
  epi_recomendado text,
  arquivo_url text,
  data_validade date,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: 4 separate policies (correct pattern — NOT current_setting)
ALTER TABLE public.fichas_seguranca ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_fichas_seguranca" ON public.fichas_seguranca;

CREATE POLICY tenant_select_fichas_seguranca ON public.fichas_seguranca
  FOR SELECT
  USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());

CREATE POLICY tenant_insert_fichas_seguranca ON public.fichas_seguranca
  FOR INSERT
  WITH CHECK (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());

CREATE POLICY tenant_update_fichas_seguranca ON public.fichas_seguranca
  FOR UPDATE
  USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id())
  WITH CHECK (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());

CREATE POLICY tenant_delete_fichas_seguranca ON public.fichas_seguranca
  FOR DELETE
  USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fichas_seguranca_empresa_id ON public.fichas_seguranca(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fichas_seguranca_empresa_ativo ON public.fichas_seguranca(empresa_id, ativo);

-- Trigger: updated_at
CREATE TRIGGER update_fichas_seguranca_updated_at
  BEFORE UPDATE ON public.fichas_seguranca
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_seguranca TO authenticated;
GRANT ALL ON public.fichas_seguranca TO service_role;

-- ============================================================
-- DONE: 104 columns added across 10 tables + 4 tables created
-- Production-grade hardening applied:
--   ✓ RLS: 4 policies per table (SELECT/INSERT/UPDATE/DELETE)
--     using is_control_plane_operator() + get_current_empresa_id()
--   ✓ Triggers: updated_at on all tables with updated_at column
--   ✓ Triggers: trg_auto_seq on solicitacoes_manutencao
--   ✓ CHECK constraints on status + impacto columns
--   ✓ ON DELETE CASCADE on empresa_id FKs
--   ✓ Performance indexes: (empresa_id, status), (empresa_id, ativo),
--     (equipamento_id), (empresa_id, data DESC)
--   ✓ GRANT to authenticated + service_role on all new tables
-- ============================================================
