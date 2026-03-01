import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { getEffectiveRole, type AppRole } from '@/utils/userRoles';
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
  signup: (email: string, password: string, nome: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isMasterTI: boolean;
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

      const { data: userRows, error } = await query;
      const filteredRows = userRows || [];

      if (error) throw error;

      return {
        nome: filteredRows?.[0]?.nome || 'Usuário',
        tipo: getEffectiveRole((filteredRows || []) as Array<{ role: AppRole }>),
        empresa_id: filteredRows?.[0]?.empresa_id || null,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { nome: 'Usuário', tipo: 'USUARIO' as const, empresa_id: null };
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
            const profileData = await fetchUserProfile(session.user.id);
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              nome: profileData.nome,
              tipo: profileData.tipo,
              empresa_id: profileData.empresa_id,
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
        fetchUserProfile(session.user.id).then(profileData => {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            nome: profileData.nome,
            tipo: profileData.tipo,
            empresa_id: profileData.empresa_id,
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
    fetchUserProfile(session.user.id).then((profileData) => {
      if (!mounted) return;
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        nome: profileData.nome,
        tipo: profileData.tipo,
        empresa_id: profileData.empresa_id,
      });
    });

    return () => {
      mounted = false;
    };
  }, [empresaId, session?.user?.id]);

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
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nome: nome,
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

  const isAdmin = user?.tipo === 'ADMIN' || user?.tipo === 'MASTER_TI';
  const isMasterTI = user?.tipo === 'MASTER_TI';

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
