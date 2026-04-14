import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Droplets } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

interface PlanoLubrificacao {
  id: string;
  nome?: string | null;
  lubrificante?: string | null;
  ativo?: boolean;
}

interface ExecLubrificacao {
  id: string;
  plano_id?: string | null;
  data_execucao?: string | null;
  status?: string | null;
  responsavel_nome?: string | null;
}

interface EstoqueRow {
  id: string;
  nome: string;
  unidade_medida?: string;
  estoque_atual?: number;
  estoque_minimo?: number;
}

interface MovLubrificante {
  lubrificante_id?: string | null;
  tipo?: 'ENTRADA' | 'SAIDA' | 'AJUSTE' | null;
  quantidade?: number;
  created_at?: string;
}

interface Props {
  planos: PlanoLubrificacao[];
  execucoes: ExecLubrificacao[];
  estoque: EstoqueRow[];
  movimentacoes: MovLubrificante[];
  dateFrom: string;
  dateTo: string;
}

const STATUS_COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#6b7280'];

export function LubrificacaoRelatorioPanel({ planos, execucoes, estoque, movimentacoes, dateFrom, dateTo }: Props) {
  const execFiltradas = useMemo(() =>
    execucoes.filter((e) => {
      const d = (e.data_execucao ?? '').slice(0, 10);
      return d >= dateFrom && d <= dateTo;
    }), [execucoes, dateFrom, dateTo]);

  // Aderência por plano
  const aderencia = useMemo(() => {
    const totalPlanos = planos.filter((p) => p.ativo !== false).length;
    const executados = new Set(execFiltradas.filter((e) => e.status === 'CONCLUIDO').map((e) => e.plano_id));
    const atrasados = new Set(execFiltradas.filter((e) => e.status === 'ATRASADO').map((e) => e.plano_id));
    const naoExec = totalPlanos - executados.size;

    return {
      totalPlanos,
      executados: executados.size,
      atrasados: atrasados.size,
      naoExecutados: Math.max(naoExec, 0),
      pct: totalPlanos > 0 ? ((executados.size / totalPlanos) * 100).toFixed(1) : '0',
    };
  }, [planos, execFiltradas]);

  // Consumo por lubrificante
  const consumo = useMemo(() => {
    const movFiltradas = movimentacoes.filter((m) => {
      const d = (m.created_at ?? '').slice(0, 10);
      return d >= dateFrom && d <= dateTo && m.tipo === 'SAIDA';
    });
    const map = new Map<string, { nome: string; consumo: number }>();
    movFiltradas.forEach((m) => {
      const estItem = estoque.find((e) => e.id === m.lubrificante_id);
      const nome = estItem?.nome || m.lubrificante_id || 'Desconhecido';
      if (!map.has(nome)) map.set(nome, { nome, consumo: 0 });
      map.get(nome)!.consumo += m.quantidade || 0;
    });
    return Array.from(map.values()).sort((a, b) => b.consumo - a.consumo).slice(0, 8);
  }, [movimentacoes, estoque, dateFrom, dateTo]);

  // Estoque baixo
  const estoqueBaixo = useMemo(() =>
    estoque.filter((e) => (e.estoque_atual ?? 0) <= (e.estoque_minimo ?? 0)),
    [estoque]);

  const pieData = [
    { name: 'Executados', value: aderencia.executados },
    { name: 'Atrasados', value: aderencia.atrasados },
    { name: 'Não executados', value: aderencia.naoExecutados },
  ].filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Droplets className="h-4 w-4 text-primary" />
          Lubrificação — Aderência & Consumo
        </CardTitle>
        <CardDescription>Execução de rotas, consumo de lubrificantes e estoque</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-primary">{aderencia.totalPlanos}</p>
            <p className="text-xs text-muted-foreground">Planos Ativos</p>
          </div>
          <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-3 text-center">
            <p className="text-xl font-bold text-green-600">{aderencia.pct}%</p>
            <p className="text-xs text-muted-foreground">Aderência</p>
          </div>
          <div className={`rounded-lg border p-3 text-center ${aderencia.atrasados > 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-muted/30'}`}>
            <p className={`text-xl font-bold ${aderencia.atrasados > 0 ? 'text-red-600' : 'text-green-600'}`}>{aderencia.atrasados}</p>
            <p className="text-xs text-muted-foreground">Atrasados</p>
          </div>
          <div className={`rounded-lg border p-3 text-center ${estoqueBaixo.length > 0 ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-muted/30'}`}>
            <p className={`text-xl font-bold ${estoqueBaixo.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>{estoqueBaixo.length}</p>
            <p className="text-xs text-muted-foreground">Estoque Baixo</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pizza aderência */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Status de Execução dos Planos</p>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ _name, percent }: { _name: string; percent: number }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Sem execuções no período.</p>
            )}
          </div>

          {/* Consumo lubrificantes */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Consumo por Lubrificante (período)</p>
            {consumo.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={consumo} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={70}
                    tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + '…' : v} />
                  <Tooltip />
                  <Bar dataKey="consumo" name="Consumo" fill="#60a5fa" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Sem movimentação de lubrificantes.</p>
            )}
          </div>
        </div>

        {/* Estoque baixo */}
        {estoqueBaixo.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Lubrificantes com Estoque Baixo</p>
            <div className="flex flex-wrap gap-2">
              {estoqueBaixo.map((e) => (
                <div key={e.id} className="rounded border px-3 py-1.5 bg-amber-50 dark:bg-amber-950/20 text-xs">
                  <span className="font-medium">{e.nome}</span>
                  <span className="text-muted-foreground ml-1">{e.estoque_atual ?? 0}/{e.estoque_minimo ?? 0} {e.unidade_medida}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
