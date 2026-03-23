import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Owner2 from '@/pages/Owner2'
import { createAuthContextValue } from '@/test/auth-context-mock'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() =>
    createAuthContextValue({
      isSystemOwner: true,
      user: {
        id: 'u-owner2',
        nome: 'Owner2 User',
        email: 'pedrozo@gppis.com.br',
        tipo: 'SYSTEM_OWNER',
        tenantId: null,
      },
      logout: vi.fn(),
    }),
  ),
}))

vi.mock('@/hooks/useOwner2Portal', () => ({
  useOwner2Actions: () => ({ execute: { mutateAsync: vi.fn(), isPending: false } }),
  useOwner2Health: () => ({ data: { status: 'ok' }, isError: false, error: null }),
  useOwner2Dashboard: () => ({ data: { message: 'ok' }, isError: false }),
  useOwner2Companies: () => ({ data: { companies: [] }, isError: false }),
  useOwner2Users: () => ({ data: { users: [] }, isError: false }),
  useOwner2Plans: () => ({ data: { plans: [] }, isError: false }),
  useOwner2Subscriptions: () => ({ data: { subscriptions: [] }, isError: false }),
  useOwner2Contracts: () => ({ data: { contracts: [] }, isError: false }),
  useOwner2Tickets: () => ({ data: { tickets: [] }, isError: false }),
  useOwner2Audits: () => ({ data: { logs: [] }, isError: false }),
  useOwner2PlatformOwners: () => ({ data: { owners: [] }, isError: false }),
  useOwner2Tables: () => ({ data: { tables: [] }, isError: false }),
  useOwner2Settings: () => ({ data: { settings: [] }, isError: false }),
}))

function renderOwner2() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <Owner2 />
    </QueryClientProvider>,
  )
}

describe('owner2 encoding regression', () => {
  it('renders Usuário label with proper accent', () => {
    renderOwner2()

    expect(screen.getByText(/Usuário:/i)).toBeInTheDocument()
  })
})
