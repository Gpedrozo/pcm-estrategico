import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OSByStatusChartProps {
  data: {
    status: string;
    quantidade: number;
  }[];
  title?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ABERTA: { label: 'Abertas', color: 'hsl(var(--warning))' },
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'hsl(var(--info))' },
  AGUARDANDO_MATERIAL: { label: 'Ag. Material', color: 'hsl(var(--destructive))' },
  AGUARDANDO_APROVACAO: { label: 'Ag. Aprovação', color: 'hsl(var(--muted-foreground))' },
  FECHADA: { label: 'Fechadas', color: 'hsl(var(--success))' },
};

export function OSByStatusChart({ data, title = "OS por Status" }: OSByStatusChartProps) {
  const chartData = useMemo(() => {
    return data.map(item => ({
      name: STATUS_CONFIG[item.status]?.label || item.status,
      value: item.quantidade,
      fill: STATUS_CONFIG[item.status]?.color || 'hsl(var(--muted))',
    }));
  }, [data]);

  const total = chartData.reduce((acc, item) => acc + item.value, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center">
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
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                width={75}
              />
              <Tooltip 
                formatter={(value: number) => [value, 'Quantidade']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={30}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
