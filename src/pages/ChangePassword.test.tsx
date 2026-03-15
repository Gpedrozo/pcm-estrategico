import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ChangePassword from './ChangePassword';
import { createAuthContextValue } from '@/test/auth-context-mock';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/contexts/AuthContext';

const mockedUseAuth = vi.mocked(useAuth);

function renderRoutes() {
  render(
    <MemoryRouter initialEntries={['/change-password']}>
      <Routes>
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ChangePassword', () => {
  it('redirects unauthenticated users to login', () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isAuthenticated: false,
      isLoading: false,
    }));

    renderRoutes();
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('redirects users without force flag to dashboard', () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isAuthenticated: true,
      isLoading: false,
      forcePasswordChange: false,
    }));

    renderRoutes();
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });

  it('validates password confirmation before submitting', async () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isAuthenticated: true,
      isLoading: false,
      forcePasswordChange: true,
      changePassword: vi.fn(async () => ({ error: null })),
    }));

    renderRoutes();

    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'NovaSenha123' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'OutraSenha123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar senha' }));

    expect(await screen.findByText('As senhas não conferem.')).toBeInTheDocument();
  });
});
