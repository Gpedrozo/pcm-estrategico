import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

const POLL_INTERVAL_MS = 5 * 60_000; // 5 minutes

/**
 * Polls empresa status every 5 minutes.
 * If the company becomes 'blocked', forces logout.
 * Only active for non-owner roles with a valid tenantId.
 */
export function useSubscriptionEnforcement() {
  const { tenantId, effectiveRole, logout } = useAuth();
  const isOwner = effectiveRole === 'SYSTEM_OWNER' || effectiveRole === 'SYSTEM_ADMIN';
  const hasLoggedOutRef = useRef(false);

  const { data: empresaStatus } = useQuery({
    queryKey: ['empresa-status-poll', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('empresas')
        .select('status')
        .eq('id', tenantId)
        .maybeSingle();
      if (error) {
        logger.warn('[SubscriptionEnforcement] Failed to poll empresa status', { error: error.message });
        return null;
      }
      return (data as Record<string, unknown>)?.status as string | null;
    },
    enabled: !!tenantId && !isOwner,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS - 30_000,
  });

  useEffect(() => {
    if (empresaStatus === 'blocked' && !hasLoggedOutRef.current) {
      hasLoggedOutRef.current = true;
      logger.warn('[SubscriptionEnforcement] Empresa blocked — forcing logout');
      logout({ reason: 'security' });
    }
  }, [empresaStatus, logout]);
}
