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

export type ExpandedScheduleRow = MaintenanceScheduleRow & {
  /** true when this is a virtual recurrence projection, not a real DB row */
  virtual?: boolean;
  /** index of the recurrence (0 = master) */
  recurrence_index?: number;
};

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

/** Fetch all active schedules and expand recurrence projections within [fromIso, toIso]. */
export function useMaintenanceScheduleExpanded(fromIso?: string, toIso?: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['maintenance-schedule-expanded', tenantId, fromIso, toIso],
    enabled: Boolean(tenantId) && Boolean(fromIso) && Boolean(toIso),
    queryFn: async () => {
      if (!tenantId || !fromIso || !toIso) return [];

      const viewStart = new Date(fromIso);
      const viewEnd = new Date(toIso);

      // 1) Fetch ALL active schedules for this tenant (not filtered by date)
      const { data: schedules, error: sErr } = await supabase
        .from('maintenance_schedule')
        .select('*')
        .eq('empresa_id', tenantId)
        .order('data_programada', { ascending: true })
        .limit(500);
      if (sErr) throw sErr;
      if (!schedules || schedules.length === 0) return [];

      // 2) Fetch periodicidade from lubrificacao plans
      const lubIds = schedules.filter(s => s.tipo === 'lubrificacao').map(s => s.origem_id);
      const prevIds = schedules.filter(s => s.tipo === 'preventiva').map(s => s.origem_id);

      const lubPlans: Record<string, { periodicidade: number; tipo_periodicidade: string }> = {};
      const prevPlans: Record<string, { frequencia_dias: number }> = {};

      if (lubIds.length > 0) {
        const { data: lubs } = await supabase
          .from('planos_lubrificacao')
          .select('id,periodicidade,tipo_periodicidade,ativo')
          .eq('empresa_id', tenantId)
          .in('id', lubIds);
        (lubs || []).forEach(l => {
          if (l.ativo && l.periodicidade > 0) {
            lubPlans[l.id] = { periodicidade: l.periodicidade, tipo_periodicidade: l.tipo_periodicidade || 'dias' };
          }
        });
      }

      if (prevIds.length > 0) {
        const { data: prevs } = await supabase
          .from('planos_preventivos')
          .select('id,frequencia_dias,ativo')
          .eq('empresa_id', tenantId)
          .in('id', prevIds);
        (prevs || []).forEach(p => {
          if (p.ativo && p.frequencia_dias && p.frequencia_dias > 0) {
            prevPlans[p.id] = { frequencia_dias: p.frequencia_dias };
          }
        });
      }

      // 3) Expand recurrences
      const result: ExpandedScheduleRow[] = [];

      // Build a set of real (materialized) schedule keys to avoid duplicate virtual projections
      const realScheduleKeys = new Set<string>();
      for (const sched of schedules as MaintenanceScheduleRow[]) {
        if (sched.data_programada) {
          const dayKey = sched.data_programada.slice(0, 10);
          realScheduleKeys.add(`${sched.origem_id}_${dayKey}`);
        }
      }

      for (const sched of schedules as MaintenanceScheduleRow[]) {
        if (!sched.data_programada) continue;
        const baseDate = new Date(sched.data_programada);
        if (isNaN(baseDate.getTime())) continue;
        let intervalDays = 0;

        if (sched.tipo === 'lubrificacao' && lubPlans[sched.origem_id]) {
          const plan = lubPlans[sched.origem_id];
          if (plan.tipo_periodicidade === 'dias') intervalDays = plan.periodicidade;
          else if (plan.tipo_periodicidade === 'semanas') intervalDays = plan.periodicidade * 7;
          else if (plan.tipo_periodicidade === 'meses') intervalDays = plan.periodicidade * 30;
          else if (plan.tipo_periodicidade === 'horas') intervalDays = Math.max(1, Math.round(plan.periodicidade / 24));
        } else if (sched.tipo === 'preventiva' && prevPlans[sched.origem_id]) {
          intervalDays = prevPlans[sched.origem_id].frequencia_dias;
        }

        // If no recurrence or interval too small, just include the master if in range
        if (intervalDays < 1) {
          if (baseDate >= viewStart && baseDate <= viewEnd) {
            result.push({ ...sched, virtual: false, recurrence_index: 0 });
          }
          continue;
        }

        // Generate occurrences from baseDate forwards and backwards within view range
        // Forwards from baseDate
        let idx = 0;
        let d = new Date(baseDate);
        while (d <= viewEnd) {
          if (d >= viewStart) {
            if (idx === 0) {
              result.push({ ...sched, virtual: false, recurrence_index: 0 });
            } else {
              const projDayKey = d.toISOString().slice(0, 10);
              if (!realScheduleKeys.has(`${sched.origem_id}_${projDayKey}`)) {
                result.push({
                  ...sched,
                  id: `${sched.id}_v${idx}`,
                  data_programada: d.toISOString(),
                  status: 'programado',
                  virtual: true,
                  recurrence_index: idx,
                });
              }
            }
          }
          idx++;
          d = new Date(baseDate.getTime() + idx * intervalDays * 86400000);
          if (idx > 60) break; // safety limit
        }

        // Backwards from baseDate (for past occurrences in view)
        idx = 1;
        d = new Date(baseDate.getTime() - idx * intervalDays * 86400000);
        while (d >= viewStart && idx <= 60) {
          if (d <= viewEnd) {
            const projDayKey = d.toISOString().slice(0, 10);
            if (!realScheduleKeys.has(`${sched.origem_id}_${projDayKey}`)) {
              result.push({
                ...sched,
                id: `${sched.id}_vn${idx}`,
                data_programada: d.toISOString(),
                status: 'programado',
                virtual: true,
                recurrence_index: -idx,
              });
            }
          }
          idx++;
          d = new Date(baseDate.getTime() - idx * intervalDays * 86400000);
        }
      }

      result.sort((a, b) => new Date(a.data_programada).getTime() - new Date(b.data_programada).getTime());
      return result;
    },
    staleTime: 30_000,
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
      deleteMaintenanceSchedule(tipo, origemId, tenantId || undefined),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedule'] });
      writeAuditLog({ action: 'DELETE_MAINTENANCE_SCHEDULE', table: 'maintenance_schedule', recordId: variables.origemId, empresaId: tenantId, source: 'useMaintenanceSchedule', severity: 'warning', metadata: { tipo: variables.tipo } });
    },
    onError: (error: Error) => {
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
      if (!tenantId) throw new Error('Tenant não identificado.');

      const payload: Record<string, string> = {};
      if (status) payload.status = status;
      if (dataProgramada) payload.data_programada = dataProgramada;

      const { data, error } = await supabase
        .from('maintenance_schedule')
        .update(payload)
        .eq('id', id)
        .eq('empresa_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as MaintenanceScheduleRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedule'] });
      writeAuditLog({ action: 'UPDATE_MAINTENANCE_STATUS', table: 'maintenance_schedule', recordId: data.id, empresaId: tenantId, source: 'useMaintenanceSchedule', metadata: { status: data.status } });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar agenda',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
