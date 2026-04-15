import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Retorna contagem de manutenções vencidas (data_programada < hoje e status = 'programado').
 * Usado no sidebar badge de Programação.
 */
export function useMaintenanceAlertCount() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['maintenance-alert-count', tenantId],
    queryFn: async () => {
      if (!tenantId) return 0;

      const hoje = new Date().toISOString();

      const { count, error } = await supabase
        .from('maintenance_schedule')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', tenantId)
        .eq('status', 'programado')
        .lt('data_programada', hoje);

      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!tenantId,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
