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
  Wrench, Clock, DollarSign, FileSpreadsheet, Loader2,
  Brain, Eye, Filter, Zap,
  Users, FileSignature, Activity
} from 'lucide-react';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useIndicadores } from '@/hooks/useIndicadores';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { useRelatoriosInteligentes } from '@/hooks/useRelatoriosInteligentes';
import { useRelatoriosExpandidos } from '@/hooks/useRelatoriosExpandidos';
import { format, subDays, differenceInDays, parseISO } from 'date-fns';
import { 
  generateOSReportPDF, generateIndicadoresPDF, generateExcelReport,
  generateCustosPDF, generateBacklogPDF, generatePreventivasPDF,
  generateEquipamentosPDF, generateMecanicosPDF, generateExecutivoPDF,
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
  // Novos
  HistoricoKPIsTendencia,
  CustosDetalhadosPanel,
  EstoqueMaterialPanel,
  AnaliseParadasPanel,
  SolicitacoesAnalisePanel,
  FMEAMatrizRiscoPanel,
  ManutencaoPreditivaPanel,
  LubrificacaoRelatorioPanel,
  RCAAnalisePanel,
  HistoricoMecanicosPanel,
  FornecedoresContratoPanel,
  SSMAConformidadePanel,
  CorretivaVsPreventivaCurvaPanel,
} from '@/components/relatorios';

type ReportType = 'os_periodo' | 'indicadores' | 'custos' | 'backlog' | 'preventivas' | 'equipamentos' | 'mecanicos' | 'executivo';
type ViewMode = 'dashboard' | 'export';
type CategoryTab = 'executivo' | 'operacional' | 'gerencial' | 'inteligencia' | 'custos' | 'manutencao' | 'rh_ssma' | 'gestao';

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
  const [observacoes, setObservacoes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [activeTab, setActiveTab] = useState<CategoryTab>('executivo');
  const [drillDown, setDrillDown] = useState<{ open: boolean; title: string; filter: (os: any) => boolean }>({ open: false, title: '', filter: () => true });
  
  const { data: ordensServico, isLoading: loadingOS } = useOrdensServico();
  const { data: indicadores, isLoading: loadingIndicadores } = useIndicadores();
  const { data: empresa } = useDadosEmpresa();
  const { toast } = useToast();

  // Dados expandidos para os novos 15 relatórios
  const expanded = useRelatoriosExpandidos(dateFrom, dateTo);

  // Motor de inteligência — conectado aos filtros de período
  const {
    kpis, alertas, insights, backlogAging, topEquipamentosCusto,
    mecanicosDesempenho, aderenciaDetalhada, osPorDia, resumoExecutivo,
  } = useRelatoriosInteligentes(dateFrom, dateTo);

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

  // Contagem de OS filtradas (preview antes de gerar)
  const previewCount = useMemo(() => {
    if (!selectedReport || !ordensServico) return 0;
    return ordensServico.filter(os => {
      const d = os.data_solicitacao?.slice(0, 10);
      if (!d || d < dateFrom || d > dateTo) return false;
      if (filterTag && !os.tag?.includes(filterTag.toUpperCase())) return false;
      if (filterTipo && os.tipo !== filterTipo) return false;
      if (filterStatus && os.status !== filterStatus) return false;
      if (selectedReport === 'backlog') return os.status !== 'FECHADA' && os.status !== 'CANCELADA';
      if (selectedReport === 'preventivas') return os.tipo === 'PREVENTIVA';
      return true;
    }).length;
  }, [selectedReport, ordensServico, dateFrom, dateTo, filterTag, filterTipo, filterStatus]);

  const handleGenerateReport = async (fmt: 'pdf' | 'excel') => {
    if (!selectedReport) return;
    setIsGenerating(true);
    
    try {
      const reportConfig = reports.find(r => r.id === selectedReport);
      const options = {
        title: reportConfig?.title || '',
        dateFrom, dateTo,
        filterTag: filterTag || undefined,
        filterTipo: filterTipo || undefined,
        filterStatus: filterStatus || undefined,
        observacoes: observacoes || undefined,
        // Dados completos do tenant
        empresaNome: empresa?.nome_fantasia || empresa?.razao_social || '',
        empresaRazaoSocial: empresa?.razao_social || '',
        empresaCnpj: empresa?.cnpj || '',
        empresaIE: empresa?.inscricao_estadual || '',
        empresaTelefone: empresa?.telefone || '',
        empresaWhatsapp: empresa?.whatsapp || '',
        empresaEmail: empresa?.email || '',
        empresaSite: empresa?.site || '',
        empresaEndereco: empresa?.endereco || '',
        empresaCidade: empresa?.cidade || '',
        empresaEstado: empresa?.estado || '',
        empresaCep: empresa?.cep || '',
        empresaResponsavelNome: empresa?.responsavel_nome || '',
        empresaResponsavelCargo: empresa?.responsavel_cargo || '',
        logoUrl: empresa?.logo_os_url || empresa?.logo_url || '',
        layoutVersion: '3.0',
      };

      if (fmt === 'pdf') {
        switch (selectedReport) {
          case 'indicadores':
            await generateIndicadoresPDF(indicadores, options);
            break;
          case 'custos':
            await generateCustosPDF(ordensServico || [], expanded.execucoes, indicadores, options);
            break;
          case 'backlog':
            await generateBacklogPDF(ordensServico || [], options);
            break;
          case 'preventivas':
            await generatePreventivasPDF(ordensServico || [], aderenciaDetalhada, options);
            break;
          case 'equipamentos':
            await generateEquipamentosPDF(ordensServico || [], options);
            break;
          case 'mecanicos':
            await generateMecanicosPDF(expanded.execucoes, mecanicosDesempenho, options);
            break;
          case 'executivo':
            await generateExecutivoPDF(indicadores, resumoExecutivo, kpis, alertas, ordensServico || [], options);
            break;
          default:
            await generateOSReportPDF(ordensServico || [], options);
            break;
        }
      } else {
        // Excel — colunas específicas por tipo
        const excelColumns: Record<string, { header: string; key: string }[]> = {
          os_periodo: [
            { header: 'Nº OS', key: 'numero_os' }, { header: 'TAG', key: 'tag' },
            { header: 'Equipamento', key: 'equipamento' }, { header: 'Tipo', key: 'tipo' },
            { header: 'Prioridade', key: 'prioridade' }, { header: 'Status', key: 'status' },
            { header: 'Solicitante', key: 'solicitante' }, { header: 'Problema', key: 'problema' },
            { header: 'Data Abertura', key: 'data_solicitacao' }, { header: 'Custo Real (R$)', key: 'custo_real' },
          ],
          backlog: [
            { header: 'Nº OS', key: 'numero_os' }, { header: 'TAG', key: 'tag' },
            { header: 'Equipamento', key: 'equipamento' }, { header: 'Tipo', key: 'tipo' },
            { header: 'Prioridade', key: 'prioridade' }, { header: 'Status', key: 'status' },
            { header: 'Data Abertura', key: 'data_solicitacao' },
          ],
          equipamentos: [
            { header: 'TAG', key: 'tag' }, { header: 'Equipamento', key: 'equipamento' },
            { header: 'Tipo', key: 'tipo' }, { header: 'Status', key: 'status' },
            { header: 'Custo Real (R$)', key: 'custo_real' }, { header: 'Data', key: 'data_solicitacao' },
          ],
          mecanicos: [
            { header: 'Nome', key: 'nome' }, { header: 'OS Executadas', key: 'osExecutadas' },
            { header: 'Horas Trabalhadas', key: 'horasTrabalhadas' }, { header: 'Eficiência (%)', key: 'eficiencia' },
          ],
        };

        let data: any[] = [];
        const cols = excelColumns[selectedReport] || excelColumns.os_periodo;

        if (selectedReport === 'mecanicos') {
          data = mecanicosDesempenho;
        } else if (selectedReport === 'backlog') {
          data = (ordensServico || []).filter(o => o.status !== 'FECHADA' && o.status !== 'CANCELADA');
        } else {
          data = (ordensServico || []).filter(os => {
            const d = os.data_solicitacao?.slice(0, 10);
            if (!d || d < dateFrom || d > dateTo) return false;
            if (filterTag && !os.tag?.includes(filterTag.toUpperCase())) return false;
            if (filterTipo && os.tipo !== filterTipo) return false;
            if (filterStatus && os.status !== filterStatus) return false;
            if (selectedReport === 'preventivas') return os.tipo === 'PREVENTIVA';
            return true;
          });
        }

        generateExcelReport(data.slice(0, 5000), cols, `${selectedReport}_${dateFrom}_${dateTo}`);
      }
      
      toast({ title: 'Relatório Gerado', description: `Arquivo ${fmt.toUpperCase()} baixado com sucesso.` });
    } catch (err: any) {
      toast({ title: 'Erro ao Gerar', description: err.message || 'Erro desconhecido.', variant: 'destructive' });
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

  const isLoading = loadingOS || loadingIndicadores || expanded.isLoading;

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
        <>
        {/* Filtros do Dashboard */}
        <div className="flex flex-wrap items-end gap-3 bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Período:
          </div>
          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 h-8 text-sm" />
          </div>
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(format(subDays(new Date(), 7), 'yyyy-MM-dd')); setDateTo(format(new Date(), 'yyyy-MM-dd')); }}>7d</Button>
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(format(subDays(new Date(), 30), 'yyyy-MM-dd')); setDateTo(format(new Date(), 'yyyy-MM-dd')); }}>30d</Button>
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(format(subDays(new Date(), 90), 'yyyy-MM-dd')); setDateTo(format(new Date(), 'yyyy-MM-dd')); }}>90d</Button>
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(format(subDays(new Date(), 365), 'yyyy-MM-dd')); setDateTo(format(new Date(), 'yyyy-MM-dd')); }}>1 ano</Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoryTab)} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 w-full">
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
            <TabsTrigger value="custos" className="gap-1.5">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Custos</span>
            </TabsTrigger>
            <TabsTrigger value="manutencao" className="gap-1.5">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Manutenção</span>
            </TabsTrigger>
            <TabsTrigger value="rh_ssma" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">RH & SSMA</span>
            </TabsTrigger>
            <TabsTrigger value="gestao" className="gap-1.5">
              <FileSignature className="h-4 w-4" />
              <span className="hidden sm:inline">Gestão</span>
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

          {/* ── TAB CUSTOS ────────────────────────────────────── */}
          <TabsContent value="custos" className="space-y-4">
            <CustosDetalhadosPanel
              execucoes={expanded.execucoes}
              ordensServico={expanded.ordensServico}
              movimentacoes={expanded.movimentacoesMat}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />
            <EstoqueMaterialPanel
              materiais={expanded.materiais}
              movimentacoes={expanded.movimentacoesMat}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />
            <CorretivaVsPreventivaCurvaPanel
              ordensServico={expanded.ordensServico}
              execucoes={expanded.execucoes}
            />
          </TabsContent>

          {/* ── TAB MANUTENÇÃO ─────────────────────────────────── */}
          <TabsContent value="manutencao" className="space-y-4">
            <HistoricoKPIsTendencia
              ordensServico={expanded.ordensServico}
              execucoes={expanded.execucoes}
            />
            <AnaliseParadasPanel
              ordensServico={expanded.ordensServico}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />
            <SolicitacoesAnalisePanel
              solicitacoes={expanded.solicitacoes}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FMEAMatrizRiscoPanel fmeas={expanded.fmeas} />
              <RCAAnalisePanel
                rcas={expanded.rcas}
                dateFrom={dateFrom}
                dateTo={dateTo}
              />
            </div>
            <ManutencaoPreditivaPanel
              medicoes={expanded.medicoes}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />
            <LubrificacaoRelatorioPanel
              planos={expanded.planosLubrif}
              execucoes={[]}
              estoque={expanded.lubrificantes}
              movimentacoes={[]}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />
          </TabsContent>

          {/* ── TAB RH & SSMA ──────────────────────────────────── */}
          <TabsContent value="rh_ssma" className="space-y-4">
            <HistoricoMecanicosPanel execucoes={expanded.execucoes} />
            <SSMAConformidadePanel treinamentos={expanded.treinamentos} />
          </TabsContent>

          {/* ── TAB GESTÃO ─────────────────────────────────────── */}
          <TabsContent value="gestao" className="space-y-4">
            <FornecedoresContratoPanel contratos={expanded.contratos} />
          </TabsContent>
        </Tabs>
        </>
      )}

      {/* ═══════════ MODO EXPORTAÇÃO PDF/EXCEL ═══════════ */}
      {viewMode === 'export' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Coluna esquerda: seleção de relatório ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Dados da empresa (preview do cabeçalho) */}
            {empresa && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {(empresa.logo_os_url || empresa.logo_url) && (
                      <img src={empresa.logo_os_url || empresa.logo_url || ''} alt="Logo" className="h-10 w-auto object-contain rounded" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">{empresa.nome_fantasia || empresa.razao_social}</p>
                      <p className="text-xs text-muted-foreground">
                        {empresa.cnpj && `CNPJ: ${empresa.cnpj}`}
                        {empresa.cidade && ` • ${empresa.cidade}/${empresa.estado || ''}`}
                        {empresa.telefone && ` • Tel: ${empresa.telefone}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {empresa.responsavel_nome && `Responsável: ${empresa.responsavel_nome}`}
                        {empresa.responsavel_cargo && ` — ${empresa.responsavel_cargo}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-auto text-xs">Dados carregados do cadastro</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <h2 className="text-lg font-semibold">Selecione o Tipo de Relatório</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reports.map((report) => {
                const catConfig = getCategoryConfig(report.category);
                const hasDedicatedGenerator = !['os_periodo'].includes(report.id);
                const isSelected = selectedReport === report.id;
                return (
                  <Card
                    key={report.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:border-primary/40'}`}
                    onClick={() => setSelectedReport(report.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-lg flex-shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {report.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-semibold text-sm leading-tight">{report.title}</h3>
                            {hasDedicatedGenerator && (
                              <span title="Gerador dedicado" className="text-green-600 text-xs">✓</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-tight">{report.description}</p>
                          <Badge className={`mt-2 text-xs ${catConfig.badge}`}>{catConfig.icon} {report.category}</Badge>
                        </div>
                        {isSelected && (
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 rounded-full bg-primary mt-1" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="text-green-600 font-bold">✓</span>
              Gerador dedicado — relatório 100% condizente com o título e dados
            </p>
          </div>

          {/* ── Coluna direita: configuração e ação ── */}
          <div>
            <Card className="sticky top-4 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="h-4 w-4 text-primary" />
                  Configuração do Relatório
                </CardTitle>
                {selectedReport ? (
                  <CardDescription className="font-medium text-primary">
                    {reports.find(r => r.id === selectedReport)?.title}
                    {previewCount > 0 && (
                      <span className="ml-2 text-muted-foreground font-normal">
                        ({previewCount} {previewCount === 1 ? 'registro' : 'registros'})
                      </span>
                    )}
                  </CardDescription>
                ) : (
                  <CardDescription>Selecione um relatório ao lado</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">

                {/* Período */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Data Inicial</Label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data Final</Label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>

                {/* Atalhos de período */}
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { label: '7d', days: 7 }, { label: '30d', days: 30 },
                    { label: '90d', days: 90 }, { label: '1 ano', days: 365 },
                  ].map(({ label, days }) => (
                    <Button
                      key={label} variant="outline" size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => {
                        setDateFrom(format(subDays(new Date(), days), 'yyyy-MM-dd'));
                        setDateTo(format(new Date(), 'yyyy-MM-dd'));
                      }}
                    >{label}</Button>
                  ))}
                </div>

                {/* Filtros opcionais */}
                <div className="space-y-1">
                  <Label className="text-xs">TAG (opcional)</Label>
                  <Input
                    placeholder="Ex: COMP-001"
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value.toUpperCase())}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Tipo de Manutenção</Label>
                  <select
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value)}
                  >
                    <option value="">Todos os tipos</option>
                    <option value="CORRETIVA">Corretiva</option>
                    <option value="PREVENTIVA">Preventiva</option>
                    <option value="PREDITIVA">Preditiva</option>
                    <option value="INSPECAO">Inspeção</option>
                    <option value="MELHORIA">Melhoria</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <select
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">Todos os status</option>
                    <option value="ABERTA">Aberta</option>
                    <option value="EM_ANDAMENTO">Em Andamento</option>
                    <option value="AGUARDANDO_MATERIAL">Aguardando Material</option>
                    <option value="FECHADA">Fechada</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>

                {/* Campo de observações (impresso no cabeçalho) */}
                <div className="space-y-1">
                  <Label className="text-xs">Observações (exibidas no PDF)</Label>
                  <Input
                    placeholder="Ex: Relatório para reunião gerencial de abril..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                {/* Preview de contagem */}
                {selectedReport && previewCount > 0 && (
                  <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                    <p className="text-xs text-primary font-medium">
                      📊 {previewCount} {previewCount === 1 ? 'registro encontrado' : 'registros encontrados'}
                      {' '}para o período selecionado
                    </p>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="pt-2 space-y-2">
                  <Button
                    className="w-full gap-2 h-10"
                    onClick={() => handleGenerateReport('pdf')}
                    disabled={!selectedReport || isGenerating}
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {isGenerating ? 'Gerando PDF...' : 'Gerar PDF Profissional'}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2 h-9"
                    onClick={() => handleGenerateReport('excel')}
                    disabled={!selectedReport || isGenerating}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Exportar para Excel
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2 text-muted-foreground"
                    onClick={() => setViewMode('dashboard')}
                  >
                    <Eye className="h-4 w-4" />
                    Ver Dashboard Interativo
                  </Button>
                </div>

                {/* Info do emissor */}
                {empresa?.nome_fantasia && (
                  <p className="text-[10px] text-muted-foreground text-center pt-1">
                    Emitido por: {empresa.nome_fantasia}
                    {empresa?.responsavel_nome && ` • ${empresa.responsavel_nome}`}
                  </p>
                )}
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
