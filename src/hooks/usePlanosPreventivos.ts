import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PlanoPreventivo {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  equipamento_id: string | null;
  tag: string | null;
  tipo_gatilho: 'TEMPO' | 'CICLO' | 'CONDICAO';
  frequencia_dias: number | null;
  frequencia_ciclos: number | null;
  condicao_disparo: string | null;
  ultima_execucao: string | null;
  proxima_execucao: string | null;
  tempo_estimado_min: number;
  especialidade: string | null;
  instrucoes: string | null;
  checklist: any;
  materiais_previstos: any;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanoInsert {
  codigo: string;
  nome: string;
  descricao?: string | null;
  equipamento_id?: string | null;
  tag?: string | null;
  tipo_gatilho?: 'TEMPO' | 'CICLO' | 'CONDICAO';
  frequencia_dias?: number | null;
  tempo_estimado_min?: number;
  especialidade?: string | null;
  instrucoes?: string | null;
  checklist?: any;
}

export function usePlanosPreventivos() {
  return useQuery({
    queryKey: ['planos-preventivos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planos_preventivos')
        .select('*')
        .order('codigo');

      if (error) throw error;
      return data as PlanoPreventivo[];
    },
  });
}

export function usePlanosPreventivosAtivos() {
  return useQuery({
    queryKey: ['planos-preventivos', 'ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planos_preventivos')
        .select('*')
        .eq('ativo', true)
        .order('proxima_execucao');

      if (error) throw error;
      return data as PlanoPreventivo[];
    },
  });
}

export function useCreatePlanoPreventivo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (plano: PlanoInsert) => {
      // Calculate next execution date
      const proximaExecucao = new Date();
      if (plano.frequencia_dias) {
        proximaExecucao.setDate(proximaExecucao.getDate() + plano.frequencia_dias);
      }

      const { data, error } = await supabase
        .from('planos_preventivos')
        .insert({
          ...plano,
          proxima_execucao: proximaExecucao.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as PlanoPreventivo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-preventivos'] });
      queryClient.invalidateQueries({ queryKey: ['document-sequences'] });
      toast({
        title: 'Plano criado',
        description: 'O plano preventivo foi criado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePlanoPreventivo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlanoPreventivo> & { id: string }) => {
      const { data, error } = await supabase
        .from('planos_preventivos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PlanoPreventivo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-preventivos'] });
      toast({
        title: 'Plano atualizado',
        description: 'O plano preventivo foi atualizado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePlanoPreventivo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('planos_preventivos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-preventivos'] });
      toast({
        title: 'Plano excluído',
        description: 'O plano preventivo foi excluído com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
