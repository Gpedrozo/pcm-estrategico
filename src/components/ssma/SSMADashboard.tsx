import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ShieldAlert, AlertTriangle, CheckCircle2, Clock, GraduationCap, HardHat, FileText, CalendarDays } from 'lucide-react';
import type { IncidenteSSMARow, PermissaoTrabalhoRow } from '@/hooks/useSSMA';
import type { TreinamentoSSMARow } from '@/hooks/useTreinamentosSSMA';
import type { EPIRow } from '@/hooks/useEPIs';
import type { FichaSegurancaRow } from '@/hooks/useFichasSeguranca';

const CHART_COLORS = ['#ef4444', '#f97316', '#3b82f6', '#6b7280'];
const CHART_STATUS_COLORS = ['#16a34a', '#ca8a04', '#ef4444', '#a855f7', '#6b7280'];

interface Props {
  incidentes?: IncidenteSSMARow[];
  permissoes?: PermissaoTrabalhoRow[];
  treinamentos?: TreinamentoSSMARow[];
  epis?: EPIRow[];
  fichas?: FichaSegurancaRow[];
}

export function SSMADashboard({ incidentes = [], permissoes = [], treinamentos = [], epis = [], fichas = [] }: Props) {
  // ── Dias sem acidentes ──────────────────────────────────────────────────────
  const diasSemAcidente = useMemo(() => {
    const acidentes = incidentes.filter(i => i.tipo === 'ACIDENTE');
    if (acidentes.length === 0) return null;
    const ultAcidente = acidentes.reduce((max, i) =>
      new Date(i.data_ocorrencia) > new Date(max.data_ocorrencia) ? i : max
    );
    const diff = Math.floor(
      (new Date().getTime() - new Date(ultAcidente.data_ocorrencia).getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff;
  }, [incidentes]);

  // ── Incidentes por tipo ─────────────────────────────────────────────────────
  const incidentesPorTipo = useMemo(() => {
    const tipos: Record<string, number> = {};
    incidentes.forEach(i => {
      const label = { ACIDENTE: 'Acidente', QUASE_ACIDENTE: 'Quase Acidente', INCIDENTE_AMBIENTAL: 'Inc. Ambiental', DESVIO: 'Desvio' }[i.tipo] || i.tipo;
      tipos[label] = (tipos[label] || 0) + 1;
    });
    return Object.entries(tipos).map(([name, value]) => ({ name, value }));
  }, [incidentes]);

  // ── Incidentes por mês (últimos 6 meses) ───────────────────────────────────
  const incidentesMensais = useMemo(() => {
    const now = new Date();
    const meses: { mes: string; total: number; acidentes: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const total = incidentes.filter(inc => {
        const dt = new Date(inc.data_ocorrencia);
        return dt.getMonth() === d.getMonth() && dt.getFullYear() === d.getFullYear();
      }).length;
      const acidentes = incidentes.filter(inc => {
        const dt = new Date(inc.data_ocorrencia);
        return inc.tipo === 'ACIDENTE' && dt.getMonth() === d.getMonth() && dt.getFullYear() === d.getFullYear();
      }).length;
      meses.push({ mes: label, total, acidentes });
    }
    return meses;
  }, [incidentes]);

  // ── Status de treinamentos ──────────────────────────────────────────────────
  const treinamentosStatus = useMemo(() => {
    const total = treinamentos.length;
    const validos = treinamentos.filter(t => t.status === 'VALIDO').length;
    const vencendo = treinamentos.filter(t => t.status === 'PROXIMO_VENCIMENTO').length;
    const vencidos = treinamentos.filter(t => t.status === 'VENCIDO').length;
    return { total, validos, vencendo, vencidos, pctValido: total > 0 ? Math.round((validos / total) * 100) : 0 };
  }, [treinamentos]);

  // ── EPIs com estoque baixo ──────────────────────────────────────────────────
  const episEstoqueBaixo = useMemo(() =>
    epis.filter(e => e.ativo && e.estoque_atual <= e.estoque_minimo).slice(0, 6),
  [epis]);

  // ── PTs por status ──────────────────────────────────────────────────────────
  const ptsPorStatus = useMemo(() => {
    const s: Record<string, number> = {};
    permissoes.forEach(p => { s[p.status] = (s[p.status] || 0) + 1; });
    const labels: Record<string, string> = {
      PENDENTE: 'Pendente', APROVADA: 'Aprovada', EM_EXECUCAO: 'Em Exec.',
      CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada',
    };
    return Object.entries(s).map(([k, v]) => ({ name: labels[k] || k, value: v }));
  }, [permissoes]);

  // ── FISPQs sem arquivo ──────────────────────────────────────────────────────
  const fichasSemArquivo = fichas.filter(f => f.ativo && !f.arquivo_url).length;

  return (
    <div className="space-y-6">
      {/* ── Card Dias Sem Acidentes ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`col-span-1 rounded-xl border-2 p-5 flex flex-col items-center justify-center gap-1 ${
          diasSemAcidente === null
            ? 'border-success bg-success/5'
            : diasSemAcidente >= 30
            ? 'border-success bg-success/5'
            : diasSemAcidente >= 7
            ? 'border-warning bg-warning/5'
            : 'border-destructive bg-destructive/5'
        }`}>
          <ShieldAlert className={`h-8 w-8 ${
            diasSemAcidente === null || diasSemAcidente >= 30 ? 'text-success' : diasSemAcidente >= 7 ? 'text-warning' : 'text-destructive'
          }`} />
          <p className={`text-5xl font-black ${
            diasSemAcidente === null || diasSemAcidente >= 30 ? 'text-success' : diasSemAcidente >= 7 ? 'text-warning' : 'text-destructive'
          }`}>
            {diasSemAcidente ?? '∞'}
          </p>
          <p className="text-sm text-muted-foreground font-medium text-center">Dias sem Acidentes</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-success" />
            <span className="text-sm text-muted-foreground">Treinamentos em Dia</span>
          </div>
          <p className="text-3xl font-bold">{treinamentosStatus.pctValido}%</p>
          <div className="w-full bg-muted rounded-full h-2 mt-1">
            <div
              className={`h-2 rounded-full transition-all ${
                treinamentosStatus.pctValido >= 80 ? 'bg-success' : treinamentosStatus.pctValido >= 50 ? 'bg-warning' : 'bg-destructive'
              }`}
              style={{ width: `${treinamentosStatus.pctValido}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {treinamentosStatus.validos} válidos · {treinamentosStatus.vencendo} vencendo · {treinamentosStatus.vencidos} vencidos
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">PTs Vigentes</span>
          </div>
          <p className="text-3xl font-bold">
            {permissoes.filter(p => p.status === 'APROVADA' || p.status === 'EM_EXECUCAO').length}
          </p>
          <p className="text-xs text-muted-foreground">
            {permissoes.filter(p => p.status === 'PENDENTE').length} aguardando aprovação
          </p>
        </div>

        <div className={`rounded-xl border p-4 flex flex-col gap-1 ${fichasSemArquivo > 0 ? 'border-warning bg-warning/5' : 'border-border bg-card'}`}>
          <div className="flex items-center gap-2">
            <FileText className={`h-5 w-5 ${fichasSemArquivo > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
            <span className="text-sm text-muted-foreground">FISPQs sem Arquivo</span>
          </div>
          <p className={`text-3xl font-bold ${fichasSemArquivo > 0 ? 'text-warning' : ''}`}>{fichasSemArquivo}</p>
          <p className="text-xs text-muted-foreground">{fichas.filter(f => f.ativo && f.arquivo_url).length} com documento anexo</p>
        </div>
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Barras mensais */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Incidentes — Últimos 6 Meses
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={incidentesMensais} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="acidentes" name="Acidentes" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pizza tipos incidentes */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Incidentes por Tipo
          </h3>
          {incidentesPorTipo.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={incidentesPorTipo} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                  {incidentesPorTipo.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Estoque EPIs */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <HardHat className="h-4 w-4 text-muted-foreground" />
            Estoque EPIs — Críticos
          </h3>
          {episEstoqueBaixo.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
              Todos os EPIs com estoque adequado
            </div>
          ) : (
            <div className="space-y-2">
              {epis.filter(e => e.ativo).slice(0, 8).map(e => {
                const pct = e.estoque_minimo > 0 ? Math.min((e.estoque_atual / e.estoque_minimo) * 100, 200) : 100;
                const baixo = e.estoque_atual <= e.estoque_minimo;
                return (
                  <div key={e.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={baixo ? 'font-semibold text-destructive' : 'text-muted-foreground'}>{e.nome}</span>
                      <span className={`font-mono font-bold ${baixo ? 'text-destructive' : 'text-success'}`}>
                        {e.estoque_atual}/{e.estoque_minimo}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${baixo ? 'bg-destructive' : 'bg-success'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pizza PTs */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Permissões de Trabalho por Status
          </h3>
          {ptsPorStatus.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={ptsPorStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {ptsPorStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_STATUS_COLORS[i % CHART_STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
