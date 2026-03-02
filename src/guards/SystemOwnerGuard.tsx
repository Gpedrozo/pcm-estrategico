import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { isOwnerDomain } from '@/lib/security';

export function SystemOwnerGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, effectiveRole } = useAuth();
  const { data: canReadControlPlane, isLoading: isPermissionLoading } = usePermission('control_plane.read', null);
  const ownerPreviewEnabled =
    import.meta.env.DEV &&
    String(import.meta.env.VITE_OWNER_PREVIEW || '').toLowerCase() === 'true';

  if (isLoading || isPermissionLoading) return null;

  if (ownerPreviewEnabled) {
    return <>{children}</>;
  }

  if (!isOwnerDomain() || effectiveRole !== 'SYSTEM_OWNER' || !canReadControlPlane) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
