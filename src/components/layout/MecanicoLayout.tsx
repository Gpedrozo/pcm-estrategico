import { Outlet } from 'react-router-dom';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import DeviceBindingGuard from '@/components/mobile/DeviceBindingGuard';
import { MecanicoTopBar } from './MecanicoTopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { useMecanicoDeviceAuth } from '@/hooks/useMecanicoDeviceAuth';
import { useOfflineSync } from '@/hooks/useOfflineSync';

function MecanicoSessionBridge({ children }: { children: React.ReactNode }) {
  const { isReady, isLoading, error, retry } = useMecanicoDeviceAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Conectando dispositivo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">Erro de conexão</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={retry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

export function MecanicoLayout() {
  return (
    <DeviceBindingGuard>
      <MecanicoSessionBridge>
        <MecanicoShell />
      </MecanicoSessionBridge>
    </DeviceBindingGuard>
  );
}

function MecanicoShell() {
  const { isOnline, pendingCount } = useOfflineSync();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MecanicoTopBar />
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
  );
}
