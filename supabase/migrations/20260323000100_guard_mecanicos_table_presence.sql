-- ============================================================================
-- Migration: Guarda de presenca da tabela public.mecanicos
-- Data: 2026-03-23
-- Motivo: Restaurar modulo de mecanicos em ambientes com schema parcial.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mecanicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid,
  nome text NOT NULL,
  telefone text,
  tipo text DEFAULT 'INTERNO',
  especialidade text,
  custo_hora numeric(12,2),
  ativo boolean NOT NULL DEFAULT true,
  codigo_acesso text,
  senha_acesso text,
  escala_trabalho text,
  folgas_planejadas text,
  ferias_inicio date,
  ferias_fim date,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mecanicos ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE public.mecanicos ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.mecanicos ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.mecanicos ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'INTERNO';
ALTER TABLE public.mecanicos ADD COLUMN IF NOT EXISTS especialidade text;
ALTER TABLE public.mecanicos ADD COLUMN IF NOT EXISTS custo_hora numeric(12,2);
ALTER TABLE public.mecanicos ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.mecanicos ADD COLUMN IF NOT EXISTS codigo_acesso text;
ALTER TABLE public.mecanicos ADD COLUMN IF NOT EXISTS senha_acesso text;
ALTER TABLE public.mecanicos ADD COLUMN IF NOT EXISTS escala_trabalho text;
ALTER TABLE public.mecanicos ADD COLUMN IF NOT EXISTS folgas_planejadas text;
ALTER TABLE public.mecanicos ADD COLUMN IF NOT EXISTS ferias_inicio date;
ALTER TABLE public.mecanicos ADD COLUMN IF NOT EXISTS ferias_fim date;
ALTER TABLE public.mecanicos ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.mecanicos ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.mecanicos ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.mecanicos ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.mecanicos
SET nome = COALESCE(nome, 'MECANICO SEM NOME'),
    tipo = COALESCE(tipo, 'INTERNO'),
    ativo = COALESCE(ativo, true),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now())
WHERE nome IS NULL
   OR tipo IS NULL
   OR ativo IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL;

UPDATE public.mecanicos
SET tipo = CASE
  WHEN upper(COALESCE(tipo, '')) IN ('INTERNO', 'PROPRIO', 'TERCEIRIZADO') THEN upper(tipo)
  ELSE 'INTERNO'
END;

CREATE INDEX IF NOT EXISTS idx_mecanicos_empresa_ativo ON public.mecanicos (empresa_id, ativo);
CREATE INDEX IF NOT EXISTS idx_mecanicos_empresa_nome ON public.mecanicos (empresa_id, nome);
CREATE INDEX IF NOT EXISTS idx_mecanicos_empresa_codigo_acesso ON public.mecanicos (empresa_id, codigo_acesso);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mecanicos_tipo_check'
      AND conrelid = 'public.mecanicos'::regclass
  ) THEN
    ALTER TABLE public.mecanicos
      ADD CONSTRAINT mecanicos_tipo_check
      CHECK (tipo IN ('INTERNO', 'PROPRIO', 'TERCEIRIZADO')) NOT VALID;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.empresas') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'mecanicos_empresa_id_fkey'
        AND conrelid = 'public.mecanicos'::regclass
    ) THEN
    ALTER TABLE public.mecanicos
      ADD CONSTRAINT mecanicos_empresa_id_fkey
      FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regprocedure('public.update_updated_at_column()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS update_mecanicos_updated_at ON public.mecanicos;
    CREATE TRIGGER update_mecanicos_updated_at
      BEFORE UPDATE ON public.mecanicos
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;

ALTER TABLE public.mecanicos ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.mecanicos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mecanicos TO authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mecanicos'
      AND policyname = 'mecanicos_select_tenant'
  ) THEN
    CREATE POLICY mecanicos_select_tenant ON public.mecanicos
      FOR SELECT TO authenticated
      USING (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mecanicos'
      AND policyname = 'mecanicos_insert_tenant'
  ) THEN
    CREATE POLICY mecanicos_insert_tenant ON public.mecanicos
      FOR INSERT TO authenticated
      WITH CHECK (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mecanicos'
      AND policyname = 'mecanicos_update_tenant'
  ) THEN
    CREATE POLICY mecanicos_update_tenant ON public.mecanicos
      FOR UPDATE TO authenticated
      USING (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      )
      WITH CHECK (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mecanicos'
      AND policyname = 'mecanicos_delete_tenant'
  ) THEN
    CREATE POLICY mecanicos_delete_tenant ON public.mecanicos
      FOR DELETE TO authenticated
      USING (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      );
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
