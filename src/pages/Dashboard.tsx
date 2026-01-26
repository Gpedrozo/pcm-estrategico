import { Link } from 'react-router-dom';
import { 
  FileText, 
  FilePlus, 
  FileCheck, 
  Clock, 
  Activity, 
  Gauge, 
  Target,
  TrendingUp,
  DollarSign,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';

// Import new dashboard components
import { IndicatorCard } from '@/components/dashboard/IndicatorCard';
import { KPIGaugeCard } from '@/components/dashboard/KPIGaugeCard';
import { OSDistributionChart } from '@/components/dashboard/OSDistributionChart';
import { OSByStatusChart } from '@/components/dashboard/OSByStatusChart';
import { CostTrendChart } from '@/components/dashboard/CostTrendChart';
import { BacklogSummary } from '@/components/dashboard/BacklogSummary';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { OSStatusBadge } from '@/components/os/OSStatusBadge';
import { OSTypeBadge } from '@/components/os/OSTypeBadge';

export default function Dashboard() {
  const { user } = useAuth();
  const { 
    indicadores, 
    osDistribuicaoPorTipo,
    osDistribuicaoPorStatus,
    custosMensais,
    backlogStats,
    osRecentes,
    aderenciaPreventiva,
    taxaCorretivaPreventiva,
    isLoading 
  } = useDashboardData();

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const defaultIndicadores = {
    osAbertas: 0,
    osEmAndamento: 0,
    osFechadas: 0,
    tempoMedioExecucao: 0,
    mtbf: 720,
    mttr: 0,
    disponibilidade: 100,
    backlogQuantidade: 0,
    backlogTempo: 0,
    backlogSemanas: 0,
    aderenciaProgramacao: 0,
    custoTotalMes: 0,
    custoMaoObraMes: 0,
    custoMateriaisMes: 0,
    custoTerceirosMes: 0,
  };

  const ind = indicadores || defaultIndicadores;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard PCM</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {user?.nome}! Visão geral da manutenção industrial.
          </p>
        </div>
        <Link to="/os/nova">
          <Button className="gap-2">
            <FilePlus className="h-4 w-4" />
            Nova O.S
          </Button>
        </Link>
      </div>

      {/* Quick Actions */}
      <QuickActions osAbertas={ind.osAbertas} />

      {/* Operational Indicators */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Indicadores Operacionais</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <IndicatorCard
            title="O.S Abertas"
            value={ind.osAbertas}
            subtitle="Aguardando atendimento"
            icon={FileText}
            variant="warning"
          />
          <IndicatorCard
            title="Em Andamento"
            value={ind.osEmAndamento}
            subtitle="Em execução"
            icon={FilePlus}
            variant="info"
          />
          <IndicatorCard
            title="O.S Fechadas"
            value={ind.osFechadas}
            subtitle="Este mês"
            icon={FileCheck}
            variant="success"
          />
          <IndicatorCard
            title="Tempo Médio"
            value={formatMinutes(ind.tempoMedioExecucao)}
            subtitle="Tempo de execução"
            icon={Clock}
            variant="primary"
          />
        </div>
      </div>

      {/* KPI Indicators */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Indicadores de Desempenho (KPIs)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPIGaugeCard
            title="MTBF"
            value={ind.mtbf}
            unit="h"
            min={0}
            max={1000}
            target={720}
            icon={Clock}
            description="Tempo Médio Entre Falhas"
          />
          <KPIGaugeCard
            title="MTTR"
            value={ind.mttr}
            unit="h"
            min={0}
            max={8}
            target={2}
            thresholds={{ warning: 4, critical: 6 }}
            icon={Activity}
            description="Tempo Médio Para Reparo"
          />
          <KPIGaugeCard
            title="Disponibilidade"
            value={ind.disponibilidade}
            unit="%"
            min={0}
            max={100}
            target={95}
            icon={Gauge}
            description="MTBF / (MTBF + MTTR)"
          />
          <KPIGaugeCard
            title="Aderência PM"
            value={aderenciaPreventiva}
            unit="%"
            min={0}
            max={100}
            target={90}
            icon={Target}
            description="Execução de Preventivas"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Trend */}
        <div className="lg:col-span-2">
          <CostTrendChart data={custosMensais} title="Evolução de Custos (6 meses)" />
        </div>
        
        {/* Backlog Summary */}
        <BacklogSummary
          backlogQuantidade={ind.backlogQuantidade}
          backlogTempo={ind.backlogTempo}
          backlogSemanas={ind.backlogSemanas}
          urgentes={backlogStats.urgentes}
          atrasadas={backlogStats.atrasadas}
          metaSemanas={2}
        />
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OSDistributionChart data={osDistribuicaoPorTipo} title="Distribuição por Tipo de OS" />
        <OSByStatusChart data={osDistribuicaoPorStatus} title="OS por Status" />
      </div>

      {/* Cost Summary and Preventive Ratio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Custo Total Mês</span>
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {formatCurrency(ind.custoTotalMes)}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">M.O</p>
              <p className="font-medium text-info">{formatCurrency(ind.custoMaoObraMes)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Mat.</p>
              <p className="font-medium text-success">{formatCurrency(ind.custoMateriaisMes)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Terc.</p>
              <p className="font-medium text-warning">{formatCurrency(ind.custoTerceirosMes)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-success/10">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Ratio Prev/Corr</span>
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {taxaCorretivaPreventiva.ratio.toFixed(0)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Preventivas este mês</p>
          <div className="mt-3 flex gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Preventivas</p>
              <p className="font-medium text-success">{taxaCorretivaPreventiva.preventivas}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Corretivas</p>
              <p className="font-medium text-destructive">{taxaCorretivaPreventiva.corretivas}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-info/10">
              <Calendar className="h-5 w-5 text-info" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Backlog (Semanas)</span>
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {ind.backlogSemanas.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {ind.backlogQuantidade} OS • {ind.backlogTempo.toFixed(0)}h acumuladas
          </p>
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                ind.backlogSemanas <= 2 ? 'bg-success' : 
                ind.backlogSemanas <= 4 ? 'bg-warning' : 'bg-destructive'
              }`}
              style={{ width: `${Math.min((ind.backlogSemanas / 4) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-warning/10">
              <Activity className="h-5 w-5 text-warning" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Aderência Prog.</span>
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {ind.aderenciaProgramacao.toFixed(0)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Execução vs Programação</p>
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                ind.aderenciaProgramacao >= 90 ? 'bg-success' : 
                ind.aderenciaProgramacao >= 70 ? 'bg-warning' : 'bg-destructive'
              }`}
              style={{ width: `${ind.aderenciaProgramacao}%` }}
            />
          </div>
        </div>
      </div>

      {/* Recent Work Orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Ordens de Serviço Recentes</h2>
          <Link to="/os/historico" className="text-sm text-primary hover:underline">
            Ver todas →
          </Link>
        </div>
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
                </tr>
              </thead>
              <tbody>
                {osRecentes && osRecentes.length > 0 ? (
                  osRecentes.map((os) => (
                    <tr key={os.id}>
                      <td className="font-mono font-medium">{os.numero_os}</td>
                      <td className="font-mono text-primary font-medium">{os.tag}</td>
                      <td className="max-w-[150px] truncate">{os.equipamento}</td>
                      <td><OSTypeBadge tipo={os.tipo as any} /></td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          os.prioridade === 'URGENTE' ? 'bg-destructive/10 text-destructive' :
                          os.prioridade === 'ALTA' ? 'bg-warning/10 text-warning' :
                          os.prioridade === 'MEDIA' ? 'bg-info/10 text-info' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {os.prioridade}
                        </span>
                      </td>
                      <td><OSStatusBadge status={os.status as any} /></td>
                      <td className="text-muted-foreground">{formatDate(os.data_solicitacao)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhuma ordem de serviço cadastrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
