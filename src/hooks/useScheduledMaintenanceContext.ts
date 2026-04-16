import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseChecklist, type Checklist } from '@/schemas/checklist.schema';

export interface ScheduledMaintenanceContext {
  tipo: 'preventiva' | 'lubrificacao';
  schedule_id: string;
  origem_id: string;
  plano_nome: string;
  plano_codigo: string;
  checklist: Checklist;
  tempo_estimado_min: number | null;
}

/**
 * Dado um maintenance_schedule_id (presente na O.S.),
 * busca o tipo de schedule, resolve o plano de origem
 * e retorna o checklist técnico para ser exibido no FecharOS.
 */
export function useScheduledMaintenanceContext(scheduleId: string | null | undefined) {
  const { tenantId } = useAuth();

  return useQuery<ScheduledMaintenanceContext | null>({
    queryKey: ['scheduled-maintenance-context', scheduleId, tenantId],
    enabled: !!scheduleId && !!tenantId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!scheduleId || !tenantId) return null;

      // 1. Buscar o maintenance_schedule para saber tipo + origem_id
      const { data: schedule, error: schedErr } = await supabase
        .from('maintenance_schedule')
        .select('id, tipo, origem_id')
        .eq('id', scheduleId)
        .eq('empresa_id', tenantId)
        .maybeSingle();

      if (schedErr || !schedule) return null;

      const { tipo, origem_id } = schedule;

      // 2. Buscar o plano de origem para extrair checklist
      if (tipo === 'preventiva' && origem_id) {
        const { data: plano, error: planoErr } = await supabase
          .from('planos_preventivos')
          .select('id, nome, codigo, checklist, tempo_estimado_min')
          .eq('id', origem_id)
          .eq('empresa_id', tenantId)
          .maybeSingle();

        if (planoErr || !plano) return null;

        return {
          tipo: 'preventiva' as const,
          schedule_id: schedule.id,
          origem_id,
          plano_nome: plano.nome,
          plano_codigo: plano.codigo,
          checklist: parseChecklist(plano.checklist),
          tempo_estimado_min: plano.tempo_estimado_min ?? null,
        };
      }

      if (tipo === 'lubrificacao' && origem_id) {
        const { data: plano, error: planoErr } = await supabase
          .from('planos_lubrificacao')
          .select('id, nome, codigo')
          .eq('id', origem_id)
          .eq('empresa_id', tenantId)
          .maybeSingle();

        if (planoErr || !plano) return null;

        // Lubrificação não tem checklist JSONB no plano —
        // retorna array vazio (pontos são gerenciados em outra tabela)
        return {
          tipo: 'lubrificacao' as const,
          schedule_id: schedule.id,
          origem_id,
          plano_nome: plano.nome,
          plano_codigo: plano.codigo,
          checklist: [],
          tempo_estimado_min: null,
        };
      }

      return null;
    },
  });
}
