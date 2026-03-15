BEGIN;

-- =====================================================
-- 1) REQUEST CORRELATION + CENTRALIZED ERROR MONITORING
-- =====================================================

ALTER TABLE IF EXISTS public.audit_logs
  ADD COLUMN IF NOT EXISTS request_id text;

ALTER TABLE IF EXISTS public.operational_logs
  ADD COLUMN IF NOT EXISTS request_id text;

CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id
  ON public.audit_logs (request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_logs_request_id
  ON public.operational_logs (request_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.system_error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  user_id uuid,
  request_id text,
  endpoint text,
  source text NOT NULL DEFAULT 'edge',
  error_name text,
  error_message text NOT NULL,
  stack_trace text,
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_error_events_created
  ON public.system_error_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_error_events_empresa_created
  ON public.system_error_events (empresa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_error_events_request_id
  ON public.system_error_events (request_id, created_at DESC);

ALTER TABLE public.system_error_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_error_events_select ON public.system_error_events;
CREATE POLICY system_error_events_select
ON public.system_error_events
FOR SELECT
TO authenticated
USING (
  public.is_control_plane_operator()
  OR empresa_id = public.current_empresa_id()
);

DROP POLICY IF EXISTS system_error_events_insert ON public.system_error_events;
CREATE POLICY system_error_events_insert
ON public.system_error_events
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_control_plane_operator()
  OR empresa_id = public.current_empresa_id()
  OR empresa_id IS NULL
);

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
  p_execution_ms integer DEFAULT NULL,
  p_request_id text DEFAULT NULL
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
    request_id,
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
    p_request_id,
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, text, uuid, uuid, jsonb, text, text, text, text, text, integer, text)
TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.app_write_operational_log(
  p_scope text,
  p_action text DEFAULT NULL,
  p_endpoint text DEFAULT NULL,
  p_status_code integer DEFAULT NULL,
  p_duration_ms integer DEFAULT NULL,
  p_empresa_id uuid DEFAULT public.current_empresa_id(),
  p_user_id uuid DEFAULT auth.uid(),
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_error_message text DEFAULT NULL,
  p_request_id text DEFAULT NULL
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
    request_id,
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
    p_request_id,
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_write_operational_log(text, text, text, integer, integer, uuid, uuid, jsonb, text, text)
TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.app_capture_system_error(
  p_empresa_id uuid DEFAULT public.current_empresa_id(),
  p_user_id uuid DEFAULT auth.uid(),
  p_request_id text DEFAULT NULL,
  p_endpoint text DEFAULT NULL,
  p_source text DEFAULT 'edge',
  p_error_name text DEFAULT NULL,
  p_error_message text DEFAULT 'unknown_error',
  p_stack_trace text DEFAULT NULL,
  p_severity text DEFAULT 'error',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.system_error_events (
    empresa_id,
    user_id,
    request_id,
    endpoint,
    source,
    error_name,
    error_message,
    stack_trace,
    severity,
    metadata,
    created_at
  )
  VALUES (
    p_empresa_id,
    p_user_id,
    p_request_id,
    p_endpoint,
    COALESCE(NULLIF(p_source, ''), 'edge'),
    p_error_name,
    COALESCE(NULLIF(p_error_message, ''), 'unknown_error'),
    p_stack_trace,
    CASE WHEN p_severity IN ('warning', 'error', 'critical') THEN p_severity ELSE 'error' END,
    COALESCE(p_metadata, '{}'::jsonb),
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_capture_system_error(uuid, uuid, text, text, text, text, text, text, text, jsonb)
TO anon, authenticated, service_role;

-- =====================================================
-- 2) SAAS METRICS (DAILY + PER COMPANY)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.saas_metrics_daily (
  metric_date date PRIMARY KEY,
  empresas_ativas integer NOT NULL DEFAULT 0,
  usuarios_ativos integer NOT NULL DEFAULT 0,
  ordens_criadas integer NOT NULL DEFAULT 0,
  execucoes_realizadas integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saas_metrics_daily_date
  ON public.saas_metrics_daily (metric_date DESC);

ALTER TABLE public.saas_metrics_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saas_metrics_daily_read ON public.saas_metrics_daily;
CREATE POLICY saas_metrics_daily_read
ON public.saas_metrics_daily
FOR SELECT
TO authenticated
USING (public.is_control_plane_operator());

DROP POLICY IF EXISTS saas_metrics_daily_write ON public.saas_metrics_daily;
CREATE POLICY saas_metrics_daily_write
ON public.saas_metrics_daily
FOR ALL
TO authenticated
USING (public.is_control_plane_operator())
WITH CHECK (public.is_control_plane_operator());

CREATE TABLE IF NOT EXISTS public.company_usage_metrics (
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  metric_month date NOT NULL,
  users_count integer NOT NULL DEFAULT 0,
  orders_created integer NOT NULL DEFAULT 0,
  storage_used bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, metric_month)
);

CREATE INDEX IF NOT EXISTS idx_company_usage_metrics_month
  ON public.company_usage_metrics (metric_month DESC);

ALTER TABLE public.company_usage_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_usage_metrics_select ON public.company_usage_metrics;
CREATE POLICY company_usage_metrics_select
ON public.company_usage_metrics
FOR SELECT
TO authenticated
USING (
  empresa_id = public.current_empresa_id()
  OR public.is_control_plane_operator()
);

DROP POLICY IF EXISTS company_usage_metrics_manage ON public.company_usage_metrics;
CREATE POLICY company_usage_metrics_manage
ON public.company_usage_metrics
FOR ALL
TO authenticated
USING (public.is_control_plane_operator())
WITH CHECK (public.is_control_plane_operator());

CREATE OR REPLACE FUNCTION public.refresh_saas_metrics_daily(
  p_metric_date date DEFAULT CURRENT_DATE
)
RETURNS public.saas_metrics_daily
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.saas_metrics_daily;
  v_start timestamptz := p_metric_date::timestamptz;
  v_end timestamptz := (p_metric_date + 1)::timestamptz;
BEGIN
  INSERT INTO public.saas_metrics_daily (
    metric_date,
    empresas_ativas,
    usuarios_ativos,
    ordens_criadas,
    execucoes_realizadas,
    updated_at
  )
  VALUES (
    p_metric_date,
    (SELECT COUNT(*)::integer FROM public.empresas e WHERE COALESCE(e.status, 'active') = 'active'),
    (SELECT COUNT(*)::integer FROM public.profiles p WHERE p.id IS NOT NULL),
    (SELECT COUNT(*)::integer FROM public.ordens_servico os WHERE os.created_at >= v_start AND os.created_at < v_end),
    (SELECT COUNT(*)::integer FROM public.execucoes_os ex WHERE ex.created_at >= v_start AND ex.created_at < v_end),
    now()
  )
  ON CONFLICT (metric_date)
  DO UPDATE SET
    empresas_ativas = EXCLUDED.empresas_ativas,
    usuarios_ativos = EXCLUDED.usuarios_ativos,
    ordens_criadas = EXCLUDED.ordens_criadas,
    execucoes_realizadas = EXCLUDED.execucoes_realizadas,
    updated_at = now();

  SELECT * INTO v_row
  FROM public.saas_metrics_daily
  WHERE metric_date = p_metric_date;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_saas_metrics_daily(date)
TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refresh_company_usage_metrics(
  p_metric_month date DEFAULT date_trunc('month', now())::date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start timestamptz := date_trunc('month', p_metric_month::timestamptz);
  v_month_end timestamptz := (date_trunc('month', p_metric_month::timestamptz) + interval '1 month');
  v_affected integer := 0;
BEGIN
  INSERT INTO public.company_usage_metrics (
    empresa_id,
    metric_month,
    users_count,
    orders_created,
    storage_used,
    updated_at
  )
  SELECT
    e.id,
    date_trunc('month', p_metric_month::timestamptz)::date,
    COALESCE((SELECT COUNT(*)::integer FROM public.profiles p WHERE p.empresa_id = e.id), 0),
    COALESCE((SELECT COUNT(*)::integer FROM public.ordens_servico os WHERE os.empresa_id = e.id AND os.created_at >= v_month_start AND os.created_at < v_month_end), 0),
    0::bigint,
    now()
  FROM public.empresas e
  ON CONFLICT (empresa_id, metric_month)
  DO UPDATE SET
    users_count = EXCLUDED.users_count,
    orders_created = EXCLUDED.orders_created,
    updated_at = now();

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_company_usage_metrics(date)
TO authenticated, service_role;

-- =====================================================
-- 3) BILLING FOUNDATION INTEGRATED WITH EXISTING PLANS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.billing_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  gateway_customer_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'delinquent', 'blocked', 'canceled')),
  gateway_provider text NOT NULL DEFAULT 'manual',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_customers_status
  ON public.billing_customers (status, updated_at DESC);

ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_customers_select ON public.billing_customers;
CREATE POLICY billing_customers_select
ON public.billing_customers
FOR SELECT
TO authenticated
USING (
  empresa_id = public.current_empresa_id()
  OR public.is_control_plane_operator()
);

DROP POLICY IF EXISTS billing_customers_manage ON public.billing_customers;
CREATE POLICY billing_customers_manage
ON public.billing_customers
FOR ALL
TO authenticated
USING (public.is_control_plane_operator())
WITH CHECK (public.is_control_plane_operator());

CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id),
  company_subscription_id uuid REFERENCES public.company_subscriptions(id) ON DELETE SET NULL,
  gateway_invoice_id text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'voided', 'refunded', 'failed')),
  due_date date NOT NULL,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_empresa_due
  ON public.billing_invoices (empresa_id, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_status_due
  ON public.billing_invoices (status, due_date DESC);

ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_invoices_select ON public.billing_invoices;
CREATE POLICY billing_invoices_select
ON public.billing_invoices
FOR SELECT
TO authenticated
USING (
  empresa_id = public.current_empresa_id()
  OR public.is_control_plane_operator()
);

DROP POLICY IF EXISTS billing_invoices_manage ON public.billing_invoices;
CREATE POLICY billing_invoices_manage
ON public.billing_invoices
FOR ALL
TO authenticated
USING (public.is_control_plane_operator())
WITH CHECK (public.is_control_plane_operator());

INSERT INTO public.billing_customers (empresa_id, status, gateway_provider, metadata)
SELECT e.id, 'pending', 'manual', jsonb_build_object('seed', 'saas_enterprise_migration')
FROM public.empresas e
ON CONFLICT (empresa_id) DO NOTHING;

INSERT INTO public.billing_invoices (
  empresa_id,
  plan_id,
  company_subscription_id,
  amount,
  currency,
  status,
  due_date,
  metadata
)
SELECT
  cs.empresa_id,
  cs.plan_id,
  cs.id,
  COALESCE(s.amount::numeric, p.price_month::numeric, 0),
  'BRL',
  CASE cs.status
    WHEN 'past_due' THEN 'overdue'
    WHEN 'canceled' THEN 'voided'
    ELSE 'pending'
  END,
  COALESCE(cs.renewal_date, CURRENT_DATE + 7),
  jsonb_build_object('source', 'company_subscriptions_seed')
FROM public.company_subscriptions cs
LEFT JOIN public.subscriptions s ON s.empresa_id = cs.empresa_id
LEFT JOIN public.plans p ON p.id = cs.plan_id
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4) PLAN LIMIT BLOCKING (INCLUDES STORAGE)
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_company_storage_limit(
  p_empresa_id uuid,
  p_increment_bytes bigint DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_max_storage bigint;
  v_current_storage bigint := 0;
  v_month date := date_trunc('month', now())::date;
BEGIN
  SELECT cs.plan_id
  INTO v_plan_id
  FROM public.company_subscriptions cs
  WHERE cs.empresa_id = p_empresa_id
    AND cs.status IN ('active', 'trial', 'past_due')
  ORDER BY cs.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'No active subscription found for empresa %', p_empresa_id;
  END IF;

  SELECT COALESCE(p.max_storage, (COALESCE(p.data_limit_mb, 2048)::bigint * 1024 * 1024))
  INTO v_max_storage
  FROM public.plans p
  WHERE p.id = v_plan_id;

  SELECT COALESCE(cum.storage_used, 0)
  INTO v_current_storage
  FROM public.company_usage_metrics cum
  WHERE cum.empresa_id = p_empresa_id
    AND cum.metric_month = v_month;

  IF COALESCE(v_current_storage, 0) + GREATEST(COALESCE(p_increment_bytes, 0), 0) > COALESCE(v_max_storage, 0) THEN
    RAISE EXCEPTION 'Plan storage limit exceeded for empresa % (current %, max %)', p_empresa_id, v_current_storage, v_max_storage;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_company_storage_limit(uuid, bigint)
TO authenticated, service_role;

COMMIT;
