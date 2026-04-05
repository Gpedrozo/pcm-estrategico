-- Add os_count, mtbf_days and requested_by to ai_root_cause_analysis
-- These columns enable the frontend to display accurate stats from history
-- and track which user generated each analysis (audit trail).
-- All nullable to maintain backward compatibility with existing records.

ALTER TABLE public.ai_root_cause_analysis
  ADD COLUMN IF NOT EXISTS os_count integer,
  ADD COLUMN IF NOT EXISTS mtbf_days numeric,
  ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES auth.users(id);

-- Backfill empresa_id for orphaned records (created before tenant isolation)
UPDATE public.ai_root_cause_analysis a
  SET empresa_id = e.empresa_id
  FROM public.equipamentos e
  WHERE a.equipamento_id = e.id
    AND a.empresa_id IS NULL;
