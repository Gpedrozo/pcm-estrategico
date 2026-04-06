-- ============================================================================
-- FIX: Subscription sync triggers - map plan_id between planos <-> plans
-- ============================================================================
-- Problem: subscriptions.plan_id FK -> planos, company_subscriptions.plan_id FK -> plans.
-- The sync triggers copied plan_id verbatim, causing FK violations because the
-- UUID in one table doesn't exist in the other.
-- Fix: look up the equivalent plan in the target table by matching codigo/code.
-- ============================================================================

-- Forward sync: subscriptions (planos FK) -> company_subscriptions (plans FK)
CREATE OR REPLACE FUNCTION public.sync_company_subscription_from_subscription()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_mapped_plan_id uuid;
BEGIN
  IF pg_trigger_depth() > 1 OR to_regclass('public.company_subscriptions') IS NULL THEN
    RETURN NEW;
  END IF;

  -- Map plan_id from planos -> plans via codigo/code
  SELECT p.id INTO v_mapped_plan_id
  FROM public.plans p
  JOIN public.planos pl ON lower(pl.codigo) = lower(p.code)
  WHERE pl.id = NEW.plan_id
  LIMIT 1;

  -- Fallback: try direct ID (in case both tables share the same UUID)
  IF v_mapped_plan_id IS NULL THEN
    SELECT id INTO v_mapped_plan_id FROM public.plans WHERE id = NEW.plan_id LIMIT 1;
  END IF;

  -- If still NULL, skip sync to avoid FK violation
  IF v_mapped_plan_id IS NULL THEN
    RAISE WARNING 'sync_company_subscription_from_subscription: no matching plan in plans for planos.id=%, skipping', NEW.plan_id;
    RETURN NEW;
  END IF;

  INSERT INTO public.company_subscriptions (
    empresa_id, plan_id, status, billing_cycle, renewal_date, starts_at, ends_at, metadata, updated_at
  ) VALUES (
    NEW.empresa_id,
    v_mapped_plan_id,
    public.owner_status_pt_to_en(NEW.status),
    COALESCE(NEW.period, 'monthly'),
    NEW.renewal_at,
    COALESCE(NEW.starts_at, CURRENT_DATE),
    NEW.ends_at,
    COALESCE(NEW.billing_metadata, '{}'::jsonb) || jsonb_build_object(
      'source', 'subscriptions', 'subscription_id', NEW.id,
      'payment_status', NEW.payment_status, 'amount', NEW.amount,
      'billing_provider', NEW.billing_provider
    ),
    now()
  )
  ON CONFLICT (empresa_id)
  DO UPDATE SET
    plan_id = EXCLUDED.plan_id, status = EXCLUDED.status, billing_cycle = EXCLUDED.billing_cycle,
    renewal_date = EXCLUDED.renewal_date, starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at,
    metadata = COALESCE(public.company_subscriptions.metadata, '{}'::jsonb) || EXCLUDED.metadata,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Reverse sync: company_subscriptions (plans FK) -> subscriptions (planos FK)
CREATE OR REPLACE FUNCTION public.sync_subscription_from_company_subscription()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_mapped_plan_id uuid;
BEGIN
  IF pg_trigger_depth() > 1 OR to_regclass('public.subscriptions') IS NULL THEN
    RETURN NEW;
  END IF;

  -- Map plan_id from plans -> planos via code/codigo
  SELECT pl.id INTO v_mapped_plan_id
  FROM public.planos pl
  JOIN public.plans p ON lower(p.code) = lower(pl.codigo)
  WHERE p.id = NEW.plan_id
  LIMIT 1;

  -- Fallback: try direct ID
  IF v_mapped_plan_id IS NULL THEN
    SELECT id INTO v_mapped_plan_id FROM public.planos WHERE id = NEW.plan_id LIMIT 1;
  END IF;

  -- If still NULL, skip sync
  IF v_mapped_plan_id IS NULL THEN
    RAISE WARNING 'sync_subscription_from_company_subscription: no matching plan in planos for plans.id=%, skipping', NEW.plan_id;
    RETURN NEW;
  END IF;

  INSERT INTO public.subscriptions (
    empresa_id, plan_id, amount, payment_method, period, starts_at, ends_at, renewal_at,
    status, payment_status, billing_provider, billing_metadata, updated_at
  ) VALUES (
    NEW.empresa_id,
    v_mapped_plan_id,
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
    plan_id = EXCLUDED.plan_id, period = EXCLUDED.period,
    starts_at = COALESCE(public.subscriptions.starts_at, EXCLUDED.starts_at),
    ends_at = EXCLUDED.ends_at, renewal_at = EXCLUDED.renewal_at,
    status = EXCLUDED.status, payment_status = EXCLUDED.payment_status,
    billing_provider = EXCLUDED.billing_provider,
    billing_metadata = COALESCE(public.subscriptions.billing_metadata, '{}'::jsonb) || EXCLUDED.billing_metadata,
    updated_at = now();

  RETURN NEW;
END;
$$;
