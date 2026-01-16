import { FileText, FilePlus, FileCheck, Clock, Loader2 } from 'lucide-react';
import { IndicatorCard } from '@/components/dashboard/IndicatorCard';
import { MaintenanceIndicators } from '@/components/dashboard/MaintenanceIndicators';
import { OSStatusBadge } from '@/components/os/OSStatusBadge';
import { OSTypeBadge } from '@/components/os/OSTypeBadge';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useIndicadores } from '@/hooks/useIndicadores';
import { useRecentOrdensServico } from '@/hooks/useOrdensServico';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { user } = useAuth();
  const { data: indicadores, isLoading: loadingIndicadores } = useIndicadores();
  const { data: recentOS, isLoading: loadingOS } = useRecentOrdensServico(5);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const isLoading = loadingIndicadores || loadingOS;

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
      </div>
    );
  }

  const defaultIndicadores = {
    osAbertas: 0,
    osEmAndamento: 0,
    osFechadas: 0,
    tempoMedioExecucao: 0,
    mtbf: 0,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {user?.nome}! Visão geral do sistema de manutenção.
          </p>
        </div>
        <Link to="/os/nova">
          <Button className="gap-2">
            <FilePlus className="h-4 w-4" />
            Nova O.S
          </Button>
        </Link>
      </div>

      {/* Operational Indicators */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Indicadores Operacionais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Maintenance Indicators */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Indicadores de Manutenção</h2>
        <MaintenanceIndicators indicadores={ind} />
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
          <table className="table-industrial">
            <thead>
              <tr>
                <th>Nº O.S</th>
                <th>TAG</th>
                <th>Equipamento</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {recentOS && recentOS.length > 0 ? (
                recentOS.map((os) => (
                  <tr key={os.id}>
                    <td className="font-mono font-medium">{os.numero_os}</td>
                    <td className="font-mono text-primary font-medium">{os.tag}</td>
                    <td>{os.equipamento}</td>
                    <td><OSTypeBadge tipo={os.tipo as any} /></td>
                    <td><OSStatusBadge status={os.status as any} /></td>
                    <td className="text-muted-foreground">{formatDate(os.data_solicitacao)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma ordem de serviço cadastrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
