import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Indicadores } from '@/types';

export function useIndicadores() {
  return useQuery({
    queryKey: ['indicadores'],
    queryFn: async () => {
      // Fetch all orders to calculate indicators
      const { data: ordensData, error: ordensError } = await supabase
        .from('ordens_servico')
        .select('*');

      if (ordensError) throw ordensError;

      // Fetch executions for time calculations
      const { data: execucoesData, error: execucoesError } = await supabase
        .from('execucoes_os')
        .select('*');

      if (execucoesError) throw execucoesError;

      const ordens = ordensData || [];
      const execucoes = execucoesData || [];

      // Calculate operational indicators
      const osAbertas = ordens.filter(os => os.status === 'ABERTA').length;
      const osEmAndamento = ordens.filter(os => 
        os.status === 'EM_ANDAMENTO' || os.status === 'AGUARDANDO_MATERIAL'
      ).length;
      
      // Get closed orders from current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const osFechadas = ordens.filter(os => {
        if (os.status !== 'FECHADA' || !os.data_fechamento) return false;
        const fechamento = new Date(os.data_fechamento);
        return fechamento >= startOfMonth;
      }).length;

      // Calculate average execution time
      const tempoMedioExecucao = execucoes.length > 0
        ? Math.round(execucoes.reduce((acc, ex) => acc + (ex.tempo_execucao || 0), 0) / execucoes.length)
        : 0;

      // Calculate backlog (open + in progress)
      const backlogOrdens = ordens.filter(os => 
        os.status !== 'FECHADA' && os.status !== 'CANCELADA'
      );
      const backlogQuantidade = backlogOrdens.length;
      const backlogTempo = backlogOrdens.reduce((acc, os) => acc + (os.tempo_estimado || 0), 0) / 60; // hours
      const backlogSemanas = backlogTempo / 40; // assuming 40h work week

      // Calculate monthly costs
      const custoMaoObraMes = execucoes.reduce((acc, ex) => acc + (Number(ex.custo_mao_obra) || 0), 0);
      const custoMateriaisMes = execucoes.reduce((acc, ex) => acc + (Number(ex.custo_materiais) || 0), 0);
      const custoTerceirosMes = execucoes.reduce((acc, ex) => acc + (Number(ex.custo_terceiros) || 0), 0);
      const custoTotalMes = custoMaoObraMes + custoMateriaisMes + custoTerceirosMes;

      // Calculate MTTR (Mean Time To Repair) in hours
      const closedWithExecution = execucoes.filter(ex => ex.tempo_execucao > 0);
      const mttr = closedWithExecution.length > 0
        ? closedWithExecution.reduce((acc, ex) => acc + ex.tempo_execucao, 0) / closedWithExecution.length / 60
        : 0;

      // MTBF calculation would require failure history - using estimate
      const mtbf = 720; // Default: 30 days in hours

      // Availability = MTBF / (MTBF + MTTR)
      const disponibilidade = mtbf > 0 ? (mtbf / (mtbf + mttr)) * 100 : 100;

      // Planning adherence - calculate based on preventive vs total
      const preventivas = ordens.filter(os => os.tipo === 'PREVENTIVA').length;
      const totalOrdens = ordens.length;
      const aderenciaProgramacao = totalOrdens > 0 ? (preventivas / totalOrdens) * 100 : 0;

      const indicadores: Indicadores = {
        osAbertas,
        osEmAndamento,
        osFechadas,
        tempoMedioExecucao,
        mtbf,
        mttr: Math.round(mttr * 10) / 10,
        disponibilidade: Math.round(disponibilidade * 10) / 10,
        backlogQuantidade,
        backlogTempo: Math.round(backlogTempo * 10) / 10,
        backlogSemanas: Math.round(backlogSemanas * 10) / 10,
        aderenciaProgramacao: Math.round(aderenciaProgramacao * 10) / 10,
        custoTotalMes,
        custoMaoObraMes,
        custoMateriaisMes,
        custoTerceirosMes,
      };

      return indicadores;
    },
  });
}
