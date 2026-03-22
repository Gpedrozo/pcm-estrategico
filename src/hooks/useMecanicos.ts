import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { useAuth } from '@/contexts/AuthContext';

export interface MecanicoRow {
  id: string;
  nome: string;
  telefone: string | null;
  tipo: string;
  especialidade: string | null;
  custo_hora: number | null;
  ativo: boolean;
  codigo_acesso?: string | null;
  senha_acesso?: string | null;
  escala_trabalho?: string | null;
  folgas_planejadas?: string | null;
  ferias_inicio?: string | null;
  ferias_fim?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MecanicoInsert {
  nome: string;
  telefone?: string | null;
  tipo?: string;
  especialidade?: string | null;
  custo_hora?: number | null;
  ativo?: boolean;
  codigo_acesso?: string | null;
  senha_acesso?: string | null;
  escala_trabalho?: string | null;
  folgas_planejadas?: string | null;
  ferias_inicio?: string | null;
  ferias_fim?: string | null;
}

export interface MecanicoUpdate {
  nome?: string;
  telefone?: string | null;
  tipo?: string;
  especialidade?: string | null;
  custo_hora?: number | null;
  ativo?: boolean;
  codigo_acesso?: string | null;
  senha_acesso?: string | null;
  escala_trabalho?: string | null;
  folgas_planejadas?: string | null;
  ferias_inicio?: string | null;
  ferias_fim?: string | null;
}

export function useMecanicos() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['mecanicos', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mecanicos')
        .select('*')
        .eq('empresa_id', tenantId!)
        .order('nome', { ascending: true });

      if (error) throw error;
      return (data || []) as MecanicoRow[];
    },
  });
}

export function useMecanicosAtivos() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['mecanicos-ativos', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mecanicos')
        .select('*')
        .eq('empresa_id', tenantId!)
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) throw error;
      return (data || []) as MecanicoRow[];
    },
  });
}

export function useCreateMecanico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (mecanico: MecanicoInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('mecanicos')
            .insert(payload)
            .select()
            .single(),
        { empresa_id: tenantId, ...mecanico } as Record<string, unknown>,
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mecanicos', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['mecanicos-ativos', tenantId] });
      toast({
        title: 'Mecânico Cadastrado',
        description: `${data.nome} foi cadastrado com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao cadastrar',
        description: error.message || 'Ocorreu um erro ao cadastrar o mecânico.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMecanico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: MecanicoUpdate & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      return updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('mecanicos')
            .update(payload)
            .eq('id', id)
            .eq('empresa_id', tenantId)
            .select()
            .single(),
        updates as Record<string, unknown>,
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mecanicos', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['mecanicos-ativos', tenantId] });
      toast({
        title: 'Mecânico Atualizado',
        description: `${data.nome} foi atualizado com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Ocorreu um erro ao atualizar o mecânico.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteMecanico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const { error } = await supabase
        .from('mecanicos')
        .delete()
        .eq('id', id)
        .eq('empresa_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mecanicos', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['mecanicos-ativos', tenantId] });
      toast({
        title: 'Mecânico Excluído',
        description: 'O mecânico foi removido com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Ocorreu um erro ao excluir o mecânico.',
        variant: 'destructive',
      });
    },
  });
}
