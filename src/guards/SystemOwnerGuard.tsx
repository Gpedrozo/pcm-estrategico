import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isOwnerDomain } from '@/lib/security';

export function SystemOwnerGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, effectiveRole } = useAuth();
  const ownerPreviewEnabled =
    import.meta.env.DEV &&
    String(import.meta.env.VITE_OWNER_PREVIEW || '').toLowerCase() === 'true';

  if (isLoading) return null;

  if (ownerPreviewEnabled) {
    return <>{children}</>;
  }

  if (!isOwnerDomain() || effectiveRole !== 'SYSTEM_OWNER') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
