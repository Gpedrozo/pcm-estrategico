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

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  tipo: AppRole;
  roles: AppRole[];
  tenantId: string | null;
}

export interface ImpersonationSession {
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
  signup: (email: string, password: string, nome: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isMasterTI: boolean;
  isSystemOwner: boolean;
  effectiveRole: AppRole;
  tenantId: string | null;
  impersonation: ImpersonationSession | null;
  startImpersonationSession: (session: ImpersonationSession) => void;
  stopImpersonationSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const IMPERSONATION_STORAGE_KEY = 'pcm.owner.impersonation.session';
const TENANT_BASE_DOMAIN = (import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gppis.com.br').toLowerCase();

function isTenantBaseDomain(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === TENANT_BASE_DOMAIN || normalized === `www.${TENANT_BASE_DOMAIN}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [impersonation, setImpersonation] = useState<ImpersonationSession | null>(null);
  const [inactivityTimeoutMs, setInactivityTimeoutMs] = useState<number | null>(null);
  const lastActivityAtRef = useRef<number>(Date.now());
  const isAutoLogoutRunningRef = useRef(false);

  const buildSessionTransferHash = useCallback((sessionData: Session | null) => {
    if (!sessionData?.access_token || !sessionData?.refresh_token) return null;

    try {
      const payload = {
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
      };
      const encoded = encodeURIComponent(window.btoa(JSON.stringify(payload)));
      return `session_transfer=${encoded}`;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const consumeSessionTransfer = async () => {
      const rawHash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : '';
      if (!rawHash) return;

      const params = new URLSearchParams(rawHash);
      const encodedTransfer = params.get('session_transfer');
      if (!encodedTransfer) return;

      try {
        const decodedJson = window.atob(decodeURIComponent(encodedTransfer));
        const decoded = JSON.parse(decodedJson) as { access_token?: string; refresh_token?: string };

        if (!decoded?.access_token || !decoded?.refresh_token) return;

        const { error } = await supabase.auth.setSession({
          access_token: decoded.access_token,
          refresh_token: decoded.refresh_token,
        });

        if (error) {
          logger.warn('session_transfer_consume_failed', {
            error: error.message,
          });
          return;
        }
        params.delete('session_transfer');
        const nextHash = params.toString();
        const cleanedUrl = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ''}`;
        window.history.replaceState({}, document.title, cleanedUrl);
      } catch (error) {
        logger.warn('session_transfer_decode_failed', {
          error: String(error),
        });
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

  const resolveTenantRedirectHost = useCallback(async (tenantId: string): Promise<string | null> => {
    const { data: configData } = await supabase
      .from('empresa_config')
      .select('dominio_custom')
      .eq('empresa_id', tenantId)
      .not('dominio_custom', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const configuredHost = (configData?.dominio_custom ?? '').trim().toLowerCase();
    if (configuredHost) return configuredHost;

    const { data: companyData } = await supabase
      .from('empresas')
      .select('slug')
      .eq('id', tenantId)
      .maybeSingle();

    const slug = (companyData?.slug ?? '').trim().toLowerCase();
    if (!slug) return null;

    return `${slug}.${TENANT_BASE_DOMAIN}`;
  }, []);

  useEffect(() => {
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
      setImpersonation(parsed);
    } catch {
      window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    }
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

  const fetchUserProfile = useCallback(async (
    userId: string,
    email?: string | null,
    metadata?: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> },
    expectedEmpresaId?: string | null,
  ) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome,empresa_id')
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

      const effectiveRole = getEffectiveRole({ roles, email });

      return {
        nome: profile?.nome || 'Usuário',
        tipo: effectiveRole,
        roles,
        tenantId,
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
      };
    }
  }, [extractEmpresaIdFromMetadata, extractRolesFromMetadata]);

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
    const domainEmpresaId = await resolveDomainEmpresaId();
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'Email ou senha inválidos' };
      }

      return { error: error.message };
    }

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const profileData = await resolveUserProfile(currentUser.id, currentUser.email, {
        app_metadata: currentUser.app_metadata,
        user_metadata: currentUser.user_metadata,
      }, currentSession?.access_token ?? null);

      const isOwnerPortalAllowed =
        profileData.tipo === 'SYSTEM_OWNER' ||
        profileData.tipo === 'SYSTEM_ADMIN';

      if (isOwnerDomain(window.location.hostname) && !isOwnerPortalAllowed) {
        await supabase.auth.signOut();
        return { error: 'Conta autenticada, mas sem permissão SYSTEM_OWNER para o Owner Portal.' };
      }

      setSession(currentSession ?? null);
      setUser({
        id: currentUser.id,
        email: currentUser.email || '',
        nome: profileData.nome,
        tipo: profileData.tipo,
        roles: profileData.roles,
        tenantId: profileData.tenantId,
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

          const targetHost = await resolveTenantRedirectHost(profileData.tenantId);
          if (!targetHost) {
            await supabase.auth.signOut();
            return {
              error: 'Nao foi possivel localizar o dominio da sua empresa. Contate o suporte para revisar o slug/dominio_custom.',
            };
          }

          const currentHostname = window.location.hostname.toLowerCase();
          if (targetHost !== currentHostname) {
            const transferHash = buildSessionTransferHash(currentSession ?? null);
            const targetUrl = `${window.location.protocol}//${targetHost}/login${transferHash ? `#${transferHash}` : ''}`;
            window.location.assign(targetUrl);
            return { error: null };
          }

          return {
            error: null,
          };
        }

        const domainEmpresaId = await resolveDomainEmpresaId();

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
  }, [buildSessionTransferHash, resolveDomainEmpresaId, resolveTenantRedirectHost, resolveUserProfile]);

  const signup = useCallback(async (email: string, password: string, nome: string): Promise<{ error: string | null }> => {
    const redirectUrl = `${window.location.origin}/`;
    const empresaSlug = resolveEmpresaSlug(window.location.hostname);
    const hostname = window.location.hostname;

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

    const empresaId = domainConfig?.empresa_id ?? null;
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

  const logout = useCallback(async () => {
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
    } finally {
      setImpersonation(null);
      window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      setUser(null);
      setSession(null);

      const { error: localSignOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (localSignOutError) {
        const { error: globalSignOutError } = await supabase.auth.signOut();
        if (globalSignOutError) {
          logger.warn('logout_signout_failed', {
            localError: localSignOutError.message,
            globalError: globalSignOutError.message,
          });
        }
      }
    }
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
        setInactivityTimeoutMs(null);
        return;
      }

      const minutesValue = Number((data?.valor as Record<string, unknown> | null)?.inactivity_timeout_minutes ?? 0);
      if (!Number.isFinite(minutesValue) || minutesValue <= 0) {
        setInactivityTimeoutMs(null);
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

      void logout();
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

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!session,
        isLoading,
        login,
        signup,
        logout,
        isAdmin,
        isMasterTI,
        isSystemOwner,
        effectiveRole,
        tenantId,
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
