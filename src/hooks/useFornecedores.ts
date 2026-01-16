import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FornecedorRow {
  id: string;
  codigo: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  tipo: 'PRESTADOR' | 'FORNECEDOR' | 'AMBOS';
  especialidade: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  avaliacao_media: number;
  total_avaliacoes: number;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FornecedorInsert {
  codigo: string;
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  tipo?: 'PRESTADOR' | 'FORNECEDOR' | 'AMBOS';
  especialidade?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  contato_nome?: string | null;
  contato_telefone?: string | null;
}

export interface ContratoRow {
  id: string;
  numero_contrato: string;
  fornecedor_id: string | null;
  titulo: string;
  descricao: string | null;
  tipo: 'SERVICO' | 'FORNECIMENTO' | 'MISTO';
  valor_total: number | null;
  valor_mensal: number | null;
  data_inicio: string;
  data_fim: string | null;
  sla_atendimento_horas: number | null;
  sla_resolucao_horas: number | null;
  penalidade_descricao: string | null;
  status: 'RASCUNHO' | 'ATIVO' | 'SUSPENSO' | 'ENCERRADO' | 'CANCELADO';
  responsavel_nome: string | null;
  responsavel_id: string | null;
  anexos: any;
  created_at: string;
  updated_at: string;
}

export function useFornecedores() {
  return useQuery({
    queryKey: ['fornecedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .order('razao_social');

      if (error) throw error;
      return data as FornecedorRow[];
    },
  });
}

export function useFornecedoresAtivos() {
  return useQuery({
    queryKey: ['fornecedores', 'ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('ativo', true)
        .order('razao_social');

      if (error) throw error;
      return data as FornecedorRow[];
    },
  });
}

export function useCreateFornecedor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (fornecedor: FornecedorInsert) => {
      const { data, error } = await supabase
        .from('fornecedores')
        .insert(fornecedor)
        .select()
        .single();

      if (error) throw error;
      return data as FornecedorRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast({
        title: 'Fornecedor criado',
        description: 'O fornecedor foi cadastrado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar fornecedor',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateFornecedor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FornecedorRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('fornecedores')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as FornecedorRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast({
        title: 'Fornecedor atualizado',
        description: 'O fornecedor foi atualizado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar fornecedor',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useContratos() {
  return useQuery({
    queryKey: ['contratos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos')
        .select('*, fornecedor:fornecedores(*)')
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      return data as (ContratoRow & { fornecedor: FornecedorRow | null })[];
    },
  });
}

export function useContratosAtivos() {
  return useQuery({
    queryKey: ['contratos', 'ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos')
        .select('*, fornecedor:fornecedores(*)')
        .eq('status', 'ATIVO')
        .order('data_fim');

      if (error) throw error;
      return data as (ContratoRow & { fornecedor: FornecedorRow | null })[];
    },
  });
}

export function useCreateContrato() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (contrato: Omit<ContratoRow, 'id' | 'created_at' | 'updated_at'>) => {
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
        title: 'Contrato criado',
        description: 'O contrato foi cadastrado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar contrato',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateContrato() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContratoRow> & { id: string }) => {
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
        description: 'O contrato foi atualizado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar contrato',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
