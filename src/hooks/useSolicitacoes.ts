import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SolicitacaoRow {
  id: string;
  numero_solicitacao: number;
  equipamento_id: string | null;
  tag: string;
  solicitante_nome: string;
  solicitante_setor: string | null;
  descricao_falha: string;
  impacto: 'ALTO' | 'MEDIO' | 'BAIXO';
  classificacao: 'EMERGENCIAL' | 'URGENTE' | 'PROGRAMAVEL';
  status: 'PENDENTE' | 'APROVADA' | 'CONVERTIDA' | 'REJEITADA' | 'CANCELADA';
  os_id: string | null;
  sla_horas: number;
  data_limite: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SolicitacaoInsert {
  tag: string;
  solicitante_nome: string;
  solicitante_setor?: string | null;
  descricao_falha: string;
  impacto?: 'ALTO' | 'MEDIO' | 'BAIXO';
  classificacao?: 'EMERGENCIAL' | 'URGENTE' | 'PROGRAMAVEL';
  equipamento_id?: string | null;
  observacoes?: string | null;
}

export function useSolicitacoes() {
  return useQuery({
    queryKey: ['solicitacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes_manutencao')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SolicitacaoRow[];
    },
  });
}

export function useSolicitacoesPendentes() {
  return useQuery({
    queryKey: ['solicitacoes', 'pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes_manutencao')
        .select('*')
        .in('status', ['PENDENTE', 'APROVADA'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SolicitacaoRow[];
    },
  });
}

export function useCreateSolicitacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (solicitacao: SolicitacaoInsert) => {
      // Calculate SLA based on classification
      const slaMap = { EMERGENCIAL: 2, URGENTE: 8, PROGRAMAVEL: 72 };
      const slaHoras = slaMap[solicitacao.classificacao || 'PROGRAMAVEL'];
      const dataLimite = new Date();
      dataLimite.setHours(dataLimite.getHours() + slaHoras);

      const { data, error } = await supabase
        .from('solicitacoes_manutencao')
        .insert({
          ...solicitacao,
          sla_horas: slaHoras,
          data_limite: dataLimite.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as SolicitacaoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
      toast({
        title: 'Solicitação criada',
        description: 'A solicitação foi registrada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar solicitação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSolicitacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SolicitacaoRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('solicitacoes_manutencao')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SolicitacaoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
      toast({
        title: 'Solicitação atualizada',
        description: 'A solicitação foi atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar solicitação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
