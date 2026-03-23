-- Hotfix: garante existencia da tabela public.plantas para destravar modulo Hierarquia

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
SET codigo = COALESCE(NULLIF(codigo, ''), 'PLANTA-' || substr(id::text, 1, 8)),
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

CREATE INDEX IF NOT EXISTS idx_plantas_empresa_id ON public.plantas (empresa_id);
CREATE INDEX IF NOT EXISTS idx_plantas_empresa_codigo ON public.plantas (empresa_id, codigo);

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
END $$;

ALTER TABLE public.plantas ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.plantas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.plantas TO authenticated, service_role;

DROP POLICY IF EXISTS plantas_select_tenant ON public.plantas;
DROP POLICY IF EXISTS plantas_insert_tenant ON public.plantas;
DROP POLICY IF EXISTS plantas_update_tenant ON public.plantas;
DROP POLICY IF EXISTS plantas_delete_tenant ON public.plantas;

CREATE POLICY plantas_select_tenant ON public.plantas
  FOR SELECT TO authenticated
  USING (
    empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
    OR empresa_id IN (
      SELECT p.empresa_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
    OR UPPER(COALESCE(auth.jwt() ->> 'role', auth.jwt() ->> 'user_type', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(auth.jwt() -> 'roles', '[]'::jsonb)) AS r(role)
      WHERE UPPER(r.role) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  );

CREATE POLICY plantas_insert_tenant ON public.plantas
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
    OR empresa_id IN (
      SELECT p.empresa_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
    OR UPPER(COALESCE(auth.jwt() ->> 'role', auth.jwt() ->> 'user_type', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(auth.jwt() -> 'roles', '[]'::jsonb)) AS r(role)
      WHERE UPPER(r.role) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  );

CREATE POLICY plantas_update_tenant ON public.plantas
  FOR UPDATE TO authenticated
  USING (
    empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
    OR empresa_id IN (
      SELECT p.empresa_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
    OR UPPER(COALESCE(auth.jwt() ->> 'role', auth.jwt() ->> 'user_type', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(auth.jwt() -> 'roles', '[]'::jsonb)) AS r(role)
      WHERE UPPER(r.role) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  )
  WITH CHECK (
    empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
    OR empresa_id IN (
      SELECT p.empresa_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
    OR UPPER(COALESCE(auth.jwt() ->> 'role', auth.jwt() ->> 'user_type', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(auth.jwt() -> 'roles', '[]'::jsonb)) AS r(role)
      WHERE UPPER(r.role) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  );

CREATE POLICY plantas_delete_tenant ON public.plantas
  FOR DELETE TO authenticated
  USING (
    empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
    OR empresa_id IN (
      SELECT p.empresa_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
    OR UPPER(COALESCE(auth.jwt() ->> 'role', auth.jwt() ->> 'user_type', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(auth.jwt() -> 'roles', '[]'::jsonb)) AS r(role)
      WHERE UPPER(r.role) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  );

NOTIFY pgrst, 'reload schema';