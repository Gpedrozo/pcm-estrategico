BEGIN;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_provider text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS asaas_customer_id text,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text,
  ADD COLUMN IF NOT EXISTS asaas_last_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscriptions_billing_provider_check'
      AND conrelid = 'public.subscriptions'::regclass
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_billing_provider_check
      CHECK (billing_provider IN ('manual', 'stripe', 'asaas'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_asaas_subscription_id
  ON public.subscriptions(asaas_subscription_id)
  WHERE asaas_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_provider
  ON public.subscriptions(billing_provider);

CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_customer_id
  ON public.subscriptions(asaas_customer_id)
  WHERE asaas_customer_id IS NOT NULL;

ALTER TABLE public.subscription_payments
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS provider_payment_id text,
  ADD COLUMN IF NOT EXISTS provider_event text,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_payments_provider_payment_id
  ON public.subscription_payments(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_payments_provider
  ON public.subscription_payments(provider);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscription_payments_provider_check'
      AND conrelid = 'public.subscription_payments'::regclass
  ) THEN
    ALTER TABLE public.subscription_payments
      ADD CONSTRAINT subscription_payments_provider_check
      CHECK (provider IN ('manual', 'stripe', 'asaas'));
  END IF;
END $$;

UPDATE public.subscriptions
SET billing_provider = 'stripe'
WHERE billing_provider = 'manual'
  AND (
    stripe_subscription_id IS NOT NULL
    OR stripe_customer_id IS NOT NULL
  );

UPDATE public.subscription_payments
SET provider = 'stripe'
WHERE provider = 'manual'
  AND EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.id = subscription_payments.subscription_id
      AND s.billing_provider = 'stripe'
  );

COMMIT;
