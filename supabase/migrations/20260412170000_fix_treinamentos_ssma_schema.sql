-- ============================================================
-- FIX: Recria treinamentos_ssma com schema correto
-- A migration 160000 criou a tabela com colunas erradas
-- (titulo, tipo) em vez do schema real do hook TypeScript
-- (colaborador_nome, tipo_curso, nome_curso, etc.)
-- ============================================================

-- Drop completo (sem dados pois a tabela foi criada incorretamente agora)
DROP TABLE IF EXISTS public.treinamentos_ssma CASCADE;

-- Recria com schema correto (igual a 20260408140000_treinamentos_ssma.sql)
CREATE TABLE public.treinamentos_ssma (
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
      CHECK (status IN ('VALIDO','PROXIMO_VENCIMENTO','VENCIDO')),

    numero_certificado VARCHAR(100),
    certificado_url TEXT,
    observacoes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_treinamentos_ssma_empresa    ON public.treinamentos_ssma(empresa_id);
CREATE INDEX idx_treinamentos_ssma_colaborador ON public.treinamentos_ssma(colaborador_id);
CREATE INDEX idx_treinamentos_ssma_validade   ON public.treinamentos_ssma(data_validade);
CREATE INDEX idx_treinamentos_ssma_status     ON public.treinamentos_ssma(status);
CREATE INDEX idx_treinamentos_ssma_tipo       ON public.treinamentos_ssma(tipo_curso);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_treinamentos_ssma_updated_at'
  ) THEN
    CREATE TRIGGER update_treinamentos_ssma_updated_at
      BEFORE UPDATE ON public.treinamentos_ssma
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.treinamentos_ssma ENABLE ROW LEVEL SECURITY;

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

NOTIFY pgrst, 'reload schema';
