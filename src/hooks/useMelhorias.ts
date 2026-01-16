import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MelhoriaRow {
  id: string;
  numero_melhoria: number;
  titulo: string;
  descricao: string;
  tipo: 'KAIZEN' | 'PROJETO' | 'LICAO_APRENDIDA' | 'SUGESTAO';
  area: string | null;
  equipamento_id: string | null;
  tag: string | null;
  situacao_antes: string | null;
  situacao_depois: string | null;
  beneficios: string | null;
  custo_implementacao: number | null;
  economia_anual: number | null;
  roi_meses: number | null;
  status: 'PROPOSTA' | 'EM_AVALIACAO' | 'APROVADA' | 'EM_IMPLEMENTACAO' | 'IMPLEMENTADA' | 'REJEITADA';
  proponente_nome: string;
  proponente_id: string | null;
  aprovador_nome: string | null;
  aprovador_id: string | null;
  data_aprovacao: string | null;
  data_implementacao: string | null;
  anexos: any;
  created_at: string;
  updated_at: string;
}

export interface MelhoriaInsert {
  titulo: string;
  descricao: string;
  tipo?: 'KAIZEN' | 'PROJETO' | 'LICAO_APRENDIDA' | 'SUGESTAO';
  area?: string | null;
  equipamento_id?: string | null;
  tag?: string | null;
  situacao_antes?: string | null;
  situacao_depois?: string | null;
  beneficios?: string | null;
  custo_implementacao?: number | null;
  economia_anual?: number | null;
  proponente_nome: string;
  proponente_id?: string | null;
}

export function useMelhorias() {
  return useQuery({
    queryKey: ['melhorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('melhorias')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MelhoriaRow[];
    },
  });
}

export function useMelhoriasAprovadas() {
  return useQuery({
    queryKey: ['melhorias', 'aprovadas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('melhorias')
        .select('*')
        .in('status', ['APROVADA', 'EM_IMPLEMENTACAO', 'IMPLEMENTADA'])
        .order('data_aprovacao', { ascending: false });

      if (error) throw error;
      return data as MelhoriaRow[];
    },
  });
}

export function useCreateMelhoria() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (melhoria: MelhoriaInsert) => {
      // Calculate ROI if both costs are provided
      let roi_meses = null;
      if (melhoria.custo_implementacao && melhoria.economia_anual && melhoria.economia_anual > 0) {
        roi_meses = Math.round((melhoria.custo_implementacao / melhoria.economia_anual) * 12);
      }

      const { data, error } = await supabase
        .from('melhorias')
        .insert({
          ...melhoria,
          roi_meses,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MelhoriaRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['melhorias'] });
      toast({
        title: 'Melhoria registrada',
        description: 'A proposta de melhoria foi registrada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao registrar melhoria',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMelhoria() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MelhoriaRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('melhorias')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MelhoriaRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['melhorias'] });
      toast({
        title: 'Melhoria atualizada',
        description: 'A melhoria foi atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar melhoria',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
