-- ============================================================================
-- Migration: Fix RLS policies for componentes_equipamento
--
-- Multiple migrations created conflicting policies on this table.
-- This migration drops ALL existing policies and creates clean ones
-- that properly allow tenant-isolated CRUD operations.
-- ============================================================================

-- Step 1: Drop ALL existing policies (conflicting from multiple migrations)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.componentes_equipamento'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.componentes_equipamento', pol.polname);
  END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.componentes_equipamento ENABLE ROW LEVEL SECURITY;

-- Step 3: Create clean tenant-isolated policies
CREATE POLICY tenant_select ON public.componentes_equipamento
  FOR SELECT
  USING (
    empresa_id IN (
      SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY tenant_insert ON public.componentes_equipamento
  FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY tenant_update ON public.componentes_equipamento
  FOR UPDATE
  USING (
    empresa_id IN (
      SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
    )
  )
  WITH CHECK (
    empresa_id IN (
      SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY tenant_delete ON public.componentes_equipamento
  FOR DELETE
  USING (
    empresa_id IN (
      SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
    )
  );
