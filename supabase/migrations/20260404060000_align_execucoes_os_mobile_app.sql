-- ============================================================
-- Migration: Align execucoes_os + ordens_servico with mobile app
-- Adds missing columns used by mecanico-app
-- ============================================================

-- ─── execucoes_os: add causa + observacoes ──────────────────
-- The mobile app records root-cause analysis and observations per execution
ALTER TABLE public.execucoes_os
  ADD COLUMN IF NOT EXISTS causa TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- ─── execucoes_os: change hora_inicio/hora_fim from TIME to TIMESTAMPTZ ──
-- The mobile app stores full ISO timestamps (when execution started/ended)
-- TIME type loses the date component; TIMESTAMPTZ is correct for tracking
ALTER TABLE public.execucoes_os
  ALTER COLUMN hora_inicio TYPE TIMESTAMPTZ USING
    CASE
      WHEN hora_inicio IS NOT NULL
        THEN (COALESCE(data_execucao, CURRENT_DATE)::TEXT || ' ' || hora_inicio::TEXT)::TIMESTAMPTZ
      ELSE NULL
    END,
  ALTER COLUMN hora_fim TYPE TIMESTAMPTZ USING
    CASE
      WHEN hora_fim IS NOT NULL
        THEN (COALESCE(data_execucao, CURRENT_DATE)::TEXT || ' ' || hora_fim::TEXT)::TIMESTAMPTZ
      ELSE NULL
    END;

-- ─── ordens_servico: add equipamento_id ─────────────────────
-- Links OS to the equipamentos table (mobile app sends this on service requests)
ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS equipamento_id UUID REFERENCES public.equipamentos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_os_equipamento ON public.ordens_servico(equipamento_id);
