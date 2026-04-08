import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { MecanicoDesempenho } from '@/hooks/useRelatoriosInteligentes';

interface ProdutividadeMecanicosPanelProps {
  mecanicos: MecanicoDesempenho[];
}

export function ProdutividadeMecanicosPanel({ mecanicos }: ProdutividadeMecanicosPanelProps) {
  if (mecanicos.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Sem dados de execuções para calcular produtividade.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-500" />
          Produtividade da Equipe
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="pb-2 pr-3">Técnico</th>
                <th className="pb-2 pr-3 text-center">OS Executadas</th>
                <th className="pb-2 pr-3 text-center">Horas</th>
                <th className="pb-2 pr-3 text-center">Tempo Médio/OS</th>
                <th className="pb-2 min-w-[120px]">Eficiência</th>
              </tr>
            </thead>
            <tbody>
              {mecanicos.map(mec => {
                const efStatus = mec.eficiencia >= 80 ? 'alto' : mec.eficiencia >= 50 ? 'medio' : 'baixo';
                const efConfig = {
                  alto: { cor: 'bg-green-500', badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
                  medio: { cor: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
                  baixo: { cor: 'bg-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
                }[efStatus];

                return (
                  <tr key={mec.nome} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="py-2.5 pr-3 font-medium">{mec.nome}</td>
                    <td className="py-2.5 pr-3 text-center font-bold">{mec.osExecutadas}</td>
                    <td className="py-2.5 pr-3 text-center">{mec.horasTrabalhadas}h</td>
                    <td className="py-2.5 pr-3 text-center">{mec.tempoMedioPorOS}h</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <Progress value={mec.eficiencia} className={`h-2 flex-1 [&>div]:${efConfig.cor}`} />
                        <Badge className={`text-[10px] px-1.5 py-0 ${efConfig.badge}`}>{mec.eficiencia}%</Badge>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer com fórmula */}
        <div className="mt-3 text-[10px] text-muted-foreground/70">
          Eficiência = Horas produtivas / Horas disponíveis (176h/mês). Tempo médio por OS em horas.
        </div>
      </CardContent>
    </Card>
  );
}
