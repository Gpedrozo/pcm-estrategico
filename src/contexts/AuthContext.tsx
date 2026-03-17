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
import { resolveOrRepairTenantHost } from '@/lib/tenantDomain';
import { logger } from '@/lib/logger';
import { writeAuditLog } from '@/lib/audit';
import { consumeSessionTransferCode, createSessionTransferHash } from '@/lib/sessionTransfer';
import { validateImpersonationSession } from '@/services/ownerPortal.service';

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

export interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
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
const IMPERSONATION_STORAGE_KEY = 'pcm.owner.impersonation.session';
const TENANT_BASE_DOMAIN = (import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gppis.com.br').toLowerCase();
const LOGOUT_MARKER_PARAM = 'logout';
const LOGOUT_REASON_PARAM = 'reason';
const TAB_CLOSE_MARKER_STORAGE_KEY = 'pcm.auth.window_closed.v1';
const TAB_CLOSE_MARKER_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const DEFAULT_INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
const SESSION_TRANSFER_MAX_AGE_MS = 2 * 60 * 1000;
const SESSION_TRANSFER_REDIRECT_STORAGE_KEY = 'pcm.auth.session_transfer.redirect.v1';
const SESSION_TRANSFER_REDIRECT_MAX_AGE_MS = 15_000;
const SESSION_TRANSFER_CONSUMED_STORAGE_KEY = 'pcm.auth.session_transfer.consumed.v1';
const LOGIN_PROFILE_TIMEOUT_MS = 12_000;
const TENANT_HOST_RESOLVE_TIMEOUT_MS = 6_000;
const LOGIN_RATE_LIMIT_STORAGE_KEY = 'pcm.auth.login.rate_limit.v1';
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_RATE_LIMIT_BLOCK_MS = 15 * 60 * 1000;

type LoginRateLimitEntry = {
  attempts: number[];
  blockedUntil: number;
};

type LogoutReason = 'manual' | 'inactivity' | 'window_closed' | 'security';

function normalizeLoginRateLimitKey(email: string) {
  return email.trim().toLowerCase();
}

function loadLoginRateLimitState(): Record<string, LoginRateLimitEntry> {
  try {
    const raw = window.localStorage.getItem(LOGIN_RATE_LIMIT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LoginRateLimitEntry>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveLoginRateLimitState(state: Record<string, LoginRateLimitEntry>) {
  try {
    window.localStorage.setItem(LOGIN_RATE_LIMIT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // noop
  }
}

function getLoginRateLimitStatus(email: string) {
  const now = Date.now();
  const key = normalizeLoginRateLimitKey(email);
  const state = loadLoginRateLimitState();
  const entry = state[key];

  if (!entry) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  const attempts = (entry.attempts ?? []).filter((ts) => now - ts <= LOGIN_RATE_LIMIT_WINDOW_MS);
  const blockedUntil = Number(entry.blockedUntil ?? 0);
  const blocked = blockedUntil > now;

  state[key] = { attempts, blockedUntil };
  saveLoginRateLimitState(state);

  return {
    blocked,
    retryAfterSeconds: blocked ? Math.max(1, Math.ceil((blockedUntil - now) / 1000)) : 0,
  };
}

function registerFailedLoginAttempt(email: string) {
  const now = Date.now();
  const key = normalizeLoginRateLimitKey(email);
  const state = loadLoginRateLimitState();
  const current = state[key] ?? { attempts: [], blockedUntil: 0 };
  const attempts = (current.attempts ?? []).filter((ts) => now - ts <= LOGIN_RATE_LIMIT_WINDOW_MS);
  attempts.push(now);

  let blockedUntil = Number(current.blockedUntil ?? 0);
  if (attempts.length >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    blockedUntil = now + LOGIN_RATE_LIMIT_BLOCK_MS;
  }

  state[key] = {
    attempts,
    blockedUntil,
  };
  saveLoginRateLimitState(state);

  return {
    blockedUntil,
    attemptsCount: attempts.length,
  };
}

function resetLoginRateLimit(email: string) {
  const key = normalizeLoginRateLimitKey(email);
  const state = loadLoginRateLimitState();
  if (!state[key]) return;
  delete state[key];
  saveLoginRateLimitState(state);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timer: number | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
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

function isTenantBaseDomain(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === TENANT_BASE_DOMAIN || normalized === `www.${TENANT_BASE_DOMAIN}`;
}

function stripAuthHandoffFromUrl() {
  const queryParams = new URLSearchParams(window.location.search);
  queryParams.delete(LOGOUT_MARKER_PARAM);
  queryParams.delete(LOGOUT_REASON_PARAM);

  const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '');
  hashParams.delete('session_transfer');

  const nextQuery = queryParams.toString();
  const nextHash = hashParams.toString();
  const cleanedUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${nextHash ? `#${nextHash}` : ''}`;
  window.history.replaceState({}, document.title, cleanedUrl);
}

function getNavigationType(): string | null {
  try {
    const entry = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return entry?.type ?? null;
  } catch {
    return null;
  }
}

function shouldForceLogoutByClosedWindowMarker() {
  try {
    const rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    if (rawHash) {
      const hashParams = new URLSearchParams(rawHash);
      if (hashParams.get('session_transfer')) {
        window.localStorage.removeItem(TAB_CLOSE_MARKER_STORAGE_KEY);
        return false;
      }
    }

    const navigationType = getNavigationType();
    if (navigationType === 'reload' || navigationType === 'back_forward') {
      return false;
    }

    const raw = window.localStorage.getItem(TAB_CLOSE_MARKER_STORAGE_KEY);
    if (!raw) return false;

    window.localStorage.removeItem(TAB_CLOSE_MARKER_STORAGE_KEY);

    const parsed = JSON.parse(raw) as { at?: number };
    const markerAt = Number(parsed?.at ?? 0);
    if (!Number.isFinite(markerAt) || markerAt <= 0) return false;

    return (Date.now() - markerAt) <= TAB_CLOSE_MARKER_MAX_AGE_MS;
  } catch {
    return false;
  }
}

function markSessionTransferRedirectInProgress() {
  try {
    window.sessionStorage.setItem(
      SESSION_TRANSFER_REDIRECT_STORAGE_KEY,
      JSON.stringify({ at: Date.now() }),
    );
  } catch {
    // noop
  }
}

function isSessionTransferRedirectInProgress() {
  try {
    const raw = window.sessionStorage.getItem(SESSION_TRANSFER_REDIRECT_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { at?: number };
    const markerAt = Number(parsed?.at ?? 0);
    if (!Number.isFinite(markerAt) || markerAt <= 0) {
      window.sessionStorage.removeItem(SESSION_TRANSFER_REDIRECT_STORAGE_KEY);
      return false;
    }
    if ((Date.now() - markerAt) > SESSION_TRANSFER_REDIRECT_MAX_AGE_MS) {
      window.sessionStorage.removeItem(SESSION_TRANSFER_REDIRECT_STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function clearSessionTransferRedirectInProgress() {
  try {
    window.sessionStorage.removeItem(SESSION_TRANSFER_REDIRECT_STORAGE_KEY);
  } catch {
    // noop
  }
}

function markConsumedSessionTransfer(encoded: string) {
  try {
    window.sessionStorage.setItem(
      SESSION_TRANSFER_CONSUMED_STORAGE_KEY,
      JSON.stringify({ encoded, at: Date.now() }),
    );
  } catch {
    // noop
  }
}

function wasSessionTransferAlreadyConsumed(encoded: string) {
  try {
    const raw = window.sessionStorage.getItem(SESSION_TRANSFER_CONSUMED_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { encoded?: string; at?: number };
    const markerAt = Number(parsed?.at ?? 0);
    if (String(parsed?.encoded ?? '') !== encoded) return false;
    if (!Number.isFinite(markerAt) || markerAt <= 0) return false;
    return (Date.now() - markerAt) <= SESSION_TRANSFER_MAX_AGE_MS;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [impersonation, setImpersonation] = useState<ImpersonationSession | null>(null);
  const [inactivityTimeoutMs, setInactivityTimeoutMs] = useState<number | null>(null);
  const lastActivityAtRef = useRef<number>(Date.now());
  const isAutoLogoutRunningRef = useRef(false);
  const isIntentionalLogoutNavigationRef = useRef(false);

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

    const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '');
    const hasSessionTransfer = Boolean(hashParams.get('session_transfer'));

    if (hasLogoutParams && !hasSessionTransfer) {
      stripAuthHandoffFromUrl();
    }
  }, []);

  useEffect(() => {
    const markWindowClosed = () => {
      if (isIntentionalLogoutNavigationRef.current) return;
      if (isSessionTransferRedirectInProgress()) return;
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

    window.addEventListener('pagehide', markWindowClosed);

    return () => {
      window.removeEventListener('pagehide', markWindowClosed);
    };
  }, [session, user]);

  const buildSessionTransferHash = useCallback(async (sessionData: Session | null, targetHost: string) => {
    return createSessionTransferHash(sessionData, targetHost);
  }, []);

  useEffect(() => {
    const consumeSessionTransfer = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hasLogoutMarker = searchParams.get(LOGOUT_MARKER_PARAM) === '1';

      if (window.location.pathname !== '/login') return;

      const rawHash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : '';
      if (!rawHash) return;

      const params = new URLSearchParams(rawHash);
      const encodedTransfer = params.get('session_transfer');
      if (!encodedTransfer) {
        if (hasLogoutMarker) {
          await supabase.auth.signOut({ scope: 'local' });
          stripAuthHandoffFromUrl();
        }
        return;
      }

      if (wasSessionTransferAlreadyConsumed(encodedTransfer)) {
        params.delete('session_transfer');
        const nextHash = params.toString();
        const cleanedUrl = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ''}`;
        window.history.replaceState({}, document.title, cleanedUrl);
        clearSessionTransferRedirectInProgress();
        return;
      }

      try {
        let decoded = await consumeSessionTransferCode(encodedTransfer, window.location.hostname.toLowerCase());

        // Backward compatibility while old token-in-hash links may still exist.
        if (!decoded) {
          const decodedJson = window.atob(decodeURIComponent(encodedTransfer));
          const legacy = JSON.parse(decodedJson) as { access_token?: string; refresh_token?: string; issued_at?: number };
          if (!legacy?.access_token || !legacy?.refresh_token) return;
          decoded = {
            access_token: legacy.access_token,
            refresh_token: legacy.refresh_token,
            issued_at: Number(legacy.issued_at ?? 0),
          };
        }

        const issuedAt = Number(decoded.issued_at || 0);
        const isFreshTransfer = Number.isFinite(issuedAt) && issuedAt > 0 && (Date.now() - issuedAt) <= SESSION_TRANSFER_MAX_AGE_MS;
        if (!isFreshTransfer) {
          logger.warn('session_transfer_expired_or_invalid', {
            issuedAt,
          });
          stripAuthHandoffFromUrl();
          return;
        }

        // session_transfer has priority over stale logout markers from closed-window flow
        if (hasLogoutMarker) {
          searchParams.delete(LOGOUT_MARKER_PARAM);
          searchParams.delete(LOGOUT_REASON_PARAM);
          const nextQuery = searchParams.toString();
          const nextHash = params.toString();
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
          clearSessionTransferRedirectInProgress();
          return;
        }
        markConsumedSessionTransfer(encodedTransfer);
        params.delete('session_transfer');
        const nextHash = params.toString();
        const cleanedUrl = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ''}`;
        window.history.replaceState({}, document.title, cleanedUrl);
        clearSessionTransferRedirectInProgress();
      } catch (error) {
        logger.warn('session_transfer_decode_failed', {
          error: String(error),
        });
        clearSessionTransferRedirectInProgress();
      }
    };

    void consumeSessionTransfer();
  }, []);

  const resolveDomainEmpresaId = useCallback(async (): Promise<string | null> => {
    if (isOwnerDomain(window.location.hostname)) return null;

    const hostname = window.location.hostname.toLowerCase();
    const { data: domainConfig, error } = await supabase
      .from('empresa_config')
      .select('empresa_id')
      .eq('dominio_custom', hostname)
      .maybeSingle();

    if (!error && domainConfig?.empresa_id) {
      return domainConfig.empresa_id;
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

  const resolveTenantRedirectHost = useCallback(async (
    tenantId: string,
    options?: { slugHint?: string | null },
  ): Promise<string | null> => {
    return resolveOrRepairTenantHost({
      tenantId,
      tenantBaseDomain: TENANT_BASE_DOMAIN,
      slugHint: options?.slugHint,
    });
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
    collect(metadata?.user_metadata?.role);
    collect(metadata?.user_metadata?.roles);

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
    const candidate = metadata?.app_metadata?.empresa_id ?? metadata?.user_metadata?.empresa_id;
    if (typeof candidate !== 'string') return null;
    const normalized = candidate.trim();
    return normalized || null;
  }, []);

  const extractEmpresaSlugFromMetadata = useCallback((metadata?: {
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  }) => {
    const candidate = metadata?.app_metadata?.empresa_slug ?? metadata?.user_metadata?.empresa_slug;
    if (typeof candidate !== 'string') return null;
    const normalized = candidate.trim().toLowerCase();
    return normalized || null;
  }, []);

  const extractForcePasswordChangeFromMetadata = useCallback((metadata?: {
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  }) => {
    const candidate =
      metadata?.app_metadata?.force_password_change
      ?? metadata?.user_metadata?.force_password_change
      ?? metadata?.app_metadata?.must_change_password
      ?? metadata?.user_metadata?.must_change_password;

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

        roleData = (fallbackRoleQuery.data || []).map((item: { role: AppRole }) => ({
          role: item.role,
          empresa_id: null,
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

      const forcePasswordChange =
        Boolean(profile?.force_password_change)
        || extractForcePasswordChangeFromMetadata(metadata);

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
        tipo: 'USUARIO',
        roles,
        tenantId: null,
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
      const hostSlug = hostname.endsWith(`.${baseDomain}`)
        ? hostname.replace(`.${baseDomain}`, '').split('.')[0]?.trim().toLowerCase() || null
        : null;

      if (metadataEmpresaId && metadataEmpresaSlug && hostSlug && hostSlug === metadataEmpresaSlug) {
        domainEmpresaId = metadataEmpresaId;
      }
    }

    let profileData = await fetchUserProfile(userId, email, metadata, domainEmpresaId);

    if (!isOwnerDomain(window.location.hostname)) {
      const hostname = window.location.hostname.toLowerCase();
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

    const ownerBackendAllowed = await verifyOwnerBackendAccess(token);
    if (ownerBackendAllowed) {
      logger.warn('owner_role_fallback_applied', {
        userId,
        email,
      });
      return elevateToSystemOwner(profileData);
    }

    return profileData;
  }, [elevateToSystemOwner, fetchUserProfile, resolveDomainEmpresaId, verifyOwnerBackendAccess]);

  useEffect(() => {
    let isActive = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isActive) return;

        setSession(nextSession);

        if (nextSession?.user) {
          void (async () => {
            const profileData = await resolveUserProfile(
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
              setIsLoading(false);
              return;
            }

            setUser({
              id: nextSession.user.id,
              email: nextSession.user.email || '',
              nome: profileData.nome,
              tipo: profileData.tipo,
              roles: profileData.roles,
              tenantId: profileData.tenantId,
              tenantSlug: profileData.tenantSlug,
              forcePasswordChange: profileData.forcePasswordChange,
            });

            setIsLoading(false);
          })();
        } else if (isActive) {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isActive) return;

      setSession(session);

      if (session?.user) {
        resolveUserProfile(session.user.id, session.user.email, {
          app_metadata: session.user.app_metadata,
          user_metadata: session.user.user_metadata,
        }, session.access_token).then(profileData => {
          if (!isActive) return;

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            nome: profileData.nome,
            tipo: profileData.tipo,
            roles: profileData.roles,
            tenantId: profileData.tenantId,
            tenantSlug: profileData.tenantSlug,
            forcePasswordChange: profileData.forcePasswordChange,
          });

          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [resolveUserProfile]);

  const login = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    const throttle = getLoginRateLimitStatus(email);
    if (throttle.blocked) {
      return { error: `Muitas tentativas de login. Tente novamente em ${throttle.retryAfterSeconds}s.` };
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    const accessToken = signInData?.session?.access_token ?? null;
    const refreshToken = signInData?.session?.refresh_token ?? null;

    if (signInError || !accessToken || !refreshToken) {
      const failedAttempt = registerFailedLoginAttempt(email);

      let message = 'Falha ao autenticar. Tente novamente.';
      const normalizedError = String(signInError?.message ?? '').trim().toLowerCase();

      if (normalizedError.includes('invalid login credentials') || normalizedError.includes('invalid credentials')) {
        message = 'Email ou senha inválidos';
      } else if (normalizedError.includes('email not confirmed')) {
        message = 'Email ainda não confirmado. Verifique sua caixa de entrada.';
      } else if (normalizedError.includes('too many requests') || normalizedError.includes('rate limit')) {
        message = 'Muitas tentativas de login. Tente novamente em instantes.';
      } else if (normalizedError.includes('email and password required')) {
        message = 'Email e senha são obrigatórios';
      } else if (signInError?.message) {
        message = signInError.message;
      }

      await writeAuditLog({
        action: 'AUTH_LOGIN_FAILED',
        table: 'auth',
        source: 'auth_context',
        severity: 'warning',
        metadata: {
          email: email.trim().toLowerCase(),
          attempts_in_window: failedAttempt.attemptsCount,
          blocked_until: failedAttempt.blockedUntil > 0 ? new Date(failedAttempt.blockedUntil).toISOString() : null,
        },
      }).catch(() => null);

      return { error: message };
    }

    resetLoginRateLimit(email);

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const activeSession = currentSession ?? signInData.session ?? null;
    const activeUser = currentUser ?? signInData.user ?? null;

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
        profileData = await withTimeout(
          resolveUserProfile(activeUser.id, activeUser.email, {
            app_metadata: activeUser.app_metadata,
            user_metadata: activeUser.user_metadata,
          }, activeSession?.access_token ?? null),
          LOGIN_PROFILE_TIMEOUT_MS,
          'timeout_resolving_user_profile',
        );
      } catch {
        await supabase.auth.signOut();
        return { error: 'Tempo esgotado ao carregar seu perfil. Tente novamente.' };
      }

      const isOwnerPortalAllowed =
        profileData.tipo === 'SYSTEM_OWNER' ||
        profileData.tipo === 'SYSTEM_ADMIN';

      if (isOwnerDomain(window.location.hostname) && !isOwnerPortalAllowed) {
        await supabase.auth.signOut();
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
      setIsLoading(false);

      const isGlobalRole =
        profileData.tipo === 'SYSTEM_OWNER' ||
        profileData.tipo === 'SYSTEM_ADMIN' ||
        profileData.tipo === 'MASTER_TI';

      const isBaseTenantHost = isTenantBaseDomain(window.location.hostname);

      if (!isOwnerDomain(window.location.hostname) && !isGlobalRole) {
        if (isBaseTenantHost) {
          if (!profileData.tenantId) {
            await supabase.auth.signOut();
            return { error: 'Usuário sem vínculo de empresa. Acesso bloqueado.' };
          }

          let targetHost = await withTimeout(
            resolveTenantRedirectHost(profileData.tenantId, {
              slugHint: extractEmpresaSlugFromMetadata({
                app_metadata: activeUser.app_metadata,
                user_metadata: activeUser.user_metadata,
              }),
            }),
            TENANT_HOST_RESOLVE_TIMEOUT_MS,
            'timeout_resolving_tenant_host',
          ).catch(() => null);
          if (!targetHost) {
            const slugFromMetadata = extractEmpresaSlugFromMetadata({
              app_metadata: activeUser.app_metadata,
              user_metadata: activeUser.user_metadata,
            });

            if (slugFromMetadata) {
              targetHost = `${slugFromMetadata}.${TENANT_BASE_DOMAIN}`;
            }
          }

          if (!targetHost) {
            logger.warn('tenant_redirect_host_missing_fallback_base_domain', {
              userId: activeUser.id,
              tenantId: profileData.tenantId,
            });
            await supabase.auth.signOut();
            return { error: 'Nao foi possivel localizar o subdominio da sua empresa. Contate o suporte.' };
          }

          const currentHostname = window.location.hostname.toLowerCase();
          if (targetHost !== currentHostname) {
            const transferHash = await buildSessionTransferHash(activeSession, targetHost);
            if (!transferHash) {
              logger.warn('session_transfer_hash_missing_on_cross_domain_redirect', {
                userId: activeUser.id,
                tenantId: profileData.tenantId,
                currentHostname,
                targetHost,
              });
              return { error: 'Não foi possível transferir sua sessão para o subdomínio. Tente novamente.' };
            }
            const targetUrl = `${window.location.protocol}//${targetHost}/login${transferHash ? `#${transferHash}` : ''}`;
            if (transferHash) {
              markSessionTransferRedirectInProgress();
            }
            window.location.assign(targetUrl);
            return { error: null };
          }

          return {
            error: null,
          };
        }

        let domainEmpresaId = await resolveDomainEmpresaId();

        if (!domainEmpresaId) {
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

          if (metadataEmpresaId && metadataEmpresaSlug && hostSlug && hostSlug === metadataEmpresaSlug) {
            domainEmpresaId = metadataEmpresaId;
          }
        }

        if (!domainEmpresaId) {
          await supabase.auth.signOut();
          return { error: 'Domínio não autorizado para login.' };
        }

        if (!profileData.tenantId || profileData.tenantId !== domainEmpresaId) {
          await supabase.auth.signOut();
          return { error: 'Usuário não pertence à empresa deste subdomínio.' };
        }
      }

      if (!isGlobalRole && !profileData.tenantId) {
        await supabase.auth.signOut();
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
  }, [buildSessionTransferHash, extractEmpresaSlugFromMetadata, resolveDomainEmpresaId, resolveTenantRedirectHost, resolveUserProfile]);

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
      return { error: changeError.message || 'Falha ao atualizar senha.' };
    }

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
        tipo: refreshedProfile.tipo,
        roles: refreshedProfile.roles,
        tenantId: refreshedProfile.tenantId,
        tenantSlug: refreshedProfile.tenantSlug,
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

    const { data: domainConfig, error: domainConfigError } = await supabase
      .from('empresa_config')
      .select('empresa_id')
      .eq('dominio_custom', hostname)
      .maybeSingle();

    if (domainConfigError) {
      return { error: 'Falha ao validar domínio da empresa.' };
    }

    let empresaId = domainConfig?.empresa_id ?? null;

    if (!empresaId) {
      const isSubdomainHost = hostname.toLowerCase().endsWith(`.${baseDomain}`) && !isTenantBaseDomain(hostname);
      const slug = isSubdomainHost
        ? hostname.toLowerCase().replace(`.${baseDomain}`, '').split('.')[0]?.trim().toLowerCase() || ''
        : '';

      if (slug && slug !== 'www') {
        const { data: empresaIdBySlug } = await supabase.rpc('resolve_empresa_id_by_slug', {
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
  }, [user]);

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
        .select('valor')
        .eq('empresa_id', currentTenantId)
        .eq('chave', 'owner.security_policy')
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        logger.warn('inactivity_policy_load_failed', {
          empresaId: currentTenantId,
          error: error.message,
        });
        setInactivityTimeoutMs(DEFAULT_INACTIVITY_TIMEOUT_MS);
        return;
      }

      const minutesValue = Number((data?.valor as Record<string, unknown> | null)?.inactivity_timeout_minutes ?? 0);
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
      logger.info('auto_logout_by_inactivity', {
        userId: user.id,
        empresaId: currentTenantId,
        inactivityTimeoutMs,
      });

      void logout({ reason: 'inactivity' });
    }, 15_000);

    return () => {
      window.clearInterval(timer);
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
        isAuthenticated: !!session,
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
