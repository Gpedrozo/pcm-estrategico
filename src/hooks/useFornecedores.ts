import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { writeAuditLog } from '@/lib/audit';

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
  codigo?: string;
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
  observacoes?: string | null;
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
        .order('razao_social')
        .limit(500);

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
        .order('razao_social')
        .limit(500);

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

      // Sincronizar nome = razao_social para backward compat (trigger também faz isso)
      const payload: Record<string, unknown> = {
        ...fornecedor,
        empresa_id: tenantId,
        nome: fornecedor.razao_social,
      };
      return insertWithColumnFallback(
        async (p) =>
          supabase
            .from('fornecedores')
            .insert(p)
            .select()
            .single(),
        payload,
      ) as Promise<FornecedorRow>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores', tenantId] });
      writeAuditLog({ action: 'CREATE_FORNECEDOR', table: 'fornecedores', empresaId: tenantId, source: 'useFornecedores' });
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
      writeAuditLog({ action: 'UPDATE_FORNECEDOR', table: 'fornecedores', empresaId: tenantId, source: 'useFornecedores' });
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
