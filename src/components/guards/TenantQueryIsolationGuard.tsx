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

    const isolateCache = async () => {
      await queryClient.cancelQueries();

      if (previousTenantId !== null) {
        queryClient.resetQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) && query.queryKey.some((keyPart) => keyPart === previousTenantId),
        });

        queryClient.removeQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) && query.queryKey.some((keyPart) => keyPart === previousTenantId),
        });
      }

      queryClient.clear();
    };

    if (!isAuthenticated) {
      if (previousTenantId !== null) {
        void isolateCache();
      }
      previousTenantRef.current = null;
      return;
    }

    if (previousTenantId !== null && previousTenantId !== currentTenantId) {
      // Tenant switched (impersonation/domain change): drop and reset cached data to prevent cross-tenant bleed.
      void isolateCache();
    }

    previousTenantRef.current = currentTenantId;
  }, [isAuthenticated, queryClient, tenantId]);

  return null;
}
