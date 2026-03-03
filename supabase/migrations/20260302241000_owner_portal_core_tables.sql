BEGIN;

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  user_limit integer NOT NULL DEFAULT 10,
  asset_limit integer NOT NULL DEFAULT 1000,
  os_limit integer NOT NULL DEFAULT 2000,
  storage_limit_mb integer NOT NULL DEFAULT 2048,
  price_month numeric(12,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'suspended')),
  renewal_at timestamptz,
  trial_ends_at timestamptz,
  payment_status text,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id)
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  requester_user_id uuid,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  subject text NOT NULL,
  message text NOT NULL,
  owner_notes text,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.plans (code, name, description, user_limit, asset_limit, os_limit, storage_limit_mb, price_month)
VALUES
  ('FREE', 'FREE', 'Plano de entrada', 3, 200, 200, 512, 0),
  ('STARTER', 'STARTER', 'Plano inicial', 20, 5000, 5000, 5120, 499),
  ('PRO', 'PRO', 'Plano profissional', 100, 50000, 50000, 51200, 1999),
  ('ENTERPRISE', 'ENTERPRISE', 'Plano enterprise', 10000, 1000000, 1000000, 512000, 9999)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  user_limit = EXCLUDED.user_limit,
  asset_limit = EXCLUDED.asset_limit,
  os_limit = EXCLUDED.os_limit,
  storage_limit_mb = EXCLUDED.storage_limit_mb,
  price_month = EXCLUDED.price_month,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
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
    DROP TRIGGER IF EXISTS trg_plans_updated_at ON public.plans;
    CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;

  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
    CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;

  IF to_regclass('public.support_tickets') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
    CREATE TRIGGER trg_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END;
$$;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plans_system_select ON public.plans;
DROP POLICY IF EXISTS plans_system_write ON public.plans;
CREATE POLICY plans_system_select ON public.plans
  FOR SELECT USING (public.is_system_operator(auth.uid()));
CREATE POLICY plans_system_write ON public.plans
  FOR ALL USING (public.is_system_operator(auth.uid())) WITH CHECK (public.is_system_operator(auth.uid()));

DROP POLICY IF EXISTS subscriptions_system_select ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_system_write ON public.subscriptions;
CREATE POLICY subscriptions_system_select ON public.subscriptions
  FOR SELECT USING (public.is_system_operator(auth.uid()) OR public.can_access_empresa(empresa_id));
CREATE POLICY subscriptions_system_write ON public.subscriptions
  FOR ALL USING (public.is_system_operator(auth.uid())) WITH CHECK (public.is_system_operator(auth.uid()));

DROP POLICY IF EXISTS support_tickets_select ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_write ON public.support_tickets;
CREATE POLICY support_tickets_select ON public.support_tickets
  FOR SELECT USING (public.is_system_operator(auth.uid()) OR public.can_access_empresa(empresa_id));
CREATE POLICY support_tickets_write ON public.support_tickets
  FOR ALL USING (public.is_system_operator(auth.uid()) OR public.can_access_empresa(empresa_id))
  WITH CHECK (public.is_system_operator(auth.uid()) OR public.can_access_empresa(empresa_id));

CREATE INDEX IF NOT EXISTS idx_plans_code ON public.plans (code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_empresa_status ON public.subscriptions (empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_empresa_status_created ON public.support_tickets (empresa_id, status, created_at DESC);

COMMIT;
