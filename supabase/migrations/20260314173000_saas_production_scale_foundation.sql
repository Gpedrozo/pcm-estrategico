BEGIN;

-- =====================================================
-- 1) AUDITORIA CORPORATIVA (compativel com schema atual)
-- =====================================================

ALTER TABLE IF EXISTS public.audit_logs
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id text,
  ADD COLUMN IF NOT EXISTS payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS endpoint text,
  ADD COLUMN IF NOT EXISTS execution_ms integer;

UPDATE public.audit_logs
SET
  user_id = COALESCE(user_id, actor_user_id),
  entity_type = COALESCE(entity_type, table_name),
  entity_id = COALESCE(entity_id, record_id),
  payload_json = CASE
    WHEN payload_json = '{}'::jsonb THEN COALESCE(metadata, '{}'::jsonb)
    ELSE payload_json
  END;

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at
  ON public.audit_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created_at
  ON public.audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs (entity_type, entity_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id text DEFAULT NULL,
  p_empresa_id uuid DEFAULT public.current_empresa_id(),
  p_user_id uuid DEFAULT auth.uid(),
  p_payload_json jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_source text DEFAULT 'app',
  p_severity text DEFAULT 'info',
  p_endpoint text DEFAULT NULL,
  p_execution_ms integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    empresa_id,
    action,
    table_name,
    record_id,
    source,
    severity,
    actor_user_id,
    actor_email,
    metadata,
    user_id,
    entity_type,
    entity_id,
    payload_json,
    ip_address,
    user_agent,
    endpoint,
    execution_ms,
    created_at
  )
  VALUES (
    p_empresa_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_source,
    p_severity,
    COALESCE(p_user_id, auth.uid()),
    auth.jwt() ->> 'email',
    COALESCE(p_payload_json, '{}'::jsonb),
    COALESCE(p_user_id, auth.uid()),
    p_entity_type,
    p_entity_id,
    COALESCE(p_payload_json, '{}'::jsonb),
    p_ip_address,
    p_user_agent,
    p_endpoint,
    p_execution_ms,
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, text, uuid, uuid, jsonb, text, text, text, text, text, integer)
TO anon, authenticated, service_role;

-- =====================================================
-- 2) PLANOS / ASSINATURA / LIMITES
-- =====================================================

ALTER TABLE IF EXISTS public.plans
  ADD COLUMN IF NOT EXISTS max_users integer,
  ADD COLUMN IF NOT EXISTS max_companies integer,
  ADD COLUMN IF NOT EXISTS max_storage bigint,
  ADD COLUMN IF NOT EXISTS max_orders_per_month integer,
  ADD COLUMN IF NOT EXISTS features_json jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.plans
SET
  max_users = COALESCE(max_users, user_limit, 10),
  max_companies = COALESCE(max_companies, company_limit, 1),
  max_storage = COALESCE(max_storage, (COALESCE(data_limit_mb, 2048)::bigint * 1024 * 1024)),
  max_orders_per_month = COALESCE(max_orders_per_month, 2000),
  features_json = CASE
    WHEN features_json = '{}'::jsonb THEN COALESCE(module_flags, '{}'::jsonb)
    ELSE features_json
  END;

CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'past_due', 'canceled', 'suspended')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'custom')),
  renewal_date date,
  starts_at date NOT NULL DEFAULT CURRENT_DATE,
  ends_at date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_subscriptions_plan_status
  ON public.company_subscriptions (plan_id, status);

INSERT INTO public.company_subscriptions (empresa_id, plan_id, status, billing_cycle, renewal_date, starts_at, ends_at, metadata)
SELECT
  s.empresa_id,
  s.plan_id,
  CASE s.status
    WHEN 'ativa' THEN 'active'
    WHEN 'teste' THEN 'trial'
    WHEN 'atrasada' THEN 'past_due'
    WHEN 'cancelada' THEN 'canceled'
    ELSE 'active'
  END,
  s.period,
  s.renewal_at,
  COALESCE(s.starts_at, CURRENT_DATE),
  s.ends_at,
  jsonb_build_object(
    'source', 'subscriptions',
    'subscription_id', s.id,
    'payment_status', s.payment_status,
    'amount', s.amount
  )
FROM public.subscriptions s
ON CONFLICT (empresa_id) DO UPDATE
SET
  plan_id = EXCLUDED.plan_id,
  status = EXCLUDED.status,
  billing_cycle = EXCLUDED.billing_cycle,
  renewal_date = EXCLUDED.renewal_date,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  metadata = EXCLUDED.metadata,
  updated_at = now();

ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_subscriptions_select ON public.company_subscriptions;
CREATE POLICY company_subscriptions_select
ON public.company_subscriptions
FOR SELECT
TO authenticated
USING (
  empresa_id = public.current_empresa_id()
  OR public.is_control_plane_operator()
);

DROP POLICY IF EXISTS company_subscriptions_manage ON public.company_subscriptions;
CREATE POLICY company_subscriptions_manage
ON public.company_subscriptions
FOR ALL
TO authenticated
USING (public.is_control_plane_operator())
WITH CHECK (public.is_control_plane_operator());

CREATE OR REPLACE FUNCTION public.check_company_plan_limit(
  p_empresa_id uuid,
  p_limit_type text,
  p_increment integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_max_users integer;
  v_max_orders integer;
  v_current_users integer := 0;
  v_current_orders integer := 0;
  v_current_month_start timestamptz := date_trunc('month', now());
BEGIN
  SELECT cs.plan_id
  INTO v_plan_id
  FROM public.company_subscriptions cs
  WHERE cs.empresa_id = p_empresa_id
    AND cs.status IN ('active', 'trial', 'past_due')
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'No active subscription found for empresa %', p_empresa_id;
  END IF;

  SELECT
    COALESCE(p.max_users, p.user_limit, 10),
    COALESCE(p.max_orders_per_month, 2000)
  INTO v_max_users, v_max_orders
  FROM public.plans p
  WHERE p.id = v_plan_id;

  IF p_limit_type = 'users' THEN
    SELECT COUNT(*)
    INTO v_current_users
    FROM public.profiles pr
    WHERE pr.empresa_id = p_empresa_id;

    IF v_current_users + GREATEST(p_increment, 1) > v_max_users THEN
      RAISE EXCEPTION 'Plan user limit exceeded for empresa % (current %, max %)', p_empresa_id, v_current_users, v_max_users;
    END IF;
  ELSIF p_limit_type = 'orders' THEN
    SELECT COUNT(*)
    INTO v_current_orders
    FROM public.ordens_servico os
    WHERE os.empresa_id = p_empresa_id
      AND os.created_at >= v_current_month_start;

    IF v_current_orders + GREATEST(p_increment, 1) > v_max_orders THEN
      RAISE EXCEPTION 'Plan orders/month limit exceeded for empresa % (current %, max %)', p_empresa_id, v_current_orders, v_max_orders;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported limit_type: %', p_limit_type;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_company_plan_limit(uuid, text, integer)
TO authenticated, service_role;

-- =====================================================
-- 3) FEATURE FLAGS POR EMPRESA
-- =====================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, feature_key)
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feature_flags_select ON public.feature_flags;
CREATE POLICY feature_flags_select
ON public.feature_flags
FOR SELECT
TO authenticated
USING (
  empresa_id = public.current_empresa_id()
  OR public.is_control_plane_operator()
);

DROP POLICY IF EXISTS feature_flags_manage ON public.feature_flags;
CREATE POLICY feature_flags_manage
ON public.feature_flags
FOR ALL
TO authenticated
USING (public.is_control_plane_operator())
WITH CHECK (public.is_control_plane_operator());

CREATE OR REPLACE FUNCTION public.is_feature_enabled(
  p_feature_key text,
  p_empresa_id uuid DEFAULT public.current_empresa_id()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT ff.enabled
    FROM public.feature_flags ff
    WHERE ff.empresa_id = p_empresa_id
      AND ff.feature_key = p_feature_key
    LIMIT 1
  ), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_feature_enabled(text, uuid)
TO authenticated, service_role;

-- =====================================================
-- 4) RATE LIMIT POR IP/IDENTIFICADOR (edge/login/admin)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ip_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  ip_address text NOT NULL,
  identifier text NOT NULL DEFAULT '*',
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  last_request_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, ip_address, identifier, window_start)
);

CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_scope_ip
  ON public.ip_rate_limits (scope, ip_address, identifier, window_start DESC);

ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ip_rate_limits_read ON public.ip_rate_limits;
CREATE POLICY ip_rate_limits_read
ON public.ip_rate_limits
FOR SELECT
TO authenticated
USING (public.is_control_plane_operator());

DROP POLICY IF EXISTS ip_rate_limits_manage ON public.ip_rate_limits;
CREATE POLICY ip_rate_limits_manage
ON public.ip_rate_limits
FOR ALL
TO authenticated
USING (public.is_control_plane_operator())
WITH CHECK (public.is_control_plane_operator());

CREATE OR REPLACE FUNCTION public.app_check_rate_limit_ip(
  p_scope text,
  p_identifier text DEFAULT NULL,
  p_max_requests integer DEFAULT 60,
  p_window_seconds integer DEFAULT 60,
  p_block_seconds integer DEFAULT 900
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_headers_raw text;
  v_headers jsonb := '{}'::jsonb;
  v_ip text := 'unknown';
  v_identifier text := COALESCE(NULLIF(trim(p_identifier), ''), '*');
  v_window_start timestamptz;
  v_current_count integer;
  v_blocked_until timestamptz;
BEGIN
  BEGIN
    v_headers_raw := current_setting('request.headers', true);
    IF COALESCE(v_headers_raw, '') <> '' THEN
      v_headers := v_headers_raw::jsonb;
    END IF;
  EXCEPTION WHEN others THEN
    v_headers := '{}'::jsonb;
  END;

  v_ip := split_part(COALESCE(v_headers ->> 'x-forwarded-for', v_headers ->> 'x-real-ip', v_headers ->> 'cf-connecting-ip', 'unknown'), ',', 1);
  v_ip := lower(trim(split_part(v_ip, ':', 1)));
  IF COALESCE(v_ip, '') = '' THEN
    v_ip := 'unknown';
  END IF;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / GREATEST(p_window_seconds, 1)) * GREATEST(p_window_seconds, 1));

  SELECT max(blocked_until)
  INTO v_blocked_until
  FROM public.ip_rate_limits
  WHERE scope = p_scope
    AND ip_address = v_ip
    AND identifier = v_identifier
    AND blocked_until IS NOT NULL
    AND blocked_until > now();

  IF v_blocked_until IS NOT NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.ip_rate_limits (
    scope,
    ip_address,
    identifier,
    window_start,
    request_count,
    last_request_at,
    updated_at
  )
  VALUES (
    p_scope,
    v_ip,
    v_identifier,
    v_window_start,
    1,
    now(),
    now()
  )
  ON CONFLICT (scope, ip_address, identifier, window_start)
  DO UPDATE SET
    request_count = public.ip_rate_limits.request_count + 1,
    last_request_at = now(),
    updated_at = now()
  RETURNING request_count INTO v_current_count;

  IF v_current_count > p_max_requests THEN
    UPDATE public.ip_rate_limits
    SET blocked_until = now() + make_interval(secs => GREATEST(p_block_seconds, 30)),
        updated_at = now()
    WHERE scope = p_scope
      AND ip_address = v_ip
      AND identifier = v_identifier
      AND window_start = v_window_start;

    RETURN false;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_check_rate_limit_ip(text, text, integer, integer, integer)
TO anon, authenticated, service_role;

-- =====================================================
-- 5) OBSERVABILIDADE (logs estruturados)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.operational_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id),
  user_id uuid,
  scope text NOT NULL,
  action text,
  endpoint text,
  status_code integer,
  duration_ms integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_logs_scope_created
  ON public.operational_logs (scope, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_logs_empresa_created
  ON public.operational_logs (empresa_id, created_at DESC);

ALTER TABLE public.operational_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operational_logs_read ON public.operational_logs;
CREATE POLICY operational_logs_read
ON public.operational_logs
FOR SELECT
TO authenticated
USING (
  public.is_control_plane_operator()
  OR empresa_id = public.current_empresa_id()
);

DROP POLICY IF EXISTS operational_logs_write ON public.operational_logs;
CREATE POLICY operational_logs_write
ON public.operational_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_control_plane_operator());

CREATE OR REPLACE FUNCTION public.app_write_operational_log(
  p_scope text,
  p_action text DEFAULT NULL,
  p_endpoint text DEFAULT NULL,
  p_status_code integer DEFAULT NULL,
  p_duration_ms integer DEFAULT NULL,
  p_empresa_id uuid DEFAULT public.current_empresa_id(),
  p_user_id uuid DEFAULT auth.uid(),
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_error_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.operational_logs (
    empresa_id,
    user_id,
    scope,
    action,
    endpoint,
    status_code,
    duration_ms,
    metadata,
    error_message,
    created_at
  )
  VALUES (
    p_empresa_id,
    p_user_id,
    p_scope,
    p_action,
    p_endpoint,
    p_status_code,
    p_duration_ms,
    COALESCE(p_metadata, '{}'::jsonb),
    p_error_message,
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_write_operational_log(text, text, text, integer, integer, uuid, uuid, jsonb, text)
TO authenticated, service_role;

-- =====================================================
-- 6) GOVERNANCA MULTI-TENANT (verificacao continua)
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_multitenant_governance()
RETURNS TABLE(
  table_name text,
  has_empresa_id boolean,
  rls_enabled boolean,
  null_empresa_rows bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table text;
  v_has_empresa_id boolean;
  v_rls_enabled boolean;
  v_null_rows bigint;
  v_required_tables text[] := ARRAY[
    'ordens_servico',
    'execucoes_os',
    'materiais_os',
    'profiles',
    'contratos'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_required_tables LOOP
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = v_table
        AND column_name = 'empresa_id'
    ) INTO v_has_empresa_id;

    SELECT COALESCE(c.relrowsecurity, false)
    INTO v_rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = v_table
    LIMIT 1;

    IF v_has_empresa_id THEN
      EXECUTE format('SELECT count(*)::bigint FROM public.%I WHERE empresa_id IS NULL', v_table)
      INTO v_null_rows;
    ELSE
      v_null_rows := NULL;
    END IF;

    table_name := v_table;
    has_empresa_id := v_has_empresa_id;
    rls_enabled := COALESCE(v_rls_enabled, false);
    null_empresa_rows := v_null_rows;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_multitenant_governance()
TO authenticated, service_role;

COMMIT;
