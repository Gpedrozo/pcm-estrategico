import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { parseISO, differenceInHours } from 'date-fns';

interface SolicitacaoRow {
  id: string;
  numero_solicitacao: number;
  tag: string;
  solicitante_nome: string;
  solicitante_setor?: string | null;
  descricao_falha: string;
  status: 'PENDENTE' | 'APROVADA' | 'CONVERTIDA' | 'REJEITADA' | 'CANCELADA';
  impacto: string;
  created_at?: string;
  updated_at?: string;
  os_id?: string | null;
}

interface Props {
  solicitacoes: SolicitacaoRow[];
  dateFrom: string;
  dateTo: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDENTE: '#f59e0b',
  APROVADA: '#3b82f6',
  CONVERTIDA: '#22c55e',
  REJEITADA: '#ef4444',
  CANCELADA: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  CONVERTIDA: 'Convertida em OS',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada',
};

export function SolicitacoesAnalisePanel({ solicitacoes, dateFrom, dateTo }: Props) {
  const filtradas = useMemo(() =>
    solicitacoes.filter((s) => {
      const d = (s.created_at ?? '').slice(0, 10);
      return d >= dateFrom && d <= dateTo;
    }), [solicitacoes, dateFrom, dateTo]);

  // Distribuição por status
  const dist = useMemo(() => {
    const map: Record<string, number> = {};
    filtradas.forEach((s) => { map[s.status] = (map[s.status] || 0) + 1; });
    return Object.entries(map).map(([status, value]) => ({ status, name: STATUS_LABELS[status] || status, value }));
  }, [filtradas]);

  // Por setor/solicitante
  const porSetor = useMemo(() => {
    const map: Record<string, number> = {};
    filtradas.forEach((s) => {
      const setor = s.solicitante_setor || 'Sem setor';
      map[setor] = (map[setor] || 0) + 1;
    });
    return Object.entries(map)
      .map(([setor, total]) => ({ setor, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filtradas]);

  // Por impacto
  const porImpacto = useMemo(() => {
    const map: Record<string, number> = {};
    filtradas.forEach((s) => { map[s.impacto] = (map[s.impacto] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtradas]);

  const total = filtradas.length;
  const aprovadas = filtradas.filter((s) => s.status === 'APROVADA' || s.status === 'CONVERTIDA').length;
  const rejeitadas = filtradas.filter((s) => s.status === 'REJEITADA').length;
  const pendentes = filtradas.filter((s) => s.status === 'PENDENTE').length;
  const taxaAprovacao = total > 0 ? ((aprovadas / total) * 100).toFixed(1) : '0';
  const taxaRejeicao = total > 0 ? ((rejeitadas / total) * 100).toFixed(1) : '0';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-primary" />
          Análise de Solicitações de Manutenção
        </CardTitle>
        <CardDescription>Taxa de aprovação, rejeição e volume por setor</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-primary">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <CheckCircle className="h-4 w-4 text-green-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-green-600">{taxaAprovacao}%</p>
            <p className="text-xs text-muted-foreground">Taxa Aprovação</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <XCircle className="h-4 w-4 text-red-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-red-600">{taxaRejeicao}%</p>
            <p className="text-xs text-muted-foreground">Taxa Rejeição</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <Clock className="h-4 w-4 text-amber-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-amber-600">{pendentes}</p>
            <p className="text-xs text-muted-foreground">Aguardando</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pizza status */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Distribuição por Status</p>
            {dist.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={dist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {dist.map((d) => <Cell key={d.status} fill={STATUS_COLORS[d.status] || '#6b7280'} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Sem solicitações no período.</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {dist.map((d) => (
                <Badge key={d.status} className="text-xs" style={{ backgroundColor: STATUS_COLORS[d.status] + '20', color: STATUS_COLORS[d.status] }}>
                  {d.name}: {d.value}
                </Badge>
              ))}
            </div>
          </div>

          {/* Por setor */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Volume por Setor</p>
            {porSetor.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={porSetor} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="setor" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="total" name="Solicitações" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Sem dados de setor.</p>
            )}
          </div>
        </div>

        {/* Por impacto */}
        {porImpacto.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Por Impacto Declarado</p>
            <div className="flex flex-wrap gap-2">
              {porImpacto.map((i) => (
                <div key={i.name} className="rounded-full border px-3 py-1 text-xs font-medium">
                  {i.name}: <span className="font-bold">{i.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
