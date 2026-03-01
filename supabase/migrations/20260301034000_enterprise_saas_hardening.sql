-- ============================================================================
-- TRANSFORMAÇÃO SAAS ENTERPRISE: hardening multi-tenant, billing e white-label
-- Prioridade aplicada: Segurança > Integridade > Isolamento > Performance
-- ============================================================================

-- 1) Estrutura base de empresas
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_nome ON public.empresas (nome);

DO $$
DECLARE
  v_nome TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.empresas) THEN
    IF to_regclass('public.dados_empresa') IS NOT NULL THEN
      SELECT COALESCE(NULLIF(nome_fantasia, ''), razao_social, 'Empresa Default')
        INTO v_nome
      FROM public.dados_empresa
      ORDER BY created_at
      LIMIT 1;
    END IF;

    INSERT INTO public.empresas (nome)
    VALUES (COALESCE(v_nome, 'Empresa Default'));
  END IF;
END;
$$;

-- 2) Funções de contexto e segurança de tenant
CREATE OR REPLACE FUNCTION public.is_master_ti()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'MASTER_TI'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.get_current_empresa_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims JSONB;
  v_empresa_id UUID;
BEGIN
  BEGIN
    v_claims := current_setting('request.jwt.claims', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_claims := '{}'::jsonb;
  END;

  IF v_claims IS NULL THEN
    v_claims := '{}'::jsonb;
  END IF;

  IF v_claims ? 'empresa_id' THEN
    v_empresa_id := NULLIF(v_claims ->> 'empresa_id', '')::uuid;
  END IF;

  IF v_empresa_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT p.empresa_id
      INTO v_empresa_id
    FROM public.profiles p
    WHERE p.id = auth.uid();
  END IF;

  IF v_empresa_id IS NULL THEN
    IF public.is_master_ti() THEN
      RETURN NULL;
    END IF;

    RAISE EXCEPTION 'empresa_id is missing in authenticated context';
  END IF;

  RETURN v_empresa_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.empresa_is_active(p_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.empresas e
    WHERE e.id = p_empresa_id
      AND e.ativo = true
      AND e.status = 'active'
      AND (
        NOT EXISTS (
          SELECT 1
          FROM public.assinaturas a0
          WHERE a0.empresa_id = e.id
        )
        OR EXISTS (
          SELECT 1
          FROM public.assinaturas a1
          WHERE a1.empresa_id = e.id
            AND a1.status = 'active'
        )
      )
  );
$$;

-- 3) Estrutura comercial SaaS
CREATE TABLE IF NOT EXISTS public.planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  limite_usuarios INTEGER NOT NULL CHECK (limite_usuarios > 0),
  limite_os INTEGER NOT NULL CHECK (limite_os > 0),
  limite_storage BIGINT NOT NULL CHECK (limite_storage > 0),
  valor_mensal NUMERIC(12,2) NOT NULL CHECK (valor_mensal >= 0),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plano_id UUID NOT NULL REFERENCES public.planos(id),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid', 'paused')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  proximo_vencimento TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assinaturas_stripe_subscription_id ON public.assinaturas (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assinaturas_empresa_id ON public.assinaturas (empresa_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_plano_id ON public.assinaturas (plano_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON public.assinaturas (status);

CREATE TABLE IF NOT EXISTS public.empresa_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  dominio_custom TEXT UNIQUE,
  logo_url TEXT,
  cor_primaria TEXT NOT NULL DEFAULT '#2563eb',
  cor_secundaria TEXT NOT NULL DEFAULT '#0f172a',
  nome_exibicao TEXT,
  favicon_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_empresa_config_empresa_id ON public.empresa_config (empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_config_dominio_custom ON public.empresa_config (dominio_custom) WHERE dominio_custom IS NOT NULL;

-- 4) Logs enterprise, rate limiting por tenant e detecção de acesso cruzado
CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  action_type TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_audit_logs_empresa_id ON public.enterprise_audit_logs (empresa_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_audit_logs_created_at ON public.enterprise_audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.rate_limits_por_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count >= 0),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_por_empresa_lookup ON public.rate_limits_por_empresa (empresa_id, endpoint, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_por_empresa_blocked ON public.rate_limits_por_empresa (empresa_id, blocked_until);

CREATE OR REPLACE FUNCTION public.detect_cross_tenant_access(
  p_target_empresa_id UUID,
  p_resource TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_empresa_id UUID;
BEGIN
  IF public.is_master_ti() THEN
    RETURN false;
  END IF;

  v_current_empresa_id := public.get_current_empresa_id();

  IF p_target_empresa_id IS DISTINCT FROM v_current_empresa_id THEN
    INSERT INTO public.enterprise_audit_logs (empresa_id, severity, action_type, details)
    VALUES (
      v_current_empresa_id,
      'critical',
      'CROSS_TENANT_ACCESS_ATTEMPT',
      jsonb_build_object(
        'target_empresa_id', p_target_empresa_id,
        'resource', p_resource,
        'user_id', auth.uid()
      )
    );

    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit_por_empresa(
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 500,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
  v_window_start TIMESTAMPTZ;
  v_total INTEGER;
  v_blocked_until TIMESTAMPTZ;
BEGIN
  IF public.is_master_ti() THEN
    RETURN true;
  END IF;

  v_empresa_id := public.get_current_empresa_id();
  v_window_start := now() - make_interval(secs => p_window_seconds);

  SELECT MAX(blocked_until)
    INTO v_blocked_until
  FROM public.rate_limits_por_empresa
  WHERE empresa_id = v_empresa_id
    AND endpoint = p_endpoint;

  IF v_blocked_until IS NOT NULL AND v_blocked_until > now() THEN
    RETURN false;
  END IF;

  SELECT COALESCE(SUM(request_count), 0)
    INTO v_total
  FROM public.rate_limits_por_empresa
  WHERE empresa_id = v_empresa_id
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;

  INSERT INTO public.rate_limits_por_empresa (empresa_id, endpoint, window_start, request_count)
  VALUES (v_empresa_id, p_endpoint, date_trunc('minute', now()), 1)
  ON CONFLICT (empresa_id, endpoint, window_start)
  DO UPDATE SET request_count = public.rate_limits_por_empresa.request_count + 1;

  IF v_total + 1 > p_max_requests THEN
    UPDATE public.rate_limits_por_empresa
      SET blocked_until = now() + interval '10 minutes'
    WHERE empresa_id = v_empresa_id
      AND endpoint = p_endpoint;

    INSERT INTO public.enterprise_audit_logs (empresa_id, severity, action_type, details)
    VALUES (
      v_empresa_id,
      'error',
      'TENANT_RATE_LIMIT_BLOCKED',
      jsonb_build_object('endpoint', p_endpoint, 'max_requests', p_max_requests)
    );

    RETURN false;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.monitor_rate_limits_por_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.request_count > 5000 THEN
    NEW.blocked_until := now() + interval '30 minutes';

    INSERT INTO public.enterprise_audit_logs (empresa_id, severity, action_type, details)
    VALUES (
      NEW.empresa_id,
      'critical',
      'TENANT_VOLUME_ABUSE_DETECTED',
      jsonb_build_object('endpoint', NEW.endpoint, 'request_count', NEW.request_count)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS monitor_rate_limits_por_empresa ON public.rate_limits_por_empresa;
CREATE TRIGGER monitor_rate_limits_por_empresa
BEFORE INSERT OR UPDATE ON public.rate_limits_por_empresa
FOR EACH ROW
EXECUTE FUNCTION public.monitor_rate_limits_por_empresa();

-- 5) Trigger functions obrigatórias
CREATE OR REPLACE FUNCTION public.enforce_empresa_id_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := public.get_current_empresa_id();
  END IF;

  IF NEW.empresa_id IS NULL THEN
    RAISE EXCEPTION 'empresa_id is required';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.block_empresa_id_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
    RAISE EXCEPTION 'Updating empresa_id is not allowed';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.enterprise_audit_logs (empresa_id, severity, action_type, details)
  VALUES (
    COALESCE(NEW.empresa_id, OLD.empresa_id),
    'warning',
    'ROLE_CHANGE',
    jsonb_build_object(
      'user_id', COALESCE(NEW.user_id, OLD.user_id),
      'old_role', OLD.role,
      'new_role', NEW.role,
      'actor', auth.uid()
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_plan_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.enterprise_audit_logs (empresa_id, severity, action_type, details)
  VALUES (
    COALESCE(NEW.empresa_id, OLD.empresa_id),
    'info',
    'PLAN_CHANGE',
    jsonb_build_object(
      'assinatura_id', COALESCE(NEW.id, OLD.id),
      'old_plano_id', OLD.plano_id,
      'new_plano_id', NEW.plano_id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'actor', auth.uid()
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS log_role_change ON public.user_roles;
CREATE TRIGGER log_role_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.log_role_change();

DROP TRIGGER IF EXISTS log_plan_change ON public.assinaturas;
CREATE TRIGGER log_plan_change
AFTER INSERT OR UPDATE OR DELETE ON public.assinaturas
FOR EACH ROW
EXECUTE FUNCTION public.log_plan_change();

-- 6) Inclusão de empresa_id em todas as tabelas operacionais públicas
DO $$
DECLARE
  v_default_empresa_id UUID;
  v_table RECORD;
  v_constraint_name TEXT;
  v_missing_count BIGINT;
BEGIN
  SELECT id INTO v_default_empresa_id
  FROM public.empresas
  ORDER BY created_at
  LIMIT 1;

  IF v_default_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Could not determine default empresa for backfill';
  END IF;

  FOR v_table IN
    SELECT t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT IN (
        'empresas',
        'planos',
        'empresa_config',
        'enterprise_audit_logs',
        'rate_limits_por_empresa'
      )
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = v_table.table_name
        AND c.column_name = 'empresa_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN empresa_id UUID', v_table.table_name);
    END IF;

    EXECUTE format('UPDATE public.%I SET empresa_id = $1 WHERE empresa_id IS NULL', v_table.table_name)
    USING v_default_empresa_id;

    EXECUTE format('SELECT count(*) FROM public.%I WHERE empresa_id IS NULL', v_table.table_name)
      INTO v_missing_count;

    IF v_missing_count > 0 THEN
      RAISE EXCEPTION 'Inconsistency detected in table %: % rows still without empresa_id after backfill', v_table.table_name, v_missing_count;
    END IF;

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_empresa_id ON public.%I (empresa_id)', v_table.table_name, v_table.table_name);

    v_constraint_name := format('fk_%s_empresa_id', v_table.table_name);

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
        AND tc.table_name = v_table.table_name
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_name = v_constraint_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) NOT VALID',
        v_table.table_name,
        v_constraint_name
      );
    END IF;

    EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', v_table.table_name, v_constraint_name);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN empresa_id SET NOT NULL', v_table.table_name);
  END LOOP;
END;
$$;

-- 7) Isolamento por RLS em todas as tabelas com empresa_id
DO $$
DECLARE
  v_table RECORD;
  v_policy RECORD;
BEGIN
  FOR v_table IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'empresa_id'
      AND c.table_name <> 'empresas'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table.table_name);

    FOR v_policy IN
      SELECT p.policyname
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = v_table.table_name
        AND (
          COALESCE(trim(p.qual), '') IN ('true', '(true)')
          OR COALESCE(trim(p.with_check), '') IN ('true', '(true)')
        )
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy.policyname, v_table.table_name);
    END LOOP;

    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', v_table.table_name);
    EXECUTE format('DROP POLICY IF EXISTS master_ti_global_access ON public.%I', v_table.table_name);

    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I FOR ALL TO authenticated USING (empresa_id = get_current_empresa_id() AND empresa_is_active(empresa_id)) WITH CHECK (empresa_id = get_current_empresa_id() AND empresa_is_active(empresa_id))',
      v_table.table_name
    );

    EXECUTE format(
      'CREATE POLICY master_ti_global_access ON public.%I FOR ALL TO authenticated USING (is_master_ti()) WITH CHECK (is_master_ti())',
      v_table.table_name
    );
  END LOOP;
END;
$$;

-- 8) Triggers por tabela para empresa_id obrigatório e imutável
DO $$
DECLARE
  v_table RECORD;
BEGIN
  FOR v_table IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'empresa_id'
      AND c.table_name NOT IN ('empresas')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS enforce_empresa_id_insert ON public.%I', v_table.table_name);
    EXECUTE format('CREATE TRIGGER enforce_empresa_id_insert BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_empresa_id_insert()', v_table.table_name);

    EXECUTE format('DROP TRIGGER IF EXISTS block_empresa_id_update ON public.%I', v_table.table_name);
    EXECUTE format('CREATE TRIGGER block_empresa_id_update BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.block_empresa_id_update()', v_table.table_name);
  END LOOP;
END;
$$;

-- 9) Monitoramento semanal de integridade de tenant
CREATE OR REPLACE FUNCTION public.weekly_tenant_integrity_check()
RETURNS TABLE (table_name TEXT, issue_type TEXT, issue_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table RECORD;
  v_count BIGINT;
BEGIN
  FOR v_table IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'empresa_id'
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE empresa_id IS NULL', v_table.table_name)
      INTO v_count;

    IF v_count > 0 THEN
      INSERT INTO public.enterprise_audit_logs (severity, action_type, details)
      VALUES ('critical', 'TENANT_INTEGRITY_NULL_EMPRESA_ID', jsonb_build_object('table', v_table.table_name, 'count', v_count));

      table_name := v_table.table_name;
      issue_type := 'missing_empresa_id';
      issue_count := v_count;
      RETURN NEXT;
    END IF;

    EXECUTE format(
      'SELECT count(*) FROM public.%I t LEFT JOIN public.empresas e ON e.id = t.empresa_id WHERE e.id IS NULL',
      v_table.table_name
    ) INTO v_count;

    IF v_count > 0 THEN
      INSERT INTO public.enterprise_audit_logs (severity, action_type, details)
      VALUES ('critical', 'TENANT_INTEGRITY_BROKEN_FK', jsonb_build_object('table', v_table.table_name, 'count', v_count));

      table_name := v_table.table_name;
      issue_type := 'broken_fk_empresa_id';
      issue_count := v_count;
      RETURN NEXT;
    END IF;
  END LOOP;

  FOR v_table IN
    SELECT t.tablename AS table_name
    FROM pg_tables t
    LEFT JOIN pg_class c ON c.relname = t.tablename
    LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.schemaname = 'public'
      AND n.nspname = 'public'
      AND c.relrowsecurity = false
  LOOP
    INSERT INTO public.enterprise_audit_logs (severity, action_type, details)
    VALUES ('critical', 'TENANT_INTEGRITY_RLS_DISABLED', jsonb_build_object('table', v_table.table_name));

    table_name := v_table.table_name;
    issue_type := 'rls_disabled';
    issue_count := 1;
    RETURN NEXT;
  END LOOP;

  FOR v_table IN
    SELECT p.tablename AS table_name
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND (
        COALESCE(trim(p.qual), '') IN ('true', '(true)')
        OR COALESCE(trim(p.with_check), '') IN ('true', '(true)')
      )
  LOOP
    INSERT INTO public.enterprise_audit_logs (severity, action_type, details)
    VALUES ('critical', 'TENANT_INTEGRITY_POLICY_PERMISSIVE', jsonb_build_object('table', v_table.table_name));

    table_name := v_table.table_name;
    issue_type := 'permissive_policy';
    issue_count := 1;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- 10) RLS para novas tabelas SaaS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits_por_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS empresas_tenant_or_master ON public.empresas;
CREATE POLICY empresas_tenant_or_master ON public.empresas
FOR SELECT TO authenticated
USING (id = get_current_empresa_id() OR is_master_ti());

DROP POLICY IF EXISTS planos_read_authenticated ON public.planos;
CREATE POLICY planos_read_authenticated ON public.planos
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS planos_manage_master ON public.planos;
CREATE POLICY planos_manage_master ON public.planos
FOR ALL TO authenticated
USING (is_master_ti())
WITH CHECK (is_master_ti());

DROP POLICY IF EXISTS assinaturas_tenant_or_master ON public.assinaturas;
CREATE POLICY assinaturas_tenant_or_master ON public.assinaturas
FOR ALL TO authenticated
USING ((empresa_id = get_current_empresa_id() AND empresa_is_active(empresa_id)) OR is_master_ti())
WITH CHECK ((empresa_id = get_current_empresa_id() AND empresa_is_active(empresa_id)) OR is_master_ti());

DROP POLICY IF EXISTS empresa_config_tenant_or_master ON public.empresa_config;
CREATE POLICY empresa_config_tenant_or_master ON public.empresa_config
FOR ALL TO authenticated
USING ((empresa_id = get_current_empresa_id() AND empresa_is_active(empresa_id)) OR is_master_ti())
WITH CHECK ((empresa_id = get_current_empresa_id() AND empresa_is_active(empresa_id)) OR is_master_ti());

DROP POLICY IF EXISTS enterprise_logs_tenant_or_master ON public.enterprise_audit_logs;
CREATE POLICY enterprise_logs_tenant_or_master ON public.enterprise_audit_logs
FOR SELECT TO authenticated
USING (empresa_id = get_current_empresa_id() OR is_master_ti());

DROP POLICY IF EXISTS enterprise_logs_system_insert ON public.enterprise_audit_logs;
CREATE POLICY enterprise_logs_system_insert ON public.enterprise_audit_logs
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS rate_limits_por_empresa_tenant_or_master ON public.rate_limits_por_empresa;
CREATE POLICY rate_limits_por_empresa_tenant_or_master ON public.rate_limits_por_empresa
FOR ALL TO authenticated
USING (empresa_id = get_current_empresa_id() OR is_master_ti())
WITH CHECK (empresa_id = get_current_empresa_id() OR is_master_ti());

-- 11) Grants
GRANT EXECUTE ON FUNCTION public.get_current_empresa_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.empresa_is_active(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_cross_tenant_access(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit_por_empresa(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.weekly_tenant_integrity_check() TO authenticated;

-- 12) Seeds iniciais de planos (idempotente)
INSERT INTO public.planos (nome, limite_usuarios, limite_os, limite_storage, valor_mensal, ativo)
VALUES
  ('Starter', 10, 1000, 10737418240, 299.90, true),
  ('Professional', 50, 10000, 107374182400, 999.90, true),
  ('Enterprise', 500, 100000, 1099511627776, 4999.90, true)
ON CONFLICT (nome) DO NOTHING;

-- 13) Atualização automática de updated_at
DO $$
BEGIN
  IF to_regproc('public.update_updated_at_column') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS update_empresas_updated_at ON public.empresas;
    CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS update_planos_updated_at ON public.planos;
    CREATE TRIGGER update_planos_updated_at BEFORE UPDATE ON public.planos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS update_assinaturas_updated_at ON public.assinaturas;
    CREATE TRIGGER update_assinaturas_updated_at BEFORE UPDATE ON public.assinaturas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS update_empresa_config_updated_at ON public.empresa_config;
    CREATE TRIGGER update_empresa_config_updated_at BEFORE UPDATE ON public.empresa_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;
