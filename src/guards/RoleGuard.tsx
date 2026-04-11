import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { AppRole } from '@/lib/security';
import { Loader2 } from 'lucide-react';

export function RoleGuard({
  allow,
  children,
  redirectTo = '/login',
}: {
  allow: AppRole[];
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { isLoading, isHydrating, authStatus, effectiveRole } = useAuth();

  if (isLoading || isHydrating || authStatus === 'idle' || authStatus === 'loading' || authStatus === 'hydrating') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (authStatus !== 'authenticated') {
    return <Navigate to={redirectTo} replace />;
  }

  if (!allow.includes(effectiveRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
