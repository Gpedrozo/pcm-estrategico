import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

import { getEffectiveRole, type AppRole } from '@/utils/userRoles';
import { buildSecureSignupMetadata } from '@/lib/secure-signup';
import { useTenant } from '@/contexts/TenantContext';

interface AuthUser {
  id: string;
  nome: string;
  email: string;
  tipo: AppRole;
  empresa_id?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (
    email: string,
    password: string,
    nome: string,
    empresaId?: string,
    role?: AppRole
  ) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isMasterTI: boolean;
  isSystemOwner: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { empresaId } = useTenant();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      let query = supabase
        .from('users_full')
        .select('nome, role, empresa_id')
        .eq('id', userId)
        .order('created_at', { ascending: true });

      if (empresaId) {
        query = query.eq('empresa_id', empresaId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        nome: data?.[0]?.nome || 'Usuário',
        tipo: getEffectiveRole((data || []) as Array<{ role: AppRole }>),
        empresa_id: data?.[0]?.empresa_id || null,
      };
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return {
        nome: 'Usuário',
        tipo: 'USUARIO' as AppRole,
        empresa_id: null,
      };
    }
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      if (session?.user) {
        setTimeout(async () => {
          const profile = await fetchUserProfile(session.user.id);
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            nome: profile.nome,
            tipo: profile.tipo,
            empresa_id: profile.empresa_id,
          });
          setIsLoading(false);
        }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);

      if (session?.user) {
        fetchUserProfile(session.user.id).then(profile => {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            nome: profile.nome,
            tipo: profile.tipo,
            empresa_id: profile.empresa_id,
          });
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    let mounted = true;

    fetchUserProfile(session.user.id).then(profile => {
      if (!mounted) return;
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        nome: profile.nome,
        tipo: profile.tipo,
        empresa_id: profile.empresa_id,
      });
    });

    return () => {
      mounted = false;
    };
  }, [empresaId, session?.user?.id]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'Email ou senha inválidos' };
      }
      return { error: error.message };
    }

    return { error: null };
  }, []);

  const signup = useCallback(
    async (
      email: string,
      password: string,
      nome: string,
      empresaId?: string,
      role: AppRole = 'USUARIO'
    ) => {
      const redirectUrl = `${window.location.origin}/`;

      let metadata;
      try {
        metadata = buildSecureSignupMetadata({ nome, empresaId, role });
      } catch (validationError) {
        return {
          error:
            validationError instanceof Error
              ? validationError.message
              : 'Dados inválidos para cadastro',
        };
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata,
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          return { error: 'Este email já está cadastrado' };
        }
        return { error: error.message };
      }

      return { error: null };
    },
    []
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const isAdmin = user?.tipo === 'ADMIN' || user?.tipo === 'MASTER_TI';
  const isMasterTI = user?.tipo === 'MASTER_TI';
  const isSystemOwner = user?.tipo === 'SYSTEM_OWNER';

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