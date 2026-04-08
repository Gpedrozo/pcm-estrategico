-- ============================================================
-- Migration: Treinamentos SSMA — Controle de Cursos e NRs
-- Date: 2026-04-08
-- Purpose: Gestão de treinamentos obrigatórios (NRs) e
--          opcionais, com controle de validade e alertas.
-- SAFE: idempotent, transactional, rollback-friendly
-- ============================================================

BEGIN;

-- =============================================
-- 1. Tabela principal: treinamentos_ssma
-- =============================================

CREATE TABLE IF NOT EXISTS public.treinamentos_ssma (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id),

    -- Colaborador vinculado
    colaborador_id UUID REFERENCES public.profiles(id),
    colaborador_nome VARCHAR(255) NOT NULL,

    -- Dados do curso/treinamento
    tipo_curso VARCHAR(50) NOT NULL DEFAULT 'OUTRO'
      CHECK (tipo_curso IN (
        'NR-05',  -- CIPA
        'NR-06',  -- EPI
        'NR-10',  -- Segurança em Instalações Elétricas
        'NR-11',  -- Transporte e Movimentação de Cargas
        'NR-12',  -- Segurança em Máquinas e Equipamentos
        'NR-13',  -- Caldeiras e Vasos de Pressão
        'NR-17',  -- Ergonomia
        'NR-20',  -- Inflamáveis e Combustíveis
        'NR-23',  -- Proteção Contra Incêndios
        'NR-33',  -- Espaço Confinado
        'NR-35',  -- Trabalho em Altura
        'CIPA',
        'BRIGADA',
        'PRIMEIRO_SOCORRO',
        'EMPILHADEIRA',
        'PONTE_ROLANTE',
        'INTEGRACAO',
        'OUTRO'
      )),
    nome_curso VARCHAR(255) NOT NULL,
    instituicao VARCHAR(255),
    carga_horaria INTEGER,                        -- em horas

    -- Datas e validade
    data_realizacao DATE NOT NULL,
    data_validade DATE,                           -- NULL = sem vencimento
    dias_alerta_antes INTEGER NOT NULL DEFAULT 30, -- alertar X dias antes

    -- Status calculado no frontend, mas armazenável para queries
    status VARCHAR(30) NOT NULL DEFAULT 'VALIDO'
      CHECK (status IN ('VALIDO', 'PROXIMO_VENCIMENTO', 'VENCIDO')),

    -- Certificado
    numero_certificado VARCHAR(100),
    certificado_url TEXT,                         -- URL no Supabase Storage

    -- Observações
    observacoes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_treinamentos_ssma_empresa
  ON public.treinamentos_ssma (empresa_id);

CREATE INDEX IF NOT EXISTS idx_treinamentos_ssma_colaborador
  ON public.treinamentos_ssma (colaborador_id);

CREATE INDEX IF NOT EXISTS idx_treinamentos_ssma_validade
  ON public.treinamentos_ssma (data_validade);

CREATE INDEX IF NOT EXISTS idx_treinamentos_ssma_status
  ON public.treinamentos_ssma (status);

CREATE INDEX IF NOT EXISTS idx_treinamentos_ssma_tipo
  ON public.treinamentos_ssma (tipo_curso);

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


-- =============================================
-- 2. RLS — Isolamento por empresa_id
-- =============================================

ALTER TABLE public.treinamentos_ssma ENABLE ROW LEVEL SECURITY;

-- Select: tenant vê apenas seus dados
DO $$ BEGIN
  DROP POLICY IF EXISTS "treinamentos_ssma_select" ON public.treinamentos_ssma;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "treinamentos_ssma_select"
  ON public.treinamentos_ssma FOR SELECT TO authenticated
  USING (
    empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Insert: tenant insere apenas seus dados
DO $$ BEGIN
  DROP POLICY IF EXISTS "treinamentos_ssma_insert" ON public.treinamentos_ssma;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "treinamentos_ssma_insert"
  ON public.treinamentos_ssma FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Update: tenant atualiza apenas seus dados
DO $$ BEGIN
  DROP POLICY IF EXISTS "treinamentos_ssma_update" ON public.treinamentos_ssma;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "treinamentos_ssma_update"
  ON public.treinamentos_ssma FOR UPDATE TO authenticated
  USING (
    empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Delete: tenant deleta apenas seus dados
DO $$ BEGIN
  DROP POLICY IF EXISTS "treinamentos_ssma_delete" ON public.treinamentos_ssma;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "treinamentos_ssma_delete"
  ON public.treinamentos_ssma FOR DELETE TO authenticated
  USING (
    empresa_id IN (
      SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );


-- =============================================
-- 3. Função para atualizar status em batch
--    (pode ser chamada via cron ou RPC)
-- =============================================

CREATE OR REPLACE FUNCTION public.atualizar_status_treinamentos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Marcar VENCIDO
  UPDATE public.treinamentos_ssma
  SET status = 'VENCIDO'
  WHERE data_validade IS NOT NULL
    AND data_validade < CURRENT_DATE
    AND status != 'VENCIDO';

  -- Marcar PROXIMO_VENCIMENTO
  UPDATE public.treinamentos_ssma
  SET status = 'PROXIMO_VENCIMENTO'
  WHERE data_validade IS NOT NULL
    AND data_validade >= CURRENT_DATE
    AND data_validade <= (CURRENT_DATE + (dias_alerta_antes || ' days')::interval)
    AND status != 'PROXIMO_VENCIMENTO';

  -- Marcar VALIDO (recuperar se data foi estendida)
  UPDATE public.treinamentos_ssma
  SET status = 'VALIDO'
  WHERE data_validade IS NOT NULL
    AND data_validade > (CURRENT_DATE + (dias_alerta_antes || ' days')::interval)
    AND status != 'VALIDO';

  -- Sem validade = sempre VALIDO
  UPDATE public.treinamentos_ssma
  SET status = 'VALIDO'
  WHERE data_validade IS NULL
    AND status != 'VALIDO';
END;
$$;

GRANT EXECUTE ON FUNCTION public.atualizar_status_treinamentos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_treinamentos() TO service_role;


COMMIT;
