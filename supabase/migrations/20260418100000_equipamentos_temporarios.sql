-- ============================================================================
-- Migration: Ativos Temporários (Locação / Empréstimo)
-- Data: 2026-04-18
-- Descrição: Adiciona suporte a equipamentos temporários com data de vencimento
--            e origem (próprio, locado, terceiro). Permite cadastro rápido inline
--            na emissão de O.S e alerta automático de vencimento via notificações.
-- ============================================================================

-- 1) Novos campos na tabela equipamentos
ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS temporario boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_vencimento date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'proprio';

-- 2) Constraint para valores válidos de origem
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'equipamentos_origem_check'
  ) THEN
    ALTER TABLE public.equipamentos
      ADD CONSTRAINT equipamentos_origem_check
      CHECK (origem IN ('proprio', 'locado', 'terceiro'));
  END IF;
END $$;

-- 3) Constraint: data_vencimento obrigatória quando temporario = true
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'equipamentos_temporario_vencimento_check'
  ) THEN
    ALTER TABLE public.equipamentos
      ADD CONSTRAINT equipamentos_temporario_vencimento_check
      CHECK (
        (temporario = false) OR
        (temporario = true AND data_vencimento IS NOT NULL)
      );
  END IF;
END $$;

-- 4) Index para queries de notificação (ativos temporários próximos do vencimento)
CREATE INDEX IF NOT EXISTS idx_equipamentos_temporario_vencimento
  ON public.equipamentos (empresa_id, data_vencimento)
  WHERE temporario = true AND ativo = true;

-- 5) Comentários
COMMENT ON COLUMN public.equipamentos.temporario IS 'Indica se o ativo é temporário (locado/emprestado)';
COMMENT ON COLUMN public.equipamentos.data_vencimento IS 'Data limite de permanência do ativo temporário na empresa';
COMMENT ON COLUMN public.equipamentos.origem IS 'Origem do ativo: proprio, locado ou terceiro';
-- migration placeholder