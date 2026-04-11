import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, Loader2, AlertTriangle, Sun, Moon } from 'lucide-react';
import type { OwnerCompany } from '@/services/ownerPortal.service';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { AssistentePCM } from '@/components/assistente/AssistentePCM';
import { GlobalSearch } from './GlobalSearch';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getImpersonationExpiresAt, getImpersonationPayload, impersonateCompany, listPlatformCompanies, stopImpersonation } from '@/services/ownerPortal.service';
import { resolveOrRepairTenantHost } from '@/lib/tenantDomain';
import { useSubscriptionAlert } from '@/hooks/useSubscriptionAlert';
import { createSessionTransferHash } from '@/lib/sessionTransfer';
import { logger } from '@/lib/logger';
import { isPersistableAppPath, persistLastAppRoute } from '@/lib/navigationState';
import { useApplyTenantVisualIdentity, useTenantVisualIdentity } from '@/hooks/useTenantVisualIdentity';
import { SESSION_TRANSFER_REDIRECT_STORAGE_KEY } from '@/lib/authConstants';
const AUTH_RETRY_COUNT_PARAM = 'retry_count';

export function AppLayout() {
  const { isAuthenticated, isLoading, isHydrating, authStatus, effectiveRole, tenantId, session, forcePasswordChange, impersonation, startImpersonationSession, stopImpersonationSession } = useAuth();
  const location = useLocation();
  const [isStoppingImpersonation, setIsStoppingImpersonation] = useState(false);
  const [countdownNow, setCountdownNow] = useState(Date.now());
  const hasAutoStoppedRef = useRef(false);
  const [isCompanyChooserOpen, setIsCompanyChooserOpen] = useState(false);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isEnteringCompany, setIsEnteringCompany] = useState(false);
  const [companies, setCompanies] = useState<OwnerCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [companySearchInput, setCompanySearchInput] = useState('');
  const [isDomainRedirectRunning, setIsDomainRedirectRunning] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('pcm-theme');
    if (stored) return stored === 'dark';
    return document.documentElement.classList.contains('dark');
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('pcm-theme', isDark ? 'dark' : 'light');
  }, [isDark]);
  const { data: tenantVisualIdentity } = useTenantVisualIdentity();
  const { data: subscriptionAlert } = useSubscriptionAlert();
  const [subscriptionAlertDismissed, setSubscriptionAlertDismissed] = useState(false);

  const subscriptionAlertInfo = useMemo((): { message: string; severity: 'warning' | 'danger'; dismissable: boolean } | null => {
    if (!subscriptionAlert) return null;
    const { status, renewal_at, ends_at, plan_name, contact_email, contact_whatsapp, contact_name, custom_message, grace_period_days, alert_days_before } = subscriptionAlert;

    const contactParts: string[] = [];
    if (contact_name) contactParts.push(contact_name);
    if (contact_email) contactParts.push(contact_email);
    if (contact_whatsapp) contactParts.push(`WhatsApp ${contact_whatsapp}`);
    const contactLabel = contactParts.length ? ` Contato: ${contactParts.join(' • ')}` : '';

    // --- Expiry countdown (highest priority) ---
    if (ends_at && (status === 'active' || status === 'ativo' || status === 'past_due')) {
      const endsAtDate = new Date(ends_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      endsAtDate.setHours(0, 0, 0, 0);
      const diffMs = endsAtDate.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffMs / 86_400_000);

      if (daysUntil <= 0) {
        // Expired — grace period
        const daysPast = Math.abs(daysUntil);
        const remaining = grace_period_days - daysPast;
        if (remaining > 0) {
          const msg = custom_message
            ? `${custom_message} (${remaining} dias restantes de carência).${contactLabel}`
            : `Seu plano${plan_name ? ` ${plan_name}` : ''} venceu há ${daysPast} dia(s). Restam ${remaining} dia(s) de carência antes do bloqueio.${contactLabel}`;
          return { message: msg, severity: 'danger', dismissable: false };
        }
        // Past grace — empresa should be blocked by cron, but show anyway
        return { message: `Seu plano está vencido e a carência expirou. Acesso será bloqueado em breve.${contactLabel}`, severity: 'danger', dismissable: false };
      }

      if (daysUntil <= alert_days_before) {
        const msg = `Seu plano${plan_name ? ` ${plan_name}` : ''} vence em ${daysUntil} dia(s) (${endsAtDate.toLocaleDateString('pt-BR')}). Renove para evitar interrupção.${contactLabel}`;
        return { message: msg, severity: 'warning', dismissable: true };
      }
    }

    // --- Existing status-based alerts ---
    if (subscriptionAlertDismissed) return null;

    if (status === 'cancelled' || status === 'suspended') {
      return { message: `Sua assinatura ${plan_name ? `(${plan_name}) ` : ''}está ${status === 'cancelled' ? 'cancelada' : 'suspensa'}. Entre em contato com o suporte para reativar.${contactLabel}`, severity: 'danger', dismissable: true };
    }
    if (status === 'past_due') {
      return { message: `Sua assinatura ${plan_name ? `(${plan_name}) ` : ''}está com pagamento atrasado. Regularize para evitar bloqueio.${contactLabel}`, severity: 'warning', dismissable: true };
    }
    if (status === 'trial' || status === 'teste') {
      const expiresLabel = renewal_at
        ? ` até ${new Date(renewal_at).toLocaleDateString('pt-BR')}`
        : '';
      return { message: `Você está no período de teste${plan_name ? ` do plano ${plan_name}` : ''}${expiresLabel}. Contrate um plano para garantir a continuidade.`, severity: 'warning', dismissable: true };
    }
    return null;
  }, [subscriptionAlert, subscriptionAlertDismissed]);

  useApplyTenantVisualIdentity(tenantVisualIdentity);

  const canSwitchCompany =
    effectiveRole === 'SYSTEM_OWNER'
    || effectiveRole === 'SYSTEM_ADMIN';

  const activeCompanyId = impersonation?.empresaId ?? '';

  // Debounce company search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setCompanySearch(companySearchInput), 300);
    return () => clearTimeout(timer);
  }, [companySearchInput]);

  const filteredCompanies = useMemo(() => {
    const term = companySearch.trim().toLowerCase();
    if (!term) return companies;

    return companies.filter((company) => {
      const name = (company.nome ?? '').toLowerCase();
      const slug = (company.slug ?? '').toLowerCase();
      const id = String(company.id ?? '').toLowerCase();
      return name.includes(term) || slug.includes(term) || id.includes(term);
    });
  }, [companies, companySearch]);

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
        // noop
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

  const [companyLoadError, setCompanyLoadError] = useState('');

  const openCompanyChooser = async () => {
    if (!canSwitchCompany) return;

    setIsCompanyChooserOpen(true);
    setIsLoadingCompanies(true);
    setCompanySearch('');
    setCompanySearchInput('');
    setCompanyLoadError('');

    try {
      const data = await listPlatformCompanies();
      const rows = Array.isArray(data?.companies) ? data.companies : [];
      setCompanies(rows);

      if (rows.length > 0) {
        const hasActiveInList = !!activeCompanyId && rows.some((item) => item.id === activeCompanyId);
        setSelectedCompanyId(hasActiveInList ? activeCompanyId : rows[0].id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar empresas';
      setCompanyLoadError(msg);
      logger.error('company_chooser_load_error', { error: msg });
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const [enterCompanyError, setEnterCompanyError] = useState('');

  const handleEnterCompanyContext = async () => {
    const selected = companies.find((item) => item.id === selectedCompanyId);
    if (!selected?.id) return;

    setIsEnteringCompany(true);
    setEnterCompanyError('');

    try {
      const response: any = await impersonateCompany(selected.id);
      const nowIso = new Date().toISOString();
      const expiresAt = getImpersonationExpiresAt(response);
      const impersonationPayload = getImpersonationPayload(response);

      startImpersonationSession({
        id: impersonationPayload?.id ?? undefined,
        sessionToken: impersonationPayload?.session_token ?? undefined,
        empresaId: selected.id,
        empresaNome: selected.nome ?? selected.slug ?? selected.id,
        startedAt: nowIso,
        expiresAt: expiresAt || undefined,
      });

      setIsCompanyChooserOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao entrar na empresa';
      setEnterCompanyError(msg);
      logger.error('company_enter_error', { error: msg, empresaId: selected.id });
    } finally {
      setIsEnteringCompany(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const route = `${location.pathname}${location.search}`;
    if (!isPersistableAppPath(route)) return;
    persistLastAppRoute(route);
  }, [isAuthenticated, location.pathname, location.search]);

  useEffect(() => {
    let isActive = true;

    const redirectTenantFromBaseDomain = async () => {
      if (isLoading || isHydrating || authStatus === 'loading' || authStatus === 'hydrating') return;
      if (!isAuthenticated || authStatus !== 'authenticated' || !tenantId || !session) return;

      const isGlobalRole =
        effectiveRole === 'SYSTEM_OWNER'
        || effectiveRole === 'SYSTEM_ADMIN'
        || effectiveRole === 'MASTER_TI';

      if (isGlobalRole) return;

      const tenantBaseDomain = (import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gppis.com.br').toLowerCase();
      const currentHost = window.location.hostname.toLowerCase();
      const isBaseDomainHost = currentHost === tenantBaseDomain || currentHost === `www.${tenantBaseDomain}`;

      if (!isBaseDomainHost) return;

      setIsDomainRedirectRunning(true);

      let targetHost = await resolveOrRepairTenantHost({
        tenantId,
        tenantBaseDomain,
      });

      if (!targetHost) {
        const metadataSlug = String(
          session.user.app_metadata?.empresa_slug
          ?? session.user.user_metadata?.empresa_slug
          ?? '',
        ).trim().toLowerCase();

        if (metadataSlug) {
          targetHost = await resolveOrRepairTenantHost({
            tenantId,
            tenantBaseDomain,
            slugHint: metadataSlug,
          });

          if (!targetHost) {
            targetHost = `${metadataSlug}.${tenantBaseDomain}`;
          }
        }
      }

      if (!isActive) return;

      if (!targetHost || targetHost === currentHost) {
        setIsDomainRedirectRunning(false);
        return;
      }

      let transferHash = '';
      const transferTokenHash = await createSessionTransferHash(session, targetHost);
      if (transferTokenHash) {
        transferHash = `#${transferTokenHash}`;
      }

      if (!transferHash) {
        if (!isActive) return;
        setIsDomainRedirectRunning(false);
        logger.warn('app_layout_redirect_missing_session_transfer', {
          tenantId,
          currentHost,
          targetHost,
        });
        return;
      }

      const currentPath = `${location.pathname}${location.search}`;
      const nextParam = encodeURIComponent(currentPath || '/dashboard');
      const currentRetryCountRaw = new URLSearchParams(location.search).get(AUTH_RETRY_COUNT_PARAM);
      const currentRetryCountParsed = Number(currentRetryCountRaw ?? 0);
      const retryCount = Number.isFinite(currentRetryCountParsed) && currentRetryCountParsed >= 0
        ? Math.trunc(currentRetryCountParsed)
        : 0;
      if (transferHash) {
        try {
          window.sessionStorage.setItem(
            SESSION_TRANSFER_REDIRECT_STORAGE_KEY,
            JSON.stringify({ at: Date.now() }),
          );
        } catch {
          // noop
        }
      }
      logger.info('app_layout_redirect_to_tenant', {
        tenantId,
        currentHost,
        targetHost,
        retryCount,
      });
      const separator = transferHash ? '&' : '';
      window.location.assign(`${window.location.protocol}//${targetHost}/login?next=${nextParam}&${AUTH_RETRY_COUNT_PARAM}=${retryCount}${separator}${transferHash}`);
    };

    void redirectTenantFromBaseDomain();

    return () => {
      isActive = false;
    };
  }, [authStatus, effectiveRole, isAuthenticated, isHydrating, isLoading, location.pathname, location.search, session, tenantId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const nextPath = encodeURIComponent(`${location.pathname}${location.search}` || '/dashboard');
    return <Navigate to={`/login?next=${nextPath}`} replace />;
  }

  if (forcePasswordChange && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (!forcePasswordChange && location.pathname === '/change-password') {
    return <Navigate to="/dashboard" replace />;
  }

  if (isDomainRedirectRunning) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const solicitanteAllowedPaths = ['/dashboard', '/solicitacoes', '/painel-operador', '/manuais-operacao', '/manual', '/suporte'];

  if (effectiveRole === 'SOLICITANTE' && !solicitanteAllowedPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))) {
    return <Navigate to="/solicitacoes" replace />;
  }

  const technicianAllowedPaths = ['/dashboard', '/os/portal-mecanico', '/solicitacoes', '/os/nova', '/os/fechar', '/os/historico', '/manuais-operacao', '/manual', '/suporte'];

  if (effectiveRole === 'TECHNICIAN' && !technicianAllowedPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))) {
    return <Navigate to="/os/portal-mecanico" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border/80 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 flex items-center px-4 gap-4">
            <SidebarTrigger className="p-2 hover:bg-muted rounded-md" aria-label="Abrir/fechar menu lateral">
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
                className="rounded border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/15"
              >
                Acessar empresa
              </button>
            )}
            <button
              onClick={() => setIsDark(prev => !prev)}
              className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={isDark ? 'Modo claro' : 'Modo escuro'}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
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
          {subscriptionAlertInfo && (
            <div className={`border-b px-4 py-2 ${subscriptionAlertInfo.severity === 'danger' ? 'border-red-300/40 bg-red-50 text-red-900' : 'border-amber-300/40 bg-amber-50 text-amber-900'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <p className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {subscriptionAlertInfo.message}
                </p>
                {subscriptionAlertInfo.dismissable && (
                  <button
                    onClick={() => setSubscriptionAlertDismissed(true)}
                    className={`rounded border px-2 py-1 ${subscriptionAlertInfo.severity === 'danger' ? 'border-red-400 hover:bg-red-100' : 'border-amber-400 hover:bg-amber-100'}`}
                  >
                    Fechar
                  </button>
                )}
              </div>
            </div>
          )}
          <main className="pcm-module-main flex-1 overflow-auto bg-gradient-to-b from-background via-background to-muted/20">
            <div className="pcm-module-shell mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-7">
              <div className="module-page">
                <Outlet />
              </div>
            </div>
          </main>
          <AssistentePCM />

          {isCompanyChooserOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-industrial-lg">
                <h3 className="text-sm font-semibold text-foreground">Entrar no contexto da empresa</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Escolha a empresa para navegar no sistema como o cliente.
                </p>

                <div className="mt-3 space-y-2">
                  <label htmlFor="company-context-search" className="text-xs font-medium text-foreground">Buscar empresa</label>
                  <input
                    id="company-context-search"
                    className="h-10 w-full rounded border border-input bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground"
                    placeholder="Digite nome, slug ou id"
                    value={companySearchInput}
                    onChange={(e) => setCompanySearchInput(e.target.value)}
                    disabled={isLoadingCompanies || isEnteringCompany}
                  />

                  <div className="max-h-56 overflow-auto rounded border border-border bg-background/40">
                    {filteredCompanies.map((company) => {
                      const isActive = activeCompanyId === company.id;
                      const isSelected = selectedCompanyId === company.id;

                      return (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() => setSelectedCompanyId(company.id)}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs ${isSelected ? 'bg-primary/10' : 'bg-card hover:bg-muted/60'} ${isActive ? 'border-l-4 border-warning' : 'border-l-4 border-transparent'}`}
                          disabled={isEnteringCompany}
                        >
                          <span className="font-medium text-foreground">{company.nome || company.slug || company.id}</span>
                          <span className="text-muted-foreground">{company.slug || company.id}</span>
                        </button>
                      );
                    })}
                    {!isLoadingCompanies && filteredCompanies.length === 0 && (
                      <p className="px-3 py-3 text-xs text-muted-foreground">Nenhuma empresa encontrada para o filtro informado.</p>
                    )}
                  </div>

                  {activeCompanyId && (
                    <p className="text-xs text-amber-700">
                      Empresa ativa no contexto atual destacada em amarelo.
                    </p>
                  )}
                  {isLoadingCompanies && <p className="text-xs text-muted-foreground">Carregando empresas...</p>}
                  {companyLoadError && <p className="text-xs text-destructive">{companyLoadError}</p>}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setIsCompanyChooserOpen(false)}
                    className="rounded border border-input bg-background px-3 py-2 text-xs text-foreground hover:bg-muted/60"
                    disabled={isEnteringCompany}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEnterCompanyContext}
                    className="rounded bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    disabled={isEnteringCompany || !selectedCompanyId}
                  >
                    {isEnteringCompany ? 'Entrando...' : 'Entrar na empresa'}
                  </button>
                </div>
                {enterCompanyError && <p className="mt-2 text-xs text-destructive">{enterCompanyError}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
