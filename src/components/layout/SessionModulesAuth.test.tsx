import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseBranding = vi.mocked(useBranding);

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
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path={path} element={<div>Módulo {path}</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
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
      <MemoryRouter initialEntries={['/dashboard']}>
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle('Sair'));
    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });
});
