import { useState, useMemo, useCallback } from 'react';
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
  Download, FileText, FileSpreadsheet, FileJson, BarChart3, Users, Loader2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function Auditoria() {
  const [filters, setFilters] = useState({
    usuario: '',
    acao: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });
  const [exporting, setExporting] = useState(false);

  const { tenantId } = useAuth();
  const { data: empresa } = useDadosEmpresa();
  const { toast } = useToast();

  const { data: auditoria, isLoading, error } = useAuditoria({
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  });

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
    return { total, criticos, usuarios };
  }, [filteredAuditoria]);

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
          <p className="text-xs font-medium text-amber-700 opacity-80">Período</p>
          <p className="mt-1 text-sm font-bold text-amber-800">
            {filters.dateFrom && filters.dateTo
              ? `${new Date(filters.dateFrom).toLocaleDateString('pt-BR')} — ${new Date(filters.dateTo).toLocaleDateString('pt-BR')}`
              : 'Todos'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline" className="gap-1.5"><ClipboardList className="h-4 w-4" /> Linha do Tempo</TabsTrigger>
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
                return (
                  <div
                    key={log.id}
                    className={`bg-card border rounded-lg p-4 hover:shadow-industrial transition-shadow ${isCritical ? 'border-destructive/40' : 'border-border'}`}
                  >
                    <div className="flex items-start gap-4">
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
                        </div>
                      </div>
                    </div>
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
