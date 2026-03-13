import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, Loader2 } from 'lucide-react';
import type { OwnerCompany } from '@/services/ownerPortal.service';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { GlobalSearch } from './GlobalSearch';
import { useEffect, useMemo, useRef, useState } from 'react';
import { impersonateCompany, listPlatformCompanies, stopImpersonation } from '@/services/ownerPortal.service';

export function AppLayout() {
  const { isAuthenticated, isLoading, effectiveRole, impersonation, startImpersonationSession, stopImpersonationSession } = useAuth();
  const location = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);
  const [isStoppingImpersonation, setIsStoppingImpersonation] = useState(false);
  const [countdownNow, setCountdownNow] = useState(Date.now());
  const hasAutoStoppedRef = useRef(false);
  const [isCompanyChooserOpen, setIsCompanyChooserOpen] = useState(false);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isEnteringCompany, setIsEnteringCompany] = useState(false);
  const [companies, setCompanies] = useState<OwnerCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  const canSwitchCompany =
    effectiveRole === 'SYSTEM_OWNER'
    || effectiveRole === 'SYSTEM_ADMIN'
    || effectiveRole === 'MASTER_TI';

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

  const openCompanyChooser = async () => {
    if (!canSwitchCompany) return;

    setIsCompanyChooserOpen(true);
    setIsLoadingCompanies(true);

    try {
      const data = await listPlatformCompanies();
      const rows = Array.isArray(data?.companies) ? data.companies : [];
      setCompanies(rows);

      if (rows.length > 0) {
        setSelectedCompanyId((prev) => prev || rows[0].id);
      }
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const handleEnterCompanyContext = async () => {
    const selected = companies.find((item) => item.id === selectedCompanyId);
    if (!selected?.id) return;

    setIsEnteringCompany(true);

    try {
      const response: any = await impersonateCompany(selected.id);
      const nowIso = new Date().toISOString();
      const expiresAt = response?.impersonation?.expires_at || null;

      startImpersonationSession({
        empresaId: selected.id,
        empresaNome: selected.nome ?? selected.slug ?? selected.id,
        startedAt: nowIso,
        expiresAt: expiresAt || undefined,
      });

      setIsCompanyChooserOpen(false);
    } finally {
      setIsEnteringCompany(false);
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
            {canSwitchCompany && (
              <button
                onClick={openCompanyChooser}
                className="rounded border border-emerald-400 px-3 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
              >
                Acessar empresa
              </button>
            )}
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

          {isCompanyChooserOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-lg border border-slate-300 bg-white p-4 shadow-lg">
                <h3 className="text-sm font-semibold text-slate-900">Entrar no contexto da empresa</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Escolha a empresa para navegar no sistema como o cliente.
                </p>

                <div className="mt-3 space-y-2">
                  <label htmlFor="company-context-picker" className="text-xs font-medium text-slate-700">Empresa</label>
                  <select
                    id="company-context-picker"
                    className="h-10 w-full rounded border border-slate-300 px-2 text-sm"
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    disabled={isLoadingCompanies || isEnteringCompany || companies.length === 0}
                  >
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.nome || company.slug || company.id}
                      </option>
                    ))}
                  </select>
                  {isLoadingCompanies && <p className="text-xs text-slate-500">Carregando empresas...</p>}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setIsCompanyChooserOpen(false)}
                    className="rounded border border-slate-300 px-3 py-2 text-xs"
                    disabled={isEnteringCompany}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEnterCompanyContext}
                    className="rounded bg-emerald-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    disabled={isEnteringCompany || !selectedCompanyId}
                  >
                    {isEnteringCompany ? 'Entrando...' : 'Entrar na empresa'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
