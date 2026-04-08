import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { AderenciaDetalhada } from '@/hooks/useRelatoriosInteligentes';

const CORES = {
  noPrazo: '#22c55e',
  atrasadas: '#eab308',
  naoExecutadas: '#ef4444',
};

interface AderenciaPreventivaProps {
  dados: AderenciaDetalhada;
}

export function AderenciaPreventiva({ dados }: AderenciaPreventivaProps) {
  const chartData = [
    { name: 'No prazo', value: dados.executadasNoPrazo, cor: CORES.noPrazo },
    { name: 'Atrasadas', value: dados.executadasAtrasadas, cor: CORES.atrasadas },
    { name: 'Não executadas', value: dados.naoExecutadas, cor: CORES.naoExecutadas },
  ].filter(d => d.value > 0);

  const isRuim = dados.percentualNoPrazo < 90;
  const isCritico = dados.percentualNoPrazo < 70;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-5 w-5 text-violet-500" />
          Aderência Preventiva
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gráfico Pizza */}
          <div className="h-[180px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} OS`, '']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Sem dados de preventivas
              </div>
            )}
          </div>

          {/* Detalhes */}
          <div className="space-y-3">
            <MetricaAderencia
              icon={<CheckCircle className="h-4 w-4 text-green-500" />}
              label="Executadas no prazo"
              valor={dados.executadasNoPrazo}
              pct={dados.percentualNoPrazo}
              cor="bg-green-500"
            />
            <MetricaAderencia
              icon={<Clock className="h-4 w-4 text-amber-500" />}
              label="Executadas com atraso"
              valor={dados.executadasAtrasadas}
              pct={dados.percentualAtrasadas}
              cor="bg-amber-500"
            />
            <MetricaAderencia
              icon={<XCircle className="h-4 w-4 text-red-500" />}
              label="Não executadas"
              valor={dados.naoExecutadas}
              pct={dados.percentualNaoExecutadas}
              cor="bg-red-500"
            />
            <div className="pt-2 border-t text-xs text-muted-foreground">
              Total de preventivas: <strong>{dados.total}</strong>
            </div>
          </div>
        </div>

        {/* Insight */}
        {isRuim && (
          <div className={`mt-3 text-xs rounded p-2 border ${isCritico ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'}`}>
            <strong>{isCritico ? '🔴 Crítico:' : '⚠️ Atenção:'}</strong> Apenas {dados.percentualNoPrazo}% das preventivas foram executadas no prazo.
            {dados.naoExecutadas > 0 && ` ${dados.naoExecutadas} preventivas ainda não foram executadas.`}
            {' '}Baixa aderência preventiva gera aumento de manutenções corretivas e reduz a confiabilidade dos ativos.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricaAderencia({ icon, label, valor, pct, cor }: { icon: React.ReactNode; label: string; valor: number; pct: number; cor: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-xs">
          {icon}
          <span>{label}</span>
        </div>
        <span className="text-xs font-bold">{valor} ({pct}%)</span>
      </div>
      <Progress value={pct} className={`h-1.5 [&>div]:${cor}`} />
    </div>
  );
}
