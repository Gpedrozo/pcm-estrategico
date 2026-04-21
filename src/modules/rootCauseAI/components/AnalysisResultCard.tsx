import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfidenceScoreBar } from './ConfidenceScoreBar';
import { AlertTriangle, CheckCircle, Lightbulb, Search, Target } from 'lucide-react';
import type { PreventivePlanSuggestion, StrategicDecisionSupport } from '../types';

interface AnalysisResultCardProps {
  summary: string;
  possibleCauses: string[];
  mainHypothesis: string;
  recommendedSolution?: string;
  preventiveActions: string[];
  recommendedImprovements?: string[];
  recurrenceInsights?: string[];
  crossModuleFindings?: string[];
  planningPriorityScore?: number;
  preventivePlanSuggestion?: PreventivePlanSuggestion;
  strategicDecisionSupport?: StrategicDecisionSupport;
  criticality: string;
  confidenceScore: number;
  osCount: number | null;
  mtbfDays: number | null;
  generatedAt: string;
}

export function AnalysisResultCard({
  summary,
  possibleCauses,
  mainHypothesis,
  recommendedSolution,
  preventiveActions,
  recommendedImprovements = [],
  recurrenceInsights = [],
  crossModuleFindings = [],
  planningPriorityScore,
  preventivePlanSuggestion,
  strategicDecisionSupport,
  criticality,
  confidenceScore,
  osCount,
  mtbfDays,
  generatedAt,
}: AnalysisResultCardProps) {
  const criticalityColor: Record<string, string> = {
    'Baixo': 'bg-green-100 text-green-800 border-green-300',
    'Médio': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Alto': 'bg-orange-100 text-orange-800 border-orange-300',
    'Crítico': 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {osCount != null && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{osCount}</p>
              <p className="text-xs text-muted-foreground">O.S. Analisadas</p>
            </CardContent>
          </Card>
        )}
        {mtbfDays != null && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{mtbfDays.toFixed(0)}d</p>
              <p className="text-xs text-muted-foreground">MTBF Estimado</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-4 text-center">
            <Badge className={criticalityColor[criticality] || 'bg-muted'}>
              {criticality}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Criticidade</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <ConfidenceScoreBar score={confidenceScore} />
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" /> Resumo da Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{summary}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Gerado em: {new Date(generatedAt).toLocaleString('pt-BR')}
          </p>
        </CardContent>
      </Card>

      {/* Main hypothesis */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Causa Raiz Principal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium">{mainHypothesis}</p>
        </CardContent>
      </Card>

      {recommendedSolution && (
        <Card className="border-green-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" /> Solução Mais Provável
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium leading-relaxed">{recommendedSolution}</p>
          </CardContent>
        </Card>
      )}

      {/* Possible causes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" /> Possíveis Causas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {possibleCauses.length > 0 ? (
            <ul className="space-y-2">
              {possibleCauses.map((cause, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="font-bold text-primary mt-0.5">{i + 1}.</span>
                  <span>{cause}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma causa identificada.</p>
          )}
        </CardContent>
      </Card>

      {/* Preventive actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" /> Ações Preventivas Recomendadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {preventiveActions.length > 0 ? (
            <ul className="space-y-2">
              {preventiveActions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma ação preventiva sugerida.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" /> Estratégia Preventiva Recomendada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {typeof planningPriorityScore === 'number' && (
            <p className="text-sm">
              Prioridade de planejamento preventivo: <strong>{Math.round(planningPriorityScore)}/100</strong>
            </p>
          )}
          {recurrenceInsights.length > 0 ? (
            <ul className="space-y-2">
              {recurrenceInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="font-bold text-blue-600 mt-0.5">{i + 1}.</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Sem insight de recorrência suficiente para sugerir estratégia automática.</p>
          )}

          {preventivePlanSuggestion && preventivePlanSuggestion.should_create_plan ? (
            <div className="rounded-md border border-blue-200 bg-blue-50/60 p-3 space-y-2">
              <p className="text-sm font-semibold">Plano sugerido: {preventivePlanSuggestion.plan_name}</p>
              <p className="text-sm">Componente recorrente: <strong>{preventivePlanSuggestion.recurring_component || 'N/A'}</strong></p>
              <p className="text-sm">Gatilho: <strong>{preventivePlanSuggestion.trigger_type}</strong></p>
              <p className="text-sm">Frequência recomendada: <strong>{preventivePlanSuggestion.suggested_frequency_days ?? 'N/A'} dias</strong></p>
              {typeof preventivePlanSuggestion.confidence_to_create_plan === 'number' && (
                <p className="text-sm">Confiança para criar plano: <strong>{Math.round(preventivePlanSuggestion.confidence_to_create_plan)}/100</strong></p>
              )}
              {preventivePlanSuggestion.deterministic_triggered && (
                <p className="text-xs text-blue-700">Plano habilitado por validação determinística de recorrência.</p>
              )}
              <p className="text-sm text-muted-foreground">{preventivePlanSuggestion.strategic_reason}</p>
              {preventivePlanSuggestion.source_evidence && preventivePlanSuggestion.source_evidence.length > 0 && (
                <ul className="space-y-1 pt-1">
                  {preventivePlanSuggestion.source_evidence.map((evidence, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="font-bold text-blue-600 mt-0.5">{i + 1}.</span>
                      <span>{evidence}</span>
                    </li>
                  ))}
                </ul>
              )}
              {preventivePlanSuggestion.stock_recommendations?.length > 0 && (
                <ul className="space-y-1 pt-1">
                  {preventivePlanSuggestion.stock_recommendations.map((item, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">A IA não recomenda criação automática de plano preventivo com os dados atuais.</p>
          )}

          {crossModuleFindings.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold mb-2">Achados intermodulares</p>
              <ul className="space-y-1">
                {crossModuleFindings.map((finding, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="font-bold text-slate-600 mt-0.5">{i + 1}.</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {strategicDecisionSupport && (
        <Card className="border-indigo-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-600" /> Suporte Decisório Estratégico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-md border border-indigo-200 bg-indigo-50/60 p-3">
                <p className="text-xs text-muted-foreground">Score de Saúde do Ativo</p>
                <p className="text-xl font-semibold text-indigo-700">{strategicDecisionSupport.health_score}/100</p>
              </div>
              <div className="rounded-md border border-rose-200 bg-rose-50/60 p-3">
                <p className="text-xs text-muted-foreground">Score de Risco Operacional</p>
                <p className="text-xl font-semibold text-rose-700">{strategicDecisionSupport.risk_score}/100</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-muted-foreground">Custo Corretivo Anual Estimado</p>
                <p className="text-lg font-semibold">R$ {strategicDecisionSupport.annual_corrective_cost_estimate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-muted-foreground">Indisponibilidade Anual Estimada</p>
                <p className="text-lg font-semibold">{strategicDecisionSupport.annual_downtime_hours_estimate.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h</p>
              </div>
            </div>

            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-semibold">Estratégia recomendada: {strategicDecisionSupport.recommended_strategy}</p>
              <p className="text-sm text-muted-foreground mt-1">{strategicDecisionSupport.executive_summary}</p>
            </div>

            {strategicDecisionSupport.scenarios?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Cenários comparativos</p>
                <ul className="space-y-2">
                  {strategicDecisionSupport.scenarios.map((scenario, index) => (
                    <li key={`${scenario.scenario}-${index}`} className="rounded-md border border-slate-200 p-3 text-sm space-y-1">
                      <p className="font-semibold">{scenario.scenario}</p>
                      <p>Custo anual estimado: <strong>R$ {scenario.annual_cost_estimate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
                      <p>Indisponibilidade estimada: <strong>{scenario.annual_downtime_estimate_hours.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h/ano</strong></p>
                      <p>Redução de risco: <strong>{scenario.risk_reduction_percent}%</strong></p>
                      <p className="text-muted-foreground">{scenario.recommendation}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-blue-600" /> Melhorias Recomendadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recommendedImprovements.length > 0 ? (
            <ul className="space-y-2">
              {recommendedImprovements.map((improvement, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma melhoria adicional sugerida.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
