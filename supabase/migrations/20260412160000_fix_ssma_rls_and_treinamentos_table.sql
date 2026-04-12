-- ============================================================
-- FIX: RLS policies para epis, entregas_epi, fichas_seguranca
--      usando subquery de profiles (padrao confiavel web)
--      + cria tabela treinamentos_ssma (nunca aplicada em prod)
-- ============================================================

-- ============================================================
-- PARTE 1: epis
-- ============================================================
DROP POLICY IF EXISTS tenant_select_epis   ON public.epis;
DROP POLICY IF EXISTS tenant_insert_epis   ON public.epis;
DROP POLICY IF EXISTS tenant_update_epis   ON public.epis;
DROP POLICY IF EXISTS tenant_delete_epis   ON public.epis;
DROP POLICY IF EXISTS epis_select          ON public.epis;
DROP POLICY IF EXISTS epis_insert          ON public.epis;
DROP POLICY IF EXISTS epis_update          ON public.epis;
DROP POLICY IF EXISTS epis_delete          ON public.epis;

CREATE POLICY epis_select ON public.epis FOR SELECT
  USING (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY epis_insert ON public.epis FOR INSERT
  WITH CHECK (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY epis_update ON public.epis FOR UPDATE
  USING (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY epis_delete ON public.epis FOR DELETE
  USING (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));

-- ============================================================
-- PARTE 2: entregas_epi
-- ============================================================
DROP POLICY IF EXISTS tenant_select_entregas_epi ON public.entregas_epi;
DROP POLICY IF EXISTS tenant_insert_entregas_epi ON public.entregas_epi;
DROP POLICY IF EXISTS tenant_update_entregas_epi ON public.entregas_epi;
DROP POLICY IF EXISTS tenant_delete_entregas_epi ON public.entregas_epi;
DROP POLICY IF EXISTS entregas_epi_select         ON public.entregas_epi;
DROP POLICY IF EXISTS entregas_epi_insert         ON public.entregas_epi;
DROP POLICY IF EXISTS entregas_epi_update         ON public.entregas_epi;
DROP POLICY IF EXISTS entregas_epi_delete         ON public.entregas_epi;

CREATE POLICY entregas_epi_select ON public.entregas_epi FOR SELECT
  USING (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY entregas_epi_insert ON public.entregas_epi FOR INSERT
  WITH CHECK (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY entregas_epi_update ON public.entregas_epi FOR UPDATE
  USING (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY entregas_epi_delete ON public.entregas_epi FOR DELETE
  USING (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));

-- ============================================================
-- PARTE 3: fichas_seguranca (FISPQs)
-- ============================================================
DROP POLICY IF EXISTS tenant_select_fichas_seguranca ON public.fichas_seguranca;
DROP POLICY IF EXISTS tenant_insert_fichas_seguranca ON public.fichas_seguranca;
DROP POLICY IF EXISTS tenant_update_fichas_seguranca ON public.fichas_seguranca;
DROP POLICY IF EXISTS tenant_delete_fichas_seguranca ON public.fichas_seguranca;
DROP POLICY IF EXISTS fichas_seguranca_select         ON public.fichas_seguranca;
DROP POLICY IF EXISTS fichas_seguranca_insert         ON public.fichas_seguranca;
DROP POLICY IF EXISTS fichas_seguranca_update         ON public.fichas_seguranca;
DROP POLICY IF EXISTS fichas_seguranca_delete         ON public.fichas_seguranca;

CREATE POLICY fichas_seguranca_select ON public.fichas_seguranca FOR SELECT
  USING (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY fichas_seguranca_insert ON public.fichas_seguranca FOR INSERT
  WITH CHECK (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY fichas_seguranca_update ON public.fichas_seguranca FOR UPDATE
  USING (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY fichas_seguranca_delete ON public.fichas_seguranca FOR DELETE
  USING (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));

-- ============================================================
-- PARTE 4: treinamentos_ssma (tabela nunca criada em prod)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.treinamentos_ssma (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  titulo       TEXT NOT NULL,
  descricao    TEXT,
  tipo         TEXT NOT NULL,
  instrutor    TEXT,
  data_inicio  DATE,
  data_fim     DATE,
  carga_horaria INTEGER,
  status       TEXT NOT NULL DEFAULT 'planejado',
  participantes INTEGER DEFAULT 0,
  concluintes   INTEGER DEFAULT 0,
  observacoes  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treinamentos_ssma_empresa ON public.treinamentos_ssma(empresa_id);
CREATE INDEX IF NOT EXISTS idx_treinamentos_ssma_status  ON public.treinamentos_ssma(status);

ALTER TABLE public.treinamentos_ssma ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS treinamentos_ssma_select ON public.treinamentos_ssma;
DROP POLICY IF EXISTS treinamentos_ssma_insert ON public.treinamentos_ssma;
DROP POLICY IF EXISTS treinamentos_ssma_update ON public.treinamentos_ssma;
DROP POLICY IF EXISTS treinamentos_ssma_delete ON public.treinamentos_ssma;

CREATE POLICY treinamentos_ssma_select ON public.treinamentos_ssma FOR SELECT
  USING (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY treinamentos_ssma_insert ON public.treinamentos_ssma FOR INSERT
  WITH CHECK (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY treinamentos_ssma_update ON public.treinamentos_ssma FOR UPDATE
  USING (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY treinamentos_ssma_delete ON public.treinamentos_ssma FOR DELETE
  USING (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));

GRANT ALL ON public.treinamentos_ssma TO authenticated;
GRANT ALL ON public.treinamentos_ssma TO service_role;

-- Notifica PostgREST para recarregar cache do schema
NOTIFY pgrst, 'reload schema';
