import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIndicadores } from './useIndicadores';
import { useOrdensServico } from './useOrdensServico';
import { useExecucoesOS } from './useExecucoesOS';
import { format, subMonths, startOfMonth, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  return {
    indicadores,
    osDistribuicaoPorTipo,
    osDistribuicaoPorStatus,
    custosMensais,
    backlogStats,
    osRecentes,
    aderenciaPreventiva,
    taxaCorretivaPreventiva,
    isLoading: loadingIndicadores || loadingOS || loadingExec,
  };
}
