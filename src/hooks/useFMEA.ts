import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FMEARow {
  id: string;
  equipamento_id: string | null;
  tag: string;
  funcao: string;
  falha_funcional: string;
  modo_falha: string;
  efeito_falha: string | null;
  causa_falha: string | null;
  severidade: number;
  ocorrencia: number;
  deteccao: number;
  rpn: number;
  acao_recomendada: string | null;
  responsavel: string | null;
  prazo: string | null;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';
  plano_preventivo_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FMEAInsert {
  tag: string;
  funcao: string;
  falha_funcional: string;
  modo_falha: string;
  efeito_falha?: string | null;
  causa_falha?: string | null;
  severidade: number;
  ocorrencia: number;
  deteccao: number;
  acao_recomendada?: string | null;
  responsavel?: string | null;
  prazo?: string | null;
  equipamento_id?: string | null;
}

export function useFMEA() {
  return useQuery({
    queryKey: ['fmea'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fmea')
        .select('*')
        .order('rpn', { ascending: false });

      if (error) throw error;
      return data as FMEARow[];
    },
  });
}

export function useFMEAByEquipamento(tag?: string) {
  return useQuery({
    queryKey: ['fmea', 'equipamento', tag],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fmea')
        .select('*')
        .eq('tag', tag!)
        .order('rpn', { ascending: false });

      if (error) throw error;
      return data as FMEARow[];
    },
    enabled: !!tag,
  });
}

export function useCreateFMEA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (fmea: FMEAInsert) => {
      const { data, error } = await supabase
        .from('fmea')
        .insert(fmea)
        .select()
        .single();

      if (error) throw error;
      return data as FMEARow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fmea'] });
      toast({
        title: 'FMEA criado',
        description: 'A análise FMEA foi criada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar FMEA',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateFMEA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FMEARow> & { id: string }) => {
      const { data, error } = await supabase
        .from('fmea')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as FMEARow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fmea'] });
      toast({
        title: 'FMEA atualizado',
        description: 'A análise FMEA foi atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar FMEA',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteFMEA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fmea')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fmea'] });
      toast({
        title: 'FMEA excluído',
        description: 'A análise FMEA foi excluída com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir FMEA',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
