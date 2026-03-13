import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export function TenantQueryIsolationGuard() {
  const queryClient = useQueryClient();
  const { tenantId, isAuthenticated } = useAuth();
  const previousTenantRef = useRef<string | null>(null);

  useEffect(() => {
    const previousTenantId = previousTenantRef.current;
    const currentTenantId = tenantId ?? null;

    if (!isAuthenticated) {
      if (previousTenantId !== null) {
        queryClient.clear();
      }
      previousTenantRef.current = null;
      return;
    }

    if (previousTenantId !== null && previousTenantId !== currentTenantId) {
      // Tenant switched (impersonation/domain change): drop cached data to prevent cross-tenant bleed.
      queryClient.clear();
    }

    previousTenantRef.current = currentTenantId;
  }, [isAuthenticated, queryClient, tenantId]);

  return null;
}
