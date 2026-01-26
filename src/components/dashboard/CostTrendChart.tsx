import { useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CostTrendChartProps {
  data: {
    month: string;
    monthLabel: string;
    maoObra: number;
    materiais: number;
    terceiros: number;
    total: number;
  }[];
  title?: string;
}

export function CostTrendChart({ data, title = "Evolução de Custos" }: CostTrendChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    return `R$ ${value}`;
  };

  if (data.length === 0) {
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
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMaoObra" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorMateriais" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTerceiros" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="monthLabel" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    maoObra: 'Mão de Obra',
                    materiais: 'Materiais',
                    terceiros: 'Terceiros',
                  };
                  return [
                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                    labels[name] || name
                  ];
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend 
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    maoObra: 'Mão de Obra',
                    materiais: 'Materiais',
                    terceiros: 'Terceiros',
                  };
                  return <span className="text-sm">{labels[value] || value}</span>;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="maoObra" 
                stroke="hsl(var(--info))" 
                fillOpacity={1} 
                fill="url(#colorMaoObra)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="materiais" 
                stroke="hsl(var(--success))" 
                fillOpacity={1} 
                fill="url(#colorMateriais)"
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="terceiros" 
                stroke="hsl(var(--warning))" 
                fillOpacity={1} 
                fill="url(#colorTerceiros)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
