import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContratoRow {
  id: string;
  numero_contrato: string;
  titulo: string;
  descricao: string | null;
  fornecedor_id: string | null;
  tipo: string | null;
  status: string | null;
  data_inicio: string;
  data_fim: string | null;
  valor_total: number | null;
  valor_mensal: number | null;
  sla_atendimento_horas: number | null;
  sla_resolucao_horas: number | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  penalidade_descricao: string | null;
  anexos: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface ContratoInsert {
  numero_contrato: string;
  titulo: string;
  descricao?: string | null;
  fornecedor_id?: string | null;
  tipo?: string | null;
  status?: string | null;
  data_inicio: string;
  data_fim?: string | null;
  valor_total?: number | null;
  valor_mensal?: number | null;
  sla_atendimento_horas?: number | null;
  sla_resolucao_horas?: number | null;
  responsavel_nome?: string | null;
  penalidade_descricao?: string | null;
}

export interface ContratoUpdate {
  numero_contrato?: string;
  titulo?: string;
  descricao?: string | null;
  tipo?: string | null;
  status?: string | null;
  data_fim?: string | null;
  valor_total?: number | null;
  valor_mensal?: number | null;
  sla_atendimento_horas?: number | null;
  sla_resolucao_horas?: number | null;
  responsavel_nome?: string | null;
  penalidade_descricao?: string | null;
}

export function useContratos() {
  return useQuery({
    queryKey: ['contratos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos')
        .select(`
          *,
          fornecedor:fornecedores(razao_social, nome_fantasia)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (ContratoRow & { fornecedor: { razao_social: string; nome_fantasia: string | null } | null })[];
    },
  });
}

export function useContratosByFornecedor(fornecedorId: string | undefined) {
  return useQuery({
    queryKey: ['contratos', 'fornecedor', fornecedorId],
    queryFn: async () => {
      if (!fornecedorId) return [];
      
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('fornecedor_id', fornecedorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContratoRow[];
    },
    enabled: !!fornecedorId,
  });
}

export function useContratosAtivos() {
  return useQuery({
    queryKey: ['contratos', 'ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos')
        .select(`
          *,
          fornecedor:fornecedores(razao_social, nome_fantasia)
        `)
        .eq('status', 'ATIVO')
        .order('data_fim', { ascending: true });

      if (error) throw error;
      return data as (ContratoRow & { fornecedor: { razao_social: string; nome_fantasia: string | null } | null })[];
    },
  });
}

export function useCreateContrato() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (contrato: ContratoInsert) => {
      const { data, error } = await supabase
        .from('contratos')
        .insert(contrato)
        .select()
        .single();

      if (error) throw error;
      return data as ContratoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({
        title: 'Contrato cadastrado',
        description: 'Contrato cadastrado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cadastrar contrato',
        description: error.message || 'Ocorreu um erro ao cadastrar o contrato.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateContrato() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ContratoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('contratos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ContratoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({
        title: 'Contrato atualizado',
        description: 'Contrato atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar contrato',
        description: error.message || 'Ocorreu um erro ao atualizar o contrato.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteContrato() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contratos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({
        title: 'Contrato excluído',
        description: 'Contrato excluído com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir contrato',
        description: error.message || 'Ocorreu um erro ao excluir o contrato.',
        variant: 'destructive',
      });
    },
  });
}
