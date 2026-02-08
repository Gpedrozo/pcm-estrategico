import { Activity, TrendingUp, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReliabilityCardProps {
  mtbf: number; // em horas
  periodoAnalise: number; // em horas
  taxaFalhas: number; // falhas por período
}

export function ReliabilityCard({ mtbf, periodoAnalise, taxaFalhas }: ReliabilityCardProps) {
  // R(t) = e^(-λt) onde λ = 1/MTBF
  const lambda = mtbf > 0 ? 1 / mtbf : 0;
  const confiabilidade = Math.exp(-lambda * periodoAnalise) * 100;
  
  const getStatus = (value: number) => {
    if (value >= 90) return { label: 'Excelente', color: 'text-success', bg: 'bg-success/10' };
    if (value >= 75) return { label: 'Bom', color: 'text-info', bg: 'bg-info/10' };
    if (value >= 50) return { label: 'Regular', color: 'text-warning', bg: 'bg-warning/10' };
    return { label: 'Crítico', color: 'text-destructive', bg: 'bg-destructive/10' };
  };

  const status = getStatus(confiabilidade);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Confiabilidade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className={`text-3xl font-bold font-mono ${status.color}`}>
              {confiabilidade.toFixed(1)}%
            </span>
            <p className="text-xs text-muted-foreground">R(t) para {periodoAnalise}h</p>
          </div>
          <div className={`p-3 rounded-lg ${status.bg}`}>
            <Activity className={`h-6 w-6 ${status.color}`} />
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between p-2 rounded-lg bg-muted/50">
            <span className="text-muted-foreground">Taxa de Falhas (λ)</span>
            <span className="font-mono font-medium">
              {lambda > 0 ? lambda.toExponential(2) : '0'} /h
            </span>
          </div>

          <div className="flex justify-between p-2 rounded-lg bg-muted/50">
            <span className="text-muted-foreground">Falhas no período</span>
            <span className="font-mono font-medium">{taxaFalhas}</span>
          </div>

          <div className="flex justify-between p-2 rounded-lg bg-muted/50">
            <span className="text-muted-foreground">MTBF</span>
            <span className="font-mono font-medium">{mtbf.toFixed(0)}h</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Fórmula: R(t) = e<sup>-λt</sup> onde λ = 1/MTBF
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
