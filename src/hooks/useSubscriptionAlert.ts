import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionAlertData {
  status: string | null;
  renewal_at: string | null;
  plan_name: string | null;
}

export function useSubscriptionAlert() {
  const { tenantId, effectiveRole } = useAuth();

  const isOwner = effectiveRole === 'SYSTEM_OWNER' || effectiveRole === 'SYSTEM_ADMIN';

  return useQuery({
    queryKey: ['subscription-alert', tenantId],
    queryFn: async (): Promise<SubscriptionAlertData | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('subscriptions' as never)
        .select('status,renewal_at,plan_id')
        .eq('empresa_id', tenantId)
        .maybeSingle();

      if (error || !data) return null;

      const row = data as Record<string, unknown>;

      let planName: string | null = null;
      if (row.plan_id) {
        const { data: plan } = await supabase
          .from('plans' as never)
          .select('name')
          .eq('id', row.plan_id)
          .maybeSingle();
        if (plan) planName = (plan as Record<string, unknown>).name as string;
      }

      return {
        status: (row.status as string) || null,
        renewal_at: (row.renewal_at as string) || null,
        plan_name: planName,
      };
    },
    enabled: !!tenantId && !isOwner,
    staleTime: 5 * 60_000,
  });
}
