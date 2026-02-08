import { Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface OEEGaugeCardProps {
  disponibilidade: number;
  performance: number;
  qualidade: number;
}

export function OEEGaugeCard({ disponibilidade, performance, qualidade }: OEEGaugeCardProps) {
  const oee = (disponibilidade / 100) * (performance / 100) * (qualidade / 100) * 100;
  
  const getOEEStatus = (value: number) => {
    if (value >= 85) return { label: 'Classe Mundial', color: 'text-success', bg: 'bg-success' };
    if (value >= 65) return { label: 'Bom', color: 'text-info', bg: 'bg-info' };
    if (value >= 40) return { label: 'Regular', color: 'text-warning', bg: 'bg-warning' };
    return { label: 'Crítico', color: 'text-destructive', bg: 'bg-destructive' };
  };

  const status = getOEEStatus(oee);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          OEE - Eficiência Global
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <span className={`text-4xl font-bold font-mono ${status.color}`}>
            {oee.toFixed(1)}%
          </span>
          <span className={`text-xs px-2 py-1 rounded ${status.bg} text-white`}>
            {status.label}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Disponibilidade</span>
              <span className="font-medium">{disponibilidade.toFixed(1)}%</span>
            </div>
            <Progress value={disponibilidade} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Performance</span>
              <span className="font-medium">{performance.toFixed(1)}%</span>
            </div>
            <Progress value={performance} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Qualidade</span>
              <span className="font-medium">{qualidade.toFixed(1)}%</span>
            </div>
            <Progress value={qualidade} className="h-2" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            OEE = D × P × Q = {disponibilidade.toFixed(0)}% × {performance.toFixed(0)}% × {qualidade.toFixed(0)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
