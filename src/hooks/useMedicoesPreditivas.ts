import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MedicaoPreditivaRow {
  id: string;
  tag: string;
  tipo_medicao: string;
  valor: number;
  unidade: string;
  limite_alerta: number | null;
  limite_critico: number | null;
  status: string | null;
  observacoes: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  equipamento_id: string | null;
  os_gerada_id: string | null;
  created_at: string;
}

export interface MedicaoPreditivaInsert {
  tag: string;
  tipo_medicao: string;
  valor: number;
  unidade: string;
  limite_alerta?: number | null;
  limite_critico?: number | null;
  status?: string | null;
  observacoes?: string | null;
  responsavel_id?: string | null;
  responsavel_nome?: string | null;
  equipamento_id?: string | null;
}

export interface MedicaoPreditivaUpdate {
  tag?: string;
  tipo_medicao?: string;
  valor?: number;
  unidade?: string;
  limite_alerta?: number | null;
  limite_critico?: number | null;
  status?: string | null;
  observacoes?: string | null;
}

export function useMedicoesPreditivas() {
  return useQuery({
    queryKey: ['medicoes_preditivas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medicoes_preditivas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MedicaoPreditivaRow[];
    },
  });
}

export function useMedicoesByTag(tag: string | undefined) {
  return useQuery({
    queryKey: ['medicoes_preditivas', 'tag', tag],
    queryFn: async () => {
      if (!tag) return [];
      
      const { data, error } = await supabase
        .from('medicoes_preditivas')
        .select('*')
        .eq('tag', tag)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MedicaoPreditivaRow[];
    },
    enabled: !!tag,
  });
}

export function useMedicoesAlertas() {
  return useQuery({
    queryKey: ['medicoes_preditivas', 'alertas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medicoes_preditivas')
        .select('*')
        .in('status', ['ALERTA', 'CRITICO'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MedicaoPreditivaRow[];
    },
  });
}

export function useCreateMedicaoPreditiva() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (medicao: MedicaoPreditivaInsert) => {
      const { data, error } = await supabase
        .from('medicoes_preditivas')
        .insert(medicao)
        .select()
        .single();

      if (error) throw error;
      return data as MedicaoPreditivaRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicoes_preditivas'] });
      toast({
        title: 'Medição registrada',
        description: 'Medição preditiva registrada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao registrar medição',
        description: error.message || 'Ocorreu um erro ao registrar a medição.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMedicaoPreditiva() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: MedicaoPreditivaUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('medicoes_preditivas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MedicaoPreditivaRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicoes_preditivas'] });
      toast({
        title: 'Medição atualizada',
        description: 'Medição preditiva atualizada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar medição',
        description: error.message || 'Ocorreu um erro ao atualizar a medição.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteMedicaoPreditiva() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('medicoes_preditivas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicoes_preditivas'] });
      toast({
        title: 'Medição excluída',
        description: 'Medição preditiva excluída com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir medição',
        description: error.message || 'Ocorreu um erro ao excluir a medição.',
        variant: 'destructive',
      });
    },
  });
}
