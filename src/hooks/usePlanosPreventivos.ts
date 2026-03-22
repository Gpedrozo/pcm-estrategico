import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { deleteMaintenanceSchedule, upsertMaintenanceSchedule } from '@/services/maintenanceSchedule';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { useAuth } from '@/contexts/AuthContext';

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
  tolerancia_antes_dias?: number | null;
  tolerancia_depois_dias?: number | null;
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
  tolerancia_antes_dias?: number | null;
  tolerancia_depois_dias?: number | null;
}

export function usePlanosPreventivos() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['planos-preventivos', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planos_preventivos')
        .select('*')
        .eq('empresa_id', tenantId!)
        .order('codigo');

      if (error) throw error;
      return data as PlanoPreventivo[];
    },
  });
}

export function usePlanosPreventivosAtivos() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['planos-preventivos', tenantId, 'ativos'],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planos_preventivos')
        .select('*')
        .eq('empresa_id', tenantId!)
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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (plano: PlanoInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      // Calculate next execution date
      const proximaExecucao = new Date();
      if (plano.frequencia_dias) {
        proximaExecucao.setDate(proximaExecucao.getDate() + plano.frequencia_dias);
      }

      const data = await insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('planos_preventivos')
            .insert(payload)
            .select()
            .single(),
        {
          empresa_id: tenantId,
          ...plano,
          proxima_execucao: proximaExecucao.toISOString(),
        } as Record<string, unknown>,
      );

      await upsertMaintenanceSchedule({
        tipo: 'preventiva',
        origemId: data.id,
        empresaId: tenantId!,
        equipamentoId: data.equipamento_id,
        titulo: `${data.codigo} • ${data.nome}`,
        descricao: data.descricao,
        dataProgramada: data.proxima_execucao || new Date().toISOString(),
        status: data.ativo ? 'programado' : 'inativo',
        responsavel: data.responsavel_nome,
      });
      return data as PlanoPreventivo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-preventivos', tenantId] });
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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlanoPreventivo> & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const data = await updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('planos_preventivos')
            .update(payload)
            .eq('id', id)
            .eq('empresa_id', tenantId)
            .select()
            .single(),
        updates as Record<string, unknown>,
      );

      await upsertMaintenanceSchedule({
        tipo: 'preventiva',
        origemId: data.id,
        empresaId: tenantId!,
        equipamentoId: data.equipamento_id,
        titulo: `${data.codigo} • ${data.nome}`,
        descricao: data.descricao,
        dataProgramada: data.proxima_execucao || new Date().toISOString(),
        status: data.ativo ? 'programado' : 'inativo',
        responsavel: data.responsavel_nome,
      });
      return data as PlanoPreventivo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-preventivos', tenantId] });
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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      await deleteMaintenanceSchedule('preventiva', id);

      const { error } = await supabase
        .from('planos_preventivos')
        .delete()
        .eq('id', id)
        .eq('empresa_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-preventivos', tenantId] });
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
