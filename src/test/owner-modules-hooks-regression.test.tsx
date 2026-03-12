import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Owner from '@/pages/Owner'
import { createAuthContextValue } from '@/test/auth-context-mock'

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

vi.mock('@/hooks/useOwnerPortal', () => ({
  useOwnerStats: () => ({ data: { total_companies: 3, total_users: 11, active_subscriptions: 2, mrr: 3000 }, isLoading: false }),
  useOwnerBackendHealth: () => ({ data: { service: 'owner-portal-admin', status: 'ok', version: '1.0-test', supported_actions: ['dashboard', 'list_companies'], timestamp: new Date().toISOString() }, isFetching: false }),
  useOwnerCompanies: () => ({ data: { companies: [{ id: 'e-1', nome: 'Empresa A' }] }, isLoading: false }),
  useOwnerUsers: () => ({ data: [{ id: 'u-1', nome: 'User A', email: 'a@x.com', status: 'ativo' }], isLoading: false }),
  useOwnerPlans: () => ({ data: [{ id: 'p-1', name: 'Plano Base', code: 'BASE' }], isLoading: false }),
  useOwnerSubscriptions: () => ({ data: [{ id: 's-1', empresa_id: 'e-1', plan_id: 'p-1', status: 'ativa' }], isLoading: false }),
  useOwnerContracts: () => ({ data: [], isLoading: false }),
  useOwnerSupportTickets: () => ({ data: [], isLoading: false }),
  useOwnerAuditLogs: () => ({ data: [], isLoading: false }),
  useOwnerMasterOwners: () => ({ data: [], isLoading: false }),
  useOwnerDatabaseTables: () => ({ data: [], isLoading: false }),
  useOwnerCompanySettings: () => ({ data: { settings: [] }, isLoading: false }),
  useOwnerCompanyActions: () => ({
    createCompanyMutation: { mutateAsync: vi.fn(), isPending: false },
    updateCompanyMutation: { mutateAsync: vi.fn(), isPending: false },
    setCompanyLifecycle: { mutateAsync: vi.fn(), isPending: false },
    createUserMutation: { mutateAsync: vi.fn(), isPending: false },
    setUserStatusMutation: { mutateAsync: vi.fn(), isPending: false },
    createPlanMutation: { mutateAsync: vi.fn(), isPending: false },
    updatePlanMutation: { mutateAsync: vi.fn(), isPending: false },
    createSubscriptionMutation: { mutateAsync: vi.fn(), isPending: false },
    setSubscriptionStatusMutation: { mutateAsync: vi.fn(), isPending: false },
    updateSubscriptionBillingMutation: { mutateAsync: vi.fn(), isPending: false },
    updateContractMutation: { mutateAsync: vi.fn(), isPending: false },
    regenerateContractMutation: { mutateAsync: vi.fn(), isPending: false },
    deleteContractMutation: { mutateAsync: vi.fn(), isPending: false },
    respondSupportMutation: { mutateAsync: vi.fn(), isPending: false },
    updateCompanySettingsMutation: { mutateAsync: vi.fn(), isPending: false },
    createPlatformOwnerMutation: { mutateAsync: vi.fn(), isPending: false },
    createSystemAdminMutation: { mutateAsync: vi.fn(), isPending: false },
    cleanupCompanyDataMutation: { mutateAsync: vi.fn(), isPending: false },
    purgeTableDataMutation: { mutateAsync: vi.fn(), isPending: false },
    deleteCompanyByOwnerMutation: { mutateAsync: vi.fn(), isPending: false },
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

    expect(screen.getByText('Owner Portal v1.0')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Empresas')).toBeInTheDocument()
    expect(screen.getByText('MRR')).toBeInTheDocument()
  })

  it('switches tab without crashing', async () => {
    renderOwner()

    screen.getByRole('button', { name: 'Empresas' }).click()
    expect(screen.getByText('Criar empresa')).toBeInTheDocument()

    screen.getByRole('button', { name: 'Usuarios' }).click()
    expect(screen.getByText('Criar usuario')).toBeInTheDocument()

    screen.getByRole('button', { name: 'Planos' }).click()
    expect(screen.getByText('Criar plano')).toBeInTheDocument()
  })
})
