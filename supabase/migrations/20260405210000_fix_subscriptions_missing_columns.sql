-- Fix: Add missing columns to subscriptions table that were expected by
-- owner-portal-admin edge function but never added via ALTER TABLE.
-- The columns were defined in migration 20260304012000 CREATE TABLE IF NOT EXISTS
-- but that statement was skipped because the table already existed from 20260302241000.

DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN IF NOT EXISTS amount numeric(14,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS period text NOT NULL DEFAULT 'monthly',
      ADD COLUMN IF NOT EXISTS starts_at date NOT NULL DEFAULT CURRENT_DATE,
      ADD COLUMN IF NOT EXISTS ends_at date;
  END IF;
END $$;

-- Ensure the status CHECK constraint allows PT-BR values used by the edge function.
-- Migration 20260322230000 should have done this, but guard against partial application.
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
      ADD CONSTRAINT subscriptions_status_check
        CHECK (status IN ('ativa','atrasada','cancelada','teste','trial','active','past_due','cancelled','suspended'));
  END IF;
END $$;

-- Ensure period CHECK constraint exists.
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
        AND pg_get_constraintdef(c.oid) ILIKE '%period%'
    LOOP
      EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_period_check
        CHECK (period IN ('monthly','quarterly','yearly','custom'));
  END IF;
END $$;
