-- ============================================================================
-- Migration: Add missing technical columns to componentes_equipamento
-- 
-- The rebuild migration (20260302200100) recreated the table with a simplified
-- schema (nome, descricao, criticidade only). This migration restores the full
-- technical columns that the frontend (ComponenteFormDialog, import, hooks) 
-- requires for proper component management.
-- ============================================================================

ALTER TABLE public.componentes_equipamento
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.componentes_equipamento(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS codigo text,
  ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'OUTRO',
  ADD COLUMN IF NOT EXISTS fabricante text,
  ADD COLUMN IF NOT EXISTS modelo text,
  ADD COLUMN IF NOT EXISTS numero_serie text,
  ADD COLUMN IF NOT EXISTS potencia text,
  ADD COLUMN IF NOT EXISTS rpm text,
  ADD COLUMN IF NOT EXISTS tensao text,
  ADD COLUMN IF NOT EXISTS corrente text,
  ADD COLUMN IF NOT EXISTS dimensoes jsonb,
  ADD COLUMN IF NOT EXISTS especificacoes jsonb,
  ADD COLUMN IF NOT EXISTS quantidade integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS posicao text,
  ADD COLUMN IF NOT EXISTS data_instalacao date,
  ADD COLUMN IF NOT EXISTS vida_util_horas integer,
  ADD COLUMN IF NOT EXISTS horas_operacao integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultima_manutencao date,
  ADD COLUMN IF NOT EXISTS proxima_manutencao date,
  ADD COLUMN IF NOT EXISTS intervalo_manutencao_dias integer,
  ADD COLUMN IF NOT EXISTS estado text DEFAULT 'BOM',
  ADD COLUMN IF NOT EXISTS observacoes text;

-- Performance indexes for new columns
CREATE INDEX IF NOT EXISTS idx_componentes_parent_id ON public.componentes_equipamento(parent_id);
CREATE INDEX IF NOT EXISTS idx_componentes_tipo ON public.componentes_equipamento(tipo);
CREATE INDEX IF NOT EXISTS idx_componentes_codigo ON public.componentes_equipamento(codigo);
