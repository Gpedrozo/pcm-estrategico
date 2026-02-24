import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OrdemServicoRow {
  id: string;
  numero_os: number;
  tipo: string;
  prioridade: string;
  tag: string;
  equipamento: string;
  solicitante: string;
  problema: string;
  data_solicitacao: string;
  status: string;
  data_fechamento: string | null;
  tempo_estimado: number | null;
  custo_estimado: number | null;
  modo_falha: string | null;
  causa_raiz: string | null;
  acao_corretiva: string | null;
  licoes_aprendidas: string | null;
  usuario_abertura: string | null;
  usuario_fechamento: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrdemServicoInsert {
  tipo: string;
  prioridade?: string;
  tag: string;
  equipamento: string;
  solicitante: string;
  problema: string;
  tempo_estimado?: number | null;
  custo_estimado?: number | null;
  usuario_abertura?: string | null;
}

export interface OrdemServicoUpdate {
  status?: string;
  data_fechamento?: string | null;
  usuario_fechamento?: string | null;
  modo_falha?: string | null;
  causa_raiz?: string | null;
  acao_corretiva?: string | null;
  licoes_aprendidas?: string | null;
}

export function useOrdensServico() {
  return useQuery({
    queryKey: ['ordens-servico'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .order('numero_os', { ascending: false });

      if (error) throw error;
      return data as OrdemServicoRow[];
    },
  });
}

export function useRecentOrdensServico(limit = 5) {
  return useQuery({
    queryKey: ['ordens-servico-recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .order('data_solicitacao', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as OrdemServicoRow[];
    },
  });
}

export function usePendingOrdensServico() {
  return useQuery({
    queryKey: ['ordens-servico-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .neq('status', 'FECHADA')
        .neq('status', 'CANCELADA')
        .order('prioridade', { ascending: true })
        .order('data_solicitacao', { ascending: true });

      if (error) throw error;
      return data as OrdemServicoRow[];
    },
  });
}

export function useCreateOrdemServico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (os: OrdemServicoInsert) => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .insert(os)
        .select()
        .single();

      if (error) throw error;
      return data as OrdemServicoRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-recent'] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-pending'] });
      queryClient.invalidateQueries({ queryKey: ['indicadores'] });
      queryClient.invalidateQueries({ queryKey: ['document-sequences'] });
      toast({
        title: 'O.S Criada com Sucesso!',
        description: `Ordem de Serviço nº ${data.numero_os} foi registrada.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar O.S',
        description: error.message || 'Ocorreu um erro ao criar a ordem de serviço.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateOrdemServico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: OrdemServicoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as OrdemServicoRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-recent'] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-pending'] });
      queryClient.invalidateQueries({ queryKey: ['indicadores'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar O.S',
        description: error.message || 'Ocorreu um erro ao atualizar a ordem de serviço.',
        variant: 'destructive',
      });
    },
  });
}
