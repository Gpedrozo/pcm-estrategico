import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuditoria } from '@/hooks/useAuditoria';
import { useAuth } from '@/contexts/AuthContext';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { exportAuditLogsCSV, exportAuditLogsXLSX, exportAuditLogsJSON } from '@/lib/auditExport';
import { generateAuditoriaPDF } from '@/lib/reportGenerator';
import {
  Search, Filter, ClipboardList, User, Clock, Tag, AlertTriangle,
  Download, FileText, FileSpreadsheet, FileJson, BarChart3, Users, Loader2, ChevronDown,
  Database, Globe, ChevronLeft, ChevronRight, Eye,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useToast } from '@/hooks/use-toast';

const acaoLabels: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Criar', color: 'bg-success/10 text-success' },
  UPDATE: { label: 'Atualizar', color: 'bg-info/10 text-info' },
  DELETE: { label: 'Excluir', color: 'bg-destructive/10 text-destructive' },
  CLOSE: { label: 'Fechar', color: 'bg-primary/10 text-primary' },
  APPROVE: { label: 'Aprovar', color: 'bg-success/10 text-success' },
  REJECT: { label: 'Rejeitar', color: 'bg-warning/10 text-warning' },
  LOGIN: { label: 'Login', color: 'bg-info/10 text-info' },
  LOGOUT: { label: 'Logout', color: 'bg-muted text-muted-foreground' },
  EXPORT: { label: 'Exportar', color: 'bg-warning/10 text-warning' },
};

const FIELD_LABELS: Record<string, string> = {
  status: 'Status', prioridade: 'Prioridade', problema: 'Problema', solicitante: 'Solicitante',
  equipamento: 'Equipamento', tag: 'TAG', nome: 'Nome', email: 'E-mail', tipo: 'Tipo',
  data_abertura: 'Data Abertura', data_fechamento: 'Data Fechamento',
  usuario_abertura: 'Aberto por', usuario_fechamento: 'Fechado por',
  mecanico_responsavel_id: 'Mecânico', modo_falha: 'Modo de Falha',
  causa_raiz: 'Causa Raiz', acao_corretiva: 'Ação Corretiva',
  licoes_aprendidas: 'Lições Aprendidas', tempo_estimado: 'Tempo Estimado (min)',
  tentativas: 'Tentativas', resultado: 'Resultado', ip: 'IP de Origem',
  mensagem_erro: 'Mensagem de Erro', formato: 'Formato', total_registros: 'Total de Registros',
  filtros: 'Filtros', created_at: 'Criado em', updated_at: 'Atualizado em',
};

function fieldLabel(key: string) {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export default function Auditoria() {
  const [filters, setFilters] = useState({
    usuario: '',
    acao: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });
  const [exporting, setExporting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── DB Rastreamento state ──
  const DB_PAGE_SIZE = 25;
  const [dbPage, setDbPage] = useState(0);
  const [dbSearch, setDbSearch] = useState('');
  const [dbTableFilter, setDbTableFilter] = useState('ALL');
  const [viewingDbLog, setViewingDbLog] = useState<any>(null);

  const { tenantId } = useAuth();
  const { data: empresa } = useDadosEmpresa();
  const { toast } = useToast();

  const { data: auditoria, isLoading, error } = useAuditoria({
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  });

  // ── DB Rastreamento query (server-side paginated) ──
  const { data: dbAuditData, isLoading: loadingDbAudit } = useQuery({
    queryKey: ['auditoria-db-tracking', tenantId, dbPage, dbSearch, dbTableFilter],
    queryFn: async () => {
      if (!tenantId) return { logs: [], total: 0 };
      let query = supabase
        .from('enterprise_audit_logs')
        .select('*', { count: 'exact' })
        .eq('empresa_id', tenantId)
        .not('dados_antes', 'is', null)
        .order('created_at', { ascending: false })
        .range(dbPage * DB_PAGE_SIZE, (dbPage + 1) * DB_PAGE_SIZE - 1);
      if (dbSearch) {
        const s = dbSearch.replace(/[%_()\\*]/g, '');
        query = query.or(`tabela.ilike.%${s}%,acao.ilike.%${s}%,usuario_email.ilike.%${s}%`);
      }
      if (dbTableFilter !== 'ALL') query = query.eq('tabela', dbTableFilter);
      const { data, count, error: qError } = await query;
      if (qError) throw qError;
      return {
        logs: (data || []).map((row: any) => ({
          id: row.id,
          tabela: row.tabela ?? 'N/A',
          operacao: row.acao ?? 'UNKNOWN',
          registro_id: row.registro_id ?? null,
          dados_antes: row.dados_antes ?? null,
          dados_depois: row.dados_depois ?? null,
          diferenca: row.diferenca ?? null,
          created_at: row.ocorreu_em ?? row.created_at,
          usuario_email: row.usuario_email ?? null,
          resultado: row.resultado ?? 'sucesso',
          ip_address: row.ip_address ?? null,
        })),
        total: count ?? 0,
      };
    },
    enabled: !!tenantId,
  });
  const dbTotalPages = Math.ceil((dbAuditData?.total ?? 0) / DB_PAGE_SIZE);

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  const filteredAuditoria = useMemo(() => auditoria?.filter(log => {
    if (filters.usuario && log.usuario_nome !== filters.usuario) return false;
    if (filters.acao && log.acao !== filters.acao) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !log.descricao.toLowerCase().includes(searchLower) &&
        !log.usuario_nome.toLowerCase().includes(searchLower) &&
        !(log.tag?.toLowerCase().includes(searchLower))
      ) {
        return false;
      }
    }
    return true;
  }) || [], [auditoria, filters]);

  const uniqueUsers = useMemo(() => [...new Set(auditoria?.map(log => log.usuario_nome) || [])], [auditoria]);

  // ── Dados computados para as tabs ──
  const kpis = useMemo(() => {
    const total = filteredAuditoria.length;
    const criticos = filteredAuditoria.filter(l => l.acao === 'DELETE' || l.acao === 'REJECT').length;
    const usuarios = new Set(filteredAuditoria.map(l => l.usuario_nome)).size;
    const dbChanges = dbAuditData?.total ?? 0;
    return { total, criticos, usuarios, dbChanges };
  }, [filteredAuditoria, dbAuditData]);

  const moduloData = useMemo(() => {
    const counts: Record<string, number> = {};
    auditoria?.forEach(log => {
      const m = log.tag || 'outros';
      counts[m] = (counts[m] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, value]) => ({ name, value }));
  }, [auditoria]);

  const usuarioData = useMemo(() => {
    const map: Record<string, { total: number; erros: number; ultimo: string }> = {};
    auditoria?.forEach(log => {
      const u = log.usuario_nome;
      if (!map[u]) map[u] = { total: 0, erros: 0, ultimo: log.data_hora };
      map[u].total++;
      if (log.acao === 'DELETE' || log.acao === 'REJECT') map[u].erros++;
      if (log.data_hora > map[u].ultimo) map[u].ultimo = log.data_hora;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [auditoria]);

  const actionColor = (acao: string) => {
    const a = acao.toUpperCase();
    if (a.includes('LOGIN') || a.includes('LOGOUT')) return 'bg-info/10 text-info border-info/20';
    if (a.includes('CREATE') || a.includes('CRIAR') || a.includes('INSERT') || a.includes('APPROVE')) return 'bg-success/10 text-success border-success/20';
    if (a.includes('UPDATE') || a.includes('EDITAR') || a.includes('CLOSE') || a.includes('EXPORT')) return 'bg-warning/10 text-warning border-warning/20';
    if (a.includes('DELETE') || a.includes('EXCLUIR') || a.includes('REJECT')) return 'bg-destructive/10 text-destructive border-destructive/20';
    return 'bg-secondary text-secondary-foreground';
  };

  // ── Handlers de exportação ──
  const empresaNome = empresa?.nome_fantasia ?? empresa?.razao_social ?? 'PCM Estratégico';

  const handleExportPDF = useCallback(async () => {
    if (!tenantId || !auditoria?.length) return;
    setExporting(true);
    try {
      await generateAuditoriaPDF(
        auditoria.map(l => ({
          created_at: l.data_hora,
          acao: l.acao,
          tabela: l.tag,
          usuario_nome: l.usuario_nome,
          resultado: 'sucesso',
        })),
        {
          title: 'Auditoria do Sistema',
          subtitle: `Trilha de conformidade — ${empresaNome}`,
          dateFrom: filters.dateFrom || '2020-01-01',
          dateTo: filters.dateTo || new Date().toISOString().slice(0, 10),
          empresaNome,
        }
      );
      toast({ title: 'PDF gerado com sucesso' });
    } catch (err) {
      toast({ title: 'Erro ao gerar PDF', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }, [tenantId, auditoria, filters, empresaNome, toast]);

  const handleExportCSV = useCallback(async () => {
    if (!tenantId) return;
    setExporting(true);
    try {
      await exportAuditLogsCSV(tenantId, {
        startDate: filters.dateFrom || undefined,
        endDate: filters.dateTo || undefined,
        actionFilter: filters.acao || undefined,
      });
      toast({ title: 'CSV exportado com sucesso' });
    } catch (err) {
      toast({ title: 'Erro ao exportar CSV', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }, [tenantId, filters, toast]);

  const handleExportXLSX = useCallback(async () => {
    if (!tenantId) return;
    setExporting(true);
    try {
      await exportAuditLogsXLSX(tenantId, {
        startDate: filters.dateFrom || undefined,
        endDate: filters.dateTo || undefined,
        actionFilter: filters.acao || undefined,
      });
      toast({ title: 'Excel exportado com sucesso' });
    } catch (err) {
      toast({ title: 'Erro ao exportar Excel', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }, [tenantId, filters, toast]);

  const handleExportJSON = useCallback(async () => {
    if (!tenantId) return;
    setExporting(true);
    try {
      await exportAuditLogsJSON(tenantId, {
        startDate: filters.dateFrom || undefined,
        endDate: filters.dateTo || undefined,
        actionFilter: filters.acao || undefined,
      });
      toast({ title: 'JSON exportado com sucesso' });
    } catch (err) {
      toast({ title: 'Erro ao exportar JSON', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }, [tenantId, filters, toast]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Erro ao carregar auditoria</h2>
          <p className="text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trilha de Auditoria</h1>
          <p className="text-muted-foreground">Registro completo de todas as ações no sistema</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-gradient-to-br from-sky-50 to-cyan-50 border-sky-200 p-4">
          <p className="text-xs font-medium text-sky-700 opacity-80">Total de Eventos</p>
          <p className="mt-1 text-2xl font-bold text-sky-800">{kpis.total}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200 p-4">
          <p className="text-xs font-medium text-rose-700 opacity-80">Críticos</p>
          <p className="mt-1 text-2xl font-bold text-rose-800">{kpis.criticos}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 p-4">
          <p className="text-xs font-medium text-emerald-700 opacity-80">Usuários Ativos</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{kpis.usuarios}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 p-4">
          <p className="text-xs font-medium text-amber-700 opacity-80">Alterações DB</p>
          <p className="mt-1 text-2xl font-bold text-amber-800">{kpis.dbChanges}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="timeline" className="gap-1.5"><ClipboardList className="h-4 w-4" /> Linha do Tempo</TabsTrigger>
          <TabsTrigger value="rastreamento" className="gap-1.5"><Globe className="h-4 w-4" /> Rastreamento DB</TabsTrigger>
          <TabsTrigger value="modulo" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Por Módulo</TabsTrigger>
          <TabsTrigger value="usuario" className="gap-1.5"><Users className="h-4 w-4" /> Por Usuário</TabsTrigger>
          <TabsTrigger value="exportar" className="gap-1.5"><Download className="h-4 w-4" /> Exportar</TabsTrigger>
        </TabsList>

        {/* TAB: Linha do Tempo */}
        <TabsContent value="timeline" className="space-y-4">
          {/* Filters */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Descrição, usuário, TAG..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Usuário</Label>
                <Select
                  value={filters.usuario || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, usuario: value === 'all' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {uniqueUsers.map((user) => (
                      <SelectItem key={user} value={user}>{user}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ação</Label>
                <Select
                  value={filters.acao || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, acao: value === 'all' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(acaoLabels).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data inicial</Label>
                <Input
                  type="datetime-local"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Data final</Label>
                <Input
                  type="datetime-local"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({ usuario: '', acao: '', search: '', dateFrom: '', dateTo: '' })}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            {filteredAuditoria.length} registro{filteredAuditoria.length !== 1 ? 's' : ''} encontrado{filteredAuditoria.length !== 1 ? 's' : ''}
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            {filteredAuditoria.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum registro encontrado</p>
              </div>
            ) : (
              filteredAuditoria.slice(0, 200).map((log) => {
                const acaoConfig = acaoLabels[log.acao] || { label: log.acao, color: 'bg-muted text-muted-foreground' };
                const isCritical = log.acao === 'DELETE' || log.acao === 'REJECT';
                const isExpanded = expandedId === log.id;

                const diferenca = log.diferenca as Record<string, { antes: unknown; depois: unknown }> | null;
                const hasDiff = !!diferenca && Object.keys(diferenca).length > 0;
                const hasLoginDetail = (log.acao === 'LOGIN' || log.acao === 'LOGOUT') && !!log.dados_depois;
                const hasCreateDetail = log.acao === 'CREATE' && !!log.dados_depois;
                const hasDeleteDetail = log.acao === 'DELETE' && !!log.dados_antes;
                const hasExportDetail = log.acao === 'EXPORT' && !!log.dados_depois;
                const hasDetail = hasDiff || hasLoginDetail || hasCreateDetail || hasDeleteDetail || hasExportDetail;

                return (
                  <div
                    key={log.id}
                    className={`bg-card border rounded-lg transition-shadow ${
                      isCritical ? 'border-destructive/40' : 'border-border'
                    } ${hasDetail ? 'hover:shadow-industrial cursor-pointer' : ''}`}
                  >
                    <div
                      className="p-4 flex items-start gap-4"
                      onClick={() => hasDetail && setExpandedId(isExpanded ? null : log.id)}
                    >
                      <div className={`p-2 rounded-lg flex-shrink-0 ${isCritical ? 'bg-destructive/10' : 'bg-muted'}`}>
                        <ClipboardList className={`h-5 w-5 ${isCritical ? 'text-destructive' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${acaoConfig.color}`}>
                            {acaoConfig.label}
                          </span>
                          {log.tag && (
                            <span className="inline-flex items-center gap-1 text-xs font-mono text-primary">
                              <Tag className="h-3 w-3" />
                              {log.tag}
                            </span>
                          )}
                          {log.resultado && log.resultado !== 'sucesso' && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              log.resultado === 'erro' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                            }`}>{log.resultado}</span>
                          )}
                        </div>
                        <p className="mt-2 text-foreground">{log.descricao}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {log.usuario_nome}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDateTime(log.data_hora)}
                          </span>
                          {log.registro_id && (
                            <span className="font-mono text-xs opacity-60">#{log.registro_id.slice(0, 8)}</span>
                          )}
                          {log.ip_address && (
                            <span className="flex items-center gap-1 font-mono text-xs opacity-60">
                              <Globe className="h-3 w-3" />
                              {log.ip_address}
                            </span>
                          )}
                        </div>
                      </div>
                      {hasDetail && (
                        <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 mt-1 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`} />
                      )}
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border px-4 py-3 bg-muted/20 rounded-b-lg">
                        {/* UPDATE diff: field-by-field table */}
                        {hasDiff && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Campos alterados</p>
                            <div className="overflow-x-auto rounded-lg border border-border">
                              <table className="w-full text-xs">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Campo</th>
                                    <th className="px-3 py-2 text-left font-medium text-rose-600">Antes</th>
                                    <th className="px-3 py-2 text-left font-medium text-emerald-600">Depois</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.entries(diferenca!)
                                    .filter(([k]) => !k.startsWith('_') && k !== 'updated_at')
                                    .map(([campo, vals]) => (
                                    <tr key={campo} className="border-t border-border">
                                      <td className="px-3 py-2 font-medium">{fieldLabel(campo)}</td>
                                      <td className="px-3 py-2 text-rose-600 font-mono max-w-[220px] truncate">
                                        {formatValue(vals?.antes)}
                                      </td>
                                      <td className="px-3 py-2 text-emerald-700 font-mono max-w-[220px] truncate">
                                        {formatValue(vals?.depois)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* CREATE: show all created fields */}
                        {hasCreateDetail && !hasDiff && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Dados do registro criado</p>
                            <div className="overflow-x-auto rounded-lg border border-border">
                              <table className="w-full text-xs">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Campo</th>
                                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Valor</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.entries(log.dados_depois!)
                                    .filter(([k]) => !k.startsWith('_') && k !== 'id' && k !== 'created_at' && k !== 'updated_at')
                                    .map(([campo, val]) => (
                                    <tr key={campo} className="border-t border-border">
                                      <td className="px-3 py-2 font-medium">{fieldLabel(campo)}</td>
                                      <td className="px-3 py-2 font-mono text-foreground max-w-[300px] truncate">{formatValue(val)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* DELETE: show all deleted fields */}
                        {hasDeleteDetail && (
                          <div>
                            <p className="text-xs font-semibold text-destructive mb-2">Dados do registro excluído</p>
                            <div className="overflow-x-auto rounded-lg border border-destructive/30">
                              <table className="w-full text-xs">
                                <thead className="bg-destructive/5">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Campo</th>
                                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Valor excluído</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.entries(log.dados_antes!)
                                    .filter(([k]) => !k.startsWith('_') && k !== 'id' && k !== 'created_at' && k !== 'updated_at')
                                    .map(([campo, val]) => (
                                    <tr key={campo} className="border-t border-border">
                                      <td className="px-3 py-2 font-medium">{fieldLabel(campo)}</td>
                                      <td className="px-3 py-2 font-mono text-rose-600 max-w-[300px] truncate">{formatValue(val)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* LOGIN/LOGOUT detail */}
                        {hasLoginDetail && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {Object.entries(log.dados_depois!)
                              .filter(([k]) => !['email'].includes(k) || log.acao === 'LOGIN')
                              .map(([k, v]) => (
                              <div key={k} className="rounded-lg border border-border bg-card p-2">
                                <p className="text-[10px] text-muted-foreground">{fieldLabel(k)}</p>
                                <p className={`text-xs font-medium mt-0.5 ${
                                  k === 'resultado' && String(v) === 'erro' ? 'text-destructive' :
                                  k === 'resultado' && String(v) === 'sucesso' ? 'text-emerald-600' : 'text-foreground'
                                }`}>{formatValue(v)}</p>
                              </div>
                            ))}
                            {log.ip_address && (
                              <div className="rounded-lg border border-border bg-card p-2">
                                <p className="text-[10px] text-muted-foreground">IP de Origem</p>
                                <p className="text-xs font-medium mt-0.5 font-mono">{log.ip_address}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* EXPORT detail */}
                        {hasExportDetail && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Object.entries(log.dados_depois!).map(([k, v]) => (
                              <div key={k} className="rounded-lg border border-border bg-card p-2">
                                <p className="text-[10px] text-muted-foreground">{fieldLabel(k)}</p>
                                <p className="text-xs font-medium mt-0.5">{formatValue(v)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {filteredAuditoria.length > 200 && (
              <p className="text-center text-sm text-muted-foreground py-2">
                Mostrando 200 de {filteredAuditoria.length} registros. Use os filtros para refinar.
              </p>
            )}
          </div>
        </TabsContent>

        {/* TAB: Rastreamento DB */}
        <TabsContent value="rastreamento" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por e-mail, tabela ou registro..."
                    value={dbSearch}
                    onChange={(e) => { setDbSearch(e.target.value); setDbPage(0); }}
                    className="pl-9"
                  />
                </div>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={dbTableFilter}
                  onChange={(e) => { setDbTableFilter(e.target.value); setDbPage(0); }}
                >
                  <option value="">Todas as Tabelas</option>
                  <option value="ordens_servico">Ordens de Serviço</option>
                  <option value="equipamentos">Equipamentos</option>
                  <option value="planos_preventiva">Planos Preventiva</option>
                  <option value="colaboradores">Colaboradores</option>
                  <option value="configuracoes_sistema">Configurações</option>
                  <option value="contratos">Contratos</option>
                </select>
              </div>

              {dbAuditLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !dbAuditData?.logs?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Nenhuma alteração de banco registrada</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tabela</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Operação</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuário</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">IP</th>
                          <th className="px-4 py-3 text-center font-medium text-muted-foreground">Detalhes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dbAuditData.logs.map((row: any) => (
                          <tr key={row.id} className="border-t border-border hover:bg-muted/30">
                            <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">
                              {new Date(row.ocorreu_em || row.created_at).toLocaleString('pt-BR')}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="font-mono text-xs">{row.tabela}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionColor(row.acao)}`}>
                                {row.acao}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs truncate max-w-[180px]">{row.usuario_email || '—'}</td>
                            <td className="px-4 py-3 text-xs font-mono opacity-70">{row.ip_address || '—'}</td>
                            <td className="px-4 py-3 text-center">
                              <Button size="sm" variant="ghost" onClick={() => setViewingDbLog(row)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Página {dbPage + 1} de {dbTotalPages || 1} &middot; {dbAuditData.total} registro{dbAuditData.total !== 1 ? 's' : ''}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" disabled={dbPage === 0} onClick={() => setDbPage((p) => p - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" disabled={dbPage + 1 >= (dbTotalPages || 1)} onClick={() => setDbPage((p) => p + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Detail Dialog */}
          <Dialog open={!!viewingDbLog} onOpenChange={(open) => !open && setViewingDbLog(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Detalhes da Alteração
                </DialogTitle>
              </DialogHeader>
              {viewingDbLog && (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Tabela</p>
                      <p className="font-mono">{viewingDbLog.tabela}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Operação</p>
                      <p><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionColor(viewingDbLog.acao)}`}>{viewingDbLog.acao}</span></p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Usuário</p>
                      <p>{viewingDbLog.usuario_email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">IP</p>
                      <p className="font-mono">{viewingDbLog.ip_address || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Registro ID</p>
                      <p className="font-mono text-xs">{viewingDbLog.registro_id || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Data</p>
                      <p>{new Date(viewingDbLog.ocorreu_em || viewingDbLog.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  {viewingDbLog.dados_antes && (
                    <div>
                      <p className="text-xs font-semibold text-rose-600 mb-1">Dados Antes</p>
                      <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto max-h-48">{JSON.stringify(viewingDbLog.dados_antes, null, 2)}</pre>
                    </div>
                  )}
                  {viewingDbLog.dados_depois && (
                    <div>
                      <p className="text-xs font-semibold text-emerald-600 mb-1">Dados Depois</p>
                      <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto max-h-48">{JSON.stringify(viewingDbLog.dados_depois, null, 2)}</pre>
                    </div>
                  )}
                  {viewingDbLog.diferenca && Object.keys(viewingDbLog.diferenca).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-600 mb-1">Diferença</p>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-xs">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">Campo</th>
                              <th className="px-3 py-2 text-left font-medium text-rose-600">Antes</th>
                              <th className="px-3 py-2 text-left font-medium text-emerald-600">Depois</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(viewingDbLog.diferenca as Record<string, { antes: unknown; depois: unknown }>).map(([campo, val]) => (
                              <tr key={campo} className="border-t border-border">
                                <td className="px-3 py-2 font-mono font-medium">{campo}</td>
                                <td className="px-3 py-2 text-rose-700 bg-rose-50/50">{JSON.stringify(val.antes)}</td>
                                <td className="px-3 py-2 text-emerald-700 bg-emerald-50/50">{JSON.stringify(val.depois)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* TAB: Por Módulo */}
        <TabsContent value="modulo" className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Volume de Eventos por Módulo</h3>
            {moduloData.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum dado disponível</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={moduloData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(value: number) => [`${value} eventos`, 'Quantidade']} />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </TabsContent>

        {/* TAB: Por Usuário */}
        <TabsContent value="usuario" className="space-y-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Atividade por Usuário</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuário</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Ações</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Críticas</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Último Acesso</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarioData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Nenhum dado</td>
                    </tr>
                  ) : (
                    usuarioData.map(([usuario, stats]) => (
                      <tr key={usuario} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{usuario}</td>
                        <td className="px-4 py-3 text-center font-bold">{stats.total}</td>
                        <td className={`px-4 py-3 text-center font-bold ${stats.erros > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{stats.erros}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDateTime(stats.ultimo)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB: Exportar */}
        <TabsContent value="exportar" className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-foreground mb-2">Exportar Relatório de Auditoria</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Escolha o formato. Os filtros de data e ação aplicados serão respeitados na exportação.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 p-6 transition-all group disabled:opacity-50"
              >
                {exporting ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : <FileText className="h-8 w-8 text-red-500 group-hover:scale-110 transition-transform" />}
                <span className="text-sm font-semibold">PDF Executivo</span>
                <span className="text-xs text-muted-foreground text-center">Resumo visual com KPIs, gráficos e trilha completa</span>
              </button>

              <button
                onClick={handleExportXLSX}
                disabled={exporting}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 p-6 transition-all group disabled:opacity-50"
              >
                {exporting ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : <FileSpreadsheet className="h-8 w-8 text-green-600 group-hover:scale-110 transition-transform" />}
                <span className="text-sm font-semibold">Excel (.xlsx)</span>
                <span className="text-xs text-muted-foreground text-center">Planilha completa com filtros automáticos</span>
              </button>

              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 p-6 transition-all group disabled:opacity-50"
              >
                {exporting ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : <ClipboardList className="h-8 w-8 text-blue-500 group-hover:scale-110 transition-transform" />}
                <span className="text-sm font-semibold">CSV</span>
                <span className="text-xs text-muted-foreground text-center">Dados brutos para Power BI ou integração</span>
              </button>

              <button
                onClick={handleExportJSON}
                disabled={exporting}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 p-6 transition-all group disabled:opacity-50"
              >
                {exporting ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : <FileJson className="h-8 w-8 text-amber-500 group-hover:scale-110 transition-transform" />}
                <span className="text-sm font-semibold">JSON</span>
                <span className="text-xs text-muted-foreground text-center">Estruturado com metadados para GRC / ERP</span>
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
