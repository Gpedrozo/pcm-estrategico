import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getPostLoginPath } from '@/lib/security';
import { supabase } from '@/integrations/supabase/client';
import { resolveOrRepairTenantHost } from '@/lib/tenantDomain';
import { createSessionTransferHash, getSessionTransferFromUrl } from '@/lib/sessionTransfer';
import { useBranding } from '@/contexts/BrandingContext';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, Settings } from 'lucide-react';
import { z } from 'zod';

const SESSION_TRANSFER_REDIRECT_STORAGE_KEY = 'pcm.auth.session_transfer.redirect.v1';
const SESSION_TRANSFER_CONSUMED_STORAGE_KEY = 'pcm.auth.session_transfer.consumed.v1';
const SESSION_TRANSFER_CONSUMED_MAX_AGE_MS = 2 * 60 * 1000;
const AUTH_RETRY_COUNT_PARAM = 'retry_count';
const AUTH_RETRY_COUNT_MAX = 2;
const HANDOFF_FAILED_PARAM = 'handoff_failed';

const TENANT_REDIRECT_TIMEOUT_MS = 6_000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: number | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => {
      reject(new Error('timeout'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer !== null) {
      window.clearTimeout(timer);
    }
  }
}

// Validação do login
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(5, 'Email inválido')
    .max(255, 'Email muito longo')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100, 'Senha muito longa'),
});

const getContrastTextColor = (backgroundColor: string) => {
  const hex = backgroundColor.replace('#', '');
  if (hex.length !== 6) return '#ffffff';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111827' : '#ffffff';
};

export default function Login() {
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [logoutNotice, setLogoutNotice] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isRedirectingTenantDomain, setIsRedirectingTenantDomain] = useState(false);
  const allowPostLoginRedirectRef = useRef(false);

  const { login, isAuthenticated, isLoading, isHydrating, authStatus, effectiveRole, tenantId, forcePasswordChange } = useAuth();
  const navigate = useNavigate();
  const { branding } = useBranding();
  const tenantBaseDomain = (import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gppis.com.br').toLowerCase();
  const currentHost = window.location.hostname.toLowerCase();

  const resolveSafeNextPath = () => {
    const nextParam = new URLSearchParams(window.location.search).get('next');
    if (!nextParam) return null;
    if (!nextParam.startsWith('/') || nextParam.startsWith('//')) return null;
    return nextParam;
  };

  const getRetryCountFromUrl = () => {
    const raw = new URLSearchParams(window.location.search).get(AUTH_RETRY_COUNT_PARAM);
    const parsed = Number(raw ?? 0);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.trunc(parsed);
  };

  const hasSessionTransferHash = () => Boolean(getSessionTransferFromUrl().token);

  const wasSessionTransferRecentlyConsumed = () => {
    try {
      const raw = window.sessionStorage.getItem(SESSION_TRANSFER_CONSUMED_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { at?: number };
      const at = Number(parsed?.at ?? 0);
      if (!Number.isFinite(at) || at <= 0) return false;
      return (Date.now() - at) <= SESSION_TRANSFER_CONSUMED_MAX_AGE_MS;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasLogoutMarker = params.get('logout') === '1';
    const reason = params.get('reason');

    if (reason === 'inactivity') {
      setLogoutNotice('Usuário desconectado por inatividade (10 minutos sem atividade). Faça login novamente.');
    } else if (reason === 'window_closed') {
      setLogoutNotice('Sessão encerrada ao fechar a página. Faça login novamente para continuar.');
    }

    if (!hasLogoutMarker && !reason) return;

    params.delete('logout');
    params.delete('reason');
    const nextQuery = params.toString();
    const cleanedUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, cleanedUrl);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const handoffFailed = params.get(HANDOFF_FAILED_PARAM) === '1';
    if (!handoffFailed) return;

    const emailParam = String(params.get('email') ?? '').trim().toLowerCase();
    if (emailParam && !loginEmail.trim()) {
      setLoginEmail(emailParam);
    }
  }, [loginEmail]);

  useEffect(() => {
    if (isLoading || isHydrating || authStatus === 'loading' || authStatus === 'hydrating') return;
    if (isAuthenticated || authStatus !== 'unauthenticated') return;

    const isBaseHost = currentHost === tenantBaseDomain || currentHost === `www.${tenantBaseDomain}`;
    const isTenantSubdomain = !isBaseHost && currentHost.endsWith(`.${tenantBaseDomain}`);
    const handoffFailed = new URLSearchParams(window.location.search).get(HANDOFF_FAILED_PARAM) === '1';

    if (!isTenantSubdomain) return;
    if (handoffFailed) return;
    if (hasSessionTransferHash()) return;
    if (wasSessionTransferRecentlyConsumed()) return;

    const retryCount = getRetryCountFromUrl();
    if (retryCount >= AUTH_RETRY_COUNT_MAX) {
      setLoginError('Nao foi possivel concluir o redirecionamento entre dominios. Limite de tentativas atingido.');
      logger.warn('tenant_subdomain_redirect_blocked_retry_limit', {
        host: currentHost,
        retryCount,
      });
      return;
    }

    const currentPath = `${window.location.pathname}${window.location.search}`;
    const nextRetry = retryCount + 1;
    const baseLoginUrl = `https://${tenantBaseDomain}/login?next=${encodeURIComponent(currentPath || '/dashboard')}&${AUTH_RETRY_COUNT_PARAM}=${nextRetry}`;
    logger.info('tenant_subdomain_redirect_to_base_login', {
      currentHost,
      nextRetry,
    });
    window.location.assign(baseLoginUrl);
  }, [authStatus, currentHost, isAuthenticated, isHydrating, isLoading, tenantBaseDomain]);

  useEffect(() => {
    if (!isAuthenticated || authStatus !== 'authenticated') return;

    const params = new URLSearchParams(window.location.search);
    if (!params.has(AUTH_RETRY_COUNT_PARAM)) return;

    params.delete(AUTH_RETRY_COUNT_PARAM);
    const nextQuery = params.toString();
    const cleanedUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, cleanedUrl);
  }, [authStatus, isAuthenticated]);

  const activeBranding = branding || {
    nome_fantasia: 'PCM ESTRATÉGICO',
    razao_social: 'PCM ESTRATÉGICO',
    logo_login_url: null,
    logo_menu_url: null,
  };

  // Redireciona para dashboard se já estiver logado
  useEffect(() => {
    let isActive = true;

    const redirectAuthenticatedUser = async () => {
      if (isLoading || isHydrating || authStatus === 'loading' || authStatus === 'hydrating') return;
      if (!isAuthenticated || authStatus !== 'authenticated') return;

      if (forcePasswordChange) {
        setIsRedirectingTenantDomain(false);
        navigate('/change-password', { replace: true });
        return;
      }

      const isGlobalRole =
        effectiveRole === 'SYSTEM_OWNER' ||
        effectiveRole === 'SYSTEM_ADMIN' ||
        effectiveRole === 'MASTER_TI';

      const isTenantBaseHost =
        currentHost === tenantBaseDomain ||
        currentHost === `www.${tenantBaseDomain}`;

      const nextPath = resolveSafeNextPath();
      const isManualAccountSwitchIntent =
        isTenantBaseHost
        && window.location.pathname === '/login'
        && !nextPath
        && !hasSessionTransferHash()
        && !allowPostLoginRedirectRef.current;

      // When user opens principal /login to switch account, do not auto-redirect
      // using a stale authenticated context from previous tenant access.
      if (isManualAccountSwitchIntent) {
        setIsRedirectingTenantDomain(false);
        return;
      }

      if (!isGlobalRole && isTenantBaseHost) {
        const retryCount = getRetryCountFromUrl();
        if (retryCount >= AUTH_RETRY_COUNT_MAX) {
          if (!isActive) return;
          setIsRedirectingTenantDomain(false);
          setLoginError('Loop de redirecionamento detectado. Tente novamente em instantes.');
          logger.warn('tenant_base_redirect_blocked_retry_limit', {
            currentHost,
            retryCount,
            tenantId,
          });
          return;
        }

        if (!tenantId) {
          return;
        }

        setIsRedirectingTenantDomain(true);
        setLoginError('');

        let targetHost = await withTimeout(
          resolveOrRepairTenantHost({
            tenantId,
            tenantBaseDomain,
          }),
          TENANT_REDIRECT_TIMEOUT_MS,
        ).catch(() => null);

        if (!targetHost) {
          const { data: userResult } = await supabase.auth.getUser();
          const rawMetadataSlug =
            userResult?.user?.app_metadata?.empresa_slug ??
            userResult?.user?.user_metadata?.empresa_slug;

          const metadataSlug = typeof rawMetadataSlug === 'string'
            ? rawMetadataSlug.trim().toLowerCase()
            : '';

          if (metadataSlug) {
            targetHost = await withTimeout(
              resolveOrRepairTenantHost({
                tenantId,
                tenantBaseDomain,
                slugHint: metadataSlug,
              }),
              TENANT_REDIRECT_TIMEOUT_MS,
            ).catch(() => null);

            if (!targetHost) {
              targetHost = `${metadataSlug}.${tenantBaseDomain}`;
            }
          }
        }

        if (!targetHost) {
          if (!isActive) return;
          setIsRedirectingTenantDomain(false);
          navigate(nextPath || getPostLoginPath(effectiveRole), { replace: true });
          return;
        }

        if (targetHost === currentHost) {
          if (!isActive) return;
          setIsRedirectingTenantDomain(false);
          navigate(nextPath || getPostLoginPath(effectiveRole), { replace: true });
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const activeSession = sessionData?.session;

        let transferHash = '';
        const transferTokenHash = await createSessionTransferHash(activeSession ?? null, targetHost);
        if (transferTokenHash) {
          transferHash = `#${transferTokenHash}`;
        }

        if (!transferHash) {
          if (!isActive) return;
          const fallbackRetry = Math.min(AUTH_RETRY_COUNT_MAX, retryCount + 1);
          const emailParam = encodeURIComponent(loginEmail.trim().toLowerCase());
          const fallbackUrl = `${window.location.protocol}//${targetHost}/login?${HANDOFF_FAILED_PARAM}=1&${AUTH_RETRY_COUNT_PARAM}=${fallbackRetry}${emailParam ? `&email=${emailParam}` : ''}`;

          logger.warn('tenant_base_redirect_missing_session_transfer', {
            currentHost,
            targetHost,
            tenantId,
            fallbackUrl,
          });

          await supabase.auth.signOut().catch(() => null);
          window.location.assign(fallbackUrl);
          return;
        }

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

        logger.info('tenant_base_redirect_with_transfer', {
          currentHost,
          targetHost,
          retryCount,
        });
        const separator = transferHash ? '&' : '';
        window.location.assign(`${window.location.protocol}//${targetHost}/login?${AUTH_RETRY_COUNT_PARAM}=${retryCount}${separator}${transferHash}`);
        return;
      }

      setIsRedirectingTenantDomain(false);
      navigate(nextPath || getPostLoginPath(effectiveRole), { replace: true });
    };

    void redirectAuthenticatedUser();

    return () => {
      isActive = false;
    };
  }, [
    isAuthenticated,
    isLoading,
    isHydrating,
    authStatus,
    navigate,
    effectiveRole,
    forcePasswordChange,
    tenantId,
    tenantBaseDomain,
    currentHost,
  ]);

  // Função de login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsRedirectingTenantDomain(false);
    setIsLoginLoading(true);
    allowPostLoginRedirectRef.current = true;

    try {
      const normalizedEmail = loginEmail.trim().toLowerCase();
      const validation = loginSchema.safeParse({ email: normalizedEmail, password: loginPassword });
      if (!validation.success) {
        setLoginError(validation.error.errors[0].message);
        setIsLoginLoading(false);
        return;
      }

      const { error } = await login(normalizedEmail, loginPassword);

      if (error) {
        allowPostLoginRedirectRef.current = false;
        setLoginError(error);
      }
    } catch (err) {
      allowPostLoginRedirectRef.current = false;
      setLoginError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoginLoading(false);
    }
  };

  // Loading inicial
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090f1a]">
        <Loader2 className="h-8 w-8 animate-spin text-sky-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090f1a] bg-gradient-to-b from-[#0b1220] via-[#0a111d] to-[#090f1a] p-4">
      <div className="w-full max-w-md">
        {/* Logo e Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4 overflow-hidden"
            style={{ backgroundColor: '#111827' }}
          >
            {activeBranding.logo_login_url ? (
              <img src={activeBranding.logo_login_url} alt={activeBranding.nome_fantasia || 'Logo'} className="w-full h-full object-cover" />
            ) : (
              <Settings className="h-8 w-8 text-primary-foreground" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {activeBranding.nome_fantasia || activeBranding.razao_social || 'PCM ESTRATÉGICO'}
          </h1>
          <p className="mt-1 text-slate-400">Sistema de Gestão de Manutenção Industrial</p>
        </div>

        {/* Login Form */}
        <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-6 shadow-industrial">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-slate-200">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="seu@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="h-11 border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-slate-200">Senha</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="h-11 border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500"
                autoComplete="off"
              />
            </div>

            {loginError && (
              <div className="flex items-center gap-2 rounded-md border border-rose-500/50 bg-rose-950/40 p-3 text-sm text-rose-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {logoutNotice && (
              <div className="rounded-md border border-amber-500/40 bg-amber-950/30 p-3 text-sm text-amber-100">
                {logoutNotice}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 font-medium"
              disabled={isLoginLoading || isRedirectingTenantDomain}
              style={{ backgroundColor: '#111827', color: getContrastTextColor('#111827') }}
            >
              {isLoginLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : isRedirectingTenantDomain ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecionando para sua empresa...
                </>
              ) : (
                'Entrar'
              )}
            </Button>

            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-slate-400 transition-colors hover:text-slate-200"
              >
                Esqueci minha senha
              </Link>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          © 2024 PCM ESTRATÉGICO • v2.0
        </p>
      </div>
    </div>
  );
}
