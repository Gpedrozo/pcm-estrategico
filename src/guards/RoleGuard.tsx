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

  if (isLoading || isHydrating || authStatus === 'loading' || authStatus === 'hydrating') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (authStatus === 'error') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">Erro ao carregar sessão.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
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
