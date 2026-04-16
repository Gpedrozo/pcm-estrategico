import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MaintenanceAlertCounts {
  /** Manutenções com data_programada < hoje (status = programado) */
  vencidas: number;
  /** Manutenções com data_programada entre hoje e hoje+7d (status = programado) */
  proximas: number;
  /** Total = vencidas + proximas */
  total: number;
}

/**
 * Retorna contagens diferenciadas de manutenções programadas:
 * - vencidas (vermelha): data < hoje
 * - próximas (âmbar): hoje ≤ data ≤ hoje+7d
 * Usado no sidebar badge e dashboard.
 */
export function useMaintenanceAlertCount() {
  const { tenantId } = useAuth();

  return useQuery<MaintenanceAlertCounts>({
    queryKey: ['maintenance-alert-count', tenantId],
    queryFn: async (): Promise<MaintenanceAlertCounts> => {
      if (!tenantId) return { vencidas: 0, proximas: 0, total: 0 };

      const hoje = new Date();
      const hojeIso = hoje.toISOString();
      const em7dias = new Date(hoje.getTime() + 7 * 86_400_000).toISOString();

      // Buscar todas as programadas com data ≤ hoje+7d em uma única query
      const { data, error } = await supabase
        .from('maintenance_schedule')
        .select('data_programada')
        .eq('empresa_id', tenantId)
        .eq('status', 'programado')
        .lte('data_programada', em7dias);

      if (error || !data) return { vencidas: 0, proximas: 0, total: 0 };

      let vencidas = 0;
      let proximas = 0;
      for (const row of data) {
        if (row.data_programada < hojeIso) {
          vencidas++;
        } else {
          proximas++;
        }
      }

      return { vencidas, proximas, total: vencidas + proximas };
    },
    enabled: !!tenantId,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
