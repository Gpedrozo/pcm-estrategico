import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PauseCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

interface OSRow {
  id: string;
  tag: string;
  equipamento: string;
  tipo: string;
  status: string;
  data_solicitacao: string | null;
  data_conclusao: string | null;
  problema?: string | null;
}

interface Props {
  ordensServico: OSRow[];
  dateFrom: string;
  dateTo: string;
}

const MOTIVO_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#22c55e', '#6b7280'];

function calcDuracao(os: OSRow): number {
  if (!os.data_solicitacao || !os.data_conclusao) return 0;
  const start = new Date(os.data_solicitacao).getTime();
  const end = new Date(os.data_conclusao).getTime();
  return Math.max((end - start) / (1000 * 60 * 60), 0);
}

export function AnaliseParadasPanel({ ordensServico, dateFrom, dateTo }: Props) {
  const osFiltered = useMemo(() =>
    ordensServico.filter((o) => {
      const d = o.data_solicitacao?.slice(0, 10) ?? '';
      return d >= dateFrom && d <= dateTo;
    }), [ordensServico, dateFrom, dateTo]);

  const corretivas = useMemo(() => osFiltered.filter((o) => o.tipo === 'CORRETIVA'), [osFiltered]);

  // Horas paradas por equipamento
  const paradasPorEquip = useMemo(() => {
    const map = new Map<string, { tag: string; equip: string; horas: number; ocorrencias: number }>();
    corretivas.forEach((os) => {
      const dur = calcDuracao(os);
      if (!map.has(os.tag)) map.set(os.tag, { tag: os.tag, equip: os.equipamento, horas: 0, ocorrencias: 0 });
      const e = map.get(os.tag)!;
      e.horas += dur;
      e.ocorrencias++;
    });
    return Array.from(map.values())
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 10)
      .map((e) => ({ ...e, horas: Number(e.horas.toFixed(1)) }));
  }, [corretivas]);

  // Pareto de motivos (usando keywords do campo problema)
  const paretoCausas = useMemo(() => {
    const freq: Record<string, number> = {};
    corretivas.forEach((os) => {
      const prob = (os.problema || '').toLowerCase();
      let encontrou = false;
      if (prob.includes('elétr') || prob.includes('eletric')) { freq['Falha elétrica'] = (freq['Falha elétrica'] || 0) + 1; encontrou = true; }
      if (prob.includes('mecâni') || prob.includes('mecani') || prob.includes('quebr')) { freq['Falha mecânica'] = (freq['Falha mecânica'] || 0) + 1; encontrou = true; }
      if (prob.includes('desgast') || prob.includes('gast')) { freq['Desgaste'] = (freq['Desgaste'] || 0) + 1; encontrou = true; }
      if (prob.includes('lubri')) { freq['Falta de lubrificação'] = (freq['Falta de lubrificação'] || 0) + 1; encontrou = true; }
      if (prob.includes('operad') || prob.includes('operac')) { freq['Operação incorreta'] = (freq['Operação incorreta'] || 0) + 1; encontrou = true; }
      if (!encontrou) freq['Outro'] = (freq['Outro'] || 0) + 1;
    });
    return Object.entries(freq)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [corretivas]);

  const totalHorasParadas = useMemo(() => paradasPorEquip.reduce((s, e) => s + e.horas, 0), [paradasPorEquip]);
  const totalOcorrencias = corretivas.length;
  const tmParada = totalOcorrencias > 0 ? (totalHorasParadas / totalOcorrencias) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PauseCircle className="h-4 w-4 text-primary" />
          Análise de Paradas
        </CardTitle>
        <CardDescription>Horas paradas por equipamento, frequência e Pareto de causas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Totais */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-red-600">{totalHorasParadas.toFixed(0)}h</p>
            <p className="text-xs text-muted-foreground">Total Horas Paradas</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-amber-600">{totalOcorrencias}</p>
            <p className="text-xs text-muted-foreground">Ocorrências</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{tmParada.toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground">Tempo Médio/Parada</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top equipamentos por horas */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Horas Paradas por Equipamento</p>
            {paradasPorEquip.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={paradasPorEquip.slice(0, 7)} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" tick={{ fontSize: 10 }} unit="h" />
                  <YAxis type="category" dataKey="tag" tick={{ fontSize: 10 }} width={60} />
                  <Tooltip formatter={(v: number) => `${v}h`} />
                  <Bar dataKey="horas" name="Horas Paradas" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Sem corretivas no período.</p>
            )}
          </div>

          {/* Pareto causas */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Pareto de Causas de Falha</p>
            {paretoCausas.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={paretoCausas} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {paretoCausas.map((_, i) => <Cell key={i} fill={MOTIVO_COLORS[i % MOTIVO_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Sem dados de causa.</p>
            )}
          </div>
        </div>

        {/* Lista top paradas */}
        {paradasPorEquip.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Detalhamento por Equipamento</p>
            <div className="space-y-2">
              {paradasPorEquip.slice(0, 5).map((e, i) => {
                const pct = totalHorasParadas > 0 ? (e.horas / totalHorasParadas) * 100 : 0;
                return (
                  <div key={e.tag} className="flex items-center gap-2">
                    <span className="text-xs w-4 text-muted-foreground font-medium">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium">{e.tag} — {e.equip}</span>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs h-5">{e.ocorrencias} OS</Badge>
                          <Badge className="text-xs h-5 bg-red-500/10 text-red-600">{e.horas}h</Badge>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-red-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
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
