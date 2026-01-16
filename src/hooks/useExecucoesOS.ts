import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ExecucaoOSRow {
  id: string;
  os_id: string;
  mecanico_id: string | null;
  mecanico_nome: string;
  data_execucao: string;
  hora_inicio: string;
  hora_fim: string;
  tempo_execucao: number;
  servico_executado: string;
  custo_mao_obra: number | null;
  custo_materiais: number | null;
  custo_terceiros: number | null;
  custo_total: number | null;
  created_at: string;
}

export interface ExecucaoOSInsert {
  os_id: string;
  mecanico_id?: string | null;
  mecanico_nome: string;
  hora_inicio: string;
  hora_fim: string;
  tempo_execucao: number;
  servico_executado: string;
  custo_mao_obra?: number | null;
  custo_materiais?: number | null;
  custo_terceiros?: number | null;
  custo_total?: number | null;
}

export function useExecucoesOS() {
  return useQuery({
    queryKey: ['execucoes-os'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('execucoes_os')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ExecucaoOSRow[];
    },
  });
}

export function useExecucaoByOSId(osId: string | undefined) {
  return useQuery({
    queryKey: ['execucao-os', osId],
    queryFn: async () => {
      if (!osId) return null;
      
      const { data, error } = await supabase
        .from('execucoes_os')
        .select('*')
        .eq('os_id', osId)
        .maybeSingle();

      if (error) throw error;
      return data as ExecucaoOSRow | null;
    },
    enabled: !!osId,
  });
}

export function useCreateExecucaoOS() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (execucao: ExecucaoOSInsert) => {
      const { data, error } = await supabase
        .from('execucoes_os')
        .insert(execucao)
        .select()
        .single();

      if (error) throw error;
      return data as ExecucaoOSRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execucoes-os'] });
      queryClient.invalidateQueries({ queryKey: ['indicadores'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao registrar execução',
        description: error.message || 'Ocorreu um erro ao registrar a execução.',
        variant: 'destructive',
      });
    },
  });
}
