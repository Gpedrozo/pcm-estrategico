-- Unified hardening migration for legacy/divergent schemas used by Owner control-plane.
-- Goal: one-shot fix to prevent PostgREST cache errors for missing columns in public.empresas.

BEGIN;

-- 1) Ensure all critical columns used by Owner flows exist.
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS plano text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS updated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.dados_empresa (
  empresa_id text PRIMARY KEY,
  razao_social text,
  nome_fantasia text,
  cnpj text,
  email text,
  telefone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  id bigserial PRIMARY KEY,
  empresa_id text,
  chave text NOT NULL,
  valor jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS configuracoes_sistema_empresa_chave_uidx
  ON public.configuracoes_sistema (empresa_id, chave);

-- 2) Standard defaults for runtime compatibility.
ALTER TABLE public.empresas ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.empresas ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.empresas ALTER COLUMN status SET DEFAULT 'active';

-- 3) Backfill CNPJ from dados_empresa when table exists.
DO $$
BEGIN
  IF to_regclass('public.dados_empresa') IS NOT NULL THEN
    UPDATE public.empresas e
    SET cnpj = de.cnpj
    FROM public.dados_empresa de
    WHERE de.empresa_id::text = e.id::text
      AND COALESCE(e.cnpj, '') = ''
      AND COALESCE(de.cnpj, '') <> '';
  END IF;
END $$;

-- 4) Backfill nome/slug/status/timestamps.
DO $$
BEGIN
  UPDATE public.empresas
  SET nome = COALESCE(NULLIF(nome, ''), 'Empresa ' || substr(md5(coalesce(id::text, random()::text)), 1, 8))
  WHERE COALESCE(nome, '') = '';

  UPDATE public.empresas
  SET slug = lower(regexp_replace(COALESCE(NULLIF(slug, ''), nome, 'empresa'), '[^a-zA-Z0-9]+', '-', 'g'))
  WHERE COALESCE(slug, '') = '';

  UPDATE public.empresas
  SET slug = trim(both '-' from regexp_replace(slug, '-{2,}', '-', 'g'))
  WHERE slug IS NOT NULL;

  UPDATE public.empresas
  SET slug = 'empresa-' || substr(md5(coalesce(id::text, random()::text)), 1, 8)
  WHERE COALESCE(slug, '') = '';

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'empresas'
      AND column_name = 'ativo'
  ) THEN
    UPDATE public.empresas
    SET status = CASE WHEN ativo THEN 'active' ELSE 'blocked' END
    WHERE COALESCE(status, '') = '';
  END IF;

  UPDATE public.empresas
  SET status = 'active'
  WHERE COALESCE(status, '') = '';

  UPDATE public.empresas
  SET created_at = now()
  WHERE created_at IS NULL;

  UPDATE public.empresas
  SET updated_at = now()
  WHERE updated_at IS NULL;
END $$;

-- 5) Deduplicate slug values before adding unique index.
WITH duplicated AS (
  SELECT ctid, slug,
         row_number() OVER (PARTITION BY slug ORDER BY created_at NULLS LAST, ctid) AS rn
  FROM public.empresas
  WHERE COALESCE(slug, '') <> ''
)
UPDATE public.empresas e
SET slug = d.slug || '-' || substr(md5(coalesce(e.id::text, e.ctid::text)), 1, 6)
FROM duplicated d
WHERE e.ctid = d.ctid
  AND d.rn > 1;

-- 6) Helpful indexes for owner portal operations.
CREATE UNIQUE INDEX IF NOT EXISTS empresas_slug_unique_idx
  ON public.empresas (slug)
  WHERE COALESCE(slug, '') <> '';

CREATE INDEX IF NOT EXISTS empresas_status_idx
  ON public.empresas (status);

-- 7) Ask PostgREST to reload schema cache immediately.
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  PERFORM pg_notify('pgrst', 'reload config');
EXCEPTION WHEN OTHERS THEN
  -- Keep migration non-blocking even if notify is unavailable.
  NULL;
END $$;

COMMIT;
