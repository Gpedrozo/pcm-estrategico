export interface AIRootCauseAnalysis {
  id: string;
  tag: string;
  equipamento_id: string | null;
  generated_at: string;
  summary: string | null;
  possible_causes: string[] | null;
  main_hypothesis: string | null;
  recommended_solution?: string | null;
  preventive_actions: string[] | null;
  recommended_improvements?: string[] | null;
  criticality: string | null;
  confidence_score: number | null;
  raw_response: any;
  created_at: string;
  os_count: number | null;
  mtbf_days: number | null;
  requested_by: string | null;
}

export interface PreventivePlanSuggestion {
  should_create_plan: boolean;
  plan_name: string;
  trigger_type: 'TEMPO' | 'CICLO' | 'CONDICAO';
  suggested_frequency_days: number | null;
  strategic_reason: string;
  recurring_component: string;
  recurrence_interval_days: number | null;
  stock_recommendations: string[];
  expected_downtime_reduction_hours: number | null;
  confidence_to_create_plan?: number;
  deterministic_triggered?: boolean;
  source_evidence?: string[];
}

export interface AnalysisResponse {
  analysis: {
    id: string;
    generated_at: string;
    summary: string;
    possible_causes: string[];
    main_hypothesis: string;
    recommended_solution?: string;
    preventive_actions: string[];
    recommended_improvements?: string[];
    recurrence_insights?: string[];
    cross_module_findings?: string[];
    planning_priority_score?: number;
    preventive_plan_suggestion?: PreventivePlanSuggestion;
    criticality: string;
    confidence_score: number;
  };
  os_count: number | null;
  mtbf_days: number | null;
}
