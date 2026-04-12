import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HardHat, AlertTriangle, CheckCircle } from 'lucide-react';
import { differenceInDays, parseISO, format, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface TreinamentoRow {
  id: string;
  colaborador_nome: string;
  tipo_curso: string;
  nome_curso: string;
  data_realizacao: string;
  data_validade: string | null;
  status: 'VALIDO' | 'PROXIMO_VENCIMENTO' | 'VENCIDO';
  carga_horaria: number | null;
}

interface Props {
  treinamentos: TreinamentoRow[];
}

const STATUS_COLORS: Record<string, string> = {
  VALIDO: '#22c55e',
  PROXIMO_VENCIMENTO: '#f59e0b',
  VENCIDO: '#ef4444',
};
const STATUS_LABELS: Record<string, string> = {
  VALIDO: 'Válido',
  PROXIMO_VENCIMENTO: 'Vencendo',
  VENCIDO: 'Vencido',
};

export function SSMAConformidadePanel({ treinamentos }: Props) {
  const hoje = new Date();

  const enriquecidos = useMemo(() => treinamentos.map((t) => {
    const diasVencimento = t.data_validade
      ? differenceInDays(parseISO(t.data_validade), hoje)
      : null;
    return { ...t, diasVencimento };
  }), [treinamentos]);

  const validos = enriquecidos.filter((t) => t.status === 'VALIDO').length;
  const proxVenc = enriquecidos.filter((t) => t.status === 'PROXIMO_VENCIMENTO').length;
  const vencidos = enriquecidos.filter((t) => t.status === 'VENCIDO').length;
  const pctCompliance = treinamentos.length > 0
    ? (((validos + proxVenc) / treinamentos.length) * 100).toFixed(0)
    : '100';

  // Por tipo de curso
  const porTipo = useMemo(() => {
    const map: Record<string, number> = {};
    treinamentos.forEach((t) => { map[t.tipo_curso] = (map[t.tipo_curso] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [treinamentos]);

  // Vencendo em breve (30 dias)
  const vencendoEm30 = enriquecidos.filter((t) => t.diasVencimento !== null && t.diasVencimento >= 0 && t.diasVencimento <= 30);

  // Por colaborador — mais vencidos
  const porColab = useMemo(() => {
    const map = new Map<string, { nome: string; vencidos: number; total: number }>();
    treinamentos.forEach((t) => {
      if (!map.has(t.colaborador_nome)) map.set(t.colaborador_nome, { nome: t.colaborador_nome, vencidos: 0, total: 0 });
      const e = map.get(t.colaborador_nome)!;
      e.total++;
      if (t.status === 'VENCIDO') e.vencidos++;
    });
    return Array.from(map.values()).filter((c) => c.vencidos > 0).sort((a, b) => b.vencidos - a.vencidos).slice(0, 8);
  }, [treinamentos]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HardHat className="h-4 w-4 text-primary" />
          SSMA — Conformidade de Treinamentos
        </CardTitle>
        <CardDescription>Status dos certificados, vencimentos e NRs por colaborador</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-primary">{treinamentos.length}</p>
            <p className="text-xs text-muted-foreground">Total Treinamentos</p>
          </div>
          <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-3 text-center">
            <CheckCircle className="h-4 w-4 text-green-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-green-600">{pctCompliance}%</p>
            <p className="text-xs text-muted-foreground">Compliance</p>
          </div>
          <div className={`rounded-lg border p-3 text-center ${proxVenc > 0 ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-muted/30'}`}>
            <p className={`text-xl font-bold ${proxVenc > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>{proxVenc}</p>
            <p className="text-xs text-muted-foreground">Vencendo em Breve</p>
          </div>
          <div className={`rounded-lg border p-3 text-center ${vencidos > 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-muted/30'}`}>
            <p className={`text-xl font-bold ${vencidos > 0 ? 'text-red-600' : 'text-green-600'}`}>{vencidos}</p>
            <p className="text-xs text-muted-foreground">Vencidos</p>
          </div>
        </div>

        {treinamentos.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por tipo */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Treinamentos por Tipo/NR</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={porTipo} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="value" name="Quantidade" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Status summary */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Distribuição por Status</p>
              <div className="space-y-3 mt-3">
                {([
                  { status: 'VALIDO', count: validos },
                  { status: 'PROXIMO_VENCIMENTO', count: proxVenc },
                  { status: 'VENCIDO', count: vencidos },
                ] as const).map(({ status, count }) => {
                  const pct = treinamentos.length > 0 ? (count / treinamentos.length) * 100 : 0;
                  const cor = STATUS_COLORS[status];
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium">{STATUS_LABELS[status]}</span>
                        <span className="font-bold" style={{ color: cor }}>{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cor }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Por colaborador com vencidos */}
              {porColab.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Colaboradores com Vencimentos</p>
                  <div className="space-y-1">
                    {porColab.map((c) => (
                      <div key={c.nome} className="flex items-center justify-between text-xs">
                        <span className="truncate">{c.nome}</span>
                        <div className="flex gap-1.5 shrink-0 ml-2">
                          <Badge className="h-4 px-1.5 text-xs bg-red-500/10 text-red-600">{c.vencidos} venc.</Badge>
                          <span className="text-muted-foreground">{c.total} total</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Alertas 30 dias */}
        {vencendoEm30.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Vencendo em 30 Dias ({vencendoEm30.length})
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {vencendoEm30.sort((a, b) => (a.diasVencimento ?? 0) - (b.diasVencimento ?? 0)).map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded border px-3 py-1.5 bg-amber-50/50 dark:bg-amber-950/10">
                  <div>
                    <p className="text-xs font-medium">{t.colaborador_nome}</p>
                    <p className="text-xs text-muted-foreground">{t.nome_curso} ({t.tipo_curso})</p>
                  </div>
                  <Badge className="text-xs bg-amber-500/10 text-amber-600 shrink-0 ml-2">
                    {t.diasVencimento}d
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {treinamentos.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum treinamento cadastrado.</p>
        )}
      </CardContent>
    </Card>
  );
}
