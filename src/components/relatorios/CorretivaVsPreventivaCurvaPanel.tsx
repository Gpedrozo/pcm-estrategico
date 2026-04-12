import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OSRow {
  id: string;
  tipo: string;
  status: string;
  data_solicitacao: string | null;
  data_conclusao: string | null;
}

interface ExecucaoRow {
  custo_mao_obra: number | null;
  custo_materiais: number | null;
  custo_terceiros: number | null;
  data_execucao: string | null;
  os_id: string | null;
}

interface Props {
  ordensServico: OSRow[];
  execucoes: ExecucaoRow[];
  meses?: number;
}

const TIPO_COLORS: Record<string, string> = {
  CORRETIVA: '#ef4444',
  PREVENTIVA: '#22c55e',
  PREDITIVA: '#3b82f6',
  INSPECAO: '#8b5cf6',
  MELHORIA: '#f59e0b',
};

export function CorretivaVsPreventivaCurvaPanel({ ordensServico, execucoes, meses = 12 }: Props) {
  const serie = useMemo(() => {
    const result = [];
    for (let i = meses - 1; i >= 0; i--) {
      const ref = subMonths(new Date(), i);
      const start = startOfMonth(ref);
      const end = endOfMonth(ref);
      const label = format(start, 'MMM/yy', { locale: ptBR });

      const osDoMes = ordensServico.filter((o) => {
        const d = o.data_solicitacao ? parseISO(o.data_solicitacao) : null;
        return d && d >= start && d <= end;
      });

      const execDoMes = execucoes.filter((e) => {
        const d = e.data_execucao ? parseISO(e.data_execucao) : null;
        return d && d >= start && d <= end;
      });

      const corretivas = osDoMes.filter((o) => o.tipo === 'CORRETIVA').length;
      const preventivas = osDoMes.filter((o) => o.tipo === 'PREVENTIVA').length;
      const preditivas = osDoMes.filter((o) => o.tipo === 'PREDITIVA').length;
      const total = osDoMes.length;
      const pctCorretiva = total > 0 ? Number(((corretivas / total) * 100).toFixed(0)) : 0;
      const pctPreventiva = total > 0 ? Number(((preventivas / total) * 100).toFixed(0)) : 0;

      const custoCorretiva = execDoMes
        .filter((e) => {
          const os = ordensServico.find((o) => o.id === e.os_id);
          return os?.tipo === 'CORRETIVA';
        })
        .reduce((s, e) => s + (Number(e.custo_mao_obra) || 0) + (Number(e.custo_materiais) || 0) + (Number(e.custo_terceiros) || 0), 0);

      const custoPreventiva = execDoMes
        .filter((e) => {
          const os = ordensServico.find((o) => o.id === e.os_id);
          return os?.tipo === 'PREVENTIVA';
        })
        .reduce((s, e) => s + (Number(e.custo_mao_obra) || 0) + (Number(e.custo_materiais) || 0) + (Number(e.custo_terceiros) || 0), 0);

      result.push({ mes: label, corretivas, preventivas, preditivas, pctCorretiva, pctPreventiva, custoCorretiva: Number(custoCorretiva.toFixed(0)), custoPreventiva: Number(custoPreventiva.toFixed(0)), total });
    }
    return result;
  }, [ordensServico, execucoes, meses]);

  // Totais do período
  const totais = useMemo(() => {
    const map: Record<string, number> = {};
    ordensServico.forEach((o) => { map[o.tipo] = (map[o.tipo] || 0) + 1; });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map).map(([tipo, qtd]) => ({
      tipo,
      qtd,
      pct: total > 0 ? ((qtd / total) * 100).toFixed(1) : '0',
    }));
  }, [ordensServico]);

  // Tendência corretiva: últimos 3 meses vs primeiros 3
  const tendCorretiva = useMemo(() => {
    if (serie.length < 6) return 'estavel';
    const init = serie.slice(0, 3).reduce((s, m) => s + m.pctCorretiva, 0) / 3;
    const fim = serie.slice(-3).reduce((s, m) => s + m.pctCorretiva, 0) / 3;
    if (fim - init > 3) return 'subindo';
    if (init - fim > 3) return 'caindo';
    return 'estavel';
  }, [serie]);

  const tendIcon = tendCorretiva === 'subindo'
    ? <TrendingUp className="h-4 w-4 text-red-500" />
    : tendCorretiva === 'caindo'
    ? <TrendingDown className="h-4 w-4 text-green-500" />
    : <Minus className="h-4 w-4 text-gray-400" />;

  const tendLabel = tendCorretiva === 'subindo'
    ? 'Corretiva subindo — atenção!'
    : tendCorretiva === 'caindo'
    ? 'Corretiva reduzindo — bom sinal!'
    : 'Mix estável';

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" />
          Corretiva vs Preventiva — Curva & Mix
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          Evolução mensal do mix de manutenção e custo comparativo
          <div className="flex items-center gap-1">
            {tendIcon}
            <span className="text-xs">{tendLabel}</span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pizza distribuição geral */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Mix Total por Tipo</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={totais} dataKey="qtd" nameKey="tipo" cx="50%" cy="50%" outerRadius={70}
                  label={({ tipo, pct }) => `${tipo.slice(0, 4)} ${pct}%`} labelLine={false}>
                  {totais.map((d) => <Cell key={d.tipo} fill={TIPO_COLORS[d.tipo] || '#6b7280'} />)}
                </Pie>
                <Tooltip formatter={(v: number, name: string) => [v, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* % Evolução mensal */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Evolução do Mix % Corretiva/Preventiva</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={serie} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="pctCorretiva" name="% Corretiva" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="pctPreventiva" name="% Preventiva" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Volume mensal empilhado */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Volume Mensal por Tipo</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={serie} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="corretivas" name="Corretiva" stackId="a" fill="#ef4444" />
              <Bar dataKey="preventivas" name="Preventiva" stackId="a" fill="#22c55e" />
              <Bar dataKey="preditivas" name="Preditiva" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Custo comparativo */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Custo Corretiva vs Preventiva (R$)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={serie.slice(-6)} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="custoCorretiva" name="Custo Corretiva" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="custoPreventiva" name="Custo Preventiva" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
