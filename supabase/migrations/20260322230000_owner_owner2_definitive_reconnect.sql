BEGIN;

-- Canonical mapping helpers between legacy PT-BR statuses and EN control-plane statuses.
CREATE OR REPLACE FUNCTION public.owner_status_pt_to_en(input_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(input_status, ''))
    WHEN 'ativa' THEN 'active'
    WHEN 'teste' THEN 'trial'
    WHEN 'atrasada' THEN 'past_due'
    WHEN 'cancelada' THEN 'canceled'
    WHEN 'active' THEN 'active'
    WHEN 'trial' THEN 'trial'
    WHEN 'past_due' THEN 'past_due'
    WHEN 'canceled' THEN 'canceled'
    WHEN 'suspended' THEN 'suspended'
    ELSE 'active'
  END;
$$;

CREATE OR REPLACE FUNCTION public.owner_status_en_to_pt(input_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(input_status, ''))
    WHEN 'active' THEN 'ativa'
    WHEN 'trial' THEN 'teste'
    WHEN 'past_due' THEN 'atrasada'
    WHEN 'canceled' THEN 'cancelada'
    WHEN 'suspended' THEN 'cancelada'
    WHEN 'ativa' THEN 'ativa'
    WHEN 'teste' THEN 'teste'
    WHEN 'atrasada' THEN 'atrasada'
    WHEN 'cancelada' THEN 'cancelada'
    ELSE 'ativa'
  END;
$$;

-- Ensure modern table exists even in older schema variants.
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'active',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  renewal_date date,
  starts_at date NOT NULL DEFAULT CURRENT_DATE,
  ends_at date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_provider text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS asaas_customer_id text,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text,
  ADD COLUMN IF NOT EXISTS asaas_last_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_method text;

CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  due_at timestamptz,
  paid_at timestamptz,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  method text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.subscription_payments
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS provider_payment_id text,
  ADD COLUMN IF NOT EXISTS provider_event text,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS processed_at timestamptz NOT NULL DEFAULT now();

-- Normalize legacy data before enforcing canonical checks.
UPDATE public.subscriptions
SET status = public.owner_status_en_to_pt(status)
WHERE status IS NOT NULL;

UPDATE public.company_subscriptions
SET status = public.owner_status_pt_to_en(status)
WHERE status IS NOT NULL;

UPDATE public.subscription_payments
SET status = CASE lower(coalesce(status, ''))
  WHEN 'pendente' THEN 'pending'
  WHEN 'pending' THEN 'pending'
  WHEN 'pago' THEN 'paid'
  WHEN 'paid' THEN 'paid'
  WHEN 'falhou' THEN 'failed'
  WHEN 'failed' THEN 'failed'
  WHEN 'reembolsado' THEN 'refunded'
  WHEN 'refunded' THEN 'refunded'
  WHEN 'atrasada' THEN 'late'
  WHEN 'late' THEN 'late'
  WHEN 'overdue' THEN 'late'
  ELSE 'pending'
END;

DO $$
DECLARE
  r record;
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    FOR r IN
      SELECT c.conname
      FROM pg_constraint c
      WHERE c.conrelid = 'public.subscriptions'::regclass
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%status%'
    LOOP
      EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_status_check_owner
        CHECK (status IN ('ativa','atrasada','cancelada','teste')),
      ADD CONSTRAINT subscriptions_period_check_owner
        CHECK (period IN ('monthly','quarterly','yearly','custom')),
      ADD CONSTRAINT subscriptions_billing_provider_check_owner
        CHECK (billing_provider IN ('manual','stripe','asaas'));
  END IF;
END $$;

DO $$
DECLARE
  r record;
BEGIN
  IF to_regclass('public.company_subscriptions') IS NOT NULL THEN
    FOR r IN
      SELECT c.conname
      FROM pg_constraint c
      WHERE c.conrelid = 'public.company_subscriptions'::regclass
        AND c.contype = 'c'
        AND (pg_get_constraintdef(c.oid) ILIKE '%status%' OR pg_get_constraintdef(c.oid) ILIKE '%billing_cycle%')
    LOOP
      EXECUTE format('ALTER TABLE public.company_subscriptions DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    ALTER TABLE public.company_subscriptions
      ADD CONSTRAINT company_subscriptions_status_check_owner
        CHECK (status IN ('active','trial','past_due','canceled','suspended')),
      ADD CONSTRAINT company_subscriptions_billing_cycle_check_owner
        CHECK (billing_cycle IN ('monthly','quarterly','yearly','custom'));
  END IF;
END $$;

DO $$
DECLARE
  r record;
BEGIN
  IF to_regclass('public.subscription_payments') IS NOT NULL THEN
    FOR r IN
      SELECT c.conname
      FROM pg_constraint c
      WHERE c.conrelid = 'public.subscription_payments'::regclass
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%status%'
    LOOP
      EXECUTE format('ALTER TABLE public.subscription_payments DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    FOR r IN
      SELECT c.conname
      FROM pg_constraint c
      WHERE c.conrelid = 'public.subscription_payments'::regclass
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%provider%'
    LOOP
      EXECUTE format('ALTER TABLE public.subscription_payments DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    ALTER TABLE public.subscription_payments
      ADD CONSTRAINT subscription_payments_status_check_owner
        CHECK (status IN ('pending','paid','late','failed','refunded')),
      ADD CONSTRAINT subscription_payments_provider_check_owner
        CHECK (provider IN ('manual','stripe','asaas'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_asaas_subscription_id
  ON public.subscriptions (asaas_subscription_id)
  WHERE asaas_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_provider
  ON public.subscriptions (billing_provider);

CREATE INDEX IF NOT EXISTS idx_company_subscriptions_empresa_status
  ON public.company_subscriptions (empresa_id, status);

CREATE INDEX IF NOT EXISTS idx_company_subscriptions_plan_status
  ON public.company_subscriptions (plan_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_payments_provider_payment_id
  ON public.subscription_payments (provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- Forward sync: owner canonical table (subscriptions) -> company_subscriptions.
CREATE OR REPLACE FUNCTION public.sync_company_subscription_from_subscription()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF pg_trigger_depth() > 1 OR to_regclass('public.company_subscriptions') IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.company_subscriptions (
    empresa_id,
    plan_id,
    status,
    billing_cycle,
    renewal_date,
    starts_at,
    ends_at,
    metadata,
    updated_at
  ) VALUES (
    NEW.empresa_id,
    NEW.plan_id,
    public.owner_status_pt_to_en(NEW.status),
    COALESCE(NEW.period, 'monthly'),
    NEW.renewal_at,
    COALESCE(NEW.starts_at, CURRENT_DATE),
    NEW.ends_at,
    COALESCE(NEW.billing_metadata, '{}'::jsonb) || jsonb_build_object(
      'source', 'subscriptions',
      'subscription_id', NEW.id,
      'payment_status', NEW.payment_status,
      'amount', NEW.amount,
      'billing_provider', NEW.billing_provider
    ),
    now()
  )
  ON CONFLICT (empresa_id)
  DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    billing_cycle = EXCLUDED.billing_cycle,
    renewal_date = EXCLUDED.renewal_date,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    metadata = COALESCE(public.company_subscriptions.metadata, '{}'::jsonb) || EXCLUDED.metadata,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Reverse sync: integrations touching company_subscriptions keep subscriptions coherent.
CREATE OR REPLACE FUNCTION public.sync_subscription_from_company_subscription()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF pg_trigger_depth() > 1 OR to_regclass('public.subscriptions') IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.subscriptions (
    empresa_id,
    plan_id,
    amount,
    payment_method,
    period,
    starts_at,
    ends_at,
    renewal_at,
    status,
    payment_status,
    billing_provider,
    billing_metadata,
    updated_at
  ) VALUES (
    NEW.empresa_id,
    NEW.plan_id,
    COALESCE((NEW.metadata ->> 'amount')::numeric, 0),
    NULL,
    COALESCE(NEW.billing_cycle, 'monthly'),
    COALESCE(NEW.starts_at, CURRENT_DATE),
    NEW.ends_at,
    NEW.renewal_date,
    public.owner_status_en_to_pt(NEW.status),
    CASE public.owner_status_en_to_pt(NEW.status)
      WHEN 'atrasada' THEN 'late'
      WHEN 'cancelada' THEN 'failed'
      ELSE 'pending'
    END,
    COALESCE(NEW.metadata ->> 'billing_provider', 'manual'),
    COALESCE(NEW.metadata, '{}'::jsonb),
    now()
  )
  ON CONFLICT (empresa_id)
  DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    period = EXCLUDED.period,
    starts_at = COALESCE(public.subscriptions.starts_at, EXCLUDED.starts_at),
    ends_at = EXCLUDED.ends_at,
    renewal_at = EXCLUDED.renewal_at,
    status = EXCLUDED.status,
    payment_status = EXCLUDED.payment_status,
    billing_provider = EXCLUDED.billing_provider,
    billing_metadata = COALESCE(public.subscriptions.billing_metadata, '{}'::jsonb) || EXCLUDED.billing_metadata,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_company_subscription_from_subscription ON public.subscriptions;
CREATE TRIGGER trg_sync_company_subscription_from_subscription
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_company_subscription_from_subscription();

DROP TRIGGER IF EXISTS trg_sync_subscription_from_company_subscription ON public.company_subscriptions;
CREATE TRIGGER trg_sync_subscription_from_company_subscription
AFTER INSERT OR UPDATE ON public.company_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_subscription_from_company_subscription();

-- Backfill rows missing on either side.
INSERT INTO public.subscriptions (
  empresa_id,
  plan_id,
  amount,
  payment_method,
  period,
  starts_at,
  ends_at,
  renewal_at,
  status,
  payment_status,
  billing_provider,
  billing_metadata
)
SELECT
  cs.empresa_id,
  cs.plan_id,
  COALESCE((cs.metadata ->> 'amount')::numeric, 0),
  NULL,
  COALESCE(cs.billing_cycle, 'monthly'),
  COALESCE(cs.starts_at, CURRENT_DATE),
  cs.ends_at,
  cs.renewal_date,
  public.owner_status_en_to_pt(cs.status),
  CASE public.owner_status_en_to_pt(cs.status)
    WHEN 'atrasada' THEN 'late'
    WHEN 'cancelada' THEN 'failed'
    ELSE 'pending'
  END,
  COALESCE(cs.metadata ->> 'billing_provider', 'manual'),
  COALESCE(cs.metadata, '{}'::jsonb)
FROM public.company_subscriptions cs
LEFT JOIN public.subscriptions s ON s.empresa_id = cs.empresa_id
WHERE s.id IS NULL;

INSERT INTO public.company_subscriptions (
  empresa_id,
  plan_id,
  status,
  billing_cycle,
  renewal_date,
  starts_at,
  ends_at,
  metadata,
  updated_at
)
SELECT
  s.empresa_id,
  s.plan_id,
  public.owner_status_pt_to_en(s.status),
  COALESCE(s.period, 'monthly'),
  s.renewal_at,
  COALESCE(s.starts_at, CURRENT_DATE),
  s.ends_at,
  COALESCE(s.billing_metadata, '{}'::jsonb) || jsonb_build_object(
    'source', 'subscriptions',
    'subscription_id', s.id,
    'payment_status', s.payment_status,
    'amount', s.amount,
    'billing_provider', s.billing_provider
  ),
  now()
FROM public.subscriptions s
ON CONFLICT (empresa_id)
DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  status = EXCLUDED.status,
  billing_cycle = EXCLUDED.billing_cycle,
  renewal_date = EXCLUDED.renewal_date,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  metadata = COALESCE(public.company_subscriptions.metadata, '{}'::jsonb) || EXCLUDED.metadata,
  updated_at = now();

COMMIT;
