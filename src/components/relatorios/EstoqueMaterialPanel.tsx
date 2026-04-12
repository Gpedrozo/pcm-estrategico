import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, TrendingDown } from 'lucide-react';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface MaterialRow {
  id: string;
  codigo: string;
  nome: string;
  unidade: string;
  custo_unitario: number;
  estoque_atual: number;
  estoque_minimo: number;
  ativo: boolean;
}

interface MovRow {
  material_id: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  quantidade: number;
  custo_total: number | null;
  created_at: string;
}

interface Props {
  materiais: MaterialRow[];
  movimentacoes: MovRow[];
  dateFrom: string;
  dateTo: string;
}

const CURVA_COLORS: Record<string, string> = { A: '#ef4444', B: '#f59e0b', C: '#22c55e' };

export function EstoqueMaterialPanel({ materiais, movimentacoes, dateFrom, dateTo }: Props) {
  const movFiltradas = useMemo(() =>
    movimentacoes.filter((m) => {
      const d = m.created_at?.slice(0, 10) ?? '';
      return d >= dateFrom && d <= dateTo;
    }), [movimentacoes, dateFrom, dateTo]);

  // Giro por material
  const giro = useMemo(() => {
    const map = new Map<string, number>();
    movFiltradas.filter((m) => m.tipo === 'SAIDA').forEach((m) => {
      map.set(m.material_id, (map.get(m.material_id) || 0) + m.quantidade);
    });
    return map;
  }, [movFiltradas]);

  // Curva ABC
  const curvaABC = useMemo(() => {
    const items = materiais
      .filter((m) => m.ativo)
      .map((m) => ({
        ...m,
        consumo: giro.get(m.id) || 0,
        valorConsumo: (giro.get(m.id) || 0) * m.custo_unitario,
      }))
      .sort((a, b) => b.valorConsumo - a.valorConsumo);

    const totalValor = items.reduce((s, i) => s + i.valorConsumo, 0);
    let acum = 0;
    return items.slice(0, 20).map((item) => {
      acum += item.valorConsumo;
      const pct = totalValor > 0 ? (acum / totalValor) * 100 : 0;
      const curva = pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C';
      return { ...item, pctAcum: Number(pct.toFixed(1)), curva };
    });
  }, [materiais, giro]);

  // Abaixo do mínimo
  const abaixoMinimo = useMemo(() =>
    materiais.filter((m) => m.ativo && m.estoque_atual <= m.estoque_minimo)
      .sort((a, b) => (a.estoque_atual / Math.max(a.estoque_minimo, 1)) - (b.estoque_atual / Math.max(b.estoque_minimo, 1)))
      .slice(0, 10),
    [materiais]);

  // Totais
  const totalItens = materiais.filter((m) => m.ativo).length;
  const totalCriticos = abaixoMinimo.length;
  const valorEstoqueTotal = materiais.filter((m) => m.ativo).reduce((s, m) => s + m.estoque_atual * m.custo_unitario, 0);

  // Distribuição por curva
  const distCurva = useMemo(() => {
    const freq: Record<string, number> = { A: 0, B: 0, C: 0 };
    curvaABC.forEach((i) => { freq[i.curva] = (freq[i.curva] || 0) + 1; });
    return Object.entries(freq).map(([name, value]) => ({ name: `Curva ${name}`, value }));
  }, [curvaABC]);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4 text-primary" />
          Análise de Estoque & Materiais
        </CardTitle>
        <CardDescription>Curva ABC, giro de estoque e itens críticos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-primary">{totalItens}</p>
            <p className="text-xs text-muted-foreground">Itens Ativos</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className={`text-xl font-bold ${totalCriticos > 0 ? 'text-red-600' : 'text-green-600'}`}>{totalCriticos}</p>
            <p className="text-xs text-muted-foreground">Abaixo do Mínimo</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-amber-600">{fmt(valorEstoqueTotal)}</p>
            <p className="text-xs text-muted-foreground">Valor em Estoque</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Curva ABC */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Distribuição Curva ABC (por consumo)</p>
            {distCurva.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={distCurva} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                    label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {distCurva.map((entry) => (
                      <Cell key={entry.name} fill={CURVA_COLORS[entry.name.split(' ')[1]] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Sem movimentação no período.</p>
            )}
          </div>

          {/* Top 10 por consumo */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Top 10 Materiais por Consumo</p>
            <div className="space-y-1">
              {curvaABC.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Badge className="text-xs px-1 h-5 min-w-[26px] justify-center" style={{ backgroundColor: CURVA_COLORS[item.curva] + '20', color: CURVA_COLORS[item.curva] }}>
                    {item.curva}
                  </Badge>
                  <span className="text-xs flex-1 truncate">{item.nome}</span>
                  <Badge variant="outline" className="text-xs h-5 shrink-0">{item.consumo} {item.unidade}</Badge>
                </div>
              ))}
              {curvaABC.length === 0 && <p className="text-xs text-muted-foreground py-2">Sem saídas registradas.</p>}
            </div>
          </div>
        </div>

        {/* Itens críticos */}
        {abaixoMinimo.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              Itens Abaixo do Estoque Mínimo ({abaixoMinimo.length})
            </p>
            <div className="space-y-2">
              {abaixoMinimo.slice(0, 6).map((m) => {
                const pct = m.estoque_minimo > 0 ? (m.estoque_atual / m.estoque_minimo) * 100 : 0;
                const cor = pct === 0 ? 'text-red-600' : pct < 50 ? 'text-amber-600' : 'text-yellow-500';
                return (
                  <div key={m.id} className="flex items-center justify-between rounded border px-3 py-2 bg-red-50/50 dark:bg-red-950/10">
                    <div>
                      <p className="text-xs font-medium">{m.nome}</p>
                      <p className="text-xs text-muted-foreground">{m.codigo}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${cor}`}>{m.estoque_atual} {m.unidade}</p>
                      <p className="text-xs text-muted-foreground">mín: {m.estoque_minimo}</p>
                    </div>
                    <TrendingDown className="h-4 w-4 text-red-500 ml-2" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
