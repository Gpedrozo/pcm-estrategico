import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { MobileTopBar } from './MobileTopBar';
import { MobileBottomNav } from './MobileBottomNav';
import DeviceBindingGuard from '@/components/mobile/DeviceBindingGuard';
import { useOfflineSync } from '@/hooks/useOfflineSync';

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

  const { isOnline, pendingCount } = useOfflineSync();

  const allowedPaths = effectiveRole === 'SOLICITANTE' ? solicitantePaths : technicianPaths;
  const defaultPath = effectiveRole === 'SOLICITANTE' ? '/operador' : '/mecanico';

  if (!allowedPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))) {
    return <Navigate to={defaultPath} replace />;
  }

  return (
    <DeviceBindingGuard>
      <div className="min-h-screen bg-background flex flex-col">
        <MobileTopBar />
        {/* Status bar offline/sync */}
        {(!isOnline || pendingCount > 0) && (
          <div className={`fixed top-14 left-0 right-0 z-40 px-4 py-1.5 text-xs font-medium text-center transition-colors ${
            isOnline
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}>
            {!isOnline ? '🔴 Offline' : ''}
            {pendingCount > 0 ? ` · ${pendingCount} ação(ões) pendente(s)` : ''}
          </div>
        )}
        <main className={`flex-1 pt-14 pb-20 px-4 overflow-y-auto overscroll-y-contain ${(!isOnline || pendingCount > 0) ? 'pt-[4.5rem]' : ''}`}>
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    </DeviceBindingGuard>
  );
}
