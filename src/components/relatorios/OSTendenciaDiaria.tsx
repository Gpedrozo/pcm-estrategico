import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';

interface OSDiario {
  data: string;
  abertas: number;
  fechadas: number;
  corretivas: number;
  preventivas: number;
}

interface OSTendenciaDiariaProps {
  dados: OSDiario[];
}

export function OSTendenciaDiaria({ dados }: OSTendenciaDiariaProps) {
  if (dados.length === 0) return null;

  const formattedData = dados.map(d => ({
    ...d,
    label: format(parseISO(d.data), 'dd/MM'),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Tendência Diária — Últimos 30 dias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(label) => `Data: ${label}`}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    abertas: 'Abertas',
                    fechadas: 'Fechadas',
                    corretivas: 'Corretivas',
                    preventivas: 'Preventivas',
                  };
                  return [value, labels[name] || name];
                }}
              />
              <Legend
                formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    abertas: 'Abertas',
                    fechadas: 'Fechadas',
                    corretivas: 'Corretivas',
                    preventivas: 'Preventivas',
                  };
                  return labels[value] || value;
                }}
              />
              <Line type="monotone" dataKey="abertas" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="fechadas" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="corretivas" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
              <Line type="monotone" dataKey="preventivas" stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
