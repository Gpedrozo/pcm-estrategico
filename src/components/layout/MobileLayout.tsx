import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { MobileTopBar } from './MobileTopBar';
import { MobileBottomNav } from './MobileBottomNav';

export function MobileLayout() {
  const { isAuthenticated, isLoading, isHydrating, authStatus, effectiveRole, forcePasswordChange } = useAuth();
  const location = useLocation();

  // Loading states
  if (isLoading || isHydrating || authStatus === 'loading' || authStatus === 'hydrating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated → login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Force password change
  if (forcePasswordChange && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // Allowed paths for mobile roles
  const technicianPaths = ['/mecanico', '/suporte', '/manuais-operacao', '/manual'];
  const solicitantePaths = ['/operador', '/suporte', '/manuais-operacao', '/manual'];

  const allowedPaths = effectiveRole === 'SOLICITANTE' ? solicitantePaths : technicianPaths;
  const defaultPath = effectiveRole === 'SOLICITANTE' ? '/operador' : '/mecanico';

  if (!allowedPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))) {
    return <Navigate to={defaultPath} replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileTopBar />
      <main className="flex-1 pt-14 pb-20 px-4 overflow-y-auto overscroll-y-contain">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
}
