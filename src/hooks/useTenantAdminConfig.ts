import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useTenantAdminConfig<T>(configKey: string, fallback: T) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['tenant-admin-config', tenantId, configKey],
    queryFn: async () => {
      if (!tenantId) return fallback;

      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('empresa_id', tenantId)
        .eq('chave', configKey)
        .maybeSingle();

      if (error) throw error;
      return (data?.valor as T | null) ?? fallback;
    },
    enabled: Boolean(tenantId),
  });
}

export function useSaveTenantAdminConfig<T>() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ configKey, value }: { configKey: string; value: T }) => {
      if (!tenantId) throw new Error('Tenant nao identificado.');

      const { error } = await supabase
        .from('configuracoes_sistema')
        .upsert(
          {
            empresa_id: tenantId,
            chave: configKey,
            valor: value as unknown,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'empresa_id,chave' },
        );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-admin-config', tenantId, variables.configKey] });
    },
  });
}
