import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface AuditoriaRow {
  id: string;
  usuario_nome?: string;
  acao?: string;
  descricao?: string;
  tag?: string | null;
  data_hora?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface Props {
  logs: AuditoriaRow[];
  dateFrom: string;
  dateTo: string;
}

const ACAO_COLORS: Record<string, string> = {
  CREATE: '#22c55e',
  UPDATE: '#3b82f6',
  DELETE: '#ef4444',
  LOGIN: '#8b5cf6',
  LOGOUT: '#6b7280',
  EXPORT: '#f59e0b',
};

function getActionColor(acao: string): string {
  const upper = (acao || '').toUpperCase();
  for (const [key, color] of Object.entries(ACAO_COLORS)) {
    if (upper.includes(key)) return color;
  }
  return '#6b7280';
}

export function AuditoriaLogPanel({ logs, dateFrom, dateTo }: Props) {
  const filtrados = useMemo(() => {
    return logs.filter((l) => {
      const d = (l.created_at || l.data_hora || '').slice(0, 10);
      return d >= dateFrom && d <= dateTo;
    });
  }, [logs, dateFrom, dateTo]);

  // Por ação
  const porAcao = useMemo(() => {
    const map: Record<string, number> = {};
    filtrados.forEach((l) => {
      const acao = String(l.acao || 'OUTRA').toUpperCase();
      map[acao] = (map[acao] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filtrados]);

  // Por usuário
  const porUsuario = useMemo(() => {
    const map: Record<string, number> = {};
    filtrados.forEach((l) => {
      const u = String(l.usuario_nome || 'Sistema');
      map[u] = (map[u] || 0) + 1;
    });
    return Object.entries(map).map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [filtrados]);

  // Críticos: DELETE + erros
  const criticos = useMemo(() =>
    filtrados.filter((l) => {
      const acao = String(l.acao || '').toUpperCase();
      return acao.includes('DELETE') || acao.includes('DELET') || acao.includes('ERRO');
    }).slice(0, 10),
    [filtrados]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="h-4 w-4 text-primary" />
          Trilha de Auditoria
        </CardTitle>
        <CardDescription>Ações críticas, alterações e rastreamento por usuário</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-primary">{filtrados.length}</p>
            <p className="text-xs text-muted-foreground">Total Eventos</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{porUsuario.length}</p>
            <p className="text-xs text-muted-foreground">Usuários Ativos</p>
          </div>
          <div className={`rounded-lg border p-3 text-center ${criticos.length > 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-muted/30'}`}>
            <p className={`text-xl font-bold ${criticos.length > 0 ? 'text-red-600' : 'text-green-600'}`}>{criticos.length}</p>
            <p className="text-xs text-muted-foreground">Ações Críticas</p>
          </div>
        </div>

        {filtrados.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por ação */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Distribuição por Tipo de Ação</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={porAcao} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="value" name="Eventos" radius={[0, 4, 4, 0]}>
                    {porAcao.map((d) => <Cell key={d.name} fill={getActionColor(d.name)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Por usuário */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Atividade por Usuário</p>
              <div className="space-y-2 mt-1">
                {porUsuario.map((u, i) => {
                  const maxTotal = porUsuario[0].total;
                  const pct = maxTotal > 0 ? (u.total / maxTotal) * 100 : 0;
                  return (
                    <div key={u.nome} className="flex items-center gap-2">
                      <span className="text-xs w-4 text-muted-foreground">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium truncate">{u.nome}</span>
                          <Badge variant="outline" className="text-xs h-5 shrink-0 ml-1">{u.total}</Badge>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Ações críticas */}
        {criticos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Ações Críticas (DELETE/Erros)</p>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {criticos.map((l) => {
                const dt = l.created_at || l.data_hora || '';
                return (
                  <div key={l.id} className="flex items-start justify-between rounded border px-3 py-2 bg-red-50/40 dark:bg-red-950/10">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{String(l.usuario_nome || 'Sistema')}</p>
                      <p className="text-xs text-muted-foreground truncate">{String(l.descricao || l.acao || '—')}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0 ml-2">
                      <Badge className="text-xs h-5 bg-red-500/10 text-red-600">{String(l.acao || '—')}</Badge>
                      {dt && (
                        <span className="text-xs text-muted-foreground self-center">
                          {format(parseISO(dt), 'dd/MM HH:mm', { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Log recente */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Log Recente (últimos 8 eventos)</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {filtrados.slice(0, 8).map((l) => {
              const dt = l.created_at || l.data_hora || '';
              const cor = getActionColor(String(l.acao || ''));
              return (
                <div key={l.id} className="flex items-center justify-between rounded border px-3 py-1.5">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge className="text-xs h-5 shrink-0" style={{ backgroundColor: cor + '20', color: cor }}>
                      {String(l.acao || '—').slice(0, 12)}
                    </Badge>
                    <span className="text-xs truncate">{String(l.usuario_nome || 'Sistema')}: {String(l.descricao || '').slice(0, 50)}</span>
                  </div>
                  {dt && (
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {format(parseISO(dt), 'dd/MM HH:mm', { locale: ptBR })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {filtrados.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum log de auditoria no período.</p>
        )}
      </CardContent>
    </Card>
  );
}
