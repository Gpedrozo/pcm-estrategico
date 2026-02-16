export interface AIRootCauseAnalysis {
  id: string;
  tag: string;
  equipamento_id: string | null;
  generated_at: string;
  summary: string | null;
  possible_causes: string[] | null;
  main_hypothesis: string | null;
  preventive_actions: string[] | null;
  criticality: string | null;
  confidence_score: number | null;
  raw_response: any;
  created_at: string;
}

export interface AnalysisResponse {
  analysis: {
    id: string;
    generated_at: string;
    summary: string;
    possible_causes: string[];
    main_hypothesis: string;
    preventive_actions: string[];
    criticality: string;
    confidence_score: number;
  };
  os_count: number;
  mtbf_days: number;
}
