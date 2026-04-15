-- ============================================================
-- FOUNDATION: Motor de Execução Unificado
-- Correções estruturais obrigatórias (P1–P4) antes de features
-- ============================================================

-- ── P1a: Adicionar CANCELADA ao CHECK de status ──────────────
-- Atualmente: ABERTA, EM_ANDAMENTO, AGUARDANDO_MATERIAL, AGUARDANDO_APROVACAO, FECHADA
-- Necessário: + CANCELADA (para cancelar O.S. emitidas por engano)
ALTER TABLE public.ordens_servico
  DROP CONSTRAINT IF EXISTS ordens_servico_status_check;

ALTER TABLE public.ordens_servico
  ADD CONSTRAINT ordens_servico_status_check
  CHECK (status = ANY(ARRAY[
    'ABERTA'::text,
    'EM_ANDAMENTO'::text,
    'AGUARDANDO_MATERIAL'::text,
    'AGUARDANDO_APROVACAO'::text,
    'FECHADA'::text,
    'CANCELADA'::text
  ]));

-- ── P1b: Adicionar LUBRIFICACAO ao CHECK de tipo ─────────────
-- Atualmente: CORRETIVA, PREVENTIVA, PREDITIVA, INSPECAO, MELHORIA
-- Necessário: + LUBRIFICACAO (lubrificação é distinta de preventiva no PCM)
ALTER TABLE public.ordens_servico
  DROP CONSTRAINT IF EXISTS ordens_servico_tipo_check;

ALTER TABLE public.ordens_servico
  ADD CONSTRAINT ordens_servico_tipo_check
  CHECK (tipo = ANY(ARRAY[
    'CORRETIVA'::text,
    'PREVENTIVA'::text,
    'PREDITIVA'::text,
    'INSPECAO'::text,
    'MELHORIA'::text,
    'LUBRIFICACAO'::text
  ]));

-- ── P3: FK entre ordens_servico e maintenance_schedule ───────
-- Rastreabilidade: saber de qual item da programação veio cada O.S.
ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS maintenance_schedule_id uuid
  REFERENCES public.maintenance_schedule(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ordens_servico_schedule_id
  ON public.ordens_servico(maintenance_schedule_id)
  WHERE maintenance_schedule_id IS NOT NULL;

-- ── P4: UNIQUE parcial — impede emissão duplicada ────────────
-- Uma entrada de schedule só pode ter UMA O.S. ativa (não-cancelada)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ordens_servico_schedule_active
  ON public.ordens_servico(maintenance_schedule_id)
  WHERE maintenance_schedule_id IS NOT NULL
    AND status != 'CANCELADA';
