import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { TopEquipamentoCusto } from '@/hooks/useRelatoriosInteligentes';

interface CustosInsightsPanelProps {
  equipamentos: TopEquipamentoCusto[];
  custoTotal: number;
}

export function CustosInsightsPanel({ equipamentos, custoTotal }: CustosInsightsPanelProps) {
  if (equipamentos.length === 0) return null;

  const topPct = equipamentos[0]?.percentualTotal || 0;
  const top3Custo = equipamentos.slice(0, 3).reduce((s, e) => s + e.custoTotal, 0);
  const top3Pct = custoTotal > 0 ? Math.round((top3Custo / custoTotal) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-500" />
          Top 10 Equipamentos por Custo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Insight principal */}
        {topPct > 20 && (
          <div className="mb-4 text-xs bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded p-2">
            <strong>Insight:</strong> Os 3 equipamentos mais caros representam <strong>{top3Pct}%</strong> do custo total.
            {topPct > 30 && ` O equipamento ${equipamentos[0].tag} sozinho concentra ${topPct}% — avaliar viabilidade de substituição ou overhaul.`}
          </div>
        )}

        <div className="space-y-3">
          {equipamentos.map((equip, index) => (
            <div key={equip.tag} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-muted rounded w-6 h-6 flex items-center justify-center text-muted-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <span className="text-sm font-semibold">{equip.tag}</span>
                    <span className="text-xs text-muted-foreground ml-2">{equip.equipamento}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">
                    R$ {equip.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">({equip.percentualTotal}%)</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress
                  value={equip.percentualTotal}
                  className="h-2 flex-1"
                />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {equip.totalOS} OS · {equip.corretivas} corr
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Custo global */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Custo Total Registrado
          </span>
          <span className="text-lg font-bold">
            R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
