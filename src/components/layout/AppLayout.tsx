import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, Loader2 } from 'lucide-react';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { GlobalSearch } from './GlobalSearch';
import { useEffect, useMemo, useRef, useState } from 'react';
import { stopImpersonation } from '@/services/ownerPortal.service';

export function AppLayout() {
  const { isAuthenticated, isLoading, effectiveRole, impersonation, stopImpersonationSession } = useAuth();
  const location = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);
  const [isStoppingImpersonation, setIsStoppingImpersonation] = useState(false);
  const [countdownNow, setCountdownNow] = useState(Date.now());
  const hasAutoStoppedRef = useRef(false);

  const remainingMs = useMemo(() => {
    if (!impersonation?.expiresAt) return null;
    return Math.max(0, new Date(impersonation.expiresAt).getTime() - countdownNow);
  }, [impersonation, countdownNow]);

  const remainingLabel = useMemo(() => {
    if (remainingMs === null) return null;
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [remainingMs]);

  useEffect(() => {
    if (!impersonation?.expiresAt) {
      hasAutoStoppedRef.current = false;
      return;
    }

    const tick = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => window.clearInterval(tick);
  }, [impersonation]);

  useEffect(() => {
    if (!impersonation?.expiresAt || remainingMs === null) return;
    if (remainingMs > 0 || hasAutoStoppedRef.current) return;

    hasAutoStoppedRef.current = true;

    void (async () => {
      try {
        await stopImpersonation({
          empresa_id: impersonation.empresaId,
          empresa_nome: impersonation.empresaNome ?? undefined,
          reason: 'expired_auto',
        });
      } catch {
      } finally {
        stopImpersonationSession();
      }
    })();
  }, [impersonation, remainingMs, stopImpersonationSession]);

  const handleStopImpersonation = async () => {
    if (!impersonation?.empresaId) {
      stopImpersonationSession();
      return;
    }

    setIsStoppingImpersonation(true);

    try {
      await stopImpersonation({
        empresa_id: impersonation.empresaId,
        empresa_nome: impersonation.empresaNome ?? undefined,
        reason: 'manual_tenant_header',
      });
    } finally {
      stopImpersonationSession();
      setIsStoppingImpersonation(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const solicitanteAllowedPaths = new Set([
    '/dashboard',
    '/solicitacoes',
    '/manuais-operacao',
    '/manuais-operacao/usuario',
  ]);

  if (effectiveRole === 'SOLICITANTE' && !solicitanteAllowedPaths.has(location.pathname)) {
    return <Navigate to="/solicitacoes" replace />;
  }

  return (
    <SidebarProvider>
      <CommandPalette />
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border/80 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 flex items-center px-4 gap-4">
            <SidebarTrigger className="p-2 hover:bg-muted rounded-md">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <GlobalSearch onOpen={() => {
              const event = new KeyboardEvent('keydown', {
                key: 'k',
                metaKey: true,
                bubbles: true,
              });
              document.dispatchEvent(event);
            }} />
            <div className="flex-1" />
            <NotificationCenter />
            <span className="text-sm text-muted-foreground hidden md:block">
              {new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </header>
          {impersonation?.empresaId && (
            <div className="border-b border-amber-300/40 bg-amber-100 px-4 py-2 text-amber-900">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <p className="font-medium">
                  Modo cliente ativo: {impersonation.empresaNome ?? impersonation.empresaId}
                  {remainingLabel ? ` • expira em ${remainingLabel}` : ''}
                </p>
                <button
                  onClick={handleStopImpersonation}
                  disabled={isStoppingImpersonation}
                  className="rounded border border-amber-500 px-2 py-1 hover:bg-amber-200 disabled:opacity-60"
                >
                  Encerrar modo cliente
                </button>
              </div>
            </div>
          )}
          <main className="flex-1 overflow-auto bg-gradient-to-b from-background via-background to-muted/20">
            <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-7">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
