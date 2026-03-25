import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { deleteMaintenanceSchedule, upsertMaintenanceSchedule } from '@/services/maintenanceSchedule';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { useAuth } from '@/contexts/AuthContext';

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
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['medicoes_preditivas', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medicoes_preditivas')
        .select('*')
        .eq('empresa_id', tenantId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MedicaoPreditivaRow[];
    },
    enabled: !!tenantId,
  });
}

export function useMedicoesByTag(tag: string | undefined) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['medicoes_preditivas', tenantId, 'tag', tag],
    queryFn: async () => {
      if (!tag) return [];
      
      const { data, error } = await supabase
        .from('medicoes_preditivas')
        .select('*')
        .eq('empresa_id', tenantId!)
        .eq('tag', tag)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MedicaoPreditivaRow[];
    },
    enabled: !!tag && !!tenantId,
  });
}

export function useMedicoesAlertas() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['medicoes_preditivas', tenantId, 'alertas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medicoes_preditivas')
        .select('*')
        .eq('empresa_id', tenantId!)
        .in('status', ['ALERTA', 'CRITICO'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MedicaoPreditivaRow[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateMedicaoPreditiva() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (medicao: MedicaoPreditivaInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const data = await insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('medicoes_preditivas')
            .insert(payload)
            .select()
            .single(),
        { ...medicao, empresa_id: tenantId } as Record<string, unknown>,
      );

      try {
        await upsertMaintenanceSchedule({
          tipo: 'preditiva',
          origemId: data.id,
          empresaId: tenantId,
          equipamentoId: data.equipamento_id,
          titulo: `${data.tag} • ${data.tipo_medicao}`,
          descricao: data.observacoes,
          dataProgramada: data.created_at || new Date().toISOString(),
          status: data.status || 'programado',
          responsavel: data.responsavel_nome,
        });
      } catch { /* schedule sync best-effort */ }

      return data as MedicaoPreditivaRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicoes_preditivas', tenantId] });
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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: MedicaoPreditivaUpdate & { id: string }) => {
      const data = await updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('medicoes_preditivas')
            .update(payload)
            .eq('id', id)
            .select()
            .single(),
        updates as Record<string, unknown>,
      );

      try {
        await upsertMaintenanceSchedule({
          tipo: 'preditiva',
          origemId: data.id,
          empresaId: tenantId!,
          equipamentoId: data.equipamento_id,
          titulo: `${data.tag} • ${data.tipo_medicao}`,
          descricao: data.observacoes,
          dataProgramada: data.created_at || new Date().toISOString(),
          status: data.status || 'programado',
          responsavel: data.responsavel_nome,
        });
      } catch { /* schedule sync best-effort */ }

      return data as MedicaoPreditivaRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicoes_preditivas', tenantId] });
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
      await deleteMaintenanceSchedule('preditiva', id);

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
