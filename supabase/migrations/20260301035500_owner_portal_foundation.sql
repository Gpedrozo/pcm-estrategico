-- Owner Portal foundation (global scope)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'SYSTEM_OWNER';

CREATE TABLE IF NOT EXISTS public.system_owner_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enterprise_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  limite_usuarios integer NOT NULL CHECK (limite_usuarios >= 0),
  limite_os integer NOT NULL CHECK (limite_os >= 0),
  limite_storage bigint NOT NULL CHECK (limite_storage >= 0),
  valor_mensal numeric(12,2) NOT NULL CHECK (valor_mensal >= 0),
  ativo boolean NOT NULL DEFAULT true,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enterprise_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'delinquent')),
  plano_id uuid REFERENCES public.enterprise_plans(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  suspended_at timestamptz,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.enterprise_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.enterprise_companies(id),
  plano_id uuid NOT NULL REFERENCES public.enterprise_plans(id),
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  empresa_id uuid REFERENCES public.enterprise_companies(id),
  action_type text NOT NULL,
  action_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enterprise_impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  empresa_id uuid NOT NULL REFERENCES public.enterprise_companies(id),
  reason text,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enterprise_system_integrity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name text NOT NULL,
  check_status text NOT NULL CHECK (check_status IN ('ok', 'warning', 'error')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_companies_status_created_at
  ON public.enterprise_companies (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_subscriptions_status_period_end
  ON public.enterprise_subscriptions (status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_enterprise_audit_logs_created_at
  ON public.enterprise_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_audit_logs_action_type
  ON public.enterprise_audit_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_enterprise_audit_logs_empresa_id
  ON public.enterprise_audit_logs (empresa_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_impersonation_sessions_expiration
  ON public.enterprise_impersonation_sessions (active, expires_at);
CREATE INDEX IF NOT EXISTS idx_enterprise_integrity_checked_at
  ON public.enterprise_system_integrity (checked_at DESC);

CREATE OR REPLACE FUNCTION public.is_system_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT
    public.has_role(auth.uid(), 'SYSTEM_OWNER'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.system_owner_allowlist a
      JOIN auth.users u ON u.id = auth.uid()
      WHERE lower(a.email) = lower(u.email)
    );
$$;

CREATE OR REPLACE FUNCTION public.is_system_owner_strict()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_system_owner()
    AND coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

CREATE OR REPLACE FUNCTION public.guard_system_owner_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_owner_count integer;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.role = 'SYSTEM_OWNER'::public.app_role AND NOT public.is_system_owner_strict() THEN
    RAISE EXCEPTION 'Somente SYSTEM_OWNER com 2FA pode promover novos SYSTEM_OWNER';
  END IF;

  IF TG_OP = 'UPDATE' AND (OLD.role = 'SYSTEM_OWNER'::public.app_role OR NEW.role = 'SYSTEM_OWNER'::public.app_role) THEN
    IF NOT public.is_system_owner_strict() THEN
      RAISE EXCEPTION 'Alteração de SYSTEM_OWNER requer autenticação forte';
    END IF;

    IF OLD.role = 'SYSTEM_OWNER'::public.app_role AND NEW.role <> 'SYSTEM_OWNER'::public.app_role THEN
      SELECT count(*) INTO current_owner_count
      FROM public.user_roles
      WHERE role = 'SYSTEM_OWNER'::public.app_role;

      IF current_owner_count <= 1 THEN
        RAISE EXCEPTION 'Não é permitido remover o último SYSTEM_OWNER';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.role = 'SYSTEM_OWNER'::public.app_role THEN
    IF NOT public.is_system_owner_strict() THEN
      RAISE EXCEPTION 'Remoção de SYSTEM_OWNER requer autenticação forte';
    END IF;

    SELECT count(*) INTO current_owner_count
    FROM public.user_roles
    WHERE role = 'SYSTEM_OWNER'::public.app_role;

    IF current_owner_count <= 1 THEN
      RAISE EXCEPTION 'Não é permitido remover o último SYSTEM_OWNER';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_system_owner_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_system_owner() THEN
    INSERT INTO public.enterprise_audit_logs (actor_user_id, actor_email, action_type, action_details)
    VALUES (
      auth.uid(),
      auth.jwt() ->> 'email',
      TG_TABLE_NAME || '.' || TG_OP,
      jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_soft_delete_company(p_company_id uuid, p_confirmation text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  company_name text;
BEGIN
  IF NOT public.is_system_owner_strict() THEN
    RAISE EXCEPTION 'Ação permitida apenas para SYSTEM_OWNER com 2FA';
  END IF;

  SELECT nome INTO company_name
  FROM public.enterprise_companies
  WHERE id = p_company_id
    AND deleted_at IS NULL;

  IF company_name IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada';
  END IF;

  IF p_confirmation IS NULL OR trim(p_confirmation) <> company_name THEN
    RAISE EXCEPTION 'Confirmação inválida para exclusão';
  END IF;

  UPDATE public.enterprise_companies
  SET status = 'suspended',
      deleted_at = now(),
      updated_at = now()
  WHERE id = p_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_impersonation_session(p_company_id uuid, p_reason text DEFAULT null, p_minutes integer DEFAULT 30)
RETURNS public.enterprise_impersonation_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session public.enterprise_impersonation_sessions;
BEGIN
  IF NOT public.is_system_owner_strict() THEN
    RAISE EXCEPTION 'Impersonação permitida apenas para SYSTEM_OWNER com 2FA';
  END IF;

  INSERT INTO public.enterprise_impersonation_sessions (owner_user_id, empresa_id, reason, expires_at, active)
  VALUES (auth.uid(), p_company_id, p_reason, now() + make_interval(mins => GREATEST(1, LEAST(p_minutes, 240))), true)
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_impersonation_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE public.enterprise_impersonation_sessions
  SET active = false
  WHERE active = true
    AND expires_at <= now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_list_companies(p_page integer DEFAULT 1, p_page_size integer DEFAULT 25)
RETURNS SETOF public.enterprise_companies
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT *
  FROM public.enterprise_companies
  WHERE deleted_at IS NULL
    AND public.is_system_owner()
  ORDER BY created_at DESC
  LIMIT LEAST(GREATEST(p_page_size, 1), 100)
  OFFSET (GREATEST(p_page, 1) - 1) * LEAST(GREATEST(p_page_size, 1), 100);
$$;

CREATE OR REPLACE FUNCTION public.owner_dashboard_metrics()
RETURNS TABLE (
  total_empresas bigint,
  empresas_ativas bigint,
  empresas_suspensas bigint,
  total_usuarios bigint,
  mrr numeric(12,2),
  receita_anual_estimada numeric(12,2),
  empresas_trial bigint,
  inadimplentes bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (SELECT count(*) FROM public.enterprise_companies WHERE deleted_at IS NULL),
    (SELECT count(*) FROM public.enterprise_companies WHERE status = 'active' AND deleted_at IS NULL),
    (SELECT count(*) FROM public.enterprise_companies WHERE status = 'suspended' AND deleted_at IS NULL),
    (SELECT count(*) FROM public.profiles),
    (SELECT coalesce(sum(valor_mensal), 0)::numeric(12,2)
      FROM public.enterprise_subscriptions s
      JOIN public.enterprise_plans p ON p.id = s.plano_id
      WHERE s.status = 'active'),
    (SELECT (coalesce(sum(valor_mensal), 0) * 12)::numeric(12,2)
      FROM public.enterprise_subscriptions s
      JOIN public.enterprise_plans p ON p.id = s.plano_id
      WHERE s.status = 'active'),
    (SELECT count(*) FROM public.enterprise_companies WHERE status = 'trial' AND deleted_at IS NULL),
    (SELECT count(*) FROM public.enterprise_subscriptions WHERE status = 'past_due')
  WHERE public.is_system_owner();
$$;

ALTER TABLE public.enterprise_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_system_integrity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_owner_allowlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System owners can view plans" ON public.enterprise_plans;
CREATE POLICY "System owners can view plans"
  ON public.enterprise_plans FOR SELECT
  USING (public.is_system_owner());
DROP POLICY IF EXISTS "System owners can manage plans" ON public.enterprise_plans;
CREATE POLICY "System owners can manage plans"
  ON public.enterprise_plans FOR ALL
  USING (public.is_system_owner_strict())
  WITH CHECK (public.is_system_owner_strict());

DROP POLICY IF EXISTS "System owners can view companies" ON public.enterprise_companies;
CREATE POLICY "System owners can view companies"
  ON public.enterprise_companies FOR SELECT
  USING (public.is_system_owner());
DROP POLICY IF EXISTS "System owners can manage companies" ON public.enterprise_companies;
CREATE POLICY "System owners can manage companies"
  ON public.enterprise_companies FOR ALL
  USING (public.is_system_owner_strict())
  WITH CHECK (public.is_system_owner_strict());

DROP POLICY IF EXISTS "System owners can view subscriptions" ON public.enterprise_subscriptions;
CREATE POLICY "System owners can view subscriptions"
  ON public.enterprise_subscriptions FOR SELECT
  USING (public.is_system_owner());
DROP POLICY IF EXISTS "System owners can manage subscriptions" ON public.enterprise_subscriptions;
CREATE POLICY "System owners can manage subscriptions"
  ON public.enterprise_subscriptions FOR ALL
  USING (public.is_system_owner_strict())
  WITH CHECK (public.is_system_owner_strict());

DROP POLICY IF EXISTS "System owners can view enterprise audit logs" ON public.enterprise_audit_logs;
CREATE POLICY "System owners can view enterprise audit logs"
  ON public.enterprise_audit_logs FOR SELECT
  USING (public.is_system_owner());
DROP POLICY IF EXISTS "System owners can insert enterprise audit logs" ON public.enterprise_audit_logs;
CREATE POLICY "System owners can insert enterprise audit logs"
  ON public.enterprise_audit_logs FOR INSERT
  WITH CHECK (public.is_system_owner());

DROP POLICY IF EXISTS "System owners can view impersonation sessions" ON public.enterprise_impersonation_sessions;
CREATE POLICY "System owners can view impersonation sessions"
  ON public.enterprise_impersonation_sessions FOR SELECT
  USING (public.is_system_owner());
DROP POLICY IF EXISTS "System owners can manage impersonation sessions" ON public.enterprise_impersonation_sessions;
CREATE POLICY "System owners can manage impersonation sessions"
  ON public.enterprise_impersonation_sessions FOR ALL
  USING (public.is_system_owner_strict())
  WITH CHECK (public.is_system_owner_strict());

DROP POLICY IF EXISTS "System owners can view integrity checks" ON public.enterprise_system_integrity;
CREATE POLICY "System owners can view integrity checks"
  ON public.enterprise_system_integrity FOR SELECT
  USING (public.is_system_owner());
DROP POLICY IF EXISTS "System owners can manage integrity checks" ON public.enterprise_system_integrity;
CREATE POLICY "System owners can manage integrity checks"
  ON public.enterprise_system_integrity FOR ALL
  USING (public.is_system_owner_strict())
  WITH CHECK (public.is_system_owner_strict());

DROP POLICY IF EXISTS "System owners can view allowlist" ON public.system_owner_allowlist;
CREATE POLICY "System owners can view allowlist"
  ON public.system_owner_allowlist FOR SELECT
  USING (public.is_system_owner_strict());
DROP POLICY IF EXISTS "System owners can manage allowlist" ON public.system_owner_allowlist;
CREATE POLICY "System owners can manage allowlist"
  ON public.system_owner_allowlist FOR ALL
  USING (public.is_system_owner_strict())
  WITH CHECK (public.is_system_owner_strict());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_enterprise_plans_updated_at') THEN
      CREATE TRIGGER update_enterprise_plans_updated_at
      BEFORE UPDATE ON public.enterprise_plans
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_enterprise_companies_updated_at') THEN
      CREATE TRIGGER update_enterprise_companies_updated_at
      BEFORE UPDATE ON public.enterprise_companies
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_enterprise_subscriptions_updated_at') THEN
      CREATE TRIGGER update_enterprise_subscriptions_updated_at
      BEFORE UPDATE ON public.enterprise_subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'guard_system_owner_role_changes') THEN
    CREATE TRIGGER guard_system_owner_role_changes
    BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.guard_system_owner_role_changes();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'log_owner_action_enterprise_companies') THEN
    CREATE TRIGGER log_owner_action_enterprise_companies
    AFTER INSERT OR UPDATE OR DELETE ON public.enterprise_companies
    FOR EACH ROW EXECUTE FUNCTION public.log_system_owner_action();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'log_owner_action_enterprise_plans') THEN
    CREATE TRIGGER log_owner_action_enterprise_plans
    AFTER INSERT OR UPDATE OR DELETE ON public.enterprise_plans
    FOR EACH ROW EXECUTE FUNCTION public.log_system_owner_action();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'log_owner_action_enterprise_subscriptions') THEN
    CREATE TRIGGER log_owner_action_enterprise_subscriptions
    AFTER INSERT OR UPDATE OR DELETE ON public.enterprise_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.log_system_owner_action();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'log_owner_action_impersonation_sessions') THEN
    CREATE TRIGGER log_owner_action_impersonation_sessions
    AFTER INSERT OR UPDATE OR DELETE ON public.enterprise_impersonation_sessions
    FOR EACH ROW EXECUTE FUNCTION public.log_system_owner_action();
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.owner_soft_delete_company(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_impersonation_session(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_impersonation_sessions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_list_companies(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_dashboard_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_soft_delete_company(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_impersonation_session(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_impersonation_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_list_companies(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_dashboard_metrics() TO authenticated;
