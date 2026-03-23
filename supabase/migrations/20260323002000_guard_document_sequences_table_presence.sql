-- Guard migration: garante tabela de sequencias de documentos em ambientes parciais

CREATE TABLE IF NOT EXISTS public.document_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  tipo_documento text NOT NULL,
  prefixo text NOT NULL,
  proximo_numero integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_sequences_empresa_tipo_key UNIQUE (empresa_id, tipo_documento),
  CONSTRAINT document_sequences_proximo_numero_check CHECK (proximo_numero >= 1)
);

ALTER TABLE public.document_sequences
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS empresa_id uuid,
  ADD COLUMN IF NOT EXISTS tipo_documento text,
  ADD COLUMN IF NOT EXISTS prefixo text,
  ADD COLUMN IF NOT EXISTS proximo_numero integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.document_sequences
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN proximo_numero SET DEFAULT 1;

UPDATE public.document_sequences
SET proximo_numero = 1
WHERE proximo_numero IS NULL OR proximo_numero < 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'document_sequences'
      AND column_name = 'empresa_id'
  ) THEN
    EXECUTE 'UPDATE public.document_sequences SET empresa_id = ''00000000-0000-0000-0000-000000000000''::uuid WHERE empresa_id IS NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'document_sequences'
      AND column_name = 'id'
  ) THEN
    EXECUTE 'UPDATE public.document_sequences SET id = gen_random_uuid() WHERE id IS NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'document_sequences'
      AND column_name = 'tipo_documento'
  ) THEN
    EXECUTE 'UPDATE public.document_sequences SET tipo_documento = ''GEN'' WHERE tipo_documento IS NULL OR btrim(tipo_documento) = ''''';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'document_sequences'
      AND column_name = 'prefixo'
  ) THEN
    EXECUTE 'UPDATE public.document_sequences SET prefixo = ''DOC'' WHERE prefixo IS NULL OR btrim(prefixo) = ''''';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'document_sequences'
      AND column_name = 'empresa_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.document_sequences ALTER COLUMN empresa_id SET NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'document_sequences'
      AND column_name = 'tipo_documento'
  ) THEN
    EXECUTE 'ALTER TABLE public.document_sequences ALTER COLUMN tipo_documento SET NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'document_sequences'
      AND column_name = 'prefixo'
  ) THEN
    EXECUTE 'ALTER TABLE public.document_sequences ALTER COLUMN prefixo SET NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'document_sequences'
      AND column_name = 'proximo_numero'
  ) THEN
    EXECUTE 'ALTER TABLE public.document_sequences ALTER COLUMN proximo_numero SET NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'document_sequences_empresa_tipo_key'
      AND conrelid = 'public.document_sequences'::regclass
  ) THEN
    ALTER TABLE public.document_sequences
      ADD CONSTRAINT document_sequences_empresa_tipo_key UNIQUE (empresa_id, tipo_documento);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'document_sequences_proximo_numero_check'
      AND conrelid = 'public.document_sequences'::regclass
  ) THEN
    ALTER TABLE public.document_sequences
      ADD CONSTRAINT document_sequences_proximo_numero_check CHECK (proximo_numero >= 1);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_document_sequences_empresa
  ON public.document_sequences (empresa_id);

CREATE INDEX IF NOT EXISTS idx_document_sequences_tipo
  ON public.document_sequences (tipo_documento);

ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_sequences_select" ON public.document_sequences;
DROP POLICY IF EXISTS "document_sequences_insert" ON public.document_sequences;
DROP POLICY IF EXISTS "document_sequences_update" ON public.document_sequences;
DROP POLICY IF EXISTS "document_sequences_delete" ON public.document_sequences;

CREATE POLICY "document_sequences_select"
  ON public.document_sequences
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(auth.jwt() ->> 'user_type', '') = 'master_ti'
    OR empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
  );

CREATE POLICY "document_sequences_insert"
  ON public.document_sequences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(auth.jwt() ->> 'user_type', '') = 'master_ti'
    OR empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
  );

CREATE POLICY "document_sequences_update"
  ON public.document_sequences
  FOR UPDATE
  TO authenticated
  USING (
    COALESCE(auth.jwt() ->> 'user_type', '') = 'master_ti'
    OR empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
  )
  WITH CHECK (
    COALESCE(auth.jwt() ->> 'user_type', '') = 'master_ti'
    OR empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
  );

CREATE POLICY "document_sequences_delete"
  ON public.document_sequences
  FOR DELETE
  TO authenticated
  USING (
    COALESCE(auth.jwt() ->> 'user_type', '') = 'master_ti'
    OR empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_sequences TO authenticated;
GRANT ALL ON public.document_sequences TO service_role;

NOTIFY pgrst, 'reload schema';