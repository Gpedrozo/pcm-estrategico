import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import {
  buildSecureSignupMetadata,
  getEffectiveRole,
  resolveEmpresaSlug,
  type AppRole,
} from '@/lib/security';
import { logger } from '@/lib/logger';
import { writeAuditLog } from '@/lib/audit';

interface AuthUser {
  id: string;
  nome: string;
  email: string;
  tipo: AppRole;
  roles: AppRole[];
  tenantId: string | null;
}

interface AuthContextType {
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (userId: string, email?: string | null) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', userId)
        .maybeSingle();

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, empresa_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      const roles: AppRole[] = (roleData || []).map(
        (item: { role: AppRole }) => item.role
      );

      const tenantId: string | null = (roleData || [])[0]?.empresa_id || null;

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);

        if (session?.user) {
          setTimeout(async () => {
            const profileData = await fetchUserProfile(session.user.id, session.user.email);

            setUser({
              id: session.user.id,
              email: session.user.email || '',
              nome: profileData.nome,
              tipo: profileData.tipo,
              roles: profileData.roles,
              tenantId: profileData.tenantId,
            });

            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);

      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email).then(profileData => {
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

    return () => subscription.unsubscribe();
  }, []);

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

    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await writeAuditLog({
          action: 'LOGIN',
          table: 'auth',
          recordId: user.id,
          source: 'auth_context',
          metadata: {
            email: user.email || email,
            event: 'login_success',
          },
        });
      }
    }, 0);

    return { error: null };
  }, []);

  const signup = useCallback(async (email: string, password: string, nome: string): Promise<{ error: string | null }> => {
    const redirectUrl = `${window.location.origin}/`;
    const empresaSlug = resolveEmpresaSlug(window.location.hostname);
    const hostname = window.location.hostname;

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
      const { data: defaultEmpresa, error: defaultEmpresaError } = await supabase
        .from('empresas')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (defaultEmpresaError || !defaultEmpresa?.id) {
        return { error: 'Empresa inválida. Contate o administrador.' };
      }

      empresaId = defaultEmpresa.id;
    }

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
  }, []);

  const logout = useCallback(async () => {
    if (user) {
      await writeAuditLog({
        action: 'LOGOUT',
        table: 'auth',
        recordId: user.id,
        source: 'auth_context',
        metadata: {
          email: user.email,
          event: 'logout',
        },
      });
    }

    await supabase.auth.signOut();
  }, [user]);

  const effectiveRole: AppRole = user?.tipo || 'USUARIO';
  const isAdmin = effectiveRole === 'ADMIN' || effectiveRole === 'MASTER_TI' || effectiveRole === 'SYSTEM_OWNER';
  const isMasterTI = effectiveRole === 'MASTER_TI' || effectiveRole === 'SYSTEM_OWNER';
  const isSystemOwner = effectiveRole === 'SYSTEM_OWNER';
  const tenantId = user?.tenantId || null;

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
