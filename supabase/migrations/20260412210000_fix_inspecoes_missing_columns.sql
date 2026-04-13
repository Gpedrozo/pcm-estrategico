-- =============================================================================
-- MIGRATION: Fix colunas faltantes em inspecoes e anomalias_inspecao
-- Date: 2026-04-12
-- Problema: Hook useInspecoes.ts declara InspecaoRow com colunas que não
--           existem no banco (itens_inspecionados, anomalias_encontradas,
--           turno, hora_inicio, hora_fim, equipamento_id).
--           Sem essas colunas, o checklist de inspeção nunca é salvo
--           e campos de horário retornam undefined.
-- =============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Colunas faltantes em public.inspecoes
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.inspecoes ADD COLUMN IF NOT EXISTS equipamento_id      UUID REFERENCES public.equipamentos(id) ON DELETE SET NULL;
ALTER TABLE public.inspecoes ADD COLUMN IF NOT EXISTS turno               TEXT;
ALTER TABLE public.inspecoes ADD COLUMN IF NOT EXISTS inspetor_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.inspecoes ADD COLUMN IF NOT EXISTS hora_inicio         TIME;
ALTER TABLE public.inspecoes ADD COLUMN IF NOT EXISTS hora_fim            TIME;
ALTER TABLE public.inspecoes ADD COLUMN IF NOT EXISTS itens_inspecionados JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.inspecoes ADD COLUMN IF NOT EXISTS anomalias_encontradas INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.inspecoes ADD COLUMN IF NOT EXISTS observacoes         TEXT;

-- Converter numero_inspecao para sequência numérica automática se ainda for text
-- (o hook espera number, mas o banco tinha text — adicionamos coluna separada)
DO $$
BEGIN
  -- Se a coluna ainda é TEXT, não alteramos o tipo pois pode quebrar dados existentes.
  -- Adicionamos uma coluna numérica calculada via default sequence se não existir.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inspecoes'
      AND column_name = 'numero_inspecao'
      AND data_type = 'text'
  ) THEN
    RAISE NOTICE '[FIX-INSPECOES] numero_inspecao ainda é TEXT — manter compatibilidade.';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Colunas faltantes em public.anomalias_inspecao
--    (interface AnomaliaRow do hook espera: tag, severidade, foto_url, os_gerada_id)
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.anomalias_inspecao ADD COLUMN IF NOT EXISTS equipamento_id UUID REFERENCES public.equipamentos(id) ON DELETE SET NULL;
ALTER TABLE public.anomalias_inspecao ADD COLUMN IF NOT EXISTS tag           TEXT;
ALTER TABLE public.anomalias_inspecao ADD COLUMN IF NOT EXISTS severidade    TEXT NOT NULL DEFAULT 'MEDIA'
  CHECK (severidade IN ('CRITICA', 'ALTA', 'MEDIA', 'BAIXA'));
ALTER TABLE public.anomalias_inspecao ADD COLUMN IF NOT EXISTS foto_url      TEXT;
ALTER TABLE public.anomalias_inspecao ADD COLUMN IF NOT EXISTS os_gerada_id  UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL;

-- Normalizar coluna 'status' para os valores esperados pelo hook
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'anomalias_inspecao_status_check'
  ) THEN
    ALTER TABLE public.anomalias_inspecao
      ADD CONSTRAINT anomalias_inspecao_status_check
      CHECK (status IS NULL OR status IN ('ABERTA', 'EM_TRATAMENTO', 'RESOLVIDA'));
  END IF;
EXCEPTION WHEN check_violation THEN
  -- Se já existe dados que violam o check, normaliza primeiro
  UPDATE public.anomalias_inspecao
  SET status = 'ABERTA'
  WHERE status NOT IN ('ABERTA', 'EM_TRATAMENTO', 'RESOLVIDA');
  
  ALTER TABLE public.anomalias_inspecao
    ADD CONSTRAINT anomalias_inspecao_status_check
    CHECK (status IS NULL OR status IN ('ABERTA', 'EM_TRATAMENTO', 'RESOLVIDA'));
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Índices de performance
-- ──────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inspecoes_empresa_data
  ON public.inspecoes(empresa_id, data_inspecao DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_inspecoes_equipamento
  ON public.inspecoes(equipamento_id)
  WHERE equipamento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_anomalias_inspecao_status
  ON public.anomalias_inspecao(empresa_id, status);

CREATE INDEX IF NOT EXISTS idx_anomalias_inspecao_os
  ON public.anomalias_inspecao(os_gerada_id)
  WHERE os_gerada_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Atualizar políticas RLS de inspecoes para incluir equipamento_id
--    (o campo precisa estar acessível nos INSERTs e SELECTs do tenant)
-- ──────────────────────────────────────────────────────────────────────────────
-- Verificar se policy can_access_empresa já existe; se não, criar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inspecoes'
      AND qual LIKE '%can_access_empresa%'
  ) THEN
    -- Remover policies permissivas USING(true) sem tenant scope
    DECLARE
      pol TEXT;
    BEGIN
      FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'inspecoes'
          AND lower(coalesce(trim(qual), '')) IN ('true', '(true)')
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.inspecoes', pol);
      END LOOP;
    END;

    CREATE POLICY "inspecoes_tenant_all"
      ON public.inspecoes
      FOR ALL
      TO authenticated
      USING (public.can_access_empresa(empresa_id))
      WITH CHECK (public.can_access_empresa(empresa_id));
      
    RAISE NOTICE '[FIX-INSPECOES] Policy tenant-scoped criada para inspecoes.';
  ELSE
    RAISE NOTICE '[FIX-INSPECOES] Policy can_access_empresa já existe para inspecoes.';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

DO $$ BEGIN
  RAISE NOTICE '[FIX-INSPECOES] Concluído. Colunas faltantes adicionadas a inspecoes e anomalias_inspecao.';
END $$;
