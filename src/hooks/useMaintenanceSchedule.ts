import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { writeAuditLog } from '@/lib/audit';
import {
  deleteMaintenanceSchedule,
  type MaintenanceScheduleRow,
  type MaintenanceScheduleUpsertInput,
  upsertMaintenanceSchedule,
} from '@/services/maintenanceSchedule';

export function useMaintenanceSchedule(fromIso?: string, toIso?: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['maintenance-schedule', tenantId, fromIso, toIso],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) return [];

      let tenantQuery = supabase
        .from('maintenance_schedule')
        .select('*')
        .eq('empresa_id', tenantId)
        .order('data_programada', { ascending: true })
        .limit(500);

      if (fromIso) tenantQuery = tenantQuery.gte('data_programada', fromIso);
      if (toIso) tenantQuery = tenantQuery.lte('data_programada', toIso);

      const { data, error } = await tenantQuery;
      if (error) throw error;
      return (data || []) as MaintenanceScheduleRow[];
    },
  });
}

export function useUpsertMaintenanceSchedule() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (input: MaintenanceScheduleUpsertInput) => upsertMaintenanceSchedule(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedule'] });
      writeAuditLog({ action: 'UPSERT_MAINTENANCE_SCHEDULE', table: 'maintenance_schedule', empresaId: tenantId, source: 'useMaintenanceSchedule' });
    },
  });
}

export function useDeleteMaintenanceSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ tipo, origemId }: { tipo: 'preventiva' | 'lubrificacao' | 'inspecao' | 'preditiva'; origemId: string }) =>
      deleteMaintenanceSchedule(tipo, origemId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedule'] });
      writeAuditLog({ action: 'DELETE_MAINTENANCE_SCHEDULE', table: 'maintenance_schedule', recordId: variables.origemId, empresaId: tenantId, source: 'useMaintenanceSchedule', severity: 'warning', metadata: { tipo: variables.tipo } });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover item da agenda',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMaintenanceStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status, dataProgramada }: { id: string; status?: string; dataProgramada?: string }) => {
      const payload: Record<string, string> = {};
      if (status) payload.status = status;
      if (dataProgramada) payload.data_programada = dataProgramada;

      const { data, error } = await supabase
        .from('maintenance_schedule')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MaintenanceScheduleRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedule'] });
      writeAuditLog({ action: 'UPDATE_MAINTENANCE_STATUS', table: 'maintenance_schedule', recordId: data.id, empresaId: tenantId, source: 'useMaintenanceSchedule', metadata: { status: data.status } });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar agenda',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
