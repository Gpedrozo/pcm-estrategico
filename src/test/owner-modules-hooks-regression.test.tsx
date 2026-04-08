import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Owner from '@/pages/Owner'
import { createAuthContextValue } from '@/test/auth-context-mock'

vi.stubEnv('VITE_OWNER_MASTER_EMAIL', 'owner-master@gppis.com.br')

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() =>
    createAuthContextValue({
      isSystemOwner: true,
      impersonation: null,
      startImpersonationSession: vi.fn(),
      stopImpersonationSession: vi.fn(),
    }),
  ),
}))

vi.mock('@/hooks/useOwner2Portal', () => ({
  useOwner2Health: () => ({ data: { service: 'owner-portal-admin', status: 'ok', version: '1.0-test', supported_actions: ['dashboard', 'list_companies'], timestamp: new Date().toISOString() }, isFetching: false }),
  useOwner2Dashboard: () => ({ data: { total_companies: 3, total_users: 11, active_subscriptions: 2, mrr: 3000 }, isLoading: false }),
  useOwner2Companies: () => ({ data: { companies: [{ id: 'e-1', nome: 'Empresa A' }] }, isLoading: false }),
  useOwner2Users: () => ({ data: { users: [{ id: 'u-1', nome: 'User A', email: 'a@x.com', status: 'ativo' }] }, isLoading: false }),
  useOwner2Plans: () => ({ data: { plans: [{ id: 'p-1', name: 'Plano Base', code: 'BASE' }] }, isLoading: false }),
  useOwner2Subscriptions: () => ({ data: { subscriptions: [{ id: 's-1', empresa_id: 'e-1', plan_id: 'p-1', status: 'ativa' }] }, isLoading: false }),
  useOwner2Contracts: () => ({ data: { contracts: [] }, isLoading: false }),
  useOwner2Tickets: () => ({ data: { tickets: [] }, isLoading: false }),
  useOwner2Audits: () => ({ data: { logs: [] }, isLoading: false }),
  useOwner2PlatformOwners: () => ({ data: { owners: [] }, isLoading: false }),
  useOwner2Tables: () => ({ data: { tables: [] }, isLoading: false }),
  useOwner2Settings: () => ({ data: { settings: [] }, isLoading: false }),
  useOwner2Actions: () => ({
    execute: { mutateAsync: vi.fn(), isPending: false },
  }),
}))

function renderOwner() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <Owner />
    </QueryClientProvider>,
  )
}

describe('owner v1 page stability', () => {
  it('renders dashboard shell and core metrics', () => {
    renderOwner()

    expect(screen.getByText('Owner Portal')).toBeInTheDocument()
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Cadastro' })).toBeInTheDocument()
    expect(screen.getByText('MRR')).toBeInTheDocument()
  })

  it('switches tab without crashing', async () => {
    renderOwner()

    fireEvent.click(screen.getByRole('button', { name: 'Cadastro' }))
    await waitFor(() => {
      expect(screen.getAllByText('Cadastrar empresa').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Usuarios' }))
    await waitFor(() => {
      expect(screen.getAllByText('Criar usuário').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Planos' }))
    await waitFor(() => {
      expect(screen.getAllByText('+ Cadastrar Novo Plano').length).toBeGreaterThan(0)
    })
  })
})
