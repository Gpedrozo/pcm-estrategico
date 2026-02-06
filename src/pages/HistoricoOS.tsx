import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrdensServico, type OrdemServicoRow } from '@/hooks/useOrdensServico';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useExecucaoByOSId } from '@/hooks/useExecucoesOS';
import { OSStatusBadge } from '@/components/os/OSStatusBadge';
import { OSTypeBadge } from '@/components/os/OSTypeBadge';
import { OSPrintDialog } from '@/components/os/OSPrintDialog';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { 
  Search, 
  FileText, 
  Eye, 
  Filter, 
  AlertTriangle, 
  Printer, 
  Download, 
  CalendarIcon,
  BarChart3,
  TrendingUp,
  Clock,
  DollarSign,
  X
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

type StatusOS = 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO_MATERIAL' | 'FECHADA' | 'CANCELADA';
type TipoOS = 'CORRETIVA' | 'PREVENTIVA' | 'PREDITIVA' | 'INSPECAO' | 'MELHORIA';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

function OSDetailsModal({ 
  os, 
  isOpen, 
  onClose 
}: { 
  os: OrdemServicoRow | null; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const { data: execucao } = useExecucaoByOSId(os?.id);

  if (!os) return null;

  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-xl">O.S {os.numero_os}</span>
            <OSStatusBadge status={os.status as any} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">TAG</Label>
              <p className="font-mono text-primary font-medium">{os.tag}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Equipamento</Label>
              <p>{os.equipamento}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <p><OSTypeBadge tipo={os.tipo as any} /></p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Prioridade</Label>
              <p className="capitalize">{os.prioridade.toLowerCase()}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Solicitante</Label>
              <p>{os.solicitante}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data Solicitação</Label>
              <p>{formatDate(os.data_solicitacao)}</p>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Problema Apresentado</Label>
            <p className="mt-1 p-3 bg-muted/50 rounded-lg">{os.problema}</p>
          </div>

          {/* RCA Fields */}
          {os.status === 'FECHADA' && (os.modo_falha || os.causa_raiz || os.acao_corretiva) && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Análise de Causa Raiz
              </h4>
              <div className="space-y-3 p-4 bg-amber-500/5 rounded-lg">
                {os.modo_falha && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Modo de Falha</Label>
                    <p className="font-medium">{os.modo_falha}</p>
                  </div>
                )}
                {os.causa_raiz && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Causa Raiz (6M)</Label>
                    <p className="font-medium">{os.causa_raiz}</p>
                  </div>
                )}
                {os.acao_corretiva && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Ação Corretiva</Label>
                    <p>{os.acao_corretiva}</p>
                  </div>
                )}
                {os.licoes_aprendidas && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Lições Aprendidas</Label>
                    <p>{os.licoes_aprendidas}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {os.status === 'FECHADA' && execucao && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Dados da Execução
              </h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 p-4 bg-emerald-500/5 rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground">Mecânico</Label>
                    <p>{execucao.mecanico_nome}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tempo</Label>
                    <p className="font-mono">
                      {execucao.hora_inicio} - {execucao.hora_fim} ({formatDuration(execucao.tempo_execucao)})
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data Fechamento</Label>
                    <p>{os.data_fechamento ? formatDate(os.data_fechamento) : '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Custo Total</Label>
                    <p className="font-mono font-medium text-emerald-600">
                      R$ {Number(execucao.custo_total || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Serviço Executado</Label>
                  <p className="mt-1 p-3 bg-muted/50 rounded-lg">{execucao.servico_executado}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function HistoricoOS() {
  const [filters, setFilters] = useState({
    tag: '',
    status: '' as StatusOS | '',
    tipo: '' as TipoOS | '',
    prioridade: '',
    search: '',
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
  });
  const [selectedOS, setSelectedOS] = useState<OrdemServicoRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [activeTab, setActiveTab] = useState('lista');

  const { data: ordensServico, isLoading: loadingOS, error } = useOrdensServico();
  const { data: equipamentos } = useEquipamentos();

  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

  // Advanced filtering
  const filteredOS = useMemo(() => {
    return ordensServico?.filter(os => {
      if (filters.tag && os.tag !== filters.tag) return false;
      if (filters.status && os.status !== filters.status) return false;
      if (filters.tipo && os.tipo !== filters.tipo) return false;
      if (filters.prioridade && os.prioridade !== filters.prioridade) return false;
      
      // Date range filter
      if (filters.dateFrom || filters.dateTo) {
        const osDate = parseISO(os.data_solicitacao);
        if (filters.dateFrom && osDate < filters.dateFrom) return false;
        if (filters.dateTo && osDate > filters.dateTo) return false;
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !os.numero_os.toString().includes(filters.search) &&
          !os.tag.toLowerCase().includes(searchLower) &&
          !os.equipamento.toLowerCase().includes(searchLower) &&
          !os.problema.toLowerCase().includes(searchLower) &&
          !os.solicitante.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      return true;
    }) || [];
  }, [ordensServico, filters]);

  // Pagination
  const paginatedOS = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredOS.slice(start, start + pageSize);
  }, [filteredOS, pageIndex, pageSize]);

  const pageCount = Math.ceil(filteredOS.length / pageSize);

  // Statistics
  const stats = useMemo(() => {
    if (!filteredOS.length) return null;

    const byType = filteredOS.reduce((acc, os) => {
      acc[os.tipo] = (acc[os.tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = filteredOS.reduce((acc, os) => {
      acc[os.status] = (acc[os.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPrioridade = filteredOS.reduce((acc, os) => {
      acc[os.prioridade] = (acc[os.prioridade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Monthly trend (last 6 months)
    const monthlyData: Record<string, { corretiva: number; preventiva: number; total: number }> = {};
    filteredOS.forEach(os => {
      const month = format(parseISO(os.data_solicitacao), 'MMM/yy', { locale: ptBR });
      if (!monthlyData[month]) {
        monthlyData[month] = { corretiva: 0, preventiva: 0, total: 0 };
      }
      monthlyData[month].total++;
      if (os.tipo === 'CORRETIVA') monthlyData[month].corretiva++;
      if (os.tipo === 'PREVENTIVA') monthlyData[month].preventiva++;
    });

    return {
      total: filteredOS.length,
      fechadas: filteredOS.filter(os => os.status === 'FECHADA').length,
      abertas: filteredOS.filter(os => os.status !== 'FECHADA' && os.status !== 'CANCELADA').length,
      byType: Object.entries(byType).map(([name, value]) => ({ name, value })),
      byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
      byPrioridade: Object.entries(byPrioridade).map(([name, value]) => ({ name, value })),
      monthly: Object.entries(monthlyData).map(([month, data]) => ({ month, ...data })),
      taxaFechamento: filteredOS.length > 0 
        ? ((filteredOS.filter(os => os.status === 'FECHADA').length / filteredOS.length) * 100).toFixed(1)
        : '0',
    };
  }, [filteredOS]);

  const handleViewOS = (os: OrdemServicoRow) => {
    setSelectedOS(os);
    setIsModalOpen(true);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Nº OS', 'TAG', 'Equipamento', 'Tipo', 'Prioridade', 'Status', 'Data Solicitação', 'Solicitante', 'Problema'];
    const rows = filteredOS.map(os => [
      os.numero_os,
      os.tag,
      os.equipamento,
      os.tipo,
      os.prioridade,
      os.status,
      formatDate(os.data_solicitacao),
      os.solicitante,
      `"${os.problema.replace(/"/g, '""')}"`,
    ]);
    
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico_os_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    link.click();
  };

  // Quick date filters
  const applyQuickDateFilter = (days: number) => {
    setFilters(prev => ({
      ...prev,
      dateFrom: subDays(new Date(), days),
      dateTo: new Date(),
    }));
  };

  const clearFilters = () => {
    setFilters({ tag: '', status: '', tipo: '', prioridade: '', search: '', dateFrom: undefined, dateTo: undefined });
    setPageIndex(0);
  };

  const hasActiveFilters = filters.tag || filters.status || filters.tipo || filters.prioridade || filters.search || filters.dateFrom || filters.dateTo;

  if (loadingOS) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Erro ao carregar ordens de serviço</h2>
          <p className="text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const uniqueTags = [...new Set(equipamentos?.map(eq => eq.tag) || [])];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico de Ordens de Serviço</h1>
          <p className="text-muted-foreground">Consulte, analise e exporte todas as O.S do sistema</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lista" className="gap-2">
            <FileText className="h-4 w-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="estatisticas" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Estatísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4">
          {/* Filters */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros Avançados</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => applyQuickDateFilter(7)}>
                  7 dias
                </Button>
                <Button variant="ghost" size="sm" onClick={() => applyQuickDateFilter(30)}>
                  30 dias
                </Button>
                <Button variant="ghost" size="sm" onClick={() => applyQuickDateFilter(90)}>
                  90 dias
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nº, TAG, equipamento..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>TAG</Label>
                <Select 
                  value={filters.tag || 'all'} 
                  onValueChange={(value) => setFilters({ ...filters, tag: value === 'all' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {uniqueTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select 
                  value={filters.tipo || 'all'} 
                  onValueChange={(value) => setFilters({ ...filters, tipo: value === 'all' ? '' : value as TipoOS })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="CORRETIVA">Corretiva</SelectItem>
                    <SelectItem value="PREVENTIVA">Preventiva</SelectItem>
                    <SelectItem value="PREDITIVA">Preditiva</SelectItem>
                    <SelectItem value="INSPECAO">Inspeção</SelectItem>
                    <SelectItem value="MELHORIA">Melhoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={filters.status || 'all'} 
                  onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value as StatusOS })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ABERTA">Aberta</SelectItem>
                    <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                    <SelectItem value="AGUARDANDO_MATERIAL">Aguard. Material</SelectItem>
                    <SelectItem value="FECHADA">Fechada</SelectItem>
                    <SelectItem value="CANCELADA">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>De</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.dateFrom && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, 'dd/MM/yyyy') : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => setFilters({ ...filters, dateFrom: date })}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Até</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.dateTo && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, 'dd/MM/yyyy') : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => setFilters({ ...filters, dateTo: date })}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filtros ativos:</span>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-destructive hover:text-destructive">
                  <X className="h-3 w-3" />
                  Limpar todos
                </Button>
              </div>
            )}
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            {filteredOS.length} registro{filteredOS.length !== 1 ? 's' : ''} encontrado{filteredOS.length !== 1 ? 's' : ''}
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-industrial">
                <thead>
                  <tr>
                    <th>Nº O.S</th>
                    <th>TAG</th>
                    <th>Equipamento</th>
                    <th>Tipo</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th>Solicitante</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOS.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Nenhuma ordem de serviço encontrada
                      </td>
                    </tr>
                  ) : (
                    paginatedOS.map((os) => (
                      <tr key={os.id}>
                        <td className="font-mono font-medium">{os.numero_os}</td>
                        <td className="font-mono text-primary font-medium">{os.tag}</td>
                        <td className="max-w-[200px] truncate">{os.equipamento}</td>
                        <td><OSTypeBadge tipo={os.tipo as any} /></td>
                        <td>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            os.prioridade === 'URGENTE' ? 'bg-destructive/10 text-destructive' :
                            os.prioridade === 'ALTA' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                            os.prioridade === 'MEDIA' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {os.prioridade}
                          </span>
                        </td>
                        <td><OSStatusBadge status={os.status as any} /></td>
                        <td className="text-muted-foreground">{formatDate(os.data_solicitacao)}</td>
                        <td>{os.solicitante}</td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewOS(os)}
                              title="Visualizar"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <OSPrintDialog 
                              os={os}
                              trigger={
                                <Button variant="ghost" size="icon" title="Imprimir">
                                  <Printer className="h-4 w-4" />
                                </Button>
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <DataTablePagination
              pageIndex={pageIndex}
              pageSize={pageSize}
              pageCount={pageCount}
              totalCount={filteredOS.length}
              onPageChange={setPageIndex}
              onPageSizeChange={setPageSize}
            />
          </div>
        </TabsContent>

        <TabsContent value="estatisticas" className="space-y-6">
          {stats && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total de O.S</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.total}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Fechadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-emerald-600">{stats.fechadas}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Em Aberto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-600">{stats.abertas}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Fechamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.taxaFechamento}%</div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Type Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.byType}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {stats.byType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* By Status Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Distribuição por Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.byStatus}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Monthly Trend */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Tendência Mensal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={stats.monthly}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          name="Total"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="corretiva" 
                          stroke="hsl(var(--destructive))" 
                          strokeWidth={2}
                          name="Corretiva"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="preventiva" 
                          stroke="hsl(var(--chart-2))" 
                          strokeWidth={2}
                          name="Preventiva"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* View OS Modal */}
      <OSDetailsModal 
        os={selectedOS} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
