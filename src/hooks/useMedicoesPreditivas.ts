import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { deleteMaintenanceSchedule, upsertMaintenanceSchedule } from '@/services/maintenanceSchedule';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { useAuth } from '@/contexts/AuthContext';
import { writeAuditLog } from '@/lib/audit';

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
        .order('created_at', { ascending: false })
        .limit(500);

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
        .order('created_at', { ascending: false })
        .limit(500);

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
        .order('created_at', { ascending: false })
        .limit(500);

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['medicoes_preditivas', tenantId] });
      toast({
        title: 'Medição registrada',
        description: 'Medição preditiva registrada com sucesso.',
      });
      writeAuditLog({ action: 'CREATE_MEDICAO_PREDITIVA', table: 'medicoes_preditivas', recordId: data.id, empresaId: tenantId, source: 'useMedicoesPreditivas', metadata: { tag: data.tag, tipo_medicao: data.tipo_medicao } });
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
    mutationFn: async ({ id, previousValues, ...updates }: MedicaoPreditivaUpdate & { id: string; previousValues?: Record<string, unknown> }) => {
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

      // Audit log with before/after diff
      const changedFields: Record<string, { antes: unknown; depois: unknown }> = {};
      if (previousValues) {
        for (const key of Object.keys(updates) as (keyof typeof updates)[]) {
          const prev = previousValues[key];
          const next = (updates as Record<string, unknown>)[key];
          if (prev !== next) {
            changedFields[key] = { antes: prev, depois: next };
          }
        }
      }

      try {
        await writeAuditLog({
          action: 'UPDATE_MEDICAO_PREDITIVA',
          table: 'medicoes_preditivas',
          recordId: id,
          empresaId: tenantId || null,
          severity: 'info',
          source: 'app',
          metadata: {
            campos_alterados: changedFields,
            tag: data.tag,
            tipo_medicao: data.tipo_medicao,
          },
        });
      } catch { /* audit best-effort */ }

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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      await deleteMaintenanceSchedule('preditiva', id, tenantId || undefined);

      const { error } = await supabase
        .from('medicoes_preditivas')
        .delete()
        .eq('id', id)
        .eq('empresa_id', tenantId);

      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['medicoes_preditivas'] });
      toast({
        title: 'Medição excluída',
        description: 'Medição preditiva excluída com sucesso.',
      });
      writeAuditLog({ action: 'DELETE_MEDICAO_PREDITIVA', table: 'medicoes_preditivas', recordId: deletedId, empresaId: tenantId, source: 'useMedicoesPreditivas', severity: 'warning' });
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

export function useHistoricoAlteracoesMedicao(recordId: string | null) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['enterprise_audit_logs', 'medicoes_preditivas', recordId, tenantId],
    queryFn: async () => {
      if (!recordId || !tenantId) return [];

      const { data, error } = await supabase
        .from('enterprise_audit_logs')
        .select('*')
        .eq('empresa_id', tenantId)
        .eq('tabela', 'medicoes_preditivas')
        .eq('registro_id', recordId)
        .limit(500)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        usuario_email: string | null;
        acao: string;
        dados_antes: Record<string, unknown> | null;
        dados_depois: Record<string, unknown> | null;
        diferenca: Record<string, unknown> | null;
        created_at: string;
      }>;
    },
    enabled: !!recordId,
  });
}
