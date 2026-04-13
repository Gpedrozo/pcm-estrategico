-- ============================================================
-- COLABORADORES SSMA — Cadastro mestre de colaboradores
-- ============================================================
-- Centraliza dados de colaboradores para vincular entregas EPI,
-- treinamentos e demais registros de SSMA por ID em vez de texto livre.

BEGIN;

CREATE TABLE IF NOT EXISTS public.colaboradores_ssma (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  funcao       TEXT,
  setor        TEXT,
  matricula    TEXT,
  data_admissao DATE,
  status       TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'AFASTADO', 'DESLIGADO')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_colaboradores_ssma_empresa
  ON public.colaboradores_ssma(empresa_id);

CREATE INDEX IF NOT EXISTS idx_colaboradores_ssma_nome
  ON public.colaboradores_ssma(empresa_id, nome);

CREATE INDEX IF NOT EXISTS idx_colaboradores_ssma_status
  ON public.colaboradores_ssma(empresa_id, status);

-- Unicidade matricula por empresa (quando preenchida)
CREATE UNIQUE INDEX IF NOT EXISTS idx_colaboradores_ssma_matricula_uq
  ON public.colaboradores_ssma(empresa_id, matricula)
  WHERE matricula IS NOT NULL AND matricula <> '';

-- RLS
ALTER TABLE public.colaboradores_ssma ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "colaboradores_ssma_tenant_isolation" ON public.colaboradores_ssma;
CREATE POLICY "colaboradores_ssma_tenant_isolation" ON public.colaboradores_ssma
  USING (empresa_id = (COALESCE(
    current_setting('request.jwt.claims', true)::json->>'empresa_id',
    current_setting('request.jwt.claims', true)::json->'app_metadata'->>'empresa_id'
  ))::uuid)
  WITH CHECK (empresa_id = (COALESCE(
    current_setting('request.jwt.claims', true)::json->>'empresa_id',
    current_setting('request.jwt.claims', true)::json->'app_metadata'->>'empresa_id'
  ))::uuid);

-- Device JWT (app mecânico)
DROP POLICY IF EXISTS "colaboradores_ssma_device_jwt" ON public.colaboradores_ssma;
CREATE POLICY "colaboradores_ssma_device_jwt" ON public.colaboradores_ssma
  FOR SELECT
  USING (empresa_id = (current_setting('request.jwt.claims', true)::json->>'empresa_id')::uuid);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at_colaboradores_ssma()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_colaboradores_ssma ON public.colaboradores_ssma;
CREATE TRIGGER set_updated_at_colaboradores_ssma
  BEFORE UPDATE ON public.colaboradores_ssma
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at_colaboradores_ssma();

COMMIT;
