import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, Download, Calendar, BarChart3, PieChart, TrendingUp,
  Wrench, Clock, DollarSign, AlertTriangle, FileSpreadsheet, Printer, Loader2
} from 'lucide-react';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useIndicadores } from '@/hooks/useIndicadores';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { format, subDays } from 'date-fns';
import { 
  generateOSReportPDF, generateIndicadoresPDF, generateExcelReport,
  generatePreventivaReportPDF, generatePreditivaReportPDF,
  generateInspecaoReportPDF, generateFMEAReportPDF, generateRCAReportPDF,
  generateSSMAReportPDF
} from '@/lib/reportGenerator';
import { usePlanosPreventivos } from '@/hooks/usePlanosPreventivos';
import { useMedicoesPreditivas } from '@/hooks/useMedicoesPreditivas';
import { useInspecoes } from '@/hooks/useInspecoes';
import { useFMEA } from '@/hooks/useFMEA';
import { useRCAs } from '@/hooks/useRCA';
import { useSSMA } from '@/hooks/useSSMA';
import { useToast } from '@/hooks/use-toast';

type ReportType = 'os_periodo' | 'indicadores' | 'custos' | 'backlog' | 'preventivas' | 'equipamentos' | 'mecanicos' | 'executivo';

interface ReportConfig {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'operacional' | 'gerencial' | 'executivo';
}

const reports: ReportConfig[] = [
  { id: 'os_periodo', title: 'Ordens de Servico por Periodo', description: 'Listagem detalhada de todas as OS em um periodo especifico', icon: <FileText className="h-6 w-6" />, category: 'operacional' },
  { id: 'indicadores', title: 'Indicadores KPI', description: 'MTBF, MTTR, Disponibilidade e Backlog', icon: <BarChart3 className="h-6 w-6" />, category: 'gerencial' },
  { id: 'preventivas', title: 'Manutencao Preventiva', description: 'Planos preventivos, aderencia e proximas execucoes', icon: <Calendar className="h-6 w-6" />, category: 'operacional' },
  { id: 'equipamentos', title: 'Manutencao Preditiva', description: 'Medicoes, tendencias e alertas de condicao', icon: <Wrench className="h-6 w-6" />, category: 'operacional' },
  { id: 'backlog', title: 'Inspecoes', description: 'Inspecoes realizadas, anomalias e checklist', icon: <Clock className="h-6 w-6" />, category: 'operacional' },
  { id: 'mecanicos', title: 'FMEA', description: 'Analise de modo e efeito de falha com RPN', icon: <TrendingUp className="h-6 w-6" />, category: 'gerencial' },
  { id: 'custos', title: 'Analise de Causa Raiz', description: 'RCA - 5 Porques e analises de falha', icon: <DollarSign className="h-6 w-6" />, category: 'gerencial' },
  { id: 'executivo', title: 'SSMA', description: 'Seguranca, Saude e Meio Ambiente - incidentes e taxas', icon: <PieChart className="h-6 w-6" />, category: 'executivo' },
];

export default function Relatorios() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterTag, setFilterTag] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { data: ordensServico, isLoading: loadingOS } = useOrdensServico();
  const { data: indicadores, isLoading: loadingIndicadores } = useIndicadores();
  const { data: empresa } = useDadosEmpresa();
  const { data: planos } = usePlanosPreventivos();
  const { data: medicoes } = useMedicoesPreditivas();
  const { data: inspecoes } = useInspecoes();
  const { data: fmeas } = useFMEA();
  const { data: rcas } = useRCA();
  const { data: incidentes } = useSSMA();
  const { toast } = useToast();

  const handleGenerateReport = async (fmt: 'pdf' | 'excel') => {
    if (!selectedReport) return;
    setIsGenerating(true);
    
    try {
      const options = {
        title: reports.find(r => r.id === selectedReport)?.title || '',
        dateFrom, dateTo, filterTag,
        empresaNome: empresa?.nome_fantasia || empresa?.razao_social || 'PCM Estratégico',
        logoUrl: empresa?.logo_relatorio_url || '',
      };

      if (fmt === 'pdf') {
        switch (selectedReport) {
          case 'indicadores':
            generateIndicadoresPDF(indicadores, options);
            break;
          case 'preventivas':
            generatePreventivaReportPDF(planos || [], options);
            break;
          case 'equipamentos':
            generatePreditivaReportPDF(medicoes || [], options);
            break;
          case 'backlog':
            generateInspecaoReportPDF(inspecoes || [], options);
            break;
          case 'mecanicos':
            generateFMEAReportPDF(fmeas || [], options);
            break;
          case 'custos':
            generateRCAReportPDF(rcas || [], options);
            break;
          case 'executivo':
            generateSSMAReportPDF(incidentes || [], options);
            break;
          default:
            generateOSReportPDF(ordensServico || [], options);
            break;
        }
      } else {
        // Excel
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
          if (d < dateFrom || d > dateTo) return false;
          if (filterTag && !os.tag.includes(filterTag)) return false;
          return true;
        });
        
        generateExcelReport(filtered, osColumns, `Relatorio_${selectedReport}_${dateFrom}`);
      }
      
      toast({ title: 'Relatório Gerado', description: `Arquivo ${fmt.toUpperCase()} baixado com sucesso.` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Erro ao gerar relatório.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'operacional': return 'bg-info/10 text-info';
      case 'gerencial': return 'bg-warning/10 text-warning';
      case 'executivo': return 'bg-primary/10 text-primary';
      default: return '';
    }
  };

  const isLoading = loadingOS || loadingIndicadores;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Central de Relatórios</h1>
          <p className="text-muted-foreground">Geração de relatórios operacionais, gerenciais e executivos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Selecione um Relatório</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => (
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
                      <Badge className={`mt-2 ${getCategoryBadge(report.category)}`}>{report.category}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Estatísticas Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total OS</span>
              </div>
              <p className="text-2xl font-bold">{ordensServico?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                <span className="text-sm text-muted-foreground">MTTR</span>
              </div>
              <p className="text-2xl font-bold">{indicadores?.mttr?.toFixed(1) || 0}h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <span className="text-sm text-muted-foreground">Disponibilidade</span>
              </div>
              <p className="text-2xl font-bold">{indicadores?.disponibilidade?.toFixed(1) || 0}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="text-sm text-muted-foreground">Backlog</span>
              </div>
              <p className="text-2xl font-bold">{indicadores?.backlogQuantidade || 0}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
