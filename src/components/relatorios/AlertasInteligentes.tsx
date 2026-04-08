import { AlertTriangle, AlertCircle, Info, CheckCircle, ChevronRight, Lightbulb, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AlertaInteligente, InsightAutomatico, AlertaSeveridade } from '@/hooks/useRelatoriosInteligentes';

const severidadeConfig: Record<AlertaSeveridade, { icon: typeof AlertTriangle; cor: string; bg: string; badge: string; label: string }> = {
  critico: { icon: AlertTriangle, cor: 'text-red-600', bg: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900', badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', label: 'CRÍTICO' },
  alerta: { icon: AlertCircle, cor: 'text-amber-600', bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', label: 'ALERTA' },
  atencao: { icon: Info, cor: 'text-blue-600', bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', label: 'ATENÇÃO' },
  ok: { icon: CheckCircle, cor: 'text-green-600', bg: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900', badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', label: 'OK' },
};

interface AlertasInteligentesProps {
  alertas: AlertaInteligente[];
  insights: InsightAutomatico[];
}

export function AlertasInteligentes({ alertas, insights }: AlertasInteligentesProps) {
  if (alertas.length === 0 && insights.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
        <CardContent className="p-6 flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-semibold text-green-700 dark:text-green-400">Sistema operando dentro dos parâmetros</p>
            <p className="text-sm text-green-600/80 dark:text-green-500">Nenhum alerta ou anomalia detectada no período analisado.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alertas */}
      {alertas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Alertas do Sistema
              <Badge variant="destructive" className="ml-auto">{alertas.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertas.map(alerta => {
              const config = severidadeConfig[alerta.severidade];
              const Icon = config.icon;
              return (
                <div key={alerta.id} className={`p-4 rounded-lg border ${config.bg}`}>
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.cor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{alerta.titulo}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${config.badge}`}>{config.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alerta.descricao}</p>
                      {alerta.variacao !== undefined && alerta.variacao !== 0 && (
                        <div className="mt-1.5 flex items-center gap-2 text-xs">
                          <span className={alerta.variacao > 0 ? 'text-red-600' : 'text-green-600'}>
                            {alerta.variacao > 0 ? '▲' : '▼'} {Math.abs(alerta.variacao).toFixed(0)}% vs período anterior
                          </span>
                        </div>
                      )}
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground bg-background/60 rounded p-2">
                        <Target className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
                        <span><strong>Ação recomendada:</strong> {alerta.acaoRecomendada}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Insights / Diagnósticos */}
      {insights.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Análise Automática
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.map(insight => {
              const config = severidadeConfig[insight.severidade];
              const tipoLabel: Record<string, string> = {
                diagnostico: 'Diagnóstico',
                tendencia: 'Tendência',
                causa: 'Causa Raiz',
                recomendacao: 'Recomendação',
              };
              return (
                <div key={insight.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                  <ChevronRight className={`h-4 w-4 mt-0.5 flex-shrink-0 ${config.cor}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{tipoLabel[insight.tipo] || insight.tipo}</Badge>
                    </div>
                    <p className="text-sm">{insight.texto}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
