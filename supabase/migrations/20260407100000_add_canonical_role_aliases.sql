-- =============================================================================
-- Migration: Add canonical role aliases to app_role enum
-- Date: 2026-04-07
-- Purpose: Adds new canonical role names (OWNER_MASTER, OWNER_SYSTEM, ADMIN_TI,
--          USER, MECANICO) to the app_role enum as aliases.
--          This is ADDITIVE ONLY — no existing values are removed or renamed.
--          The frontend compatibility layer (roleCompat.ts) handles mapping.
-- Risk: ZERO — ADD VALUE IF NOT EXISTS is safe and non-destructive.
-- =============================================================================

-- New canonical aliases
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'OWNER_MASTER';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'OWNER_SYSTEM';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ADMIN_TI';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'USER';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'MECANICO';

-- Verification (no-op, just for audit log readability)
DO $$
BEGIN
  RAISE NOTICE '[canonical_role_aliases] Migration applied — 5 new enum values added to app_role (additive, non-destructive)';
END $$;
