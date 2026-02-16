import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfidenceScoreBar } from './ConfidenceScoreBar';
import { AlertTriangle, CheckCircle, Lightbulb, Search, Target } from 'lucide-react';

interface AnalysisResultCardProps {
  summary: string;
  possibleCauses: string[];
  mainHypothesis: string;
  preventiveActions: string[];
  criticality: string;
  confidenceScore: number;
  osCount: number;
  mtbfDays: number;
  generatedAt: string;
}

export function AnalysisResultCard({
  summary,
  possibleCauses,
  mainHypothesis,
  preventiveActions,
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
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{osCount}</p>
            <p className="text-xs text-muted-foreground">O.S. Analisadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{mtbfDays.toFixed(0)}d</p>
            <p className="text-xs text-muted-foreground">MTBF Estimado</p>
          </CardContent>
        </Card>
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

      {/* Possible causes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" /> Possíveis Causas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {possibleCauses.map((cause, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="font-bold text-primary mt-0.5">{i + 1}.</span>
                <span>{cause}</span>
              </li>
            ))}
          </ul>
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
          <ul className="space-y-2">
            {preventiveActions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
