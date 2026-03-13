-- Migracao final para tenant hardening (4 tabelas)
-- Data: 2026-03-12
-- Tabelas alvo: solicitacoes, solicitacoes_manutencao, subscription_payments, contract_versions

BEGIN;

-- 0) Guardrails: identificar funcao de contexto tenant
DO $$
BEGIN
  IF to_regprocedure('public.get_current_empresa_id()') IS NULL
     AND to_regprocedure('public.current_empresa_id()') IS NULL THEN
    RAISE EXCEPTION 'Nenhuma funcao de contexto tenant encontrada (get_current_empresa_id/current_empresa_id).';
  END IF;
END $$;

-- 1) Adicionar coluna empresa_id (idempotente)
ALTER TABLE IF EXISTS public.subscription_payments ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE IF EXISTS public.contract_versions ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE IF EXISTS public.solicitacoes_manutencao ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE IF EXISTS public.solicitacoes ADD COLUMN IF NOT EXISTS empresa_id uuid;

-- 2) Backfill empresa_id por relacionamento conhecido
-- 2.1 subscription_payments -> subscriptions
UPDATE public.subscription_payments sp
SET empresa_id = s.empresa_id
FROM public.subscriptions s
WHERE sp.subscription_id = s.id
  AND sp.empresa_id IS NULL;

-- 2.2 contract_versions -> contracts
UPDATE public.contract_versions cv
SET empresa_id = c.empresa_id
FROM public.contracts c
WHERE cv.contract_id = c.id
  AND cv.empresa_id IS NULL;

-- 2.3 solicitacoes_manutencao -> equipamentos (quando existir equipamento_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'solicitacoes_manutencao' AND column_name = 'equipamento_id'
  ) THEN
    EXECUTE '
      UPDATE public.solicitacoes_manutencao sm
      SET empresa_id = e.empresa_id
      FROM public.equipamentos e
      WHERE sm.equipamento_id = e.id
        AND sm.empresa_id IS NULL
    ';
  END IF;
END $$;

-- 2.4 solicitacoes (legado) -> equipamentos (quando existir equipamento_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'solicitacoes' AND column_name = 'equipamento_id'
  ) THEN
    EXECUTE '
      UPDATE public.solicitacoes s
      SET empresa_id = e.empresa_id
      FROM public.equipamentos e
      WHERE s.equipamento_id = e.id
        AND s.empresa_id IS NULL
    ';
  END IF;
END $$;

-- 2.5 Fallback: preencher nulos restantes com empresa default para nao quebrar rollout
DO $$
DECLARE
  v_default_empresa uuid;
BEGIN
  SELECT id INTO v_default_empresa FROM public.empresas ORDER BY created_at LIMIT 1;

  IF v_default_empresa IS NOT NULL THEN
    UPDATE public.subscription_payments SET empresa_id = v_default_empresa WHERE empresa_id IS NULL;
    UPDATE public.contract_versions SET empresa_id = v_default_empresa WHERE empresa_id IS NULL;
    UPDATE public.solicitacoes_manutencao SET empresa_id = v_default_empresa WHERE empresa_id IS NULL;
    UPDATE public.solicitacoes SET empresa_id = v_default_empresa WHERE empresa_id IS NULL;
  END IF;
END $$;

-- 3) FK + indice
ALTER TABLE IF EXISTS public.subscription_payments
  DROP CONSTRAINT IF EXISTS subscription_payments_empresa_id_fkey;
ALTER TABLE IF EXISTS public.subscription_payments
  ADD CONSTRAINT subscription_payments_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.contract_versions
  DROP CONSTRAINT IF EXISTS contract_versions_empresa_id_fkey;
ALTER TABLE IF EXISTS public.contract_versions
  ADD CONSTRAINT contract_versions_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.solicitacoes_manutencao
  DROP CONSTRAINT IF EXISTS solicitacoes_manutencao_empresa_id_fkey;
ALTER TABLE IF EXISTS public.solicitacoes_manutencao
  ADD CONSTRAINT solicitacoes_manutencao_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.solicitacoes
  DROP CONSTRAINT IF EXISTS solicitacoes_empresa_id_fkey;
ALTER TABLE IF EXISTS public.solicitacoes
  ADD CONSTRAINT solicitacoes_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_subscription_payments_empresa_id ON public.subscription_payments(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contract_versions_empresa_id ON public.contract_versions(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_manutencao_empresa_id ON public.solicitacoes_manutencao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_empresa_id ON public.solicitacoes(empresa_id);

-- 4) NOT NULL quando seguro
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.subscription_payments WHERE empresa_id IS NULL) THEN
    ALTER TABLE public.subscription_payments ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contract_versions WHERE empresa_id IS NULL) THEN
    ALTER TABLE public.contract_versions ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.solicitacoes_manutencao WHERE empresa_id IS NULL) THEN
    ALTER TABLE public.solicitacoes_manutencao ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  IF to_regclass('public.solicitacoes') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.solicitacoes WHERE empresa_id IS NULL) THEN
    ALTER TABLE public.solicitacoes ALTER COLUMN empresa_id SET NOT NULL;
  END IF;
END $$;

-- 5) RLS hardening (remove policies permissivas true)
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('subscription_payments','contract_versions','solicitacoes_manutencao','solicitacoes')
      AND (
        lower(coalesce(qual, '')) = 'true'
        OR lower(coalesce(with_check, '')) = 'true'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

ALTER TABLE IF EXISTS public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.solicitacoes_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.solicitacoes ENABLE ROW LEVEL SECURITY;

-- 6) Policies tenant-safe (adaptativo por funcao tenant)
DO $$
DECLARE
  tenant_expr text;
BEGIN
  IF to_regprocedure('public.get_current_empresa_id()') IS NOT NULL THEN
    tenant_expr := 'public.get_current_empresa_id()';
  ELSE
    tenant_expr := 'public.current_empresa_id()';
  END IF;

  -- subscription_payments
  EXECUTE 'DROP POLICY IF EXISTS subscription_payments_tenant_read ON public.subscription_payments';
  EXECUTE 'DROP POLICY IF EXISTS subscription_payments_tenant_write ON public.subscription_payments';
  EXECUTE format(
    'CREATE POLICY subscription_payments_tenant_read ON public.subscription_payments FOR SELECT USING (public.is_control_plane_operator() OR empresa_id = %s)',
    tenant_expr
  );
  EXECUTE format(
    'CREATE POLICY subscription_payments_tenant_write ON public.subscription_payments FOR ALL USING (public.is_control_plane_operator() OR empresa_id = %s) WITH CHECK (public.is_control_plane_operator() OR empresa_id = %s)',
    tenant_expr,
    tenant_expr
  );

  -- contract_versions
  EXECUTE 'DROP POLICY IF EXISTS contract_versions_tenant_read ON public.contract_versions';
  EXECUTE 'DROP POLICY IF EXISTS contract_versions_tenant_write ON public.contract_versions';
  EXECUTE format(
    'CREATE POLICY contract_versions_tenant_read ON public.contract_versions FOR SELECT USING (public.is_control_plane_operator() OR empresa_id = %s)',
    tenant_expr
  );
  EXECUTE format(
    'CREATE POLICY contract_versions_tenant_write ON public.contract_versions FOR ALL USING (public.is_control_plane_operator() OR empresa_id = %s) WITH CHECK (public.is_control_plane_operator() OR empresa_id = %s)',
    tenant_expr,
    tenant_expr
  );

  -- solicitacoes_manutencao
  EXECUTE 'DROP POLICY IF EXISTS solicitacoes_manutencao_tenant_read ON public.solicitacoes_manutencao';
  EXECUTE 'DROP POLICY IF EXISTS solicitacoes_manutencao_tenant_write ON public.solicitacoes_manutencao';
  EXECUTE format(
    'CREATE POLICY solicitacoes_manutencao_tenant_read ON public.solicitacoes_manutencao FOR SELECT USING (public.is_control_plane_operator() OR empresa_id = %s)',
    tenant_expr
  );
  EXECUTE format(
    'CREATE POLICY solicitacoes_manutencao_tenant_write ON public.solicitacoes_manutencao FOR ALL USING (public.is_control_plane_operator() OR empresa_id = %s) WITH CHECK (public.is_control_plane_operator() OR empresa_id = %s)',
    tenant_expr,
    tenant_expr
  );

  -- solicitacoes (legado)
  IF to_regclass('public.solicitacoes') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS solicitacoes_tenant_read ON public.solicitacoes';
    EXECUTE 'DROP POLICY IF EXISTS solicitacoes_tenant_write ON public.solicitacoes';
    EXECUTE format(
      'CREATE POLICY solicitacoes_tenant_read ON public.solicitacoes FOR SELECT USING (public.is_control_plane_operator() OR empresa_id = %s)',
      tenant_expr
    );
    EXECUTE format(
      'CREATE POLICY solicitacoes_tenant_write ON public.solicitacoes FOR ALL USING (public.is_control_plane_operator() OR empresa_id = %s) WITH CHECK (public.is_control_plane_operator() OR empresa_id = %s)',
      tenant_expr,
      tenant_expr
    );
  END IF;
END $$;

COMMIT;

-- Validacao rapida
SELECT
  count(*)::int AS total_tabelas,
  count(*) FILTER (WHERE has_empresa_id)::int AS tabelas_com_empresa_id,
  count(*) FILTER (WHERE has_empresa_id AND rls_enabled)::int AS tabelas_tenant_com_rls,
  count(*) FILTER (WHERE has_empresa_id AND NOT rls_enabled)::int AS tabelas_tenant_sem_rls,
  count(*) FILTER (WHERE NOT has_empresa_id)::int AS tabelas_sem_empresa_id
FROM (
  SELECT
    t.table_name,
    EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = t.table_name
        AND c.column_name = 'empresa_id'
    ) AS has_empresa_id,
    COALESCE(pc.relrowsecurity, false) AS rls_enabled
  FROM information_schema.tables t
  LEFT JOIN pg_class pc
    ON pc.relname = t.table_name
   AND pc.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
) s;
