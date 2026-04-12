import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';

interface FMEARow {
  id: string;
  tag: string;
  modo_falha: string;
  causa_falha: string | null;
  efeito_falha: string | null;
  severidade: number;
  ocorrencia: number;
  deteccao: number;
  rpn: number;
  acao_recomendada: string | null;
  responsavel: string | null;
  prazo: string | null;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';
}

interface Props {
  fmeas: FMEARow[];
}

function getRPNColor(rpn: number): string {
  if (rpn >= 200) return '#ef4444';
  if (rpn >= 100) return '#f59e0b';
  if (rpn >= 50) return '#3b82f6';
  return '#22c55e';
}

function getRPNLabel(rpn: number): string {
  if (rpn >= 200) return 'Crítico';
  if (rpn >= 100) return 'Alto';
  if (rpn >= 50) return 'Médio';
  return 'Baixo';
}

export function FMEAMatrizRiscoPanel({ fmeas }: Props) {
  // Top 15 por RPN
  const topRPN = useMemo(() =>
    [...fmeas].sort((a, b) => b.rpn - a.rpn).slice(0, 15),
    [fmeas]);

  // Distribuição por faixa de risco
  const distRisco = useMemo(() => {
    const faixas = { 'Crítico (≥200)': 0, 'Alto (100-199)': 0, 'Médio (50-99)': 0, 'Baixo (<50)': 0 };
    fmeas.forEach((f) => {
      if (f.rpn >= 200) faixas['Crítico (≥200)']++;
      else if (f.rpn >= 100) faixas['Alto (100-199)']++;
      else if (f.rpn >= 50) faixas['Médio (50-99)']++;
      else faixas['Baixo (<50)']++;
    });
    return Object.entries(faixas).map(([name, value]) => ({ name, value }));
  }, [fmeas]);

  const criticos = fmeas.filter((f) => f.rpn >= 200).length;
  const pendentes = fmeas.filter((f) => f.status === 'PENDENTE').length;

  if (fmeas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            FMEA — Matriz de Risco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum FMEA cadastrado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-primary" />
          FMEA — Matriz de Risco
        </CardTitle>
        <CardDescription>RPN, modos de falha críticos e ações pendentes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-primary">{fmeas.length}</p>
            <p className="text-xs text-muted-foreground">Total FMEA</p>
          </div>
          <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 p-3 text-center">
            <AlertTriangle className="h-4 w-4 text-red-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-red-600">{criticos}</p>
            <p className="text-xs text-muted-foreground">RPN Crítico (≥200)</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-amber-600">{pendentes}</p>
            <p className="text-xs text-muted-foreground">Ações Pendentes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 15 por RPN */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Top Modos de Falha por RPN</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topRPN.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 1000]} />
                <YAxis type="category" dataKey="modo_falha" tick={{ fontSize: 9 }} width={90}
                  tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + '…' : v} />
                <Tooltip formatter={(v: number) => `RPN: ${v}`} labelFormatter={(l) => l} />
                <Bar dataKey="rpn" name="RPN" radius={[0, 4, 4, 0]}>
                  {topRPN.slice(0, 10).map((f) => (
                    <Cell key={f.id} fill={getRPNColor(f.rpn)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuição por faixa */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Distribuição por Faixa de Risco</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={distRisco} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" name="Quantidade" radius={[4, 4, 0, 0]}>
                  {distRisco.map((d, i) => (
                    <Cell key={i} fill={['#ef4444', '#f59e0b', '#3b82f6', '#22c55e'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lista ações críticas */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Ações Prioritárias (Top RPN)</p>
          <div className="space-y-2">
            {topRPN.slice(0, 5).map((f) => (
              <div key={f.id} className="rounded border p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{f.tag} — {f.modo_falha}</span>
                  <Badge className="text-xs" style={{ backgroundColor: getRPNColor(f.rpn) + '20', color: getRPNColor(f.rpn) }}>
                    RPN {f.rpn} — {getRPNLabel(f.rpn)}
                  </Badge>
                </div>
                {f.acao_recomendada && (
                  <p className="text-xs text-muted-foreground">→ {f.acao_recomendada}</p>
                )}
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>S:{f.severidade} O:{f.ocorrencia} D:{f.deteccao}</span>
                  {f.responsavel && <span>| {f.responsavel}</span>}
                  <Badge variant="outline" className="text-xs h-4 px-1.5">{f.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
