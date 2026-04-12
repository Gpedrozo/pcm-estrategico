import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TopEquipamentoCusto } from '@/hooks/useRelatoriosInteligentes';

interface EquipConfiabilidadePanelProps {
  equipamentos: TopEquipamentoCusto[];
  onEquipClick?: (tag: string) => void;
}

export function EquipConfiabilidadePanel({ equipamentos, onEquipClick }: EquipConfiabilidadePanelProps) {
  if (equipamentos.length === 0) return null;

  // Ordenar por quantidade de corretivas (maior = menos confiável)
  const ranked = [...equipamentos].sort((a, b) => b.corretivas - a.corretivas);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Wrench className="h-5 w-5 text-orange-500" />
          Confiabilidade por Equipamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="pb-2 pr-2">#</th>
                <th className="pb-2 pr-2">TAG</th>
                <th className="pb-2 pr-2">Equipamento</th>
                <th className="pb-2 pr-2 text-center">Total OS</th>
                <th className="pb-2 pr-2 text-center">Corretivas</th>
                <th className="pb-2 pr-2 text-center">Preventivas</th>
                <th className="pb-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {ranked.slice(0, 10).map((eq, i) => {
                const _ratioPrev = eq.totalOS > 0 ? ((eq.totalOS - eq.corretivas) / eq.totalOS) * 100 : 100;
                const status: 'critico' | 'alerta' | 'ok' =
                  eq.corretivas >= 5 ? 'critico' : eq.corretivas >= 3 ? 'alerta' : 'ok';

                const statusConfig = {
                  critico: { label: 'Crítico', badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
                  alerta: { label: 'Atenção', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
                  ok: { label: 'Normal', badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
                }[status];

                return (
                  <tr
                    key={eq.tag}
                    className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => onEquipClick?.(eq.tag)}
                  >
                    <td className="py-2.5 pr-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2.5 pr-2 font-mono font-semibold text-xs">{eq.tag}</td>
                    <td className="py-2.5 pr-2 text-xs">{eq.equipamento}</td>
                    <td className="py-2.5 pr-2 text-center font-bold">{eq.totalOS}</td>
                    <td className="py-2.5 pr-2 text-center">
                      <span className={eq.corretivas >= 5 ? 'text-red-600 font-bold' : eq.corretivas >= 3 ? 'text-amber-600 font-semibold' : ''}>
                        {eq.corretivas}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 text-center">{eq.totalOS - eq.corretivas}</td>
                    <td className="py-2.5 text-center">
                      <Badge className={`text-[10px] px-1.5 py-0 ${statusConfig.badge}`}>
                        {statusConfig.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Insight */}
        {ranked[0] && ranked[0].corretivas >= 3 && (
          <div className="mt-3 text-xs bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded p-2">
            <AlertTriangle className="h-3 w-3 inline mr-1 text-orange-500" />
            <strong>Insight:</strong> Equipamento <strong>{ranked[0].tag}</strong> lidera com {ranked[0].corretivas} corretivas.
            Recomendado análise de causa raiz e revisão do plano preventivo. Considerar FMEA para este ativo.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
