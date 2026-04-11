import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import {
  buildSecureSignupMetadata,
  getEffectiveRole,
  isOwnerDomain,
  normalizeRole,
  resolveEmpresaSlug,
  type AppRole,
} from '@/lib/security';
import { logger } from '@/lib/logger';
import { writeAuditLog } from '@/lib/audit';
import { setMonitoringUser, setMonitoringTag } from '@/lib/monitoring';
import {
  consumeSessionTransferCode,
  getDirectSessionTransferFromUrl,
  getSessionTransferFromUrl,
} from '@/lib/sessionTransfer';
import { HANDOFF_FAILED_PARAM, resolveTenantHostSlug } from '@/lib/tenantLoginFlow';
import { validateImpersonationSession } from '@/services/ownerPortal.service';
import {
  IMPERSONATION_STORAGE_KEY,
  TENANT_BASE_DOMAIN,
  LOGOUT_MARKER_PARAM,
  LOGOUT_REASON_PARAM,
  TAB_CLOSE_MARKER_STORAGE_KEY,
  DEFAULT_INACTIVITY_TIMEOUT_MS,
  INACTIVITY_NOTICE_STORAGE_KEY,
  LOGIN_PROFILE_TIMEOUT_MS,
  TENANT_HOST_RESOLVE_TIMEOUT_MS,
  HYDRATION_TIMEOUT_MS,
  CROSS_DOMAIN_REDIRECT_MARKER_STORAGE_KEY,
  SESSION_TRANSFER_MAX_AGE_MS,
  SESSION_TRANSFER_PARAM,
} from '@/lib/authConstants';
import {
  getLoginRateLimitStatus,
  registerFailedLoginAttempt,
  resetLoginRateLimit,
} from '@/lib/authRateLimit';
import {
  type OwnerEdgeLoginResult,
  signInThroughOwnerEdge,
} from '@/lib/authOwnerEdge';
import {
  isTenantBaseDomain,
  stripAuthHandoffFromUrl,
  getNavigationType,
  shouldForceLogoutByClosedWindowMarker,
  markSessionTransferRedirectInProgress,
  isSessionTransferRedirectInProgress,
  clearSessionTransferRedirectInProgress,
  isCrossDomainRedirectInProgress,
  markConsumedSessionTransfer,
  wasSessionTransferAlreadyConsumed,
  getRedirectRetryCount,
  markRedirectRetryAttempt,
  clearRedirectRetryAttempts,
  shouldBlockCrossDomainRedirect,
  getRetryCountFromCurrentUrl,
  withTimeout,
} from '@/lib/authSessionHelpers';

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  tipo: AppRole;
  roles: AppRole[];
  tenantId: string | null;
  tenantSlug: string | null;
  forcePasswordChange: boolean;
}

export interface ImpersonationSession {
  id?: string;
  sessionToken?: string;
  empresaId: string;
  empresaNome?: string | null;
  startedAt: string;
  expiresAt?: string | null;
}

export type AuthStatus = 'loading' | 'hydrating' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  authStatus: AuthStatus;
  isHydrating: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  changePassword: (newPassword: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, nome: string) => Promise<{ error: string | null }>;
  logout: (options?: { reason?: LogoutReason }) => Promise<void>;
  isAdmin: boolean;
  isMasterTI: boolean;
  isSystemOwner: boolean;
  effectiveRole: AppRole;
  tenantId: string | null;
  tenantSlug: string | null;
  forcePasswordChange: boolean;
  impersonation: ImpersonationSession | null;
  startImpersonationSession: (session: ImpersonationSession) => void;
  stopImpersonationSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type LogoutReason = 'manual' | 'inactivity' | 'window_closed' | 'security';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [impersonation, setImpersonation] = useState<ImpersonationSession | null>(null);
  const [inactivityTimeoutMs, setInactivityTimeoutMs] = useState<number | null>(null);
  const lastActivityAtRef = useRef<number>(Date.now());
  const isAutoLogoutRunningRef = useRef(false);
  const isIntentionalLogoutNavigationRef = useRef(false);
  const hydrationRetryCountRef = useRef(0);

  const transitionAuthStatus = useCallback((nextStatus: AuthStatus, reason: string, metadata?: Record<string, unknown>) => {
    setAuthStatus((currentStatus) => {
      if (currentStatus !== nextStatus) {
        logger.info('auth_status_transition', {
          from: currentStatus,
          to: nextStatus,
          reason,
          ...metadata,
        });
      }
      return nextStatus;
    });
  }, []);

  const isHydrating = authStatus === 'hydrating';
  const isLoading = authStatus === 'loading' || authStatus === 'hydrating';

  useEffect(() => {
    if (authStatus !== 'hydrating') {
      // Reset retry counter on successful auth or any non-hydrating state
      if (authStatus === 'authenticated' || authStatus === 'unauthenticated') {
        hydrationRetryCountRef.current = 0;
      }
      return;
    }

    const startedAt = performance.now();
    const timer = window.setTimeout(() => {
      const hydrationMs = Math.trunc(performance.now() - startedAt);

      if (hydrationRetryCountRef.current < 1) {
        hydrationRetryCountRef.current += 1;
        logger.info('auth_hydration_auto_retry', {
          hydrationMs,
          attempt: hydrationRetryCountRef.current,
        });
        transitionAuthStatus('loading', 'hydration_auto_retry');
        // Trigger a new auth state change event via refreshSession
        void supabase.auth.refreshSession().catch(() => {
          transitionAuthStatus('error', 'hydration_auto_retry_refresh_failed', { hydrationMs });
        });
        return;
      }

      transitionAuthStatus('error', 'hydrating_timeout_controlled', {
        hydrationMs,
        retryAttempts: hydrationRetryCountRef.current,
      });
      logger.warn('auth_hydrating_timeout_controlled', {
        hydrationMs,
        retryAttempts: hydrationRetryCountRef.current,
      });
    }, HYDRATION_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [authStatus, transitionAuthStatus]);

  useEffect(() => {
    if (!shouldForceLogoutByClosedWindowMarker()) return;

    const forceLogoutAfterClosedWindow = async () => {
      await supabase.auth.signOut({ scope: 'local' });
      await supabase.auth.signOut();

      if (window.location.pathname === '/login') {
        stripAuthHandoffFromUrl();
        return;
      }

      const queryParams = new URLSearchParams(window.location.search);
      queryParams.set(LOGOUT_MARKER_PARAM, '1');
      queryParams.set(LOGOUT_REASON_PARAM, 'window_closed');
      const nextQuery = queryParams.toString();

      window.location.assign(`/login?${nextQuery}`);
    };

    void forceLogoutAfterClosedWindow();
  }, []);

  useEffect(() => {
    if (window.location.pathname !== '/login') return;

    const searchParams = new URLSearchParams(window.location.search);
    const hasLogoutParams =
      searchParams.has(LOGOUT_MARKER_PARAM)
      || searchParams.has(LOGOUT_REASON_PARAM);

    const hasSessionTransfer = Boolean(getSessionTransferFromUrl().token);

    if (hasLogoutParams && !hasSessionTransfer) {
      stripAuthHandoffFromUrl();
    }
  }, []);

  useEffect(() => {
    const markWindowClosed = () => {
      if (isIntentionalLogoutNavigationRef.current) return;
      if (isSessionTransferRedirectInProgress()) return;
      if (isCrossDomainRedirectInProgress()) return;
      if (!session || !user) return;

      try {
        window.localStorage.setItem(
          TAB_CLOSE_MARKER_STORAGE_KEY,
          JSON.stringify({ at: Date.now() }),
        );
      } catch {
        // noop
      }
    };

    // Use 'beforeunload' instead of 'pagehide'.
    // 'pagehide' fires on tab switches in Safari/iOS, which falsely marks
    // the window as closed and triggers force-logout on the next full reload.
    // 'beforeunload' only fires on real navigation/close — not tab switches.
    window.addEventListener('beforeunload', markWindowClosed);

    return () => {
      window.removeEventListener('beforeunload', markWindowClosed);
    };
  }, [session, user]);

  useEffect(() => {
    const consumeSessionTransfer = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hasLogoutMarker = searchParams.get(LOGOUT_MARKER_PARAM) === '1';

      const transfer = getSessionTransferFromUrl();
      const encodedTransfer = transfer.token;
      const directTransfer = getDirectSessionTransferFromUrl();

      if (!encodedTransfer && !directTransfer) {
        if (hasLogoutMarker) {
          await supabase.auth.signOut({ scope: 'local' });
          stripAuthHandoffFromUrl();
        }
        return;
      }

      transitionAuthStatus('hydrating', 'session_transfer_consume_started', {
        source: directTransfer ? directTransfer.source : transfer.source,
      });
      const transferStartedAt = performance.now();

      if (directTransfer) {
        const isFreshDirectTransfer = (Date.now() - directTransfer.issued_at) <= SESSION_TRANSFER_MAX_AGE_MS;
        if (!isFreshDirectTransfer) {
          transitionAuthStatus('error', 'session_transfer_direct_expired_or_invalid', {
            hydrationMs: Math.trunc(performance.now() - transferStartedAt),
          });
          stripAuthHandoffFromUrl();
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token: directTransfer.access_token,
          refresh_token: directTransfer.refresh_token,
        });

        if (error) {
          logger.warn('session_transfer_direct_set_session_failed', {
            error: error.message,
          });
          transitionAuthStatus('error', 'session_transfer_direct_set_session_failed', {
            hydrationMs: Math.trunc(performance.now() - transferStartedAt),
          });
          clearSessionTransferRedirectInProgress();
          stripAuthHandoffFromUrl();
          return;
        }

        clearSessionTransferRedirectInProgress();
        stripAuthHandoffFromUrl();
        transitionAuthStatus('loading', 'session_transfer_direct_consumed_success', {
          hydrationMs: Math.trunc(performance.now() - transferStartedAt),
        });
        return;
      }

      if (!encodedTransfer) {
        return;
      }

      if (wasSessionTransferAlreadyConsumed(encodedTransfer)) {
        const url = new URL(window.location.href);
        url.searchParams.delete(SESSION_TRANSFER_PARAM);
        const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : '');
        hashParams.delete(SESSION_TRANSFER_PARAM);
        const nextHash = hashParams.toString();
        const cleanedUrl = `${url.pathname}${url.search}${nextHash ? `#${nextHash}` : ''}`;
        window.history.replaceState({}, document.title, cleanedUrl);
        clearSessionTransferRedirectInProgress();
        transitionAuthStatus('loading', 'session_transfer_already_consumed');
        return;
      }

      try {
        const decoded = await withTimeout(
          consumeSessionTransferCode(encodedTransfer, window.location.hostname.toLowerCase()),
          HYDRATION_TIMEOUT_MS,
          'session_transfer_consume_timeout',
        );

        if (!decoded) {
          transitionAuthStatus('error', 'session_transfer_token_invalid_or_unavailable', {
            hydrationMs: Math.trunc(performance.now() - transferStartedAt),
          });
          stripAuthHandoffFromUrl();
          return;
        }

        const issuedAt = Number(decoded.issued_at || 0);
        const isFreshTransfer = Number.isFinite(issuedAt) && issuedAt > 0 && (Date.now() - issuedAt) <= SESSION_TRANSFER_MAX_AGE_MS;
        if (!isFreshTransfer) {
          logger.warn('session_transfer_expired_or_invalid', {
            issuedAt,
          });
          transitionAuthStatus('error', 'session_transfer_expired_or_invalid', {
            hydrationMs: Math.trunc(performance.now() - transferStartedAt),
          });
          stripAuthHandoffFromUrl();
          return;
        }

        // session_transfer has priority over stale logout markers from closed-window flow
        if (hasLogoutMarker) {
          searchParams.delete(LOGOUT_MARKER_PARAM);
          searchParams.delete(LOGOUT_REASON_PARAM);
          const nextQuery = searchParams.toString();
          const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '');
          hashParams.delete(SESSION_TRANSFER_PARAM);
          const nextHash = hashParams.toString();
          const cleanedUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${nextHash ? `#${nextHash}` : ''}`;
          window.history.replaceState({}, document.title, cleanedUrl);
        }

        const { error } = await supabase.auth.setSession({
          access_token: decoded.access_token,
          refresh_token: decoded.refresh_token,
        });

        if (error) {
          logger.warn('session_transfer_consume_failed', {
            error: error.message,
          });
          transitionAuthStatus('error', 'session_transfer_set_session_failed', {
            hydrationMs: Math.trunc(performance.now() - transferStartedAt),
          });
          clearSessionTransferRedirectInProgress();
          return;
        }
        markConsumedSessionTransfer(encodedTransfer);
        const url = new URL(window.location.href);
        url.searchParams.delete(SESSION_TRANSFER_PARAM);
        const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : '');
        hashParams.delete(SESSION_TRANSFER_PARAM);
        const nextHash = hashParams.toString();
        const cleanedUrl = `${url.pathname}${url.search}${nextHash ? `#${nextHash}` : ''}`;
        window.history.replaceState({}, document.title, cleanedUrl);
        clearSessionTransferRedirectInProgress();
        transitionAuthStatus('loading', 'session_transfer_consumed_success', {
          hydrationMs: Math.trunc(performance.now() - transferStartedAt),
        });
      } catch (error) {
        logger.warn('session_transfer_decode_failed', {
          error: String(error),
        });
        transitionAuthStatus('error', 'session_transfer_decode_failed', {
          hydrationMs: Math.trunc(performance.now() - transferStartedAt),
        });
        clearSessionTransferRedirectInProgress();
      }
    };

    void consumeSessionTransfer();
  }, [transitionAuthStatus]);

  const resolveDomainEmpresaId = useCallback(async (): Promise<string | null> => {
    if (isOwnerDomain(window.location.hostname)) return null;

    const hostname = window.location.hostname.toLowerCase();
    const { data: domainConfig, error } = await (supabase
      .from('empresa_config' as any)
      .select('empresa_id')
      .eq('dominio_custom', hostname)
      .maybeSingle() as any);

    if (!error && domainConfig?.empresa_id) {
      return domainConfig.empresa_id as string;
    }

    if (error) {
      logger.warn('tenant_domain_resolve_failed', {
        hostname,
        error: error.message,
      });
    }

    const baseDomain = TENANT_BASE_DOMAIN.toLowerCase();
    const isBaseDomainHost = hostname === baseDomain || hostname === `www.${baseDomain}`;

    if (isBaseDomainHost) return null;
    if (!hostname.endsWith(`.${baseDomain}`)) return null;

    const slug = hostname.replace(`.${baseDomain}`, '').split('.')[0]?.trim().toLowerCase();
    if (!slug || slug === 'www') return null;

    const { data: companyBySlug, error: slugError } = await supabase
      .from('empresas')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (slugError) {
      logger.warn('tenant_slug_resolve_failed', {
        hostname,
        slug,
        error: slugError.message,
      });
      return null;
    }

    return companyBySlug?.id ?? null;
  }, []);

  useEffect(() => {
    const loadImpersonation = async () => {
      try {
        const raw = window.localStorage.getItem(IMPERSONATION_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as ImpersonationSession;
        if (!parsed?.empresaId || !parsed?.startedAt) {
          window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
          return;
        }
        if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
          window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
          return;
        }

        // Reject tampered localStorage impersonation sessions unless backend confirms validity.
        if (parsed.id && parsed.sessionToken) {
          try {
            await validateImpersonationSession({
              empresa_id: parsed.empresaId,
              impersonation_session_id: parsed.id,
              impersonation_session_token: parsed.sessionToken,
            });
          } catch {
            window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
            return;
          }
        }

        setImpersonation(parsed);
      } catch {
        window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      }
    };

    void loadImpersonation();
  }, []);

  useEffect(() => {
    if (!impersonation) {
      window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(impersonation));
  }, [impersonation]);

  useEffect(() => {
    if (!impersonation?.expiresAt) return;

    const expiresAtMs = new Date(impersonation.expiresAt).getTime();
    if (!Number.isFinite(expiresAtMs)) {
      setImpersonation(null);
      return;
    }

    if (expiresAtMs <= Date.now()) {
      setImpersonation(null);
      return;
    }

    const timer = window.setInterval(() => {
      if (Date.now() >= expiresAtMs) {
        setImpersonation(null);
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [impersonation]);

  const validateTenantDomainAccess = useCallback(async (options?: { allowBaseDomain?: boolean }): Promise<string | null> => {
    if (isOwnerDomain(window.location.hostname)) return null;

    const hostname = window.location.hostname.toLowerCase();
    const allowBaseDomain = Boolean(options?.allowBaseDomain);

    if (allowBaseDomain && isTenantBaseDomain(hostname)) {
      return null;
    }

    const domainEmpresaId = await resolveDomainEmpresaId();
    if (!domainEmpresaId) {
      if (isTenantBaseDomain(hostname)) {
        return 'Acesso pelo domínio base está bloqueado. Use o subdomínio da sua empresa.';
      }
      return 'Domínio não autorizado para login.';
    }

    return null;
  }, [resolveDomainEmpresaId]);

  const extractRolesFromMetadata = useCallback((metadata?: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }) => {
    const rawRoles: string[] = [];

    const collect = (value: unknown) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (typeof entry === 'string') rawRoles.push(entry);
        });
        return;
      }
      if (typeof value === 'string') {
        rawRoles.push(value);
      }
    };

    collect(metadata?.app_metadata?.role);
    collect(metadata?.app_metadata?.roles);
    // Security fix: user_metadata is user-writable (supabase.auth.updateUser),
    // so it MUST NOT be trusted as a role source on the frontend.
    // Note: can_access_empresa() in the DB still reads user_metadata for device-auth JWTs — that's OK.

    return Array.from(new Set(
      rawRoles
        .map((role) => normalizeRole(role))
        .filter((role): role is AppRole => Boolean(role)),
    ));
  }, []);

  const extractEmpresaIdFromMetadata = useCallback((metadata?: {
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  }) => {
    // Security fix: only trust app_metadata (server-set). user_metadata is user-writable.
    const candidate = metadata?.app_metadata?.empresa_id;
    if (typeof candidate !== 'string') return null;
    const normalized = candidate.trim();
    return normalized || null;
  }, []);

  const extractEmpresaSlugFromMetadata = useCallback((metadata?: {
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  }) => {
    // Security fix: only trust app_metadata (server-set). user_metadata is user-writable.
    const candidate = metadata?.app_metadata?.empresa_slug;
    if (typeof candidate !== 'string') return null;
    const normalized = candidate.trim().toLowerCase();
    return normalized || null;
  }, []);

  const extractForcePasswordChangeFromMetadata = useCallback((metadata?: {
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  }) => {
    // Security fix: only trust app_metadata (server-set). user_metadata is user-writable.
    const candidate =
      metadata?.app_metadata?.force_password_change
      ?? metadata?.app_metadata?.must_change_password;

    return Boolean(candidate);
  }, []);

  const fetchUserProfile = useCallback(async (
    userId: string,
    email?: string | null,
    metadata?: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> },
    expectedEmpresaId?: string | null,
  ) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome,empresa_id,force_password_change')
        .eq('id', userId)
        .maybeSingle();

      const roleQuery = await supabase
        .from('user_roles')
        .select('role, empresa_id')
        .eq('user_id', userId);

      let roleData = roleQuery.data || [];

      if (roleQuery.error) {
        const fallbackRoleQuery = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        roleData = (fallbackRoleQuery.data || []).map((item: any) => ({
          role: item.role,
          empresa_id: '' as string,
        }));

        if (fallbackRoleQuery.error) {
          logger.warn('fetch_user_roles_failed', {
            userId,
            primaryError: roleQuery.error.message,
            fallbackError: fallbackRoleQuery.error.message,
          });
        }
      }

      const dbRoles: AppRole[] = (roleData || [])
        .map((item: { role: string }) => normalizeRole(item.role))
        .filter((role): role is AppRole => Boolean(role));

      const metadataRoles = extractRolesFromMetadata(metadata);
      const metadataEmpresaId = extractEmpresaIdFromMetadata(metadata);
      const roles: AppRole[] = Array.from(new Set([...dbRoles, ...metadataRoles]));

      const availableTenantIds = new Set<string>();
      (roleData || []).forEach((item: { empresa_id?: string | null }) => {
        if (item.empresa_id) availableTenantIds.add(item.empresa_id);
      });
      if (profile?.empresa_id) availableTenantIds.add(profile.empresa_id);
      if (metadataEmpresaId) availableTenantIds.add(metadataEmpresaId);

      let tenantId: string | null = null;
      if (expectedEmpresaId) {
        tenantId = availableTenantIds.has(expectedEmpresaId) ? expectedEmpresaId : null;
      } else {
        tenantId = (roleData || [])[0]?.empresa_id || profile?.empresa_id || metadataEmpresaId || null;
      }

      let tenantSlug: string | null = extractEmpresaSlugFromMetadata(metadata);
      if (tenantId) {
        const { data: companyData } = await supabase
          .from('empresas')
          .select('slug')
          .eq('id', tenantId)
          .maybeSingle();

        const slug = typeof companyData?.slug === 'string'
          ? companyData.slug.trim().toLowerCase()
          : '';
        if (slug) tenantSlug = slug;
      }

      // DB (profiles) is the source of truth. Only fallback to JWT metadata
      // when the profile row was not fetched (e.g. RLS / network error).
      // Using || here caused an infinite loop: after password change the DB
      // was already false, but the stale JWT still carried true in app_metadata.
      const forcePasswordChange = profile
        ? Boolean(profile.force_password_change)
        : extractForcePasswordChangeFromMetadata(metadata);

      const effectiveRole = getEffectiveRole({ roles, email });

      return {
        nome: profile?.nome || 'Usuário',
        tipo: effectiveRole,
        roles,
        tenantId,
        tenantSlug,
        forcePasswordChange,
      };
    } catch (error) {
      logger.error('fetch_user_profile_failed', {
        error: String(error),
        userId,
      });

      const roles: AppRole[] = ['USUARIO'];

      return {
        nome: 'Usuário',
        tipo: 'USUARIO' as AppRole,
        roles,
        tenantId: null as string | null,
        tenantSlug: extractEmpresaSlugFromMetadata(metadata),
        forcePasswordChange: extractForcePasswordChangeFromMetadata(metadata),
      };
    }
  }, [extractEmpresaIdFromMetadata, extractEmpresaSlugFromMetadata, extractForcePasswordChangeFromMetadata, extractRolesFromMetadata]);

  const elevateToSystemOwner = useCallback((profileData: {
    nome: string;
    tipo: AppRole;
    roles: AppRole[];
    tenantId: string | null;
    tenantSlug?: string | null;
    forcePasswordChange?: boolean;
  }) => {
    const roles = Array.from(new Set([
      ...(profileData.roles || []),
      'SYSTEM_OWNER' as AppRole,
      'SYSTEM_ADMIN' as AppRole,
    ]));

    return {
      ...profileData,
      tipo: 'SYSTEM_OWNER' as AppRole,
      roles,
    };
  }, []);

  const verifyOwnerBackendAccess = useCallback(async (token?: string | null): Promise<boolean> => {
    try {
      let accessToken = token ?? null;
      if (!accessToken) {
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        accessToken = activeSession?.access_token ?? null;
      }

      if (!accessToken) return false;

      const { data, error } = await supabase.functions.invoke('owner-portal-admin', {
        body: { action: 'health_check' },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) return false;
      return Boolean((data as { status?: string } | null)?.status === 'ok');
    } catch {
      return false;
    }
  }, []);

  const resolveUserProfile = useCallback(async (
    userId: string,
    email?: string | null,
    metadata?: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> },
    token?: string | null,
  ) => {
    let domainEmpresaId = await resolveDomainEmpresaId();

    // Fallback for first access on brand-new tenants: trust auth metadata when host slug matches.
    if (!domainEmpresaId && !isOwnerDomain(window.location.hostname)) {
      const metadataEmpresaId = extractEmpresaIdFromMetadata(metadata);
      const metadataEmpresaSlug = extractEmpresaSlugFromMetadata(metadata);
      const hostname = window.location.hostname.toLowerCase();
      const baseDomain = TENANT_BASE_DOMAIN.toLowerCase();
      const hostSlug = resolveTenantHostSlug(hostname);

      if (metadataEmpresaId && metadataEmpresaSlug && hostSlug && hostSlug === metadataEmpresaSlug) {
        domainEmpresaId = metadataEmpresaId;
      }
    }

    let profileData = await fetchUserProfile(userId, email, metadata, domainEmpresaId);

    if (!isOwnerDomain(window.location.hostname)) {
      const hostname = window.location.hostname.toLowerCase();
      const hostSlug = resolveTenantHostSlug(hostname);
      const metadataEmpresaSlug = extractEmpresaSlugFromMetadata(metadata);
      const isGlobalRole =
        profileData.tipo === 'SYSTEM_OWNER' ||
        profileData.tipo === 'SYSTEM_ADMIN' ||
        profileData.tipo === 'MASTER_TI';

      if (isGlobalRole) {
        return {
          ...profileData,
          tenantId: domainEmpresaId || profileData.tenantId,
        };
      }

      if (isTenantBaseDomain(hostname)) {
        return {
          ...profileData,
          tenantId: profileData.tenantId,
        };
      }

      const slugMatchesTenant = Boolean(
        hostSlug
        && (
          (profileData.tenantSlug && profileData.tenantSlug === hostSlug)
          || (metadataEmpresaSlug && metadataEmpresaSlug === hostSlug)
        ),
      );

      if (!domainEmpresaId && slugMatchesTenant && profileData.tenantId) {
        logger.warn('tenant_profile_resolve_fallback_slug_match_without_domain_config', {
          userId,
          hostSlug,
          tenantId: profileData.tenantId,
        });

        return {
          ...profileData,
          tenantId: profileData.tenantId,
          tenantSlug: profileData.tenantSlug || hostSlug,
        };
      }

      return {
        ...profileData,
        tenantId: domainEmpresaId && profileData.tenantId === domainEmpresaId ? domainEmpresaId : null,
      };
    }

    const isGlobalRole =
      profileData.tipo === 'SYSTEM_OWNER' ||
      profileData.tipo === 'SYSTEM_ADMIN' ||
      profileData.tipo === 'MASTER_TI';

    if (isGlobalRole) return profileData;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      profileData = await fetchUserProfile(userId, email, metadata, domainEmpresaId);

      const recoveredGlobalRole =
        profileData.tipo === 'SYSTEM_OWNER' ||
        profileData.tipo === 'SYSTEM_ADMIN' ||
        profileData.tipo === 'MASTER_TI';

      if (recoveredGlobalRole) return profileData;
    }

    // Security fix (VULN-AUTH-04): removed backend fallback elevation.
    // If owner doesn't have SYSTEM_OWNER role in user_roles, fix the DB — don't self-elevate.
    // The old code called verifyOwnerBackendAccess() and auto-granted SYSTEM_OWNER to anyone
    // whose token passed health_check, which is a privilege escalation vector.

    return profileData;
  }, [elevateToSystemOwner, extractEmpresaSlugFromMetadata, fetchUserProfile, resolveDomainEmpresaId, verifyOwnerBackendAccess]);

  const resolveUserProfileWithRetry = useCallback(async (
    userId: string,
    email?: string | null,
    metadata?: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> },
    token?: string | null,
  ) => {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        return await withTimeout(
          resolveUserProfile(userId, email, metadata, token),
          LOGIN_PROFILE_TIMEOUT_MS,
          `timeout_resolving_user_profile_attempt_${attempt}`,
        );
      } catch (error) {
        lastError = error;
        logger.warn('auth_profile_hydration_attempt_failed', {
          userId,
          attempt,
          error: String(error),
        });
      }
    }

    throw lastError ?? new Error('profile_hydration_failed');
  }, [resolveUserProfile]);

  useEffect(() => {
    let isActive = true;

    transitionAuthStatus('loading', 'auth_bootstrap_started');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isActive) return;

        setSession(nextSession);

        if (nextSession?.user) {
          transitionAuthStatus('hydrating', 'auth_state_change_with_session', {
            event: _event,
            userId: nextSession.user.id,
          });

          void (async () => {
            try {
              const profileData = await resolveUserProfileWithRetry(
                nextSession.user.id,
                nextSession.user.email,
                {
                  app_metadata: nextSession.user.app_metadata,
                  user_metadata: nextSession.user.user_metadata,
                },
                nextSession.access_token,
              );

              if (!isActive) return;

              const isGlobalRole =
                profileData.tipo === 'SYSTEM_OWNER' ||
                profileData.tipo === 'SYSTEM_ADMIN' ||
                profileData.tipo === 'MASTER_TI';

              if (!isGlobalRole && !profileData.tenantId) {
                await supabase.auth.signOut();
                setUser(null);
                setSession(null);
                transitionAuthStatus('unauthenticated', 'profile_without_tenant_after_hydration', {
                  userId: nextSession.user.id,
                });
                return;
              }

              setUser({
                id: nextSession.user.id,
                email: nextSession.user.email || '',
                nome: profileData.nome,
                tipo: profileData.tipo as AppRole,
                roles: profileData.roles,
                tenantId: profileData.tenantId,
                tenantSlug: (profileData as any).tenantSlug ?? null,
                forcePasswordChange: (profileData as any).forcePasswordChange ?? false,
              });
              setMonitoringUser(nextSession.user.id, nextSession.user.email || '');
              if (profileData.tenantId) setMonitoringTag('tenant', profileData.tenantId);
              clearRedirectRetryAttempts();
              transitionAuthStatus('authenticated', 'profile_hydrated_from_auth_state_change', {
                userId: nextSession.user.id,
              });
            } catch (error) {
              logger.error('auth_state_change_hydration_failed', {
                error: String(error),
                userId: nextSession.user.id,
              });
              setUser(null);
              transitionAuthStatus('error', 'auth_state_change_hydration_failed', {
                userId: nextSession.user.id,
              });
            }
          })();
        } else if (isActive) {
          setUser(null);
          transitionAuthStatus('unauthenticated', 'auth_state_change_without_session', {
            event: _event,
          });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isActive) return;

      setSession(session);

      if (session?.user) {
        transitionAuthStatus('hydrating', 'bootstrap_session_found', {
          userId: session.user.id,
        });

        void resolveUserProfileWithRetry(session.user.id, session.user.email, {
          app_metadata: session.user.app_metadata,
          user_metadata: session.user.user_metadata,
        }, session.access_token).then(profileData => {
          if (!isActive) return;

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            nome: profileData.nome,
            tipo: profileData.tipo as AppRole,
            roles: profileData.roles,
            tenantId: profileData.tenantId,
            tenantSlug: (profileData as any).tenantSlug ?? null,
            forcePasswordChange: (profileData as any).forcePasswordChange ?? false,
          });

          clearRedirectRetryAttempts();
          transitionAuthStatus('authenticated', 'bootstrap_profile_loaded', {
            userId: session.user.id,
          });
        }).catch((error) => {
          if (!isActive) return;
          logger.error('auth_bootstrap_profile_failed', {
            error: String(error),
            userId: session.user.id,
          });
          setUser(null);
          transitionAuthStatus('error', 'bootstrap_profile_failed', {
            userId: session.user.id,
          });
        });
      } else {
        transitionAuthStatus('unauthenticated', 'bootstrap_without_session');
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [resolveUserProfileWithRetry, transitionAuthStatus]);

  const login = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    transitionAuthStatus('loading', 'login_started', {
      email: email.trim().toLowerCase(),
    });

    const throttle = getLoginRateLimitStatus(email);
    if (throttle.blocked) {
      transitionAuthStatus('unauthenticated', 'login_rate_limited', {
        retryAfterSeconds: throttle.retryAfterSeconds,
      });
      return { error: `Muitas tentativas de login. Tente novamente em ${throttle.retryAfterSeconds}s.` };
    }

    const ownerDomain = isOwnerDomain(window.location.hostname);
    let signInSession: Session | null = null;
    let signInUser: any | null = null;
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let providerStatus: number | null = null;
    let providerErrorMessage = '';
    let providerPayload: any = null;

    if (ownerDomain) {
      const ownerSignIn = await signInThroughOwnerEdge(email, password);
      providerStatus = ownerSignIn.status;
      providerPayload = ownerSignIn.payload;

      if (!ownerSignIn.ok) {
        providerErrorMessage = ownerSignIn.message || 'Owner login failed';
      } else {
        accessToken = ownerSignIn.accessToken;
        refreshToken = ownerSignIn.refreshToken;
        signInUser = ownerSignIn.user;

        if (accessToken && refreshToken) {
          const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setSessionError) {
            providerErrorMessage = String(setSessionError.message || 'Owner session setup failed');
          } else {
            signInSession = setSessionData.session ?? null;
            signInUser = setSessionData.user ?? signInUser;
          }
        }
      }
    } else {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      providerStatus = signInError?.status ?? null;
      providerErrorMessage = String(signInError?.message ?? '').trim();
      signInSession = signInData?.session ?? null;
      signInUser = signInData?.user ?? null;
      accessToken = signInData?.session?.access_token ?? null;
      refreshToken = signInData?.session?.refresh_token ?? null;
    }

    if (providerErrorMessage || !accessToken || !refreshToken) {
      const failedAttempt = registerFailedLoginAttempt(email);

      let message = 'Falha ao autenticar. Tente novamente.';
      const normalizedError = String(providerErrorMessage ?? '').trim().toLowerCase();

      // ── Subscription expired — special handling ──────────────────────
      if (normalizedError.includes('subscription_expired') || providerStatus === 403) {
        const details = providerPayload?.details ?? providerPayload?.context ?? {};
        const contactEmail = String(details?.contact_email ?? '').trim();
        const contactWhatsapp = String(details?.contact_whatsapp ?? '').trim();
        const contactName = String(details?.contact_name ?? '').trim();
        const customMessage = String(details?.custom_message ?? '').trim();

        const contactParts: string[] = [];
        if (contactEmail) contactParts.push(`Email: ${contactEmail}`);
        if (contactWhatsapp) contactParts.push(`WhatsApp: ${contactWhatsapp}`);

        message = customMessage
          || `Seu plano venceu e o acesso foi bloqueado.${contactName ? ` Entre em contato com ${contactName}` : ' Entre em contato com o representante'} para renovar sua assinatura.${contactParts.length ? '\n' + contactParts.join(' | ') : ''}`;

        transitionAuthStatus('unauthenticated', 'login_blocked_subscription_expired', {
          contact_email: contactEmail || null,
          contact_whatsapp: contactWhatsapp || null,
        });

        return { error: message };
      }

      if (normalizedError.includes('invalid login credentials') || normalizedError.includes('invalid credentials')) {
        message = 'Email ou senha inválidos';
      } else if (normalizedError.includes('email not confirmed')) {
        message = 'Email ainda não confirmado. Verifique sua caixa de entrada.';
      } else if (normalizedError.includes('too many requests') || normalizedError.includes('rate limit')) {
        message = 'Muitas tentativas de login. Tente novamente em instantes.';
      } else if (providerStatus === 429) {
        message = 'Muitas tentativas de login. Tente novamente em instantes.';
      } else if (normalizedError.includes('email and password required')) {
        message = 'Email e senha são obrigatórios';
      } else if (
        normalizedError.includes('auth schema misconfigured')
        || normalizedError.includes('database error querying schema')
        || providerStatus === 503
      ) {
        message = 'Serviço de autenticação do Owner indisponível no momento. Tente novamente em alguns minutos.';
      } else if (normalizedError.includes('auth provider request failed') || providerStatus === 502) {
        message = 'Falha temporária no provedor de autenticação. Tente novamente em instantes.';
      } else if (providerErrorMessage) {
        message = providerErrorMessage;
      }

      await writeAuditLog({
        action: 'AUTH_LOGIN_FAILED',
        table: 'auth',
        source: 'auth_context',
        severity: 'warning',
        metadata: {
          email: email.trim().toLowerCase(),
          provider_status: providerStatus,
          provider_error: providerErrorMessage || null,
          attempts_in_window: failedAttempt.attemptsCount,
          blocked_until: failedAttempt.blockedUntil > 0 ? new Date(failedAttempt.blockedUntil).toISOString() : null,
        },
      }).catch(() => null);

      transitionAuthStatus('unauthenticated', 'login_failed', {
        reason: normalizedError || 'unknown_login_error',
      });

      return { error: message };
    }

    resetLoginRateLimit(email);
    transitionAuthStatus('hydrating', 'login_session_received');

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const activeSession = currentSession ?? signInSession ?? null;
    const activeUser = currentUser ?? signInUser ?? null;

    if (activeUser) {
      let profileData: {
        nome: string;
        tipo: AppRole;
        roles: AppRole[];
        tenantId: string | null;
        tenantSlug: string | null;
        forcePasswordChange: boolean;
      };

      try {
        const rawProfile = await resolveUserProfileWithRetry(activeUser.id, activeUser.email, {
            app_metadata: activeUser.app_metadata,
            user_metadata: activeUser.user_metadata,
          }, activeSession?.access_token ?? null);
        profileData = {
          nome: rawProfile.nome,
          tipo: rawProfile.tipo as AppRole,
          roles: rawProfile.roles,
          tenantId: rawProfile.tenantId,
          tenantSlug: (rawProfile as any).tenantSlug ?? null,
          forcePasswordChange: (rawProfile as any).forcePasswordChange ?? false,
        };
      } catch {
        await supabase.auth.signOut();
        transitionAuthStatus('error', 'login_profile_hydration_timeout_or_error', {
          userId: activeUser.id,
        });
        return { error: 'Tempo esgotado ao carregar seu perfil. Tente novamente.' };
      }

      const isOwnerPortalAllowed =
        profileData.tipo === 'SYSTEM_OWNER' ||
        profileData.tipo === 'SYSTEM_ADMIN';

      if (isOwnerDomain(window.location.hostname) && !isOwnerPortalAllowed) {
        await supabase.auth.signOut();
        transitionAuthStatus('unauthenticated', 'login_missing_owner_permission', {
          userId: activeUser.id,
        });
        return { error: 'Conta autenticada, mas sem permissão SYSTEM_OWNER para o Owner Portal.' };
      }

      setSession(activeSession);
      setUser({
        id: activeUser.id,
        email: activeUser.email || '',
        nome: profileData.nome,
        tipo: profileData.tipo,
        roles: profileData.roles,
        tenantId: profileData.tenantId,
        tenantSlug: profileData.tenantSlug,
        forcePasswordChange: profileData.forcePasswordChange,
      });
      transitionAuthStatus('authenticated', 'login_profile_hydrated', {
        userId: activeUser.id,
      });
      clearRedirectRetryAttempts();

      const isGlobalRole =
        profileData.tipo === 'SYSTEM_OWNER' ||
        profileData.tipo === 'SYSTEM_ADMIN' ||
        profileData.tipo === 'MASTER_TI';

      const isBaseTenantHost = isTenantBaseDomain(window.location.hostname);

      if (!isOwnerDomain(window.location.hostname) && !isGlobalRole) {
        if (isBaseTenantHost) {
          // Base-domain login should only authenticate/hydrate.
          // Cross-domain redirect is centralized in Login.tsx to avoid race/duplication.
          logger.info('auth_login_base_domain_authenticated_waiting_login_page_redirect', {
            userId: activeUser.id,
            tenantId: profileData.tenantId,
          });
        } else {
          let domainEmpresaId = await resolveDomainEmpresaId();

          const metadataEmpresaId = extractEmpresaIdFromMetadata({
            app_metadata: activeUser.app_metadata,
            user_metadata: activeUser.user_metadata,
          });
          const metadataEmpresaSlug = extractEmpresaSlugFromMetadata({
            app_metadata: activeUser.app_metadata,
            user_metadata: activeUser.user_metadata,
          });

          const hostname = window.location.hostname.toLowerCase();
          const hostSlug = hostname.endsWith(`.${TENANT_BASE_DOMAIN}`)
            ? hostname.replace(`.${TENANT_BASE_DOMAIN}`, '').split('.')[0]?.trim().toLowerCase() || null
            : null;

          if (!domainEmpresaId && metadataEmpresaId && metadataEmpresaSlug && hostSlug && hostSlug === metadataEmpresaSlug) {
            domainEmpresaId = metadataEmpresaId;
          }

          if (!domainEmpresaId) {
            const isHandoffFailedTenantLogin =
              window.location.pathname === '/login'
              && new URLSearchParams(window.location.search).get(HANDOFF_FAILED_PARAM) === '1';

            const slugMatchesHost = Boolean(
              hostSlug
              && (
                (profileData.tenantSlug && profileData.tenantSlug === hostSlug)
                || (metadataEmpresaSlug && metadataEmpresaSlug === hostSlug)
              ),
            );

            if (isHandoffFailedTenantLogin && slugMatchesHost && profileData.tenantId) {
              domainEmpresaId = profileData.tenantId;
              logger.warn('tenant_login_domain_resolve_fallback_by_profile_on_handoff_failed', {
                userId: activeUser.id,
                hostSlug,
                tenantId: profileData.tenantId,
              });
            }
          }

          if (!domainEmpresaId) {
            await supabase.auth.signOut();
            transitionAuthStatus('unauthenticated', 'login_blocked_domain_not_authorized', {
              userId: activeUser.id,
            });
            return { error: 'Domínio não autorizado para login.' };
          }

          if (!profileData.tenantId || profileData.tenantId !== domainEmpresaId) {
            await supabase.auth.signOut();
            transitionAuthStatus('unauthenticated', 'login_blocked_tenant_mismatch', {
              userId: activeUser.id,
              domainEmpresaId,
              profileTenantId: profileData.tenantId,
            });
            return { error: 'Usuário não pertence à empresa deste subdomínio.' };
          }
        }
      }

      if (!isGlobalRole && !profileData.tenantId) {
        await supabase.auth.signOut();
        transitionAuthStatus('unauthenticated', 'login_blocked_without_tenant', {
          userId: activeUser.id,
        });
        return { error: 'Usuário sem vínculo de empresa. Acesso bloqueado.' };
      }
    }

    void Promise.resolve().then(async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const profileData = await resolveUserProfile(user.id, user.email, {
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata,
      });

      await writeAuditLog({
        action: 'LOGIN',
        table: 'auth',
        recordId: user.id,
        empresaId: profileData.tenantId,
        source: 'auth_context',
        metadata: {
          email: user.email || email,
          event: 'login_success',
        },
      });
    });

    return { error: null };
  }, [extractEmpresaSlugFromMetadata, resolveDomainEmpresaId, resolveUserProfileWithRetry, transitionAuthStatus]);

  const changePassword = useCallback(async (newPassword: string): Promise<{ error: string | null }> => {
    const normalizedPassword = newPassword.trim();
    if (normalizedPassword.length < 8) {
      return { error: 'A nova senha deve ter pelo menos 8 caracteres.' };
    }

    const { data: sessionResult } = await supabase.auth.getSession();
    let accessToken = sessionResult.session?.access_token ?? null;

    if (!accessToken) {
      const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
      accessToken = refreshedSession.session?.access_token ?? null;

      if (refreshError || !accessToken) {
        return { error: 'Auth session missing! Faça login novamente para continuar.' };
      }
    }

    const { error: changeError } = await supabase.functions.invoke('auth-change-password', {
      body: {
        new_password: normalizedPassword,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (changeError) {
      logger.warn('auth_change_password_function_failed_fallback_to_update_user', {
        error: changeError.message ?? 'invoke_failed',
      });

      const { error: fallbackChangeError } = await supabase.auth.updateUser({
        password: normalizedPassword,
        data: {
          force_password_change: false,
        },
      });

      if (fallbackChangeError) {
        return { error: fallbackChangeError.message || changeError.message || 'Falha ao atualizar senha.' };
      }

      const { data: fallbackUserResult } = await supabase.auth.getUser();
      const fallbackUser = fallbackUserResult.user;
      if (fallbackUser?.id) {
        await Promise.resolve(
          supabase
            .from('profiles')
            .update({ force_password_change: false })
            .eq('id', fallbackUser.id)
        ).catch(() => null);
      }
    }

    // Refresh the session so the browser gets a new JWT with the updated
    // app_metadata (force_password_change: false).  Without this, a page
    // reload would read the stale cached JWT and re-enter the loop.
    await supabase.auth.refreshSession().catch(() => null);

    const { data: userResult } = await supabase.auth.getUser();
    const currentUser = userResult.user;

    if (!currentUser?.id) {
      return { error: 'Sessão inválida após atualização de senha.' };
    }

    const refreshedProfile = await resolveUserProfile(
      currentUser.id,
      currentUser.email,
      {
        app_metadata: currentUser.app_metadata,
        user_metadata: currentUser.user_metadata,
      },
    );

    setUser((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        nome: refreshedProfile.nome,
        tipo: refreshedProfile.tipo as AppRole,
        roles: refreshedProfile.roles,
        tenantId: refreshedProfile.tenantId,
        tenantSlug: (refreshedProfile as any).tenantSlug ?? previous.tenantSlug,
        forcePasswordChange: false,
      };
    });

    await writeAuditLog({
      action: 'AUTH_PASSWORD_CHANGED',
      table: 'profiles',
      recordId: currentUser.id,
      empresaId: refreshedProfile.tenantId,
      source: 'auth_context',
      metadata: {
        force_password_change_cleared: true,
      },
    }).catch(() => null);

    return { error: null };
  }, [resolveUserProfile]);

  const signup = useCallback(async (email: string, password: string, nome: string): Promise<{ error: string | null }> => {
    const redirectUrl = `${window.location.origin}/`;
    const empresaSlug = resolveEmpresaSlug(window.location.hostname);
    const hostname = window.location.hostname;
    const baseDomain = TENANT_BASE_DOMAIN.toLowerCase();

    const tenantDomainError = await validateTenantDomainAccess();
    if (tenantDomainError) {
      return { error: tenantDomainError };
    }

    const { data: domainConfig, error: domainConfigError } = await (supabase
      .from('empresa_config' as any)
      .select('empresa_id')
      .eq('dominio_custom', hostname)
      .maybeSingle() as any);

    if (domainConfigError) {
      return { error: 'Falha ao validar domínio da empresa.' };
    }

    let empresaId: string | null = domainConfig?.empresa_id ?? null;

    if (!empresaId) {
      const isSubdomainHost = hostname.toLowerCase().endsWith(`.${baseDomain}`) && !isTenantBaseDomain(hostname);
      const slug = isSubdomainHost
        ? hostname.toLowerCase().replace(`.${baseDomain}`, '').split('.')[0]?.trim().toLowerCase() || ''
        : '';

      if (slug && slug !== 'www') {
        const { data: empresaIdBySlug } = await supabase.rpc('resolve_empresa_id_by_slug' as any, {
          p_slug: slug,
        });
        empresaId = typeof empresaIdBySlug === 'string' ? empresaIdBySlug : null;
      }
    }

    if (!empresaId) return { error: 'Domínio não autorizado para cadastro.' };

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nome,
          ...buildSecureSignupMetadata({
            empresaId,
            empresaSlug,
            email,
          }),
        },
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        return { error: 'Este email já está cadastrado' };
      }

      return { error: error.message };
    }

    return { error: null };
  }, [validateTenantDomainAccess]);

  const logout = useCallback(async (options?: { reason?: LogoutReason }) => {
    const reason = options?.reason ?? 'manual';
    try {
      if (user) {
        await writeAuditLog({
          action: 'LOGOUT',
          table: 'auth',
          recordId: user.id,
          empresaId: user.tenantId,
          source: 'auth_context',
          metadata: {
            email: user.email,
            event: 'logout',
          },
        });
      }
    } catch (error) {
      void error;
    }

    setImpersonation(null);
    window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    setUser(null);
    setSession(null);
    clearRedirectRetryAttempts();
    transitionAuthStatus('unauthenticated', 'logout_started', {
      reason,
    });

    const { error: localSignOutError } = await supabase.auth.signOut({ scope: 'local' });
    const { error: globalSignOutError } = await supabase.auth.signOut();

    if (localSignOutError || globalSignOutError) {
      logger.warn('logout_signout_failed', {
        localError: localSignOutError?.message ?? null,
        globalError: globalSignOutError?.message ?? null,
      });
    }

    stripAuthHandoffFromUrl();

    const currentHost = window.location.hostname.toLowerCase();
    const shouldRedirectToBaseDomain =
      !isOwnerDomain(currentHost)
      && !isTenantBaseDomain(currentHost)
      && currentHost.endsWith(`.${TENANT_BASE_DOMAIN}`);

    const reasonQuery = reason !== 'manual'
      ? `&${LOGOUT_REASON_PARAM}=${encodeURIComponent(reason)}`
      : '';

    isIntentionalLogoutNavigationRef.current = true;
    if (shouldRedirectToBaseDomain) {
      const targetUrl = `${window.location.protocol}//${TENANT_BASE_DOMAIN}/login?${LOGOUT_MARKER_PARAM}=1${reasonQuery}`;
      window.location.assign(targetUrl);
      return;
    }

    const fallbackLoginUrl = `/login?${LOGOUT_MARKER_PARAM}=1${reasonQuery}`;
    window.location.assign(fallbackLoginUrl);
  }, [transitionAuthStatus, user]);

  const currentTenantId = impersonation?.empresaId || user?.tenantId || null;

  useEffect(() => {
    let isMounted = true;

    const loadInactivityPolicy = async () => {
      if (!session || !user || !currentTenantId) {
        if (isMounted) setInactivityTimeoutMs(null);
        return;
      }

      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('chave,valor')
        .eq('empresa_id', currentTenantId)
        .in('chave', ['owner.security_policy', 'tenant.security_policy'])
        .order('updated_at', { ascending: false });

      if (!isMounted) return;

      if (error) {
        logger.warn('inactivity_policy_load_failed', {
          empresaId: currentTenantId,
          error: error.message,
        });
        setInactivityTimeoutMs(DEFAULT_INACTIVITY_TIMEOUT_MS);
        return;
      }

      const rows = Array.isArray(data) ? data as Array<{ chave?: string; valor?: Record<string, unknown> | null }> : [];
      const ownerPolicy = rows.find((row) => row.chave === 'owner.security_policy')?.valor ?? null;
      const tenantPolicy = rows.find((row) => row.chave === 'tenant.security_policy')?.valor ?? null;

      const minutesValue = Number(
        ownerPolicy?.inactivity_timeout_minutes
        ?? tenantPolicy?.inactivity_timeout_minutes
        ?? 0,
      );
      if (!Number.isFinite(minutesValue) || minutesValue <= 0) {
        setInactivityTimeoutMs(DEFAULT_INACTIVITY_TIMEOUT_MS);
        return;
      }

      setInactivityTimeoutMs(Math.trunc(minutesValue) * 60 * 1000);
    };

    void loadInactivityPolicy();

    return () => {
      isMounted = false;
    };
  }, [currentTenantId, session, user]);

  useEffect(() => {
    if (!session || !user || !inactivityTimeoutMs) {
      return;
    }

    lastActivityAtRef.current = Date.now();
    isAutoLogoutRunningRef.current = false;

    const markActivity = () => {
      lastActivityAtRef.current = Date.now();
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });

    const timer = window.setInterval(() => {
      if (isAutoLogoutRunningRef.current) return;

      const inactiveForMs = Date.now() - lastActivityAtRef.current;
      if (inactiveForMs < inactivityTimeoutMs) return;

      isAutoLogoutRunningRef.current = true;
      const configuredMinutes = Math.max(1, Math.trunc(inactivityTimeoutMs / 60_000));
      try {
        window.localStorage.setItem(
          INACTIVITY_NOTICE_STORAGE_KEY,
          JSON.stringify({ minutes: configuredMinutes, at: Date.now() }),
        );
      } catch {
        // noop
      }
      logger.info('auto_logout_by_inactivity', {
        userId: user.id,
        empresaId: currentTenantId,
        inactivityTimeoutMs,
      });

      void logout({ reason: 'inactivity' });
    }, 15_000);

    // Check inactivity immediately when tab becomes visible again
    // (browsers throttle setInterval in background tabs)
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (isAutoLogoutRunningRef.current) return;

      const inactiveForMs = Date.now() - lastActivityAtRef.current;
      if (inactiveForMs < inactivityTimeoutMs) return;

      isAutoLogoutRunningRef.current = true;
      const configuredMinutes = Math.max(1, Math.trunc(inactivityTimeoutMs / 60_000));
      try {
        window.localStorage.setItem(
          INACTIVITY_NOTICE_STORAGE_KEY,
          JSON.stringify({ minutes: configuredMinutes, at: Date.now() }),
        );
      } catch {
        // noop
      }
      logger.info('auto_logout_by_inactivity_visibility', {
        userId: user.id,
        empresaId: currentTenantId,
        inactivityTimeoutMs,
      });

      void logout({ reason: 'inactivity' });
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
    };
  }, [currentTenantId, inactivityTimeoutMs, logout, session, user]);

  useEffect(() => {
    if (!user) {
      setImpersonation(null);
      return;
    }

    const canImpersonate =
      user.tipo === 'SYSTEM_OWNER' ||
      user.tipo === 'SYSTEM_ADMIN';

    if (!canImpersonate) {
      setImpersonation(null);
    }
  }, [user]);

  const startImpersonationSession = useCallback((sessionData: ImpersonationSession) => {
    setImpersonation(sessionData);
  }, []);

  const stopImpersonationSession = useCallback(() => {
    setImpersonation(null);
  }, []);

  const effectiveRole: AppRole = user?.tipo || 'USUARIO';
  const isAdmin =
    effectiveRole === 'ADMIN' ||
    effectiveRole === 'MASTER_TI' ||
    effectiveRole === 'SYSTEM_OWNER' ||
    effectiveRole === 'SYSTEM_ADMIN';
  const isMasterTI =
    effectiveRole === 'MASTER_TI' ||
    effectiveRole === 'SYSTEM_OWNER' ||
    effectiveRole === 'SYSTEM_ADMIN';
  const isSystemOwner = effectiveRole === 'SYSTEM_OWNER' || effectiveRole === 'SYSTEM_ADMIN';
  const tenantId = currentTenantId;
  const tenantSlug = user?.tenantSlug ?? null;
  const forcePasswordChange = Boolean(user?.forcePasswordChange);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        authStatus,
        isHydrating,
        isAuthenticated: authStatus === 'authenticated' && !!session,
        isLoading,
        login,
        changePassword,
        signup,
        logout,
        isAdmin,
        isMasterTI,
        isSystemOwner,
        effectiveRole,
        tenantId,
        tenantSlug,
        forcePasswordChange,
        impersonation,
        startImpersonationSession,
        stopImpersonationSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export function useAuthOptional() {
  return useContext(AuthContext);
}
