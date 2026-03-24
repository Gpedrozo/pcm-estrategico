-- ============================================================================
-- Migration: Add empresa_id to ai_root_cause_analysis for tenant isolation
-- ============================================================================

-- Step 1: Add empresa_id column (nullable for existing rows)
ALTER TABLE public.ai_root_cause_analysis
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);

-- Step 2: Create index for tenant queries
CREATE INDEX IF NOT EXISTS idx_ai_root_cause_empresa
  ON public.ai_root_cause_analysis(empresa_id);

-- Step 3: Drop old overly-permissive policies
DROP POLICY IF EXISTS "Authenticated users can view ai analysis" ON public.ai_root_cause_analysis;
DROP POLICY IF EXISTS "Authenticated users can create ai analysis" ON public.ai_root_cause_analysis;
DROP POLICY IF EXISTS "Authenticated users can delete ai analysis" ON public.ai_root_cause_analysis;

-- Step 4: Create tenant-isolated policies
CREATE POLICY ai_root_cause_select ON public.ai_root_cause_analysis
  FOR SELECT TO authenticated
  USING (
    public.is_control_plane_operator()
    OR empresa_id IN (SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  );

CREATE POLICY ai_root_cause_insert ON public.ai_root_cause_analysis
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_control_plane_operator()
    OR empresa_id IN (SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  );

CREATE POLICY ai_root_cause_delete ON public.ai_root_cause_analysis
  FOR DELETE TO authenticated
  USING (
    public.is_control_plane_operator()
    OR empresa_id IN (SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  );
