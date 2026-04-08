import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { BacklogBucket } from '@/hooks/useRelatoriosInteligentes';

interface BacklogAgingChartProps {
  buckets: BacklogBucket[];
  totalBacklog: number;
  onBucketClick?: (faixa: string) => void;
}

export function BacklogAgingChart({ buckets, totalBacklog, onBucketClick }: BacklogAgingChartProps) {
  const envelhecidas = buckets.filter(b => b.faixa === '15–30 dias' || b.faixa === '30+ dias')
    .reduce((s, b) => s + b.quantidade, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Envelhecimento do Backlog
          {envelhecidas > 0 && (
            <span className="ml-auto text-xs text-red-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {envelhecidas} OS com mais de 15 dias
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={buckets}
              onClick={(data) => {
                if (data?.activeLabel && onBucketClick) onBucketClick(data.activeLabel);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="faixa" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                formatter={(value: number, _name: string, props: any) => [
                  `${value} OS (${props.payload.percentual}%)`,
                  'Quantidade',
                ]}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Bar dataKey="quantidade" radius={[4, 4, 0, 0]} cursor="pointer">
                {buckets.map((entry, index) => (
                  <Cell key={index} fill={entry.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Resumo textual */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {buckets.map(b => (
            <div
              key={b.faixa}
              className="text-center p-2 rounded border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onBucketClick?.(b.faixa)}
            >
              <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: b.cor }} />
              <span className="text-lg font-bold">{b.quantidade}</span>
              <p className="text-[10px] text-muted-foreground">{b.faixa}</p>
            </div>
          ))}
        </div>

        {/* Insight */}
        {envelhecidas > 0 && totalBacklog > 0 && (
          <div className="mt-3 text-xs text-muted-foreground bg-red-50 dark:bg-red-950/20 rounded p-2 border border-red-200 dark:border-red-900">
            <strong>Insight:</strong> {Math.round((envelhecidas / totalBacklog) * 100)}% do backlog tem mais de 15 dias de idade.
            OS envelhecidas indicam gargalo na execução ou falta de recursos. Padrão industrial recomenda máximo de 7 dias.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
