import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { KPIComparacao, AlertaSeveridade } from '@/hooks/useRelatoriosInteligentes';

const severidadeCores: Record<AlertaSeveridade, { bg: string; border: string; text: string; progress: string }> = {
  critico: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-300 dark:border-red-800', text: 'text-red-700 dark:text-red-400', progress: 'bg-red-500' },
  alerta: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-300 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', progress: 'bg-amber-500' },
  atencao: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-300 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-400', progress: 'bg-blue-500' },
  ok: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-300 dark:border-green-800', text: 'text-green-700 dark:text-green-400', progress: 'bg-green-500' },
};

interface KPIMetaRealProps {
  kpis: KPIComparacao[];
}

export function KPIMetaReal({ kpis }: KPIMetaRealProps) {
  if (kpis.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {kpis.map(kpi => {
        const cores = severidadeCores[kpi.severidade];
        const TrendIcon = kpi.tendencia === 'subindo' ? TrendingUp : kpi.tendencia === 'caindo' ? TrendingDown : Minus;

        // Para KPIs onde menor é melhor (MTTR, Backlog, Custo), subir é ruim
        const isInverso = ['MTTR', 'BKL', 'BKS', 'CUSTO'].includes(kpi.sigla);
        const trendColor = kpi.tendencia === 'estavel'
          ? 'text-muted-foreground'
          : (kpi.tendencia === 'subindo' && isInverso) || (kpi.tendencia === 'caindo' && !isInverso)
            ? 'text-red-600'
            : 'text-green-600';

        // Progresso em relação à meta (0-100)
        let progressValue = 0;
        if (kpi.meta > 0) {
          if (isInverso) {
            progressValue = Math.max(0, Math.min(100, ((kpi.meta - kpi.valorAtual) / kpi.meta) * 100 + 50));
          } else {
            progressValue = Math.max(0, Math.min(100, (kpi.valorAtual / kpi.meta) * 100));
          }
        }

        const formatarValor = (v: number) => {
          if (kpi.unidade === 'R$') return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
          return `${v}${kpi.unidade}`;
        };

        return (
          <Card key={kpi.sigla} className={`${cores.bg} ${cores.border} border transition-all hover:shadow-md`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 cursor-help">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{kpi.sigla}</span>
                        <Info className="h-3 w-3 text-muted-foreground/60" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px]">
                      <p className="font-semibold text-sm">{kpi.nome}</p>
                      <p className="text-xs text-muted-foreground mt-1">Fórmula: {kpi.formula}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cores.text} border-current`}>
                  {kpi.severidade === 'critico' ? '🔴' : kpi.severidade === 'alerta' ? '🟡' : kpi.severidade === 'atencao' ? '🔵' : '🟢'}
                </Badge>
              </div>

              <div className="flex items-end gap-2 mb-1">
                <span className={`text-2xl font-bold ${cores.text}`}>{formatarValor(kpi.valorAtual)}</span>
              </div>

              <p className="text-xs text-muted-foreground mb-2">{kpi.nome}</p>

              {/* Meta vs Real */}
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-muted-foreground">Meta: {formatarValor(kpi.meta)}</span>
                <div className={`flex items-center gap-1 ${trendColor}`}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{kpi.variacao > 0 ? '+' : ''}{kpi.variacao}%</span>
                </div>
              </div>

              <Progress value={progressValue} className="h-1.5" />

              {/* Período Anterior */}
              {kpi.valorAnterior > 0 && (
                <div className="mt-2 text-[10px] text-muted-foreground/70">
                  Período anterior: {formatarValor(kpi.valorAnterior)}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
