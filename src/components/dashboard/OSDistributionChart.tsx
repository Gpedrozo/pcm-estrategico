import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OSDistributionChartProps {
  data: {
    tipo: string;
    quantidade: number;
  }[];
  title?: string;
}

const COLORS = {
  CORRETIVA: 'hsl(var(--destructive))',
  PREVENTIVA: 'hsl(var(--success))',
  PREDITIVA: 'hsl(var(--info))',
  INSPECAO: 'hsl(var(--warning))',
  MELHORIA: 'hsl(var(--primary))',
};

const LABELS = {
  CORRETIVA: 'Corretiva',
  PREVENTIVA: 'Preventiva',
  PREDITIVA: 'Preditiva',
  INSPECAO: 'Inspeção',
  MELHORIA: 'Melhoria',
};

export function OSDistributionChart({ data, title = "Distribuição por Tipo" }: OSDistributionChartProps) {
  const chartData = useMemo(() => {
    return data.map(item => ({
      name: LABELS[item.tipo as keyof typeof LABELS] || item.tipo,
      value: item.quantidade,
      fill: COLORS[item.tipo as keyof typeof COLORS] || 'hsl(var(--muted))',
    }));
  }, [data]);

  const total = chartData.reduce((acc, item) => acc + item.value, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Sem dados para exibir</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => 
                  percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                }
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [value, 'Quantidade']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend 
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-2">
          <p className="text-2xl font-bold">{total}</p>
          <p className="text-xs text-muted-foreground">Total de OS</p>
        </div>
      </CardContent>
    </Card>
  );
}
