
-- Create table for AI root cause analysis results
CREATE TABLE public.ai_root_cause_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text NOT NULL,
  equipamento_id uuid REFERENCES public.equipamentos(id),
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  summary text,
  possible_causes jsonb,
  main_hypothesis text,
  preventive_actions jsonb,
  criticality text,
  confidence_score numeric,
  raw_response jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX idx_ai_root_cause_tag ON public.ai_root_cause_analysis(tag);
CREATE INDEX idx_ai_root_cause_equip ON public.ai_root_cause_analysis(equipamento_id);

-- Enable RLS
ALTER TABLE public.ai_root_cause_analysis ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view ai analysis"
ON public.ai_root_cause_analysis FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create ai analysis"
ON public.ai_root_cause_analysis FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete ai analysis"
ON public.ai_root_cause_analysis FOR DELETE
USING (true);
