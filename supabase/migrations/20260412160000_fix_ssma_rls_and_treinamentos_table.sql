-- ============================================================
-- FIX SSMA TABLES: RLS + treinamentos_ssma missing table
-- Date: 2026-04-12
-- Root causes:
--   1. epis / fichas_seguranca: RLS INSERT policy blocks web users
--      because get_current_empresa_id() may return NULL when empresa_id
--      is not embedded in the JWT. Using direct profiles subquery fix.
--   2. treinamentos_ssma: table does not exist in production DB.
--      Migration 20260408140000 was not pushed.
-- ============================================================

-- ============================================================
-- PARTE 1: Fix RLS em epis
-- ============================================================

-- Remove todas as policies atuais e recria com pattern profiles-subquery
-- (mesmo padrão do treinamentos_ssma que também funciona)

DROP POLICY IF EXISTS tenant_select_epis ON public.epis;
DROP POLICY IF EXISTS tenant_insert_epis ON public.epis;
DROP POLICY IF EXISTS tenant_update_epis ON public.epis;
DROP POLICY IF EXISTS tenant_delete_epis ON public.epis;
DROP POLICY IF EXISTS "tenant_isolation_epis" ON public.epis;

CREATE POLICY "epis_select"
  ON public.epis FOR SELECT TO authenticated
  USING (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "epis_insert"
  ON public.epis FOR INSERT TO authenticated
  WITH CHECK (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "epis_update"
  ON public.epis FOR UPDATE TO authenticated
  USING (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "epis_delete"
  ON public.epis FOR DELETE TO authenticated
  USING (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- ============================================================
-- PARTE 2: Fix RLS em entregas_epi
-- ============================================================

DROP POLICY IF EXISTS tenant_select_entregas_epi ON public.entregas_epi;
DROP POLICY IF EXISTS tenant_insert_entregas_epi ON public.entregas_epi;
DROP POLICY IF EXISTS tenant_update_entregas_epi ON public.entregas_epi;
DROP POLICY IF EXISTS tenant_delete_entregas_epi ON public.entregas_epi;
DROP POLICY IF EXISTS "tenant_isolation_entregas_epi" ON public.entregas_epi;

CREATE POLICY "entregas_epi_select"
  ON public.entregas_epi FOR SELECT TO authenticated
  USING (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "entregas_epi_insert"
  ON public.entregas_epi FOR INSERT TO authenticated
  WITH CHECK (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "entregas_epi_update"
  ON public.entregas_epi FOR UPDATE TO authenticated
  USING (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "entregas_epi_delete"
  ON public.entregas_epi FOR DELETE TO authenticated
  USING (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- ============================================================
-- PARTE 3: Fix RLS em fichas_seguranca
-- ============================================================

DROP POLICY IF EXISTS tenant_select_fichas_seguranca ON public.fichas_seguranca;
DROP POLICY IF EXISTS tenant_insert_fichas_seguranca ON public.fichas_seguranca;
DROP POLICY IF EXISTS tenant_update_fichas_seguranca ON public.fichas_seguranca;
DROP POLICY IF EXISTS tenant_delete_fichas_seguranca ON public.fichas_seguranca;
DROP POLICY IF EXISTS "tenant_isolation_fichas_seguranca" ON public.fichas_seguranca;

CREATE POLICY "fichas_seguranca_select"
  ON public.fichas_seguranca FOR SELECT TO authenticated
  USING (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "fichas_seguranca_insert"
  ON public.fichas_seguranca FOR INSERT TO authenticated
  WITH CHECK (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "fichas_seguranca_update"
  ON public.fichas_seguranca FOR UPDATE TO authenticated
  USING (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "fichas_seguranca_delete"
  ON public.fichas_seguranca FOR DELETE TO authenticated
  USING (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- ============================================================
-- PARTE 4: Criar treinamentos_ssma (se não existe)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.treinamentos_ssma (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID REFERENCES public.profiles(id),
    colaborador_nome VARCHAR(255) NOT NULL,
    tipo_curso VARCHAR(50) NOT NULL DEFAULT 'OUTRO'
      CHECK (tipo_curso IN (
        'NR-05','NR-06','NR-10','NR-11','NR-12','NR-13',
        'NR-17','NR-20','NR-23','NR-33','NR-35',
        'CIPA','BRIGADA','PRIMEIRO_SOCORRO','EMPILHADEIRA',
        'PONTE_ROLANTE','INTEGRACAO','OUTRO'
      )),
    nome_curso VARCHAR(255) NOT NULL,
    instituicao VARCHAR(255),
    carga_horaria INTEGER,
    data_realizacao DATE NOT NULL,
    data_validade DATE,
    dias_alerta_antes INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(30) NOT NULL DEFAULT 'VALIDO'
      CHECK (status IN ('VALIDO', 'PROXIMO_VENCIMENTO', 'VENCIDO')),
    numero_certificado VARCHAR(100),
    certificado_url TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_treinamentos_ssma_empresa
  ON public.treinamentos_ssma (empresa_id);
CREATE INDEX IF NOT EXISTS idx_treinamentos_ssma_validade
  ON public.treinamentos_ssma (data_validade);
CREATE INDEX IF NOT EXISTS idx_treinamentos_ssma_status
  ON public.treinamentos_ssma (status);

-- Trigger updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_treinamentos_ssma_updated_at'
  ) THEN
    CREATE TRIGGER update_treinamentos_ssma_updated_at
      BEFORE UPDATE ON public.treinamentos_ssma
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- RLS
ALTER TABLE public.treinamentos_ssma ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treinamentos_ssma_select" ON public.treinamentos_ssma;
DROP POLICY IF EXISTS "treinamentos_ssma_insert" ON public.treinamentos_ssma;
DROP POLICY IF EXISTS "treinamentos_ssma_update" ON public.treinamentos_ssma;
DROP POLICY IF EXISTS "treinamentos_ssma_delete" ON public.treinamentos_ssma;

CREATE POLICY "treinamentos_ssma_select"
  ON public.treinamentos_ssma FOR SELECT TO authenticated
  USING (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "treinamentos_ssma_insert"
  ON public.treinamentos_ssma FOR INSERT TO authenticated
  WITH CHECK (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "treinamentos_ssma_update"
  ON public.treinamentos_ssma FOR UPDATE TO authenticated
  USING (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "treinamentos_ssma_delete"
  ON public.treinamentos_ssma FOR DELETE TO authenticated
  USING (
    public.is_control_plane_operator()
    OR empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamentos_ssma TO authenticated;
GRANT ALL ON public.treinamentos_ssma TO service_role;

-- ============================================================
-- PARTE 5: Notify PostgREST para recarregar schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
