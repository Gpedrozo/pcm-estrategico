-- ============================================================================
-- Migration: Fix RLS on empresas table for SYSTEM_OWNER access
--
-- The empresas table has conflicting policies from multiple migrations.
-- The 'empresas_tenant_or_master' policy only checks is_master_ti() 
-- which excludes SYSTEM_OWNER. This migration consolidates all policies
-- into clean ones that allow SYSTEM_OWNER full access.
-- ============================================================================

-- Step 1: Drop ALL existing policies on empresas
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.empresas'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.empresas', pol.polname);
  END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Step 3: Create consolidated policies

-- SELECT: SYSTEM_OWNER/SYSTEM_ADMIN/MASTER_TI see ALL empresas.
-- Regular users see only their own empresa via user_roles.
CREATE POLICY empresas_select ON public.empresas
  FOR SELECT TO authenticated
  USING (
    public.is_control_plane_operator()
    OR id IN (SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  );

-- INSERT: Only control plane operators can create new empresas
CREATE POLICY empresas_insert ON public.empresas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_control_plane_operator()
  );

-- UPDATE: Control plane or admin of the specific empresa
CREATE POLICY empresas_update ON public.empresas
  FOR UPDATE TO authenticated
  USING (
    public.is_control_plane_operator()
    OR id IN (
      SELECT ur.empresa_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN', 'MASTER_TI')
    )
  )
  WITH CHECK (
    public.is_control_plane_operator()
    OR id IN (
      SELECT ur.empresa_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN', 'MASTER_TI')
    )
  );

-- DELETE: Only control plane operators
CREATE POLICY empresas_delete ON public.empresas
  FOR DELETE TO authenticated
  USING (
    public.is_control_plane_operator()
  );

-- Also fix is_master_ti to include SYSTEM_OWNER for backwards compatibility
CREATE OR REPLACE FUNCTION public.is_master_ti()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(has_role(auth.uid(), 'MASTER_TI'::app_role), false)
      OR coalesce(has_role(auth.uid(), 'SYSTEM_OWNER'::app_role), false);
$$;
