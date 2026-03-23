-- Guard migration: restaura tabelas base da hierarquia em ambientes parciais

CREATE TABLE IF NOT EXISTS public.plantas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  endereco text,
  responsavel text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plantas ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE public.plantas ADD COLUMN IF NOT EXISTS codigo text;
ALTER TABLE public.plantas ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.plantas ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.plantas ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE public.plantas ADD COLUMN IF NOT EXISTS responsavel text;
ALTER TABLE public.plantas ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.plantas ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.plantas ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.plantas
SET codigo = COALESCE(NULLIF(codigo, ''), 'PLANTA-SEM-CODIGO'),
    nome = COALESCE(NULLIF(nome, ''), 'Planta sem nome'),
    ativo = COALESCE(ativo, true),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now())
WHERE codigo IS NULL
   OR nome IS NULL
   OR ativo IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL;

ALTER TABLE public.plantas ALTER COLUMN codigo SET NOT NULL;
ALTER TABLE public.plantas ALTER COLUMN nome SET NOT NULL;
ALTER TABLE public.plantas ALTER COLUMN ativo SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plantas_empresa_codigo_key'
      AND conrelid = 'public.plantas'::regclass
  ) THEN
    ALTER TABLE public.plantas
      ADD CONSTRAINT plantas_empresa_codigo_key UNIQUE (empresa_id, codigo);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_plantas_empresa_codigo ON public.plantas (empresa_id, codigo);

CREATE TABLE IF NOT EXISTS public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid,
  planta_id uuid,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS planta_id uuid;
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS codigo text;
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.areas
SET codigo = COALESCE(NULLIF(codigo, ''), 'AREA-SEM-CODIGO'),
    nome = COALESCE(NULLIF(nome, ''), 'Area sem nome'),
    ativo = COALESCE(ativo, true),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now())
WHERE codigo IS NULL
   OR nome IS NULL
   OR ativo IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL;

ALTER TABLE public.areas ALTER COLUMN codigo SET NOT NULL;
ALTER TABLE public.areas ALTER COLUMN nome SET NOT NULL;
ALTER TABLE public.areas ALTER COLUMN ativo SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'areas_empresa_planta_codigo_key'
      AND conrelid = 'public.areas'::regclass
  ) THEN
    ALTER TABLE public.areas
      ADD CONSTRAINT areas_empresa_planta_codigo_key UNIQUE (empresa_id, planta_id, codigo);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_areas_empresa_planta ON public.areas (empresa_id, planta_id);

CREATE TABLE IF NOT EXISTS public.sistemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid,
  area_id uuid,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  funcao_principal text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sistemas ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE public.sistemas ADD COLUMN IF NOT EXISTS area_id uuid;
ALTER TABLE public.sistemas ADD COLUMN IF NOT EXISTS codigo text;
ALTER TABLE public.sistemas ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.sistemas ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.sistemas ADD COLUMN IF NOT EXISTS funcao_principal text;
ALTER TABLE public.sistemas ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.sistemas ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.sistemas ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.sistemas
SET codigo = COALESCE(NULLIF(codigo, ''), 'SISTEMA-SEM-CODIGO'),
    nome = COALESCE(NULLIF(nome, ''), 'Sistema sem nome'),
    ativo = COALESCE(ativo, true),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now())
WHERE codigo IS NULL
   OR nome IS NULL
   OR ativo IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL;

ALTER TABLE public.sistemas ALTER COLUMN codigo SET NOT NULL;
ALTER TABLE public.sistemas ALTER COLUMN nome SET NOT NULL;
ALTER TABLE public.sistemas ALTER COLUMN ativo SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sistemas_empresa_area_codigo_key'
      AND conrelid = 'public.sistemas'::regclass
  ) THEN
    ALTER TABLE public.sistemas
      ADD CONSTRAINT sistemas_empresa_area_codigo_key UNIQUE (empresa_id, area_id, codigo);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sistemas_empresa_area ON public.sistemas (empresa_id, area_id);

DO $$
BEGIN
  IF to_regclass('public.empresas') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'plantas_empresa_id_fkey'
        AND conrelid = 'public.plantas'::regclass
    ) THEN
    ALTER TABLE public.plantas
      ADD CONSTRAINT plantas_empresa_id_fkey
      FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.empresas') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'areas_empresa_id_fkey'
        AND conrelid = 'public.areas'::regclass
    ) THEN
    ALTER TABLE public.areas
      ADD CONSTRAINT areas_empresa_id_fkey
      FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.plantas') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'areas_planta_id_fkey'
        AND conrelid = 'public.areas'::regclass
    ) THEN
    ALTER TABLE public.areas
      ADD CONSTRAINT areas_planta_id_fkey
      FOREIGN KEY (planta_id) REFERENCES public.plantas(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.empresas') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'sistemas_empresa_id_fkey'
        AND conrelid = 'public.sistemas'::regclass
    ) THEN
    ALTER TABLE public.sistemas
      ADD CONSTRAINT sistemas_empresa_id_fkey
      FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.areas') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'sistemas_area_id_fkey'
        AND conrelid = 'public.sistemas'::regclass
    ) THEN
    ALTER TABLE public.sistemas
      ADD CONSTRAINT sistemas_area_id_fkey
      FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.plantas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sistemas ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.plantas, public.areas, public.sistemas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plantas, public.areas, public.sistemas TO authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plantas' AND policyname = 'plantas_select_tenant'
  ) THEN
    CREATE POLICY plantas_select_tenant ON public.plantas
      FOR SELECT TO authenticated
      USING (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plantas' AND policyname = 'plantas_insert_tenant'
  ) THEN
    CREATE POLICY plantas_insert_tenant ON public.plantas
      FOR INSERT TO authenticated
      WITH CHECK (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plantas' AND policyname = 'plantas_update_tenant'
  ) THEN
    CREATE POLICY plantas_update_tenant ON public.plantas
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
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plantas' AND policyname = 'plantas_delete_tenant'
  ) THEN
    CREATE POLICY plantas_delete_tenant ON public.plantas
      FOR DELETE TO authenticated
      USING (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'areas' AND policyname = 'areas_select_tenant'
  ) THEN
    CREATE POLICY areas_select_tenant ON public.areas
      FOR SELECT TO authenticated
      USING (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'areas' AND policyname = 'areas_insert_tenant'
  ) THEN
    CREATE POLICY areas_insert_tenant ON public.areas
      FOR INSERT TO authenticated
      WITH CHECK (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'areas' AND policyname = 'areas_update_tenant'
  ) THEN
    CREATE POLICY areas_update_tenant ON public.areas
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
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'areas' AND policyname = 'areas_delete_tenant'
  ) THEN
    CREATE POLICY areas_delete_tenant ON public.areas
      FOR DELETE TO authenticated
      USING (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sistemas' AND policyname = 'sistemas_select_tenant'
  ) THEN
    CREATE POLICY sistemas_select_tenant ON public.sistemas
      FOR SELECT TO authenticated
      USING (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sistemas' AND policyname = 'sistemas_insert_tenant'
  ) THEN
    CREATE POLICY sistemas_insert_tenant ON public.sistemas
      FOR INSERT TO authenticated
      WITH CHECK (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sistemas' AND policyname = 'sistemas_update_tenant'
  ) THEN
    CREATE POLICY sistemas_update_tenant ON public.sistemas
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
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sistemas' AND policyname = 'sistemas_delete_tenant'
  ) THEN
    CREATE POLICY sistemas_delete_tenant ON public.sistemas
      FOR DELETE TO authenticated
      USING (
        empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
        OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';