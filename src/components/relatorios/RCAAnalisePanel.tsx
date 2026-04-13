import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface RCARow {
  id: string;
  numero_rca?: number;
  titulo: string;
  tag: string | null;
  metodo_analise: string;
  causa_raiz_identificada: string | null;
  porque_1?: string | null;
  porque_2?: string | null;
  porque_3?: string | null;
  status: string;
  eficacia_verificada: boolean;
  responsavel_nome: string | null;
  created_at: string;
  data_conclusao: string | null;
}

interface Props {
  rcas: RCARow[];
  dateFrom: string;
  dateTo: string;
}

const STATUS_COLORS: Record<string, string> = {
  EM_ANALISE: '#3b82f6',
  CONCLUIDA: '#22c55e',
  VERIFICANDO_EFICACIA: '#f59e0b',
  ENCERRADA: '#6b7280',
};

export function RCAAnalisePanel({ rcas, dateFrom, dateTo }: Props) {
  const filtradas = useMemo(() =>
    rcas.filter((r) => r.created_at.slice(0, 10) >= dateFrom && r.created_at.slice(0, 10) <= dateTo),
    [rcas, dateFrom, dateTo]);

  // Por método
  const porMetodo = useMemo(() => {
    const map: Record<string, number> = {};
    filtradas.forEach((r) => { map[r.metodo_analise] = (map[r.metodo_analise] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtradas]);

  // Por status
  const porStatus = useMemo(() => {
    const map: Record<string, number> = {};
    filtradas.forEach((r) => { map[r.status] = (map[r.status] || 0) + 1; });
    return Object.entries(map).map(([status, value]) => ({ status, value }));
  }, [filtradas]);

  // Top causas raiz
  const topCausas = useMemo(() => {
    const map: Record<string, number> = {};
    filtradas.forEach((r) => {
      const causa = r.causa_raiz_identificada;
      if (!causa) return;
      // Pegar primeiras 40 chars como key
      const k = causa.length > 40 ? causa.slice(0, 40) + '…' : causa;
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map)
      .map(([causa, freq]) => ({ causa, freq }))
      .sort((a, b) => b.freq - a.freq)
      .slice(0, 8);
  }, [filtradas]);

  // Tags mais recorrentes
  const topTags = useMemo(() => {
    const map: Record<string, number> = {};
    filtradas.forEach((r) => {
      if (!r.tag) return;
      map[r.tag] = (map[r.tag] || 0) + 1;
    });
    return Object.entries(map)
      .map(([tag, total]) => ({ tag, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filtradas]);

  const eficaciaVerificada = filtradas.filter((r) => r.eficacia_verificada).length;
  const pctEficacia = filtradas.length > 0 ? ((eficaciaVerificada / filtradas.length) * 100).toFixed(0) : '0';

  if (filtradas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Análise de Causa Raiz (RCA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma RCA registrada no período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="h-4 w-4 text-primary" />
          Análise de Causa Raiz (RCA)
        </CardTitle>
        <CardDescription>Modos de falha recorrentes, causas identificadas e eficácia das ações</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-primary">{filtradas.length}</p>
            <p className="text-xs text-muted-foreground">Total RCAs</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-green-600">{pctEficacia}%</p>
            <p className="text-xs text-muted-foreground">Eficácia Verificada</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{filtradas.filter((r) => r.status === 'EM_ANALISE').length}</p>
            <p className="text-xs text-muted-foreground">Em Análise</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-amber-600">{filtradas.filter((r) => r.status === 'VERIFICANDO_EFICACIA').length}</p>
            <p className="text-xs text-muted-foreground">Verificando Eficácia</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Por método */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">RCAs por Método de Análise</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={porMetodo} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Quantidade" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Por status */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Por Status</p>
            <div className="space-y-2 mt-4">
              {porStatus.map((s) => {
                const pct = filtradas.length > 0 ? (s.value / filtradas.length) * 100 : 0;
                const cor = STATUS_COLORS[s.status] || '#6b7280';
                return (
                  <div key={s.status} className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{s.status.replace(/_/g, ' ')}</span>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                        <Badge className="h-4 px-1.5 text-xs" style={{ backgroundColor: cor + '20', color: cor }}>{s.value}</Badge>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top causas recorrentes */}
        {topCausas.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Causas Raiz Mais Recorrentes</p>
            <div className="space-y-1.5">
              {topCausas.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded border px-3 py-1.5">
                  <span className="text-xs">{c.causa}</span>
                  <Badge variant="outline" className="text-xs h-5 shrink-0 ml-2">{c.freq}x</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top tags */}
        {topTags.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Equipamentos com Mais RCAs</p>
            <div className="flex flex-wrap gap-2">
              {topTags.map((t) => (
                <Badge key={t.tag} variant="outline" className="text-xs">{t.tag}: {t.total}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
