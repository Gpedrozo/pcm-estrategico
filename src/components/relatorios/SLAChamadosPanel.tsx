import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Headphones, Clock, AlertTriangle } from 'lucide-react';
import { differenceInHours, parseISO } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

interface TicketRow {
  id: string;
  subject: string;
  status: string;
  priority: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}

interface Props {
  tickets: TicketRow[];
  dateFrom: string;
  dateTo: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: '#3b82f6',
  in_progress: '#f59e0b',
  resolved: '#22c55e',
  closed: '#6b7280',
  waiting_client: '#8b5cf6',
};
const PRIO_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#3b82f6',
  high: '#f59e0b',
  critical: '#ef4444',
};

export function SLAChamadosPanel({ tickets, dateFrom, dateTo }: Props) {
  const filtrados = useMemo(() =>
    tickets.filter((t) => t.created_at.slice(0, 10) >= dateFrom && t.created_at.slice(0, 10) <= dateTo),
    [tickets, dateFrom, dateTo]);

  // Tempo de resolução
  const tempoResolucao = useMemo(() => {
    return filtrados
      .filter((t) => t.status === 'resolved' || t.status === 'closed')
      .map((t) => {
        const horas = differenceInHours(parseISO(t.updated_at), parseISO(t.created_at));
        return { ...t, horas };
      });
  }, [filtrados]);

  const tmrMedio = tempoResolucao.length > 0
    ? (tempoResolucao.reduce((s, t) => s + t.horas, 0) / tempoResolucao.length).toFixed(1)
    : '—';

  // Por status
  const porStatus = useMemo(() => {
    const map: Record<string, number> = {};
    filtrados.forEach((t) => { map[t.status] = (map[t.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtrados]);

  // Por prioridade
  const porPrioridade = useMemo(() => {
    const map: Record<string, number> = {};
    filtrados.forEach((t) => {
      const p = t.priority || 'medium';
      map[p] = (map[p] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtrados]);

  const abertos = filtrados.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
  const _resolvidos = filtrados.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const criticos = filtrados.filter((t) => t.priority === 'critical').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Headphones className="h-4 w-4 text-primary" />
          SLA de Chamados & Suporte
        </CardTitle>
        <CardDescription>Tempo de resolução, volume por prioridade e status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-primary">{filtrados.length}</p>
            <p className="text-xs text-muted-foreground">Total Chamados</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <Clock className="h-4 w-4 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-blue-600">{tmrMedio}h</p>
            <p className="text-xs text-muted-foreground">TMR Médio</p>
          </div>
          <div className={`rounded-lg border p-3 text-center ${abertos > 0 ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-muted/30'}`}>
            <p className={`text-xl font-bold ${abertos > 0 ? 'text-amber-600' : 'text-green-600'}`}>{abertos}</p>
            <p className="text-xs text-muted-foreground">Em Aberto</p>
          </div>
          <div className={`rounded-lg border p-3 text-center ${criticos > 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-muted/30'}`}>
            <p className={`text-xl font-bold ${criticos > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{criticos}</p>
            <p className="text-xs text-muted-foreground">Críticos</p>
          </div>
        </div>

        {filtrados.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por status */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Por Status</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={porStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {porStatus.map((d) => <Cell key={d.name} fill={STATUS_COLORS[d.name] || '#6b7280'} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {porStatus.map((d) => (
                  <Badge key={d.name} className="text-xs" style={{ backgroundColor: (STATUS_COLORS[d.name] || '#6b7280') + '20', color: STATUS_COLORS[d.name] || '#6b7280' }}>
                    {d.name}: {d.value}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Por prioridade */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Por Prioridade</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={porPrioridade} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Chamados" radius={[4, 4, 0, 0]}>
                    {porPrioridade.map((d) => <Cell key={d.name} fill={PRIO_COLORS[d.name] || '#6b7280'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tickets críticos abertos */}
        {filtrados.filter((t) => t.priority === 'critical' && (t.status === 'open' || t.status === 'in_progress')).length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              Chamados Críticos em Aberto
            </p>
            <div className="space-y-1.5">
              {filtrados.filter((t) => t.priority === 'critical' && (t.status === 'open' || t.status === 'in_progress')).map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded border px-3 py-2 bg-red-50/50 dark:bg-red-950/10">
                  <span className="text-xs font-medium">{t.subject}</span>
                  <Badge className="text-xs bg-red-500/10 text-red-600 shrink-0 ml-2">
                    {differenceInHours(new Date(), parseISO(t.created_at))}h em aberto
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {filtrados.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Sem chamados no período.</p>
        )}
      </CardContent>
    </Card>
  );
}
