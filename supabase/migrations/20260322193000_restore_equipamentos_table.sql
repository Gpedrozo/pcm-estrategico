-- ============================================================================
-- Migration: Restaurar tabela public.equipamentos (hotfix produção)
-- Data: 2026-03-22
-- Motivo: Corrigir erro "Could not find the table 'public.equipamentos'"
--         no frontend do módulo de ativos.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid,
  sistema_id uuid,
  tag text NOT NULL,
  nome text NOT NULL,
  criticidade text DEFAULT 'C' NOT NULL,
  nivel_risco text DEFAULT 'BAIXO' NOT NULL,
  localizacao text,
  fabricante text,
  modelo text,
  numero_serie text,
  data_instalacao date,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS sistema_id uuid;
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS tag text;
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS criticidade text DEFAULT 'C';
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS nivel_risco text DEFAULT 'BAIXO';
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS localizacao text;
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS fabricante text;
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS modelo text;
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS numero_serie text;
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS data_instalacao date;
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill mínimo para evitar nulls críticos em bases legadas
UPDATE public.equipamentos
SET criticidade = COALESCE(criticidade, 'C'),
    nivel_risco = COALESCE(nivel_risco, 'BAIXO'),
    ativo = COALESCE(ativo, true),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now())
WHERE criticidade IS NULL
   OR nivel_risco IS NULL
   OR ativo IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL;

-- Normalização de domínios para bases legadas
UPDATE public.equipamentos
SET criticidade = CASE
  WHEN upper(COALESCE(criticidade, '')) IN ('A', 'B', 'C') THEN upper(criticidade)
  ELSE 'C'
END,
nivel_risco = CASE
  WHEN upper(COALESCE(nivel_risco, '')) IN ('CRITICO', 'ALTO', 'MEDIO', 'BAIXO') THEN upper(nivel_risco)
  WHEN upper(COALESCE(nivel_risco, '')) = 'MÉDIO' THEN 'MEDIO'
  ELSE 'BAIXO'
END;

DO $$
DECLARE
  v_default_empresa uuid;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'equipamentos'
      AND column_name = 'empresa_id'
  ) THEN
    SELECT id INTO v_default_empresa
    FROM public.empresas
    ORDER BY created_at
    LIMIT 1;

    IF v_default_empresa IS NOT NULL THEN
      UPDATE public.equipamentos
      SET empresa_id = v_default_empresa
      WHERE empresa_id IS NULL;
    END IF;
  END IF;
END;
$$;

-- Índices de consulta
CREATE INDEX IF NOT EXISTS idx_equipamentos_empresa_id ON public.equipamentos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_empresa_tag ON public.equipamentos (empresa_id, tag);
CREATE INDEX IF NOT EXISTS idx_equipamentos_empresa_sistema ON public.equipamentos (empresa_id, sistema_id);

-- Constraints de domínio
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'equipamentos_criticidade_check'
      AND conrelid = 'public.equipamentos'::regclass
  ) THEN
    ALTER TABLE public.equipamentos
      ADD CONSTRAINT equipamentos_criticidade_check
      CHECK (criticidade IN ('A', 'B', 'C')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'equipamentos_nivel_risco_check'
      AND conrelid = 'public.equipamentos'::regclass
  ) THEN
    ALTER TABLE public.equipamentos
      ADD CONSTRAINT equipamentos_nivel_risco_check
      CHECK (nivel_risco IN ('CRITICO', 'ALTO', 'MEDIO', 'BAIXO')) NOT VALID;
  END IF;
END;
$$;

-- FKs (criação condicional para evitar falha em ambientes parciais)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'equipamentos_empresa_id_fkey'
      AND conrelid = 'public.equipamentos'::regclass
  ) THEN
    ALTER TABLE public.equipamentos
      ADD CONSTRAINT equipamentos_empresa_id_fkey
      FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'equipamentos_sistema_id_fkey'
      AND conrelid = 'public.equipamentos'::regclass
  ) THEN
    ALTER TABLE public.equipamentos
      ADD CONSTRAINT equipamentos_sistema_id_fkey
      FOREIGN KEY (sistema_id) REFERENCES public.sistemas(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- Trigger de updated_at
DROP TRIGGER IF EXISTS update_equipamentos_updated_at ON public.equipamentos;
CREATE TRIGGER update_equipamentos_updated_at
  BEFORE UPDATE ON public.equipamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'equipamentos'
      AND policyname = 'equipamentos_select_tenant'
  ) THEN
    CREATE POLICY equipamentos_select_tenant ON public.equipamentos
      FOR SELECT TO authenticated
      USING (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR COALESCE(auth.jwt() ->> 'role', '') IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'equipamentos'
      AND policyname = 'equipamentos_insert_tenant'
  ) THEN
    CREATE POLICY equipamentos_insert_tenant ON public.equipamentos
      FOR INSERT TO authenticated
      WITH CHECK (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR COALESCE(auth.jwt() ->> 'role', '') IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'equipamentos'
      AND policyname = 'equipamentos_update_tenant'
  ) THEN
    CREATE POLICY equipamentos_update_tenant ON public.equipamentos
      FOR UPDATE TO authenticated
      USING (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR COALESCE(auth.jwt() ->> 'role', '') IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      )
      WITH CHECK (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR COALESCE(auth.jwt() ->> 'role', '') IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'equipamentos'
      AND policyname = 'equipamentos_delete_tenant'
  ) THEN
    CREATE POLICY equipamentos_delete_tenant ON public.equipamentos
      FOR DELETE TO authenticated
      USING (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR COALESCE(auth.jwt() ->> 'role', '') IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      );
  END IF;
END;
$$;
