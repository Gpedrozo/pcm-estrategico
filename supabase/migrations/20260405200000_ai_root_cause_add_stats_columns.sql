-- Ensure ai_root_cause_analysis table exists (may have been dropped or never created)
-- Then add os_count, mtbf_days, requested_by and tenant isolation columns.

-- Step 1: Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ai_root_cause_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text NOT NULL,
  equipamento_id uuid REFERENCES public.equipamentos(id),
  generated_at timestamptz NOT NULL DEFAULT now(),
  summary text,
  possible_causes jsonb,
  main_hypothesis text,
  preventive_actions jsonb,
  criticality text,
  confidence_score numeric,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Step 2: Indexes
CREATE INDEX IF NOT EXISTS idx_ai_root_cause_tag ON public.ai_root_cause_analysis(tag);
CREATE INDEX IF NOT EXISTS idx_ai_root_cause_equip ON public.ai_root_cause_analysis(equipamento_id);

-- Step 3: Enable RLS
ALTER TABLE public.ai_root_cause_analysis ENABLE ROW LEVEL SECURITY;

-- Step 4: Add empresa_id column (tenant isolation)
ALTER TABLE public.ai_root_cause_analysis
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);

CREATE INDEX IF NOT EXISTS idx_ai_root_cause_empresa
  ON public.ai_root_cause_analysis(empresa_id);

-- Step 5: Add stats + audit columns
ALTER TABLE public.ai_root_cause_analysis
  ADD COLUMN IF NOT EXISTS os_count integer,
  ADD COLUMN IF NOT EXISTS mtbf_days numeric,
  ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES auth.users(id);

-- Step 6: RLS policies (drop old, create tenant-isolated)
DROP POLICY IF EXISTS "Authenticated users can view ai analysis" ON public.ai_root_cause_analysis;
DROP POLICY IF EXISTS "Authenticated users can create ai analysis" ON public.ai_root_cause_analysis;
DROP POLICY IF EXISTS "Authenticated users can delete ai analysis" ON public.ai_root_cause_analysis;
DROP POLICY IF EXISTS ai_root_cause_select ON public.ai_root_cause_analysis;
DROP POLICY IF EXISTS ai_root_cause_insert ON public.ai_root_cause_analysis;
DROP POLICY IF EXISTS ai_root_cause_delete ON public.ai_root_cause_analysis;

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

-- Step 7: Grant permissions
GRANT SELECT, INSERT, DELETE ON public.ai_root_cause_analysis TO authenticated;
GRANT ALL ON public.ai_root_cause_analysis TO service_role;

-- Step 8: Backfill empresa_id for orphaned records
UPDATE public.ai_root_cause_analysis a
  SET empresa_id = e.empresa_id
  FROM public.equipamentos e
  WHERE a.equipamento_id = e.id
    AND a.empresa_id IS NULL;
