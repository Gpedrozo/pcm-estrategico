import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './AppLayout';
import { AppSidebar } from './AppSidebar';
import { createAuthContextValue } from '@/test/auth-context-mock';
import { SidebarProvider } from '@/components/ui/sidebar';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/contexts/BrandingContext', () => ({
  useBranding: vi.fn(),
}));

vi.mock('@/components/notifications/NotificationCenter', () => ({
  NotificationCenter: () => null,
}));

vi.mock('./GlobalSearch', () => ({
  GlobalSearch: () => null,
}));

vi.mock('@/components/command-palette/CommandPalette', () => ({
  CommandPalette: () => null,
}));

vi.mock('@/hooks/useModuleAccess', () => ({
  useModuleAccess: () => ({
    modules: {},
    isLoading: false,
    isModuleEnabled: () => true,
    isRouteEnabled: () => true,
    isSidebarItemVisible: () => true,
  }),
}));

import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseBranding = vi.mocked(useBranding);

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

const modulePaths = [
  '/dashboard',
  '/solicitacoes',
  '/os/nova',
  '/os/fechar',
  '/os/historico',
  '/backlog',
  '/programacao',
  '/preventiva',
  '/preditiva',
  '/inspecoes',
  '/fmea',
  '/rca',
  '/melhorias',
  '/hierarquia',
  '/equipamentos',
  '/mecanicos',
  '/materiais',
  '/fornecedores',
  '/contratos',
  '/documentos',
  '/lubrificacao',
  '/custos',
  '/relatorios',
  '/ssma',
  '/usuarios',
  '/auditoria',
  '/admin/arquivos-owner',
  '/master-ti',
  '/inteligencia-causa-raiz',
];

function renderProtectedRoute(path: string) {
  const queryClient = createTestQueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path={path} element={<div>Módulo {path}</div>} />
          </Route>
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Session and module route coverage', () => {
  beforeEach(() => {
    mockedUseBranding.mockReturnValue({
      branding: null,
      loading: false,
      refresh: vi.fn(),
    });
  });

  it.each(modulePaths)('allows authenticated user in %s', (path) => {
    mockedUseAuth.mockReturnValue(
      createAuthContextValue({
        isAuthenticated: true,
        isLoading: false,
      })
    );

    renderProtectedRoute(path);
    expect(screen.getByText(`Módulo ${path}`)).toBeInTheDocument();
  });

  it.each(modulePaths)('redirects unauthenticated user from %s to login', (path) => {
    mockedUseAuth.mockReturnValue(
      createAuthContextValue({
        isAuthenticated: false,
        isLoading: false,
      })
    );

    renderProtectedRoute(path);
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('does not redirect to login while auth is hydrating', () => {
    mockedUseAuth.mockReturnValue(
      createAuthContextValue({
        isAuthenticated: false,
        isLoading: true,
        isHydrating: true,
        authStatus: 'hydrating',
      })
    );

    renderProtectedRoute('/dashboard');
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('executes logout action from sidebar', () => {
    const queryClient = createTestQueryClient();
    const logoutSpy = vi.fn().mockResolvedValue(undefined);

    mockedUseAuth.mockReturnValue(
      createAuthContextValue({
        isAuthenticated: true,
        isLoading: false,
        isAdmin: true,
        isMasterTI: true,
        logout: logoutSpy,
      })
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <SidebarProvider>
            <AppSidebar />
          </SidebarProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByTitle('Sair'));
    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });
});
