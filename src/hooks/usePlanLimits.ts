import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface CompanyLimits {
  usuarios: number;
  equipamentos: number;
  os_mes: number;
  storage_mb: number;
}

const DEFAULT_LIMITS: CompanyLimits = {
  usuarios: 10,
  equipamentos: 500,
  os_mes: 2000,
  storage_mb: 2048,
};

export function usePlanLimits() {
  const { tenantId, isSystemOwner } = useAuth();

  const { data: limits = DEFAULT_LIMITS, isLoading } = useQuery({
    queryKey: ['plan-limits', tenantId],
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CompanyLimits> => {
      if (!tenantId) return DEFAULT_LIMITS;

      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('empresa_id', tenantId)
        .eq('chave', 'owner.limits')
        .maybeSingle();

      if (error || !data?.valor) return DEFAULT_LIMITS;

      const v = data.valor as Record<string, unknown>;
      return {
        usuarios: Number(v.usuarios ?? DEFAULT_LIMITS.usuarios),
        equipamentos: Number(v.equipamentos ?? DEFAULT_LIMITS.equipamentos),
        os_mes: Number(v.os_mes ?? DEFAULT_LIMITS.os_mes),
        storage_mb: Number(v.storage_mb ?? DEFAULT_LIMITS.storage_mb),
      };
    },
  });

  return {
    limits,
    isLoading,
    isOwnerBypass: isSystemOwner,
  };
}
