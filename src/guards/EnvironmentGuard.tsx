import React from 'react';
import { Navigate } from 'react-router-dom';
import { isOwnerDomain } from '@/lib/security';

export function EnvironmentGuard({
  children,
  allowOwner = false,
}: {
  children: React.ReactNode;
  allowOwner?: boolean;
}) {
  const ownerDomain = isOwnerDomain();

  if (ownerDomain && !allowOwner) {
    return <Navigate to="/" replace />;
  }

  if (!ownerDomain && allowOwner) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
