import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Wrench, Settings, Activity, Lightbulb, Search } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface CostByTypeData {
  tipo: string;
  custo: number;
  quantidade: number;
}

interface CostByTypeChartProps {
  data: CostByTypeData[];
  title?: string;
}

const COLORS = {
  CORRETIVA: 'hsl(var(--destructive))',
  PREVENTIVA: 'hsl(var(--success))',
  PREDITIVA: 'hsl(var(--info))',
  INSPECAO: 'hsl(var(--warning))',
  MELHORIA: 'hsl(var(--primary))',
};

const ICONS = {
  CORRETIVA: Wrench,
  PREVENTIVA: Settings,
  PREDITIVA: Activity,
  INSPECAO: Search,
  MELHORIA: Lightbulb,
};

export function CostByTypeChart({ data, title = "Custo por Tipo de OS" }: CostByTypeChartProps) {
  const total = data.reduce((acc, item) => acc + item.custo, 0);

  const chartData = data.map(item => ({
    name: item.tipo,
    value: item.custo,
    quantidade: item.quantidade,
    percentual: total > 0 ? ((item.custo / total) * 100).toFixed(1) : 0,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(data.value)}</p>
          <p className="text-sm text-muted-foreground">{data.quantidade} OS</p>
          <p className="text-sm font-medium">{data.percentual}% do total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[entry.name as keyof typeof COLORS] || 'hsl(var(--muted))'} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 space-y-2">
          {chartData.map((item) => {
            const Icon = ICONS[item.name as keyof typeof ICONS] || Wrench;
            const color = COLORS[item.name as keyof typeof COLORS] || 'hsl(var(--muted))';
            return (
              <div
                key={item.name}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(item.value)}</p>
                  <p className="text-xs text-muted-foreground">{item.percentual}%</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-bold">{formatCurrency(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
