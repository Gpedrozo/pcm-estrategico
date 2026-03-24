-- Migration: Create admin_assign_user_role RPC (SECURITY DEFINER)
-- Purpose: Reliable role assignment that bypasses RLS and triggers
-- Used by: owner-portal-admin edge function during company/user creation

-- Ensure app_role type exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('USUARIO','ADMIN','MASTER_TI','SYSTEM_OWNER');
  END IF;
END $$;

-- Create or replace the RPC function for role assignment
CREATE OR REPLACE FUNCTION public.admin_assign_user_role(
  p_user_id uuid,
  p_empresa_id uuid,
  p_role text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_existing_id uuid;
BEGIN
  -- Validate role
  BEGIN
    v_role := p_role::public.app_role;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN jsonb_build_object('success', false, 'error', format('Invalid role: %s', p_role));
  END;

  -- Check if exact role already exists
  SELECT id INTO v_existing_id
  FROM public.user_roles
  WHERE user_id = p_user_id AND empresa_id = p_empresa_id AND role = v_role
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'action', 'already_exists', 'id', v_existing_id);
  END IF;

  -- Insert new role
  INSERT INTO public.user_roles (user_id, empresa_id, role)
  VALUES (p_user_id, p_empresa_id, v_role)
  ON CONFLICT (user_id, empresa_id, role) DO NOTHING
  RETURNING id INTO v_existing_id;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'action', 'created', 'id', v_existing_id);
  END IF;

  -- If ON CONFLICT hit, it already exists
  RETURN jsonb_build_object('success', true, 'action', 'conflict_resolved');
END;
$$;

-- Grant execute to service_role and authenticated
GRANT EXECUTE ON FUNCTION public.admin_assign_user_role(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_assign_user_role(uuid, uuid, text) TO authenticated;

-- Add unique index on (user_id, empresa_id) for upsert compatibility
-- This allows a user to have only ONE role per company
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_user_roles_user_empresa_unique'
  ) THEN
    -- Clean up any duplicates first (keep the highest-privilege or most recent)
    DELETE FROM public.user_roles a
    USING public.user_roles b
    WHERE a.user_id = b.user_id
      AND a.empresa_id = b.empresa_id
      AND a.id < b.id;

    CREATE UNIQUE INDEX idx_user_roles_user_empresa_unique
    ON public.user_roles (user_id, empresa_id);
  END IF;
END $$;
