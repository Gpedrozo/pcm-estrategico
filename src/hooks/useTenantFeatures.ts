import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

const FEATURE_KEYS = ['fmea', 'rca', 'documentos', 'preventiva'] as const;

type FeatureKey = (typeof FEATURE_KEYS)[number];

export function useTenantFeatures() {
  const { empresaId } = useTenant();

  return useQuery({
    queryKey: ['tenant-features', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const checks = await Promise.all(
        FEATURE_KEYS.map(async (feature) => {
          const { data, error } = await (supabase as any).rpc('empresa_tem_feature', {
            _empresa_id: empresaId,
            _feature_key: feature,
          });
          if (error) throw error;
          return [feature, !!data] as const;
        }),
      );

      return Object.fromEntries(checks) as Record<FeatureKey, boolean>;
    },
  });
}
