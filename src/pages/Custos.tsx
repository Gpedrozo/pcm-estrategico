import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Package, 
  Building2, 
  PieChart,
  BarChart3,
  Download,
  Calendar
} from 'lucide-react';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useExecucoesOS } from '@/hooks/useExecucoesOS';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Custos() {
  const [activeTab, setActiveTab] = useState('resumo');
  const [selectedPeriod, setSelectedPeriod] = useState('3');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  const { data: ordensServico, isLoading: loadingOS } = useOrdensServico();
  const { data: execucoes, isLoading: loadingExec } = useExecucoesOS();
  const { data: equipamentos, isLoading: loadingEquip } = useEquipamentos();

  // Calculate costs from executions
  const custos = useMemo(() => {
    if (!execucoes) return { maoObra: 0, materiais: 0, terceiros: 0, total: 0 };
    
    const months = parseInt(selectedPeriod);
    const startDate = startOfMonth(subMonths(new Date(), months - 1));
    
    const filteredExec = execucoes.filter(exec => {
      const execDate = parseISO(exec.data_execucao);
      return execDate >= startDate;
    });
    
    const maoObra = filteredExec.reduce((acc, e) => acc + (e.custo_mao_obra || 0), 0);
    const materiais = filteredExec.reduce((acc, e) => acc + (e.custo_materiais || 0), 0);
    const terceiros = filteredExec.reduce((acc, e) => acc + (e.custo_terceiros || 0), 0);
    
    return {
      maoObra,
      materiais,
      terceiros,
      total: maoObra + materiais + terceiros,
    };
  }, [execucoes, selectedPeriod]);

  // Calculate cost by equipment
  const custosPorEquipamento = useMemo(() => {
    if (!execucoes || !ordensServico) return [];
    
    const custoMap: { [tag: string]: { maoObra: number; materiais: number; terceiros: number; qtdOS: number } } = {};
    
    execucoes.forEach(exec => {
      const os = ordensServico.find(o => o.id === exec.os_id);
      if (!os) return;
      
      if (!custoMap[os.tag]) {
        custoMap[os.tag] = { maoObra: 0, materiais: 0, terceiros: 0, qtdOS: 0 };
      }
      
      custoMap[os.tag].maoObra += exec.custo_mao_obra || 0;
      custoMap[os.tag].materiais += exec.custo_materiais || 0;
      custoMap[os.tag].terceiros += exec.custo_terceiros || 0;
      custoMap[os.tag].qtdOS += 1;
    });
    
    return Object.entries(custoMap)
      .map(([tag, custos]) => ({
        tag,
        equipamento: equipamentos?.find(e => e.tag === tag)?.nome || tag,
        ...custos,
        total: custos.maoObra + custos.materiais + custos.terceiros,
      }))
      .sort((a, b) => b.total - a.total);
  }, [execucoes, ordensServico, equipamentos]);

  // Monthly trend
  const custosMensais = useMemo(() => {
    if (!execucoes) return [];
    
    const months: { [key: string]: { maoObra: number; materiais: number; terceiros: number } } = {};
    
    for (let i = 5; i >= 0; i--) {
      const month = format(subMonths(new Date(), i), 'yyyy-MM');
      months[month] = { maoObra: 0, materiais: 0, terceiros: 0 };
    }
    
    execucoes.forEach(exec => {
      const month = format(parseISO(exec.data_execucao), 'yyyy-MM');
      if (months[month]) {
        months[month].maoObra += exec.custo_mao_obra || 0;
        months[month].materiais += exec.custo_materiais || 0;
        months[month].terceiros += exec.custo_terceiros || 0;
      }
    });
    
    return Object.entries(months).map(([month, custos]) => ({
      month,
      monthLabel: format(parseISO(`${month}-01`), 'MMM/yy', { locale: ptBR }),
      ...custos,
      total: custos.maoObra + custos.materiais + custos.terceiros,
    }));
  }, [execucoes]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isLoading = loadingOS || loadingExec || loadingEquip;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Custos de Manutenção</h1>
          <p className="text-muted-foreground">Análise de custos por categoria, equipamento e período</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Último mês</SelectItem>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Main Cost Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Custo Total</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(custos.total)}</p>
            <p className="text-xs text-muted-foreground">Últimos {selectedPeriod} meses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-info" />
              <span className="text-sm text-muted-foreground">Mão de Obra</span>
            </div>
            <p className="text-2xl font-bold text-info">{formatCurrency(custos.maoObra)}</p>
            <p className="text-xs text-muted-foreground">
              {custos.total > 0 ? ((custos.maoObra / custos.total) * 100).toFixed(0) : 0}% do total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-success" />
              <span className="text-sm text-muted-foreground">Materiais</span>
            </div>
            <p className="text-2xl font-bold text-success">{formatCurrency(custos.materiais)}</p>
            <p className="text-xs text-muted-foreground">
              {custos.total > 0 ? ((custos.materiais / custos.total) * 100).toFixed(0) : 0}% do total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-warning" />
              <span className="text-sm text-muted-foreground">Terceiros</span>
            </div>
            <p className="text-2xl font-bold text-warning">{formatCurrency(custos.terceiros)}</p>
            <p className="text-xs text-muted-foreground">
              {custos.total > 0 ? ((custos.terceiros / custos.total) * 100).toFixed(0) : 0}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="resumo" className="gap-2">
            <PieChart className="h-4 w-4" />
            Resumo
          </TabsTrigger>
          <TabsTrigger value="equipamentos" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Por Equipamento
          </TabsTrigger>
          <TabsTrigger value="tendencia" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Tendência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cost Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Custos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Mão de Obra</span>
                      <span className="font-medium">{formatCurrency(custos.maoObra)}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-info rounded-full transition-all" 
                        style={{ width: `${custos.total > 0 ? (custos.maoObra / custos.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Materiais</span>
                      <span className="font-medium">{formatCurrency(custos.materiais)}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-success rounded-full transition-all" 
                        style={{ width: `${custos.total > 0 ? (custos.materiais / custos.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Terceiros</span>
                      <span className="font-medium">{formatCurrency(custos.terceiros)}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-warning rounded-full transition-all" 
                        style={{ width: `${custos.total > 0 ? (custos.terceiros / custos.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top 5 Equipment by Cost */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Equipamentos (Custo)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {custosPorEquipamento.slice(0, 5).map((item, index) => (
                    <div key={item.tag} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                        <div>
                          <p className="font-mono text-primary font-medium">{item.tag}</p>
                          <p className="text-xs text-muted-foreground">{item.equipamento}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(item.total)}</p>
                        <p className="text-xs text-muted-foreground">{item.qtdOS} OS</p>
                      </div>
                    </div>
                  ))}
                  {custosPorEquipamento.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      Nenhum custo registrado
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="equipamentos" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <table className="table-industrial">
                <thead>
                  <tr>
                    <th>TAG</th>
                    <th>Equipamento</th>
                    <th>Mão de Obra</th>
                    <th>Materiais</th>
                    <th>Terceiros</th>
                    <th>Total</th>
                    <th>Qtd OS</th>
                  </tr>
                </thead>
                <tbody>
                  {custosPorEquipamento.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum custo registrado</td></tr>
                  ) : (
                    custosPorEquipamento.map(item => (
                      <tr key={item.tag}>
                        <td className="font-mono text-primary font-medium">{item.tag}</td>
                        <td>{item.equipamento}</td>
                        <td>{formatCurrency(item.maoObra)}</td>
                        <td>{formatCurrency(item.materiais)}</td>
                        <td>{formatCurrency(item.terceiros)}</td>
                        <td className="font-bold">{formatCurrency(item.total)}</td>
                        <td><Badge variant="outline">{item.qtdOS}</Badge></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tendencia" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolução Mensal de Custos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {custosMensais.map(month => (
                  <div key={month.month} className="border-b border-border pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{month.monthLabel}</span>
                      </div>
                      <span className="text-lg font-bold">{formatCurrency(month.total)}</span>
                    </div>
                    <div className="flex gap-1 h-6">
                      {month.total > 0 && (
                        <>
                          <div 
                            className="bg-info rounded" 
                            style={{ width: `${(month.maoObra / month.total) * 100}%` }}
                            title={`Mão de Obra: ${formatCurrency(month.maoObra)}`}
                          />
                          <div 
                            className="bg-success rounded" 
                            style={{ width: `${(month.materiais / month.total) * 100}%` }}
                            title={`Materiais: ${formatCurrency(month.materiais)}`}
                          />
                          <div 
                            className="bg-warning rounded" 
                            style={{ width: `${(month.terceiros / month.total) * 100}%` }}
                            title={`Terceiros: ${formatCurrency(month.terceiros)}`}
                          />
                        </>
                      )}
                      {month.total === 0 && (
                        <div className="w-full bg-muted rounded" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-info rounded" />
                  <span>Mão de Obra</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-success rounded" />
                  <span>Materiais</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-warning rounded" />
                  <span>Terceiros</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}