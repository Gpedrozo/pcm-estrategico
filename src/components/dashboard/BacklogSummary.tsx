import { AlertTriangle, Clock, TrendingDown, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface BacklogSummaryProps {
  backlogQuantidade: number;
  backlogTempo: number;
  backlogSemanas: number;
  urgentes: number;
  atrasadas: number;
  metaSemanas?: number;
}

export function BacklogSummary({
  backlogQuantidade,
  backlogTempo,
  backlogSemanas,
  urgentes,
  atrasadas,
  metaSemanas = 2,
}: BacklogSummaryProps) {
  const isHealthy = backlogSemanas <= metaSemanas;
  const percentMeta = Math.min((backlogSemanas / metaSemanas) * 100, 150);

  const getBacklogStatus = () => {
    if (backlogSemanas <= 1) return { label: 'Saudável', color: 'bg-success text-success-foreground' };
    if (backlogSemanas <= 2) return { label: 'Adequado', color: 'bg-info text-info-foreground' };
    if (backlogSemanas <= 4) return { label: 'Atenção', color: 'bg-warning text-warning-foreground' };
    return { label: 'Crítico', color: 'bg-destructive text-destructive-foreground' };
  };

  const status = getBacklogStatus();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Backlog de Manutenção
          </CardTitle>
          <Badge className={status.color}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main metric */}
        <div className="text-center p-4 rounded-lg bg-muted/50">
          <p className="text-4xl font-bold font-mono">{backlogSemanas.toFixed(1)}</p>
          <p className="text-sm text-muted-foreground">Semanas de backlog</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Meta: {metaSemanas} semanas</span>
          </div>
        </div>

        {/* Progress to target */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso vs Meta</span>
            <span className={cn(
              "font-medium",
              isHealthy ? "text-success" : "text-destructive"
            )}>
              {percentMeta.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={Math.min(percentMeta, 100)} 
            className={cn(
              "h-2",
              !isHealthy && "[&>div]:bg-destructive"
            )}
          />
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs">Total OS</span>
            </div>
            <p className="text-xl font-bold">{backlogQuantidade}</p>
          </div>
          <div className="p-3 rounded-lg border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Horas Acum.</span>
            </div>
            <p className="text-xl font-bold">{backlogTempo.toFixed(0)}h</p>
          </div>
        </div>

        {/* Alerts */}
        {(urgentes > 0 || atrasadas > 0) && (
          <div className="space-y-2">
            {urgentes > 0 && (
              <div className="flex items-center justify-between p-2 rounded bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive font-medium">Urgentes</span>
                </div>
                <Badge variant="destructive">{urgentes}</Badge>
              </div>
            )}
            {atrasadas > 0 && (
              <div className="flex items-center justify-between p-2 rounded bg-warning/10 border border-warning/20">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-sm text-warning font-medium">Atrasadas</span>
                </div>
                <Badge className="bg-warning text-warning-foreground">{atrasadas}</Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
