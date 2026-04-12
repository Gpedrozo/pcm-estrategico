import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

interface ExecucaoRow {
  os_id: string | null;
  data_execucao: string | null;
  custo_mao_obra: number | null;
  custo_materiais: number | null;
  custo_terceiros: number | null;
  mecanico_nome?: string | null;
}

interface OSRow {
  id: string;
  tag: string;
  equipamento: string;
  tipo: string;
  data_solicitacao: string | null;
  data_conclusao: string | null;
}

interface MaterialMovRow {
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  custo_total: number | null;
  created_at: string;
}

interface Props {
  execucoes: ExecucaoRow[];
  ordensServico: OSRow[];
  movimentacoes?: MaterialMovRow[];
  dateFrom: string;
  dateTo: string;
}

const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#22c55e'];

export function CustosDetalhadosPanel({ execucoes, ordensServico, movimentacoes: _movimentacoes = [], dateFrom, dateTo }: Props) {
  const execFiltered = useMemo(() =>
    execucoes.filter((e) => {
      const d = e.data_execucao?.slice(0, 10) ?? '';
      return d >= dateFrom && d <= dateTo;
    }), [execucoes, dateFrom, dateTo]);

  const totais = useMemo(() => {
    const maoObra = execFiltered.reduce((s, e) => s + (Number(e.custo_mao_obra) || 0), 0);
    const materiais = execFiltered.reduce((s, e) => s + (Number(e.custo_materiais) || 0), 0);
    const terceiros = execFiltered.reduce((s, e) => s + (Number(e.custo_terceiros) || 0), 0);
    const total = maoObra + materiais + terceiros;
    return { maoObra, materiais, terceiros, total };
  }, [execFiltered]);

  const pieData = useMemo(() => [
    { name: 'Mão de Obra', value: totais.maoObra },
    { name: 'Materiais', value: totais.materiais },
    { name: 'Terceiros', value: totais.terceiros },
  ].filter((d) => d.value > 0), [totais]);

  // Top 10 equipamentos por custo
  const topEquip = useMemo(() => {
    const map = new Map<string, { tag: string; equip: string; custo: number; tipo: Record<string, number> }>();

    execFiltered.forEach((exec) => {
      const os = ordensServico.find((o) => o.id === exec.os_id);
      if (!os) return;
      const key = os.tag;
      const custo = (Number(exec.custo_mao_obra) || 0) + (Number(exec.custo_materiais) || 0) + (Number(exec.custo_terceiros) || 0);
      if (!map.has(key)) map.set(key, { tag: os.tag, equip: os.equipamento, custo: 0, tipo: {} });
      const entry = map.get(key)!;
      entry.custo += custo;
      entry.tipo[os.tipo] = (entry.tipo[os.tipo] || 0) + 1;
    });

    return Array.from(map.values())
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 10)
      .map((e) => ({ ...e, custo: Number(e.custo.toFixed(2)) }));
  }, [execFiltered, ordensServico]);

  // Custo por tipo de OS
  const custoPorTipo = useMemo(() => {
    const map: Record<string, number> = {};
    execFiltered.forEach((exec) => {
      const os = ordensServico.find((o) => o.id === exec.os_id);
      if (!os) return;
      const custo = (Number(exec.custo_mao_obra) || 0) + (Number(exec.custo_materiais) || 0) + (Number(exec.custo_terceiros) || 0);
      map[os.tipo] = (map[os.tipo] || 0) + custo;
    });
    return Object.entries(map).map(([tipo, custo]) => ({ tipo, custo: Number(custo.toFixed(2)) }));
  }, [execFiltered, ordensServico]);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4 text-primary" />
          Custos Detalhados de Manutenção
        </CardTitle>
        <CardDescription>Breakdown de custos por categoria, equipamento e tipo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Totais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Geral', value: totais.total, color: 'text-primary' },
            { label: 'Mão de Obra', value: totais.maoObra, color: 'text-blue-600' },
            { label: 'Materiais', value: totais.materiais, color: 'text-amber-600' },
            { label: 'Terceiros', value: totais.terceiros, color: 'text-red-600' },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className={`text-lg font-bold ${item.color}`}>{fmt(item.value)}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pizza composição */}
          {pieData.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Composição de Custos</p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Custo por tipo */}
          {custoPorTipo.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Custo por Tipo de OS</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={custoPorTipo} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="tipo" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="custo" name="Custo" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top 10 equipamentos */}
        {topEquip.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Top 10 Equipamentos por Custo</p>
            <div className="space-y-2">
              {topEquip.map((e, i) => {
                const pct = totais.total > 0 ? (e.custo / totais.total) * 100 : 0;
                return (
                  <div key={e.tag} className="flex items-center gap-2">
                    <span className="text-xs w-4 text-muted-foreground font-medium">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium">{e.tag}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                          <Badge variant="outline" className="text-xs h-5 px-1.5">{fmt(e.custo)}</Badge>
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

        {topEquip.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Sem dados de custo para o período selecionado.</p>
        )}
      </CardContent>
    </Card>
  );
}
