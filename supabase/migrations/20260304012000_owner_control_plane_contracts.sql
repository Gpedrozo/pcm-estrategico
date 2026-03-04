BEGIN;

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  user_limit integer NOT NULL DEFAULT 10,
  module_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_limit_mb integer NOT NULL DEFAULT 2048,
  premium_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  company_limit integer,
  price_month numeric(12,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text,
  period text NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly','quarterly','yearly','custom')),
  starts_at date NOT NULL,
  ends_at date,
  renewal_at date,
  status text NOT NULL DEFAULT 'teste' CHECK (status IN ('ativa','atrasada','cancelada','teste')),
  payment_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id)
);

CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  paid_at timestamptz,
  due_at date,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  method text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  requester_user_id uuid,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','em_analise','resolvido')),
  priority text NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa','media','alta','critica')),
  owner_response text,
  owner_responder_id uuid,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  content text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  starts_at date,
  ends_at date,
  amount numeric(12,2),
  payment_method text,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','rascunho','encerrado','cancelado')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  version integer NOT NULL,
  content text NOT NULL,
  change_summary text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, version)
);

INSERT INTO public.plans (code, name, description, user_limit, module_flags, data_limit_mb, premium_features, company_limit, price_month, active)
VALUES
  ('STARTER', 'Starter', 'Plano inicial', 10, '{"dashboard": true, "preventiva": true, "os": true}'::jsonb, 4096, '[]'::jsonb, null, 499.00, true),
  ('PROFESSIONAL', 'Professional', 'Plano profissional', 50, '{"dashboard": true, "preventiva": true, "os": true, "preditiva": true, "fmea": true}'::jsonb, 20480, '["analytics"]'::jsonb, null, 1999.00, true),
  ('ENTERPRISE', 'Enterprise', 'Plano enterprise', 500, '{"dashboard": true, "preventiva": true, "os": true, "preditiva": true, "fmea": true, "rca": true, "ssma": true}'::jsonb, 102400, '["analytics","sso","priority_support"]'::jsonb, null, 4999.00, true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  user_limit = EXCLUDED.user_limit,
  module_flags = EXCLUDED.module_flags,
  data_limit_mb = EXCLUDED.data_limit_mb,
  premium_features = EXCLUDED.premium_features,
  company_limit = EXCLUDED.company_limit,
  price_month = EXCLUDED.price_month,
  active = EXCLUDED.active,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.owner_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.plans') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_owner_plans_updated_at ON public.plans;
    CREATE TRIGGER trg_owner_plans_updated_at BEFORE UPDATE ON public.plans
    FOR EACH ROW EXECUTE FUNCTION public.owner_touch_updated_at();
  END IF;

  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_owner_subscriptions_updated_at ON public.subscriptions;
    CREATE TRIGGER trg_owner_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.owner_touch_updated_at();
  END IF;

  IF to_regclass('public.support_tickets') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_owner_support_tickets_updated_at ON public.support_tickets;
    CREATE TRIGGER trg_owner_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.owner_touch_updated_at();
  END IF;

  IF to_regclass('public.contracts') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_owner_contracts_updated_at ON public.contracts;
    CREATE TRIGGER trg_owner_contracts_updated_at BEFORE UPDATE ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION public.owner_touch_updated_at();
  END IF;
END;
$$;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plans_select ON public.plans;
DROP POLICY IF EXISTS plans_manage ON public.plans;
CREATE POLICY plans_select ON public.plans
  FOR SELECT USING (public.is_control_plane_operator());
CREATE POLICY plans_manage ON public.plans
  FOR ALL USING (public.is_control_plane_operator())
  WITH CHECK (public.is_control_plane_operator());

DROP POLICY IF EXISTS subscriptions_select ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_manage ON public.subscriptions;
CREATE POLICY subscriptions_select ON public.subscriptions
  FOR SELECT USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());
CREATE POLICY subscriptions_manage ON public.subscriptions
  FOR ALL USING (public.is_control_plane_operator())
  WITH CHECK (public.is_control_plane_operator());

DROP POLICY IF EXISTS subscription_payments_select ON public.subscription_payments;
DROP POLICY IF EXISTS subscription_payments_manage ON public.subscription_payments;
CREATE POLICY subscription_payments_select ON public.subscription_payments
  FOR SELECT USING (
    public.is_control_plane_operator()
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.id = subscription_id
        AND s.empresa_id = public.get_current_empresa_id()
    )
  );
CREATE POLICY subscription_payments_manage ON public.subscription_payments
  FOR ALL USING (public.is_control_plane_operator())
  WITH CHECK (public.is_control_plane_operator());

DROP POLICY IF EXISTS support_tickets_select ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_manage ON public.support_tickets;
CREATE POLICY support_tickets_select ON public.support_tickets
  FOR SELECT USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());
CREATE POLICY support_tickets_manage ON public.support_tickets
  FOR ALL USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id())
  WITH CHECK (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());

DROP POLICY IF EXISTS contracts_select ON public.contracts;
DROP POLICY IF EXISTS contracts_manage ON public.contracts;
CREATE POLICY contracts_select ON public.contracts
  FOR SELECT USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id());
CREATE POLICY contracts_manage ON public.contracts
  FOR ALL USING (public.is_control_plane_operator())
  WITH CHECK (public.is_control_plane_operator());

DROP POLICY IF EXISTS contract_versions_select ON public.contract_versions;
DROP POLICY IF EXISTS contract_versions_manage ON public.contract_versions;
CREATE POLICY contract_versions_select ON public.contract_versions
  FOR SELECT USING (
    public.is_control_plane_operator()
    OR EXISTS (
      SELECT 1
      FROM public.contracts c
      WHERE c.id = contract_id
        AND c.empresa_id = public.get_current_empresa_id()
    )
  );
CREATE POLICY contract_versions_manage ON public.contract_versions
  FOR ALL USING (public.is_control_plane_operator())
  WITH CHECK (public.is_control_plane_operator());

CREATE INDEX IF NOT EXISTS idx_plans_code ON public.plans(code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_empresa_status ON public.subscriptions(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal_at ON public.subscriptions(renewal_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_empresa_status ON public.support_tickets(empresa_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_empresa_created_at ON public.contracts(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contract_versions_contract_version ON public.contract_versions(contract_id, version DESC);

COMMIT;