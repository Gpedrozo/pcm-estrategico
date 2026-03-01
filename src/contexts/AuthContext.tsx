import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import {
  buildSecureSignupMetadata,
  getEffectiveRole,
  resolveTenantSlug,
  type AppRole,
} from '@/lib/security';

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
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', userId)
        .maybeSingle();

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, tenant_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      const roles = (roleData || []).map((item: { role: AppRole }) => item.role);
      const tenantId = (roleData || [])[0]?.tenant_id || null;
      const effectiveRole = getEffectiveRole({ roles, email });

      return {
        nome: profile?.nome || 'Usuário',
        tipo: effectiveRole,
        roles,
        tenantId,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { nome: 'Usuário', tipo: 'USUARIO' as const, roles: ['USUARIO'], tenantId: null };
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout to avoid deadlock
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

    // THEN check for existing session
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

    // Log audit
    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome')
          .eq('id', user.id)
          .maybeSingle();
        
        await supabase.from('auditoria').insert({
          usuario_id: user.id,
          usuario_nome: profile?.nome || user.email || 'Usuário',
          acao: 'LOGIN',
          descricao: 'Login no sistema',
        });
      }
    }, 0);

    return { error: null };
  }, []);

  const signup = useCallback(async (email: string, password: string, nome: string): Promise<{ error: string | null }> => {
    const redirectUrl = `${window.location.origin}/`;
    const tenantSlug = resolveTenantSlug(window.location.hostname);

    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants' as any)
      .select('id, slug')
      .eq('slug', tenantSlug)
      .maybeSingle();

    if (tenantError || !tenantData?.id) {
      return { error: 'Tenant inválido. Contate o administrador.' };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nome: nome,
          ...buildSecureSignupMetadata({
            tenantId: tenantData.id,
            tenantSlug: tenantData.slug,
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
    // Log audit before logout
    if (user) {
      await supabase.from('auditoria').insert({
        usuario_id: user.id,
        usuario_nome: user.nome,
        acao: 'LOGOUT',
        descricao: 'Logout do sistema',
      });
    }
    
    await supabase.auth.signOut();
  }, [user]);

  const effectiveRole = user?.tipo || 'USUARIO';
  const isAdmin = effectiveRole === 'ADMIN' || effectiveRole === 'MASTER_TI';
  const isMasterTI = effectiveRole === 'MASTER_TI';
  const isSystemOwner = effectiveRole === 'SYSTEM_OWNER';
  const tenantId = user?.tenantId || null;

  return (
    <AuthContext.Provider value={{
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
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
