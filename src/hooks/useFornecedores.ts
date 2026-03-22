import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';

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
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['fornecedores', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('empresa_id', tenantId)
        .order('razao_social');

      if (error) throw error;
      return data as FornecedorRow[];
    },
    enabled: !!tenantId,
  });
}

export function useFornecedoresAtivos() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['fornecedores', tenantId, 'ativos'],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('empresa_id', tenantId)
        .eq('ativo', true)
        .order('razao_social');

      if (error) throw error;
      return data as FornecedorRow[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateFornecedor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (fornecedor: FornecedorInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('fornecedores')
            .insert(payload)
            .select()
            .single(),
        { ...fornecedor, empresa_id: tenantId } as Record<string, unknown>,
      ) as Promise<FornecedorRow>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores', tenantId] });
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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FornecedorRow> & { id: string }) => {
      return updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('fornecedores')
            .update(payload)
            .eq('id', id)
            .select()
            .single(),
        updates as Record<string, unknown>,
      ) as Promise<FornecedorRow>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores', tenantId] });
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
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['contratos', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const { data, error } = await supabase
        .from('contratos')
        .select('*, fornecedor:fornecedores(*)')
        .eq('empresa_id', tenantId)
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      return data as (ContratoRow & { fornecedor: FornecedorRow | null })[];
    },
    enabled: !!tenantId,
  });
}

export function useContratosAtivos() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['contratos', tenantId, 'ativos'],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const { data, error } = await supabase
        .from('contratos')
        .select('*, fornecedor:fornecedores(*)')
        .eq('empresa_id', tenantId)
        .eq('status', 'ATIVO')
        .order('data_fim');

      if (error) throw error;
      return data as (ContratoRow & { fornecedor: FornecedorRow | null })[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateContrato() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (contrato: Omit<ContratoRow, 'id' | 'created_at' | 'updated_at'>) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const { data, error } = await supabase
        .from('contratos')
        .insert({ ...contrato, empresa_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data as ContratoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos', tenantId] });
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
  const { tenantId } = useAuth();

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
      queryClient.invalidateQueries({ queryKey: ['contratos', tenantId] });
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
