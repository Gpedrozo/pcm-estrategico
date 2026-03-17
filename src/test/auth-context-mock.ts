import type { Session } from '@supabase/supabase-js';
import type { AuthContextType, AuthUser } from '@/contexts/AuthContext';

function createSession(overrides: Partial<Session> = {}): Session {
  const now = Math.floor(Date.now() / 1000);

  return {
    access_token: 'access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: 'refresh-token',
    user: {
      id: 'user-1',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as Session['user'],
    ...overrides,
  };
}

function createAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    nome: 'Usuário Teste',
    email: 'usuario@teste.com',
    tipo: 'USUARIO',
    roles: ['USUARIO'],
    tenantId: 'empresa-1',
    tenantSlug: 'empresa-teste',
    forcePasswordChange: false,
    ...overrides,
  };
}

export function createAuthContextValue(overrides: Partial<AuthContextType> = {}): AuthContextType {
  return {
    user: createAuthUser(),
    session: createSession(),
    authStatus: 'authenticated',
    isHydrating: false,
    isAuthenticated: true,
    isLoading: false,
    login: async () => ({ error: null }),
    changePassword: async () => ({ error: null }),
    signup: async () => ({ error: null }),
    logout: async () => {},
    isAdmin: false,
    isMasterTI: false,
    isSystemOwner: false,
    effectiveRole: 'USUARIO',
    tenantId: 'empresa-1',
    tenantSlug: 'empresa-teste',
    forcePasswordChange: false,
    impersonation: null,
    startImpersonationSession: () => {},
    stopImpersonationSession: () => {},
    ...overrides,
  };
}

export { createSession, createAuthUser };
