import { Clock, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface SLAData {
  dentroPrazo: number;
  foraPrazo: number;
  percentualCumprimento: number;
  tempoMedioAtendimento: number; // em horas
  metaSLA: number; // em horas
}

interface SLAComplianceCardProps {
  data: SLAData;
}

export function SLAComplianceCard({ data }: SLAComplianceCardProps) {
  const isAboveMeta = data.percentualCumprimento >= 90;
  const statusColor = isAboveMeta ? 'text-success' : data.percentualCumprimento >= 70 ? 'text-warning' : 'text-destructive';
  const statusBg = isAboveMeta ? 'bg-success' : data.percentualCumprimento >= 70 ? 'bg-warning' : 'bg-destructive';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          SLA de Atendimento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className={`text-3xl font-bold font-mono ${statusColor}`}>
              {data.percentualCumprimento.toFixed(0)}%
            </span>
            <p className="text-xs text-muted-foreground">Cumprimento do SLA</p>
          </div>
          <div className={`p-2 rounded-lg ${statusBg}/10`}>
            {isAboveMeta ? (
              <TrendingUp className={`h-6 w-6 ${statusColor}`} />
            ) : (
              <TrendingDown className={`h-6 w-6 ${statusColor}`} />
            )}
          </div>
        </div>

        <Progress 
          value={data.percentualCumprimento} 
          className="h-3 mb-4"
        />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-2 rounded-lg bg-success/10">
            <p className="text-success font-bold">{data.dentroPrazo}</p>
            <p className="text-xs text-muted-foreground">Dentro do prazo</p>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10">
            <p className="text-destructive font-bold">{data.foraPrazo}</p>
            <p className="text-xs text-muted-foreground">Fora do prazo</p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Tempo médio:</span>
          </div>
          <Badge variant="outline" className="font-mono">
            {data.tempoMedioAtendimento.toFixed(1)}h
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
