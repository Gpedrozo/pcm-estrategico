import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MecanicoRow {
  id: string;
  nome: string;
  telefone: string | null;
  tipo: string;
  especialidade: string | null;
  custo_hora: number | null;
  ativo: boolean;
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
}

export interface MecanicoUpdate {
  nome?: string;
  telefone?: string | null;
  tipo?: string;
  especialidade?: string | null;
  custo_hora?: number | null;
  ativo?: boolean;
}

export function useMecanicos() {
  return useQuery({
    queryKey: ['mecanicos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mecanicos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      return data as MecanicoRow[];
    },
  });
}

export function useMecanicosAtivos() {
  return useQuery({
    queryKey: ['mecanicos-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mecanicos')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) throw error;
      return data as MecanicoRow[];
    },
  });
}

export function useCreateMecanico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (mecanico: MecanicoInsert) => {
      const { data, error } = await supabase
        .from('mecanicos')
        .insert(mecanico)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mecanicos'] });
      queryClient.invalidateQueries({ queryKey: ['mecanicos-ativos'] });
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

  return useMutation({
    mutationFn: async ({ id, ...updates }: MecanicoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('mecanicos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mecanicos'] });
      queryClient.invalidateQueries({ queryKey: ['mecanicos-ativos'] });
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

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mecanicos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mecanicos'] });
      queryClient.invalidateQueries({ queryKey: ['mecanicos-ativos'] });
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
