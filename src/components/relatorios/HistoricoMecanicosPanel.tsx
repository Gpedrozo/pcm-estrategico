import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExecucaoRow {
  id: string;
  os_id: string | null;
  data_execucao: string | null;
  tempo_execucao: number;
  custo_mao_obra?: number | null;
  mecanico_nome?: string | null;
  mecanico_id?: string | null;
}

interface Props {
  execucoes: ExecucaoRow[];
  meses?: number;
}

interface MesData {
  mes: string;
  [mecanico: string]: number | string;
}

export function HistoricoMecanicosPanel({ execucoes, meses = 6 }: Props) {
  // Agrupamento mensal por mecânico
  const serie = useMemo((): MesData[] => {
    const result: MesData[] = [];
    for (let i = meses - 1; i >= 0; i--) {
      const ref = subMonths(new Date(), i);
      const start = startOfMonth(ref);
      const end = endOfMonth(ref);
      const label = format(start, 'MMM/yy', { locale: ptBR });

      const execDoMes = execucoes.filter((e) => {
        const d = e.data_execucao ? parseISO(e.data_execucao) : null;
        return d && d >= start && d <= end;
      });

      const entry: MesData = { mes: label };
      execDoMes.forEach((e) => {
        const nome = e.mecanico_nome || 'Desconhecido';
        entry[nome] = ((entry[nome] as number) || 0) + 1;
      });
      result.push(entry);
    }
    return result;
  }, [execucoes, meses]);

  // Mecânicos únicos
  const mecanicos = useMemo(() => {
    const set = new Set<string>();
    execucoes.forEach((e) => { if (e.mecanico_nome) set.add(e.mecanico_nome); });
    return Array.from(set).slice(0, 8); // máx 8 cores
  }, [execucoes]);

  // Comparativo por mecânico
  const comparativo = useMemo(() => {
    const map = new Map<string, { nome: string; totalOS: number; totalHoras: number; tempoMedio: number; eficiencia: number }>();
    execucoes.forEach((e) => {
      const nome = e.mecanico_nome || 'Desconhecido';
      if (!map.has(nome)) map.set(nome, { nome, totalOS: 0, totalHoras: 0, tempoMedio: 0, eficiencia: 0 });
      const entry = map.get(nome)!;
      entry.totalOS++;
      entry.totalHoras += (e.tempo_execucao || 0) / 60;
    });
    return Array.from(map.values())
      .map((m) => ({
        ...m,
        tempoMedio: m.totalOS > 0 ? Number((m.totalHoras / m.totalOS).toFixed(1)) : 0,
        eficiencia: m.totalOS > 0 ? Math.min(100, Number(((m.totalOS / (m.totalHoras || 1)) * 10).toFixed(0))) : 0,
        totalHoras: Number(m.totalHoras.toFixed(1)),
      }))
      .sort((a, b) => b.totalOS - a.totalOS)
      .slice(0, 10);
  }, [execucoes]);

  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          Histórico de Produtividade — Mecânicos
        </CardTitle>
        <CardDescription>Evolução mensal e comparativo entre técnicos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Evolução mensal */}
        {mecanicos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">OS Executadas por Mecânico / Mês</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={serie} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {mecanicos.map((nome, i) => (
                  <Bar key={nome} dataKey={nome} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === mecanicos.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Comparativo */}
        {comparativo.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Comparativo de Desempenho</p>
            <div className="space-y-2">
              {comparativo.map((m, i) => {
                const maxOS = comparativo[0].totalOS;
                const pct = maxOS > 0 ? (m.totalOS / maxOS) * 100 : 0;
                const efColor = m.eficiencia >= 80 ? 'text-green-600' : m.eficiencia >= 50 ? 'text-amber-600' : 'text-red-600';
                return (
                  <div key={m.nome} className="flex items-center gap-2">
                    <span className="text-xs w-4 text-muted-foreground">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium">{m.nome}</span>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs h-5">{m.totalOS} OS</Badge>
                          <Badge variant="outline" className="text-xs h-5">{m.totalHoras}h</Badge>
                          <Badge className={`text-xs h-5 ${efColor.replace('text-', 'bg-').replace('600', '500/10')} ${efColor}`}>{m.eficiencia}% ef.</Badge>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {comparativo.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma execução com mecânico registrado.</p>
        )}
      </CardContent>
    </Card>
  );
}
