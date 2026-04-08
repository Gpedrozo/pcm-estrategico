import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, Download, Calendar, BarChart3, PieChart, TrendingUp,
  Wrench, Clock, DollarSign, AlertTriangle, FileSpreadsheet, Printer, Loader2,
  Brain, Eye, Filter, Zap
} from 'lucide-react';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useIndicadores } from '@/hooks/useIndicadores';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { useRelatoriosInteligentes } from '@/hooks/useRelatoriosInteligentes';
import { format, subDays, differenceInDays, parseISO } from 'date-fns';
import { 
  generateOSReportPDF, generateIndicadoresPDF, generateExcelReport 
} from '@/lib/reportGenerator';
import { useToast } from '@/hooks/use-toast';
import {
  AlertasInteligentes,
  KPIMetaReal,
  ResumoExecutivoPanel,
  BacklogAgingChart,
  CustosInsightsPanel,
  EquipConfiabilidadePanel,
  AderenciaPreventiva,
  ProdutividadeMecanicosPanel,
  OSTendenciaDiaria,
  DrillDownModal,
} from '@/components/relatorios';

type ReportType = 'os_periodo' | 'indicadores' | 'custos' | 'backlog' | 'preventivas' | 'equipamentos' | 'mecanicos' | 'executivo';
type ViewMode = 'dashboard' | 'export';
type CategoryTab = 'executivo' | 'operacional' | 'gerencial' | 'inteligencia';

interface ReportConfig {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'operacional' | 'gerencial' | 'executivo';
}

const reports: ReportConfig[] = [
  { id: 'os_periodo', title: 'Ordens de Serviço por Período', description: 'Listagem detalhada de todas as OS em um período específico', icon: <FileText className="h-6 w-6" />, category: 'operacional' },
  { id: 'indicadores', title: 'Indicadores KPI', description: 'MTBF, MTTR, Disponibilidade e Backlog', icon: <BarChart3 className="h-6 w-6" />, category: 'gerencial' },
  { id: 'custos', title: 'Custos de Manutenção', description: 'Análise de custos por categoria e equipamento', icon: <DollarSign className="h-6 w-6" />, category: 'gerencial' },
  { id: 'backlog', title: 'Relatório de Backlog', description: 'OS pendentes e tempo em fila', icon: <Clock className="h-6 w-6" />, category: 'operacional' },
  { id: 'preventivas', title: 'Aderência Preventivas', description: 'Execução vs. programação de preventivas', icon: <Calendar className="h-6 w-6" />, category: 'gerencial' },
  { id: 'equipamentos', title: 'Desempenho por Equipamento', description: 'Histórico e indicadores por TAG', icon: <Wrench className="h-6 w-6" />, category: 'operacional' },
  { id: 'mecanicos', title: 'Produtividade de Mecânicos', description: 'Horas trabalhadas e OS executadas por técnico', icon: <TrendingUp className="h-6 w-6" />, category: 'gerencial' },
  { id: 'executivo', title: 'Resumo Executivo', description: 'Visão consolidada para gestão', icon: <PieChart className="h-6 w-6" />, category: 'executivo' },
];

export default function Relatorios() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterTag, setFilterTag] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [activeTab, setActiveTab] = useState<CategoryTab>('executivo');
  const [drillDown, setDrillDown] = useState<{ open: boolean; title: string; filter: (os: any) => boolean }>({ open: false, title: '', filter: () => true });
  
  const { data: ordensServico, isLoading: loadingOS } = useOrdensServico();
  const { data: indicadores, isLoading: loadingIndicadores } = useIndicadores();
  const { data: empresa } = useDadosEmpresa();
  const { toast } = useToast();

  // Motor de inteligência
  const {
    kpis, alertas, insights, backlogAging, topEquipamentosCusto,
    mecanicosDesempenho, aderenciaDetalhada, osPorDia, resumoExecutivo,
  } = useRelatoriosInteligentes();

  // Drill-down filtered OS
  const drillDownOS = useMemo(() => {
    if (!ordensServico || !drillDown.open) return [];
    return ordensServico.filter(drillDown.filter);
  }, [ordensServico, drillDown]);

  // Handle backlog bucket click → drill-down
  const handleBacklogBucketClick = (faixa: string) => {
    const now = new Date();
    const ranges: Record<string, [number, number]> = {
      '0–7 dias': [0, 7],
      '7–15 dias': [7, 15],
      '15–30 dias': [15, 30],
      '30+ dias': [30, 9999],
    };
    const [min, max] = ranges[faixa] || [0, 9999];
    setDrillDown({
      open: true,
      title: `Backlog: ${faixa}`,
      filter: (os) => {
        if (os.status === 'FECHADA' || os.status === 'CANCELADA') return false;
        const d = os.data_solicitacao ? parseISO(os.data_solicitacao) : null;
        if (!d) return false;
        const dias = differenceInDays(now, d);
        return dias >= min && dias < max;
      },
    });
  };

  // Handle equipment click → drill-down
  const handleEquipClick = (tag: string) => {
    setDrillDown({
      open: true,
      title: `OS do equipamento: ${tag}`,
      filter: (os) => os.tag === tag,
    });
  };

  const handleGenerateReport = async (fmt: 'pdf' | 'excel') => {
    if (!selectedReport) return;
    setIsGenerating(true);
    
    try {
      const options = {
        title: reports.find(r => r.id === selectedReport)?.title || '',
        dateFrom, dateTo, filterTag,
        empresaNome: empresa?.nome_fantasia || empresa?.razao_social || 'Manutenção Industrial',
        empresaCnpj: empresa?.cnpj || '',
        empresaTelefone: empresa?.telefone || '',
        empresaEmail: empresa?.email || '',
        empresaEndereco: empresa?.endereco || '',
        logoUrl: empresa?.logo_os_url || empresa?.logo_url || '',
        layoutVersion: '2.0',
      };

      if (fmt === 'pdf') {
        switch (selectedReport) {
          case 'indicadores':
            await generateIndicadoresPDF(indicadores, options);
            break;
          default:
            await generateOSReportPDF(ordensServico || [], options);
            break;
        }
      } else {
        const osColumns = [
          { header: 'Nº OS', key: 'numero_os' },
          { header: 'TAG', key: 'tag' },
          { header: 'Equipamento', key: 'equipamento' },
          { header: 'Tipo', key: 'tipo' },
          { header: 'Prioridade', key: 'prioridade' },
          { header: 'Status', key: 'status' },
          { header: 'Solicitante', key: 'solicitante' },
          { header: 'Problema', key: 'problema' },
          { header: 'Data', key: 'data_solicitacao' },
        ];
        
        const filtered = (ordensServico || []).filter(os => {
          const d = os.data_solicitacao?.slice(0, 10);
          if (d && (d < dateFrom || d > dateTo)) return false;
          if (filterTag && !os.tag.includes(filterTag)) return false;
          if (filterTipo && os.tipo !== filterTipo) return false;
          if (filterStatus && os.status !== filterStatus) return false;
          return true;
        }).slice(0, 5000);
        
        generateExcelReport(filtered, osColumns, `Relatorio_${selectedReport}_${dateFrom}`);
      }
      
      toast({ title: 'Relatório Gerado', description: `Arquivo ${fmt.toUpperCase()} baixado com sucesso.` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Erro ao gerar relatório.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'operacional': return { badge: 'bg-info/10 text-info', icon: '🟢' };
      case 'gerencial': return { badge: 'bg-warning/10 text-warning', icon: '🔵' };
      case 'executivo': return { badge: 'bg-primary/10 text-primary', icon: '🟣' };
      default: return { badge: '', icon: '' };
    }
  };

  const isLoading = loadingOS || loadingIndicadores;

  if (isLoading) {
    return (
      <div className="module-page space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="module-page space-y-6">
      {/* Header */}
      <div className="module-page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Central de Relatórios Inteligentes
          </h1>
          <p className="text-muted-foreground">
            Dados → Análise → Diagnóstico — O relatório diz o que está errado e o que fazer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'dashboard' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('dashboard')}
            className="gap-1.5"
          >
            <Eye className="h-4 w-4" />
            Dashboard Interativo
          </Button>
          <Button
            variant={viewMode === 'export' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('export')}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            Exportar PDF/Excel
          </Button>
        </div>
      </div>

      {/* ═══════════ MODO DASHBOARD INTERATIVO ═══════════ */}
      {viewMode === 'dashboard' && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoryTab)} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="executivo" className="gap-1.5">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Executivo</span>
            </TabsTrigger>
            <TabsTrigger value="operacional" className="gap-1.5">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Operacional</span>
            </TabsTrigger>
            <TabsTrigger value="gerencial" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Gerencial</span>
            </TabsTrigger>
            <TabsTrigger value="inteligencia" className="gap-1.5">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Inteligência</span>
            </TabsTrigger>
          </TabsList>

          {/* ── TAB EXECUTIVO ─────────────────────────────── */}
          <TabsContent value="executivo" className="space-y-4">
            <ResumoExecutivoPanel dados={resumoExecutivo} />
            <KPIMetaReal kpis={kpis} />
            <AlertasInteligentes alertas={alertas} insights={insights} />
          </TabsContent>

          {/* ── TAB OPERACIONAL ───────────────────────────── */}
          <TabsContent value="operacional" className="space-y-4">
            <OSTendenciaDiaria dados={osPorDia} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BacklogAgingChart
                buckets={backlogAging}
                totalBacklog={indicadores?.backlogQuantidade || 0}
                onBucketClick={handleBacklogBucketClick}
              />
              <AderenciaPreventiva dados={aderenciaDetalhada} />
            </div>
            <EquipConfiabilidadePanel
              equipamentos={topEquipamentosCusto}
              onEquipClick={handleEquipClick}
            />
          </TabsContent>

          {/* ── TAB GERENCIAL ─────────────────────────────── */}
          <TabsContent value="gerencial" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CustosInsightsPanel
                equipamentos={topEquipamentosCusto}
                custoTotal={indicadores?.custoTotalMes || 0}
              />
              <ProdutividadeMecanicosPanel mecanicos={mecanicosDesempenho} />
            </div>
          </TabsContent>

          {/* ── TAB INTELIGÊNCIA ──────────────────────────── */}
          <TabsContent value="inteligencia" className="space-y-4">
            <Card className="border-2 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Motor de Inteligência PCM
                </CardTitle>
                <CardDescription>
                  Análise automática do estado da manutenção — 3 níveis: Dado → Informação → Decisão
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 rounded-lg bg-muted/40 border">
                    <span className="text-2xl font-bold text-primary">{kpis.length}</span>
                    <p className="text-xs text-muted-foreground">KPIs Monitorados</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/40 border">
                    <span className="text-2xl font-bold text-red-500">{alertas.length}</span>
                    <p className="text-xs text-muted-foreground">Alertas Ativos</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/40 border">
                    <span className="text-2xl font-bold text-amber-500">{insights.length}</span>
                    <p className="text-xs text-muted-foreground">Insights Gerados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <AlertasInteligentes alertas={alertas} insights={insights} />
            <KPIMetaReal kpis={kpis} />
          </TabsContent>
        </Tabs>
      )}

      {/* ═══════════ MODO EXPORTAÇÃO PDF/EXCEL ═══════════ */}
      {viewMode === 'export' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Selecione um Relatório</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((report) => {
                const catConfig = getCategoryConfig(report.category);
                return (
                  <Card 
                    key={report.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${selectedReport === report.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedReport(report.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${selectedReport === report.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {report.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{report.title}</h3>
                          <p className="text-sm text-muted-foreground">{report.description}</p>
                          <Badge className={`mt-2 ${catConfig.badge}`}>{catConfig.icon} {report.category}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Configurar Relatório
                </CardTitle>
                <CardDescription>
                  {selectedReport 
                    ? `Configurando: ${reports.find(r => r.id === selectedReport)?.title}`
                    : 'Selecione um relatório ao lado'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Filtrar por TAG (opcional)</Label>
                  <Input placeholder="Ex: COMP-001" value={filterTag} onChange={(e) => setFilterTag(e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Manutenção</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="CORRETIVA">Corretiva</option>
                    <option value="PREVENTIVA">Preventiva</option>
                    <option value="PREDITIVA">Preditiva</option>
                    <option value="INSPECAO">Inspeção</option>
                    <option value="MELHORIA">Melhoria</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="ABERTA">Aberta</option>
                    <option value="EM_ANDAMENTO">Em Andamento</option>
                    <option value="AGUARDANDO_MATERIAL">Aguardando Material</option>
                    <option value="FECHADA">Fechada</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>
                <div className="pt-4 space-y-2">
                  <Button 
                    className="w-full gap-2" 
                    onClick={() => handleGenerateReport('pdf')}
                    disabled={!selectedReport || isGenerating}
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {isGenerating ? 'Gerando...' : 'Gerar PDF'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => handleGenerateReport('excel')}
                    disabled={!selectedReport || isGenerating}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Exportar Excel
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2 text-muted-foreground"
                    onClick={() => setViewMode('dashboard')}
                  >
                    <Eye className="h-4 w-4" />
                    Visualizar online
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Drill-Down Modal */}
      <DrillDownModal
        open={drillDown.open}
        onClose={() => setDrillDown({ open: false, title: '', filter: () => true })}
        title={drillDown.title}
        ordens={drillDownOS}
      />
    </div>
  );
}
