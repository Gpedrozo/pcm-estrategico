-- ============================================================
-- Migration: Fix all missing columns causing silent data loss
-- Date: 2026-04-12
-- Description: Adds columns that the frontend forms send but
--   the database doesn't have (dropped by full_rebuild_reset).
--   Uses ADD COLUMN IF NOT EXISTS for idempotent safety.
-- ============================================================

-- ============================================================
-- 1. contratos — 9 missing columns (service uses .insert() direto → INSERT FAILS)
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
-- 2. fmea — 8 missing columns (insertWithColumnFallback → silent data loss)
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
-- 3. analise_causa_raiz — 18 missing columns (insertWithColumnFallback → silent data loss)
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
-- 4. melhorias — 17 missing columns (insertWithColumnFallback → silent data loss)
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
-- 5. incidentes_ssma — 16 missing columns (insertWithColumnFallback → silent data loss)
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
-- 6. permissoes_trabalho — 15 missing columns (insertWithColumnFallback → silent data loss)
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
-- 7. dados_empresa — 11 missing columns (.insert() direto → INSERT FAILS)
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
-- 8. configuracoes_sistema — 3 missing columns (.insert() direto → INSERT FAILS)
-- ============================================================
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'GERAL';
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'STRING';

-- ============================================================
-- 9. inspecoes — 1 missing column (equipamento_id never added after full_rebuild)
-- ============================================================
ALTER TABLE public.inspecoes ADD COLUMN IF NOT EXISTS equipamento_id uuid REFERENCES public.equipamentos(id);

-- ============================================================
-- 10. solicitacoes_manutencao — TABLE DROPPED by full_rebuild, never recreated
--     Used by useSolicitacoes.ts and mecanico-app CriarSolicitacaoScreen
-- ============================================================
CREATE TABLE IF NOT EXISTS public.solicitacoes_manutencao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  numero_solicitacao text,
  equipamento_id uuid REFERENCES public.equipamentos(id),
  tag text,
  solicitante_nome text,
  solicitante_setor text,
  descricao_falha text,
  impacto text,
  classificacao text,
  status text DEFAULT 'PENDENTE',
  os_id uuid REFERENCES public.ordens_servico(id),
  sla_horas numeric,
  data_limite timestamptz,
  observacoes text,
  usuario_aprovacao uuid,
  data_aprovacao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for solicitacoes_manutencao
ALTER TABLE public.solicitacoes_manutencao ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "tenant_isolation_solicitacoes_manutencao"
    ON public.solicitacoes_manutencao
    FOR ALL
    USING (empresa_id = (SELECT public.get_current_empresa_id()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for tenant isolation
CREATE INDEX IF NOT EXISTS idx_solicitacoes_manutencao_empresa_id
  ON public.solicitacoes_manutencao(empresa_id);

-- ============================================================
-- DONE: 99 columns added across 9 tables + 1 table created
-- All operations are idempotent (IF NOT EXISTS / IF NOT EXISTS)
-- No columns dropped, no columns renamed
-- ============================================================
