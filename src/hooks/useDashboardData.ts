import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIndicadores } from './useIndicadores';
import { useOrdensServico } from './useOrdensServico';
import { useExecucoesOS } from './useExecucoesOS';
import { format, subMonths, startOfMonth, parseISO, differenceInDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TopEquipmentItem {
  tag: string;
  equipamento: string;
  totalOS: number;
  corretivas: number;
  preventivas: number;
  disponibilidade?: number;
}

interface RecentActivity {
  id: string;
  type: 'os_created' | 'os_closed' | 'preventive_executed' | 'alert' | 'measurement';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  tag?: string;
}

export function useDashboardData() {
  const { data: indicadores, isLoading: loadingIndicadores } = useIndicadores();
  const { data: ordensServico, isLoading: loadingOS } = useOrdensServico();
  const { data: execucoes, isLoading: loadingExec } = useExecucoesOS();

  // OS distribution by type
  const osDistribuicaoPorTipo = useMemo(() => {
    if (!ordensServico) return [];
    
    const counts: Record<string, number> = {};
    ordensServico.forEach(os => {
      counts[os.tipo] = (counts[os.tipo] || 0) + 1;
    });
    
    return Object.entries(counts).map(([tipo, quantidade]) => ({
      tipo,
      quantidade,
    }));
  }, [ordensServico]);

  // OS distribution by status
  const osDistribuicaoPorStatus = useMemo(() => {
    if (!ordensServico) return [];
    
    const counts: Record<string, number> = {};
    ordensServico.forEach(os => {
      counts[os.status] = (counts[os.status] || 0) + 1;
    });
    
    return Object.entries(counts).map(([status, quantidade]) => ({
      status,
      quantidade,
    }));
  }, [ordensServico]);

  // Monthly cost trend
  const custosMensais = useMemo(() => {
    if (!execucoes) return [];
    
    const months: Record<string, { maoObra: number; materiais: number; terceiros: number }> = {};
    
    // Initialize last 6 months
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

  // Backlog statistics
  const backlogStats = useMemo(() => {
    if (!ordensServico) return { urgentes: 0, atrasadas: 0 };
    
    const now = new Date();
    const backlogOS = ordensServico.filter(os => 
      os.status === 'ABERTA' || os.status === 'EM_ANDAMENTO' || os.status === 'AGUARDANDO_MATERIAL'
    );
    
    const urgentes = backlogOS.filter(os => os.prioridade === 'URGENTE').length;
    
    const atrasadas = backlogOS.filter(os => {
      const dataSolicitacao = parseISO(os.data_solicitacao);
      const diasEmAberto = differenceInDays(now, dataSolicitacao);
      return diasEmAberto > 7 && os.status === 'ABERTA';
    }).length;
    
    return { urgentes, atrasadas };
  }, [ordensServico]);

  // Recent OS
  const osRecentes = useMemo(() => {
    if (!ordensServico) return [];
    return ordensServico.slice(0, 8);
  }, [ordensServico]);

  // Calculate preventive compliance rate
  const aderenciaPreventiva = useMemo(() => {
    if (!ordensServico) return 0;
    
    const preventivas = ordensServico.filter(os => os.tipo === 'PREVENTIVA');
    if (preventivas.length === 0) return 100;
    
    const concluidas = preventivas.filter(os => os.status === 'FECHADA').length;
    return (concluidas / preventivas.length) * 100;
  }, [ordensServico]);

  // Corretivas vs Preventivas ratio
  const taxaCorretivaPreventiva = useMemo(() => {
    if (!ordensServico) return { corretivas: 0, preventivas: 0, ratio: 0 };
    
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    
    const osDoMes = ordensServico.filter(os => {
      const dataSolicitacao = parseISO(os.data_solicitacao);
      return dataSolicitacao >= startOfCurrentMonth;
    });
    
    const corretivas = osDoMes.filter(os => os.tipo === 'CORRETIVA').length;
    const preventivas = osDoMes.filter(os => os.tipo === 'PREVENTIVA').length;
    const total = corretivas + preventivas;
    
    return {
      corretivas,
      preventivas,
      ratio: total > 0 ? (preventivas / total) * 100 : 0,
    };
  }, [ordensServico]);

  // Top equipment by OS count
  const topEquipamentos = useMemo((): TopEquipmentItem[] => {
    if (!ordensServico) return [];
    
    const equipCounts: Record<string, { 
      tag: string; 
      equipamento: string; 
      total: number; 
      corretivas: number; 
      preventivas: number;
    }> = {};
    
    ordensServico.forEach(os => {
      if (!equipCounts[os.tag]) {
        equipCounts[os.tag] = { 
          tag: os.tag, 
          equipamento: os.equipamento, 
          total: 0, 
          corretivas: 0, 
          preventivas: 0 
        };
      }
      equipCounts[os.tag].total++;
      if (os.tipo === 'CORRETIVA') equipCounts[os.tag].corretivas++;
      if (os.tipo === 'PREVENTIVA') equipCounts[os.tag].preventivas++;
    });
    
    return Object.values(equipCounts)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(item => ({
        tag: item.tag,
        equipamento: item.equipamento,
        totalOS: item.total,
        corretivas: item.corretivas,
        preventivas: item.preventivas,
      }));
  }, [ordensServico]);

  // Recent activity feed
  const recentActivities = useMemo((): RecentActivity[] => {
    if (!ordensServico) return [];
    
    const activities: RecentActivity[] = [];
    
    // Get recent OS events (last 10)
    const recentOS = ordensServico.slice(0, 10);
    
    recentOS.forEach(os => {
      activities.push({
        id: `os-${os.id}`,
        type: os.status === 'FECHADA' ? 'os_closed' : 'os_created',
        title: os.status === 'FECHADA' 
          ? `O.S #${os.numero_os} Fechada` 
          : `O.S #${os.numero_os} Criada`,
        description: os.problema.substring(0, 100),
        timestamp: os.status === 'FECHADA' && os.data_fechamento 
          ? os.data_fechamento 
          : os.data_solicitacao,
        status: os.prioridade === 'URGENTE' ? 'warning' : 
                os.status === 'FECHADA' ? 'success' : 'info',
        tag: os.tag,
      });
    });
    
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
  }, [ordensServico]);

  // Calculate advanced KPIs
  const advancedKPIs = useMemo(() => {
    if (!ordensServico || !execucoes) {
      return {
        mtbf: 720,
        mttr: 2,
        disponibilidade: 98,
        confiabilidade: 95,
        oee: 85,
      };
    }
    
    // Calculate MTTR from executions
    const temposReparo = execucoes.map(e => e.tempo_execucao / 60); // Convert to hours
    const mttr = temposReparo.length > 0 
      ? temposReparo.reduce((a, b) => a + b, 0) / temposReparo.length 
      : 2;
    
    // Estimate MTBF from corrective OS intervals
    const corretivas = ordensServico
      .filter(os => os.tipo === 'CORRETIVA' && os.status === 'FECHADA')
      .sort((a, b) => new Date(a.data_solicitacao).getTime() - new Date(b.data_solicitacao).getTime());
    
    let mtbf = 720; // Default 30 days in hours
    if (corretivas.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < corretivas.length; i++) {
        const prev = new Date(corretivas[i-1].data_solicitacao);
        const curr = new Date(corretivas[i].data_solicitacao);
        intervals.push(differenceInHours(curr, prev));
      }
      if (intervals.length > 0) {
        mtbf = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      }
    }
    
    // Availability = MTBF / (MTBF + MTTR) * 100
    const disponibilidade = (mtbf / (mtbf + mttr)) * 100;
    
    // Reliability (simplified exponential model)
    const t = 168; // One week in hours
    const lambda = 1 / mtbf; // Failure rate
    const confiabilidade = Math.exp(-lambda * t) * 100;
    
    // OEE simplified (using availability as main factor)
    const oee = disponibilidade * 0.95; // Assuming 95% performance and quality
    
    return {
      mtbf: Math.max(mtbf, 1),
      mttr: Math.max(mttr, 0.1),
      disponibilidade: Math.min(disponibilidade, 100),
      confiabilidade: Math.min(confiabilidade, 100),
      oee: Math.min(oee, 100),
    };
  }, [ordensServico, execucoes]);

  return {
    indicadores,
    osDistribuicaoPorTipo,
    osDistribuicaoPorStatus,
    custosMensais,
    backlogStats,
    osRecentes,
    aderenciaPreventiva,
    taxaCorretivaPreventiva,
    topEquipamentos,
    recentActivities,
    advancedKPIs,
    isLoading: loadingIndicadores || loadingOS || loadingExec,
  };
}
