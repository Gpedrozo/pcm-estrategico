-- ============================================================
-- Migration: Fix contratos module (UNIQUE, CHECK, trigger, indexes)
-- Date: 2026-04-08
-- Safe: uses IF EXISTS / DO blocks with exception handling
-- ============================================================

-- 1. Fix UNIQUE: numero_contrato deve ser unique POR TENANT, não global
ALTER TABLE public.contratos DROP CONSTRAINT IF EXISTS contratos_numero_contrato_key;

DO $$
BEGIN
  ALTER TABLE public.contratos
    ADD CONSTRAINT contratos_empresa_numero_contrato_key UNIQUE (empresa_id, numero_contrato);
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Constraint contratos_empresa_numero_contrato_key already exists, skipping.';
END $$;

-- 2. Expand tipo CHECK to include MATERIAL and LOCACAO
ALTER TABLE public.contratos DROP CONSTRAINT IF EXISTS contratos_tipo_check;

DO $$
BEGIN
  ALTER TABLE public.contratos
    ADD CONSTRAINT contratos_tipo_check
    CHECK (tipo IN ('SERVICO', 'FORNECIMENTO', 'MATERIAL', 'MISTO', 'LOCACAO'));
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Constraint contratos_tipo_check already exists, skipping.';
END $$;

-- 3. Expand status CHECK to include VENCIDO
ALTER TABLE public.contratos DROP CONSTRAINT IF EXISTS contratos_status_check;

DO $$
BEGIN
  ALTER TABLE public.contratos
    ADD CONSTRAINT contratos_status_check
    CHECK (status IN ('RASCUNHO', 'ATIVO', 'SUSPENSO', 'ENCERRADO', 'CANCELADO', 'VENCIDO'));
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Constraint contratos_status_check already exists, skipping.';
END $$;

-- 4. Trigger: auto-mark VENCIDO when data_fim in the past and status is ATIVO
CREATE OR REPLACE FUNCTION public.contratos_auto_vencido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.data_fim IS NOT NULL
     AND NEW.data_fim < CURRENT_DATE
     AND NEW.status = 'ATIVO' THEN
    NEW.status := 'VENCIDO';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contratos_auto_vencido ON public.contratos;
CREATE TRIGGER trg_contratos_auto_vencido
  BEFORE INSERT OR UPDATE ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.contratos_auto_vencido();

-- 5. One-time cleanup: mark existing expired contracts as VENCIDO
UPDATE public.contratos
SET status = 'VENCIDO', updated_at = now()
WHERE status = 'ATIVO'
  AND data_fim IS NOT NULL
  AND data_fim < CURRENT_DATE;

-- 6. Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_contratos_empresa_status
  ON public.contratos(empresa_id, status);

CREATE INDEX IF NOT EXISTS idx_contratos_fornecedor_id
  ON public.contratos(fornecedor_id);

CREATE INDEX IF NOT EXISTS idx_contratos_data_fim
  ON public.contratos(data_fim)
  WHERE data_fim IS NOT NULL;
