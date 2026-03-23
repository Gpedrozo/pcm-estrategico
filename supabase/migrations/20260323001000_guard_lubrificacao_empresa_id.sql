-- ============================================================================
-- Migration: Guarda de empresa_id no modulo de lubrificacao
-- Data: 2026-03-23
-- Motivo: Ambientes que executaram apenas a migration inicial de lubrificacao
--         ficam sem coluna empresa_id, quebrando filtros tenant-first.
-- ============================================================================

ALTER TABLE IF EXISTS public.planos_lubrificacao
  ADD COLUMN IF NOT EXISTS empresa_id uuid;

ALTER TABLE IF EXISTS public.atividades_lubrificacao
  ADD COLUMN IF NOT EXISTS empresa_id uuid;

ALTER TABLE IF EXISTS public.execucoes_lubrificacao
  ADD COLUMN IF NOT EXISTS empresa_id uuid;

DO $$
BEGIN
  IF to_regclass('public.equipamentos') IS NOT NULL AND to_regclass('public.planos_lubrificacao') IS NOT NULL THEN
    UPDATE public.planos_lubrificacao pl
    SET empresa_id = e.empresa_id
    FROM public.equipamentos e
    WHERE e.id = pl.equipamento_id
      AND pl.empresa_id IS NULL;
  END IF;

  IF to_regclass('public.planos_lubrificacao') IS NOT NULL AND to_regclass('public.atividades_lubrificacao') IS NOT NULL THEN
    UPDATE public.atividades_lubrificacao al
    SET empresa_id = pl.empresa_id
    FROM public.planos_lubrificacao pl
    WHERE pl.id = al.plano_id
      AND al.empresa_id IS NULL;
  END IF;

  IF to_regclass('public.planos_lubrificacao') IS NOT NULL AND to_regclass('public.execucoes_lubrificacao') IS NOT NULL THEN
    UPDATE public.execucoes_lubrificacao el
    SET empresa_id = pl.empresa_id
    FROM public.planos_lubrificacao pl
    WHERE pl.id = el.plano_id
      AND el.empresa_id IS NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_planos_lubrificacao_empresa_proxima
  ON public.planos_lubrificacao (empresa_id, proxima_execucao);

CREATE INDEX IF NOT EXISTS idx_atividades_lubrificacao_empresa_plano
  ON public.atividades_lubrificacao (empresa_id, plano_id);

CREATE INDEX IF NOT EXISTS idx_execucoes_lubrificacao_empresa_data
  ON public.execucoes_lubrificacao (empresa_id, data_execucao);

DO $$
BEGIN
  IF to_regclass('public.empresas') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'planos_lubrificacao_empresa_id_fkey'
        AND conrelid = 'public.planos_lubrificacao'::regclass
    ) THEN
      ALTER TABLE public.planos_lubrificacao
        ADD CONSTRAINT planos_lubrificacao_empresa_id_fkey
        FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'atividades_lubrificacao_empresa_id_fkey'
        AND conrelid = 'public.atividades_lubrificacao'::regclass
    ) THEN
      ALTER TABLE public.atividades_lubrificacao
        ADD CONSTRAINT atividades_lubrificacao_empresa_id_fkey
        FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'execucoes_lubrificacao_empresa_id_fkey'
        AND conrelid = 'public.execucoes_lubrificacao'::regclass
    ) THEN
      ALTER TABLE public.execucoes_lubrificacao
        ADD CONSTRAINT execucoes_lubrificacao_empresa_id_fkey
        FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
  END IF;
END;
$$;

ALTER TABLE IF EXISTS public.planos_lubrificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.atividades_lubrificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.execucoes_lubrificacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON public.planos_lubrificacao;
DROP POLICY IF EXISTS tenant_insert ON public.planos_lubrificacao;
DROP POLICY IF EXISTS tenant_update ON public.planos_lubrificacao;
DROP POLICY IF EXISTS tenant_delete ON public.planos_lubrificacao;

CREATE POLICY tenant_select ON public.planos_lubrificacao
  FOR SELECT TO authenticated
  USING (
    empresa_id = NULLIF(
      COALESCE(
        auth.jwt() ->> 'empresa_id',
        auth.jwt() ->> 'tenant_id',
        auth.jwt() -> 'app_metadata' ->> 'empresa_id',
        auth.jwt() -> 'app_metadata' ->> 'tenant_id'
      ),
      ''
    )::uuid
    OR UPPER(COALESCE(
      auth.jwt() ->> 'role',
      auth.jwt() ->> 'user_role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    )) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
  );

CREATE POLICY tenant_insert ON public.planos_lubrificacao
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = NULLIF(
      COALESCE(
        auth.jwt() ->> 'empresa_id',
        auth.jwt() ->> 'tenant_id',
        auth.jwt() -> 'app_metadata' ->> 'empresa_id',
        auth.jwt() -> 'app_metadata' ->> 'tenant_id'
      ),
      ''
    )::uuid
    OR UPPER(COALESCE(
      auth.jwt() ->> 'role',
      auth.jwt() ->> 'user_role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    )) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
  );

CREATE POLICY tenant_update ON public.planos_lubrificacao
  FOR UPDATE TO authenticated
  USING (
    empresa_id = NULLIF(
      COALESCE(
        auth.jwt() ->> 'empresa_id',
        auth.jwt() ->> 'tenant_id',
        auth.jwt() -> 'app_metadata' ->> 'empresa_id',
        auth.jwt() -> 'app_metadata' ->> 'tenant_id'
      ),
      ''
    )::uuid
    OR UPPER(COALESCE(
      auth.jwt() ->> 'role',
      auth.jwt() ->> 'user_role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    )) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
  )
  WITH CHECK (
    empresa_id = NULLIF(
      COALESCE(
        auth.jwt() ->> 'empresa_id',
        auth.jwt() ->> 'tenant_id',
        auth.jwt() -> 'app_metadata' ->> 'empresa_id',
        auth.jwt() -> 'app_metadata' ->> 'tenant_id'
      ),
      ''
    )::uuid
    OR UPPER(COALESCE(
      auth.jwt() ->> 'role',
      auth.jwt() ->> 'user_role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    )) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
  );

CREATE POLICY tenant_delete ON public.planos_lubrificacao
  FOR DELETE TO authenticated
  USING (
    empresa_id = NULLIF(
      COALESCE(
        auth.jwt() ->> 'empresa_id',
        auth.jwt() ->> 'tenant_id',
        auth.jwt() -> 'app_metadata' ->> 'empresa_id',
        auth.jwt() -> 'app_metadata' ->> 'tenant_id'
      ),
      ''
    )::uuid
    OR UPPER(COALESCE(
      auth.jwt() ->> 'role',
      auth.jwt() ->> 'user_role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    )) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
  );

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.planos_lubrificacao TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.planos_lubrificacao TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
