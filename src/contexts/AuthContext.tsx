import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [impersonation, setImpersonation] = useState<ImpersonationSession | null>(null);

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

  const validateTenantDomainAccess = useCallback(async (): Promise<string | null> => {
    if (isOwnerDomain(window.location.hostname)) return null;

    const hostname = window.location.hostname;
    const { data: domainConfig, error } = await supabase
      .from('empresa_config')
      .select('empresa_id')
      .eq('dominio_custom', hostname)
      .maybeSingle();

    if (error) return 'Falha ao validar domínio da empresa.';
    if (!domainConfig?.empresa_id) return 'Domínio não autorizado para login.';

    return null;
  }, []);

  const fetchUserProfile = async (
    userId: string,
    email?: string | null,
    metadata?: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }
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
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      let roleData = roleQuery.data;

      if (roleQuery.error && /empresa_id|column/i.test(roleQuery.error.message)) {
        const fallbackRoleQuery = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        roleData = (fallbackRoleQuery.data || []).map((item: { role: AppRole }) => ({
          role: item.role,
          empresa_id: null,
        }));
      }

      const dbRoles: AppRole[] = (roleData || [])
        .map((item: { role: string }) => normalizeRole(item.role))
        .filter((role): role is AppRole => Boolean(role));

      const roles: AppRole[] = Array.from(new Set(dbRoles));

      const tenantId: string | null = (roleData || [])[0]?.empresa_id || profile?.empresa_id || null;

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
  };

  useEffect(() => {
    let isActive = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isActive) return;

        setSession(nextSession);

        if (nextSession?.user) {
          void (async () => {
            const profileData = await fetchUserProfile(
              nextSession.user.id,
              nextSession.user.email,
              {
                app_metadata: nextSession.user.app_metadata,
                user_metadata: nextSession.user.user_metadata,
              }
            );

            if (!isActive) return;

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
        fetchUserProfile(session.user.id, session.user.email, {
          app_metadata: session.user.app_metadata,
          user_metadata: session.user.user_metadata,
        }).then(profileData => {
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
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    const tenantDomainError = await validateTenantDomainAccess();
    if (tenantDomainError) {
      return { error: tenantDomainError };
    }

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

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const profileData = await fetchUserProfile(currentUser.id, currentUser.email, {
        app_metadata: currentUser.app_metadata,
        user_metadata: currentUser.user_metadata,
      });

      const isGlobalRole =
        profileData.tipo === 'SYSTEM_OWNER' ||
        profileData.tipo === 'SYSTEM_ADMIN' ||
        profileData.tipo === 'MASTER_TI';

      if (!isGlobalRole && !profileData.tenantId) {
        await supabase.auth.signOut();
        return { error: 'Usuário sem vínculo de empresa. Acesso bloqueado.' };
      }
    }

    void Promise.resolve().then(async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const profileData = await fetchUserProfile(user.id, user.email, {
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
  }, []);

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

    setImpersonation(null);
    window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);

    await supabase.auth.signOut();
  }, [user]);

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
  const tenantId = impersonation?.empresaId || user?.tenantId || null;

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
