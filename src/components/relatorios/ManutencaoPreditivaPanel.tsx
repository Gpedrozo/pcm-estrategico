import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingDown } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MedicaoRow {
  id: string;
  tag: string;
  tipo_medicao: string;
  valor: number;
  unidade: string;
  limite_alerta: number | null;
  limite_critico: number | null;
  status: string | null;
  created_at: string;
}

interface Props {
  medicoes: MedicaoRow[];
  dateFrom: string;
  dateTo: string;
}

export function ManutencaoPreditivaPanel({ medicoes, dateFrom, dateTo }: Props) {
  const filtradas = useMemo(() =>
    medicoes.filter((m) => {
      const d = m.created_at?.slice(0, 10) ?? '';
      return d >= dateFrom && d <= dateTo;
    }), [medicoes, dateFrom, dateTo]);

  // Agrupar por TAG + tipo_medicao
  const grupos = useMemo(() => {
    const map = new Map<string, MedicaoRow[]>();
    filtradas.forEach((m) => {
      const key = `${m.tag}||${m.tipo_medicao}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return Array.from(map.entries()).map(([key, items]) => {
      const [tag, tipo] = key.split('||');
      const sorted = [...items].sort((a, b) => a.created_at.localeCompare(b.created_at));
      const ultimo = sorted[sorted.length - 1];
      const limAlerta = ultimo?.limite_alerta;
      const limCrit = ultimo?.limite_critico;
      const valores = sorted.map((i) => ({
        data: format(parseISO(i.created_at), 'dd/MM', { locale: ptBR }),
        valor: Number(i.valor.toFixed(2)),
        limAlerta,
        limCrit,
      }));
      // Tendência: últimas 3 medições
      const ultimos3 = sorted.slice(-3).map((i) => i.valor);
      let tendencia: 'subindo' | 'caindo' | 'estavel' = 'estavel';
      if (ultimos3.length >= 2) {
        const diff = ultimos3[ultimos3.length - 1] - ultimos3[0];
        const pct = ultimos3[0] !== 0 ? Math.abs(diff / ultimos3[0]) * 100 : 0;
        if (pct > 5) tendencia = diff > 0 ? 'subindo' : 'caindo';
      }
      const statusAtual = ultimo?.status || 'NORMAL';
      return { tag, tipo, unidade: ultimo?.unidade || '', valores, limAlerta, limCrit, tendencia, statusAtual, ultimo };
    });
  }, [filtradas]);

  const criticos = grupos.filter((g) => g.statusAtual === 'CRITICO' || g.statusAtual === 'ALERTA').length;
  const _emAlerta = grupos.filter((g) => g.statusAtual === 'ALERTA').length;

  if (grupos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Manutenção Preditiva
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma medição preditiva registrada no período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          Manutenção Preditiva — Tendência de Degradação
        </CardTitle>
        <CardDescription>Evolução das medições com limites de alerta e crítico</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-primary">{grupos.length}</p>
            <p className="text-xs text-muted-foreground">Pontos Monitorados</p>
          </div>
          <div className={`rounded-lg border p-3 text-center ${criticos > 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-muted/30'}`}>
            <p className={`text-xl font-bold ${criticos > 0 ? 'text-red-600' : 'text-green-600'}`}>{criticos}</p>
            <p className="text-xs text-muted-foreground">Em Alerta/Crítico</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-amber-600">{grupos.filter((g) => g.tendencia === 'subindo').length}</p>
            <p className="text-xs text-muted-foreground">Tendência ↑</p>
          </div>
        </div>

        {/* Gráficos por grupo (máx 6) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {grupos.slice(0, 6).map((g) => {
            const statusColor = g.statusAtual === 'CRITICO' ? '#ef4444' : g.statusAtual === 'ALERTA' ? '#f59e0b' : '#22c55e';
            return (
              <div key={`${g.tag}-${g.tipo}`} className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-medium">{g.tag}</p>
                    <p className="text-xs text-muted-foreground">{g.tipo}</p>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    {g.tendencia !== 'estavel' && (
                      <TrendingDown className={`h-3.5 w-3.5 ${g.tendencia === 'subindo' ? 'text-red-500 rotate-180' : 'text-green-500'}`} />
                    )}
                    <Badge className="text-xs h-5" style={{ backgroundColor: statusColor + '20', color: statusColor }}>
                      {g.statusAtual}
                    </Badge>
                  </div>
                </div>
                {g.valores.length > 1 ? (
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={g.valores} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="data" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v: number) => `${v} ${g.unidade}`} />
                      <Line type="monotone" dataKey="valor" name={g.tipo} stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                      {g.limAlerta != null && <ReferenceLine y={g.limAlerta} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Alerta', fontSize: 9, fill: '#f59e0b' }} />}
                      {g.limCrit != null && <ReferenceLine y={g.limCrit} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Crítico', fontSize: 9, fill: '#ef4444' }} />}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-3">Apenas {g.valores.length} medição — insuficiente para tendência.</p>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  Último: <span className="font-medium">{g.ultimo?.valor} {g.unidade}</span>
                  {g.limAlerta != null && <span> | Alerta: {g.limAlerta}</span>}
                  {g.limCrit != null && <span> | Crítico: {g.limCrit}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {grupos.length > 6 && (
          <p className="text-xs text-muted-foreground text-center">+ {grupos.length - 6} pontos não exibidos. Filtre por tag para detalhar.</p>
        )}
      </CardContent>
    </Card>
  );
}
