import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OwnerEmpresasModule } from '@/modules/empresas/OwnerEmpresasModule'
import { OwnerSuporteModule } from '@/modules/suporte/OwnerSuporteModule'
import { createAuthContextValue } from '@/test/auth-context-mock'

const empresasState = {
  isLoading: true,
  companies: [] as Array<{ id: string; nome?: string; dados_empresa?: Array<{ nome_fantasia?: string; razao_social?: string }> }>,
}

const suporteState = {
  isLoading: true,
  tickets: [] as Array<{ id: string; subject?: string; status?: string; priority?: string; updated_at?: string }>,
}

const ownerActionsMock = {
  createCompanyMutation: { mutate: vi.fn(), isPending: false },
  updateCompanyMutation: { mutate: vi.fn(), isPending: false },
  setCompanyLifecycle: { mutate: vi.fn(), isPending: false },
  changePlan: { mutate: vi.fn(), isPending: false },
  startImpersonationMutation: { mutate: vi.fn(), isPending: false },
  stopImpersonationMutation: { mutate: vi.fn(), isPending: false },
  respondSupportMutation: { mutate: vi.fn(), isPending: false },
}

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
  useOwnerCompanies: () => ({
    data: { companies: empresasState.companies },
    isLoading: empresasState.isLoading,
  }),
  useOwnerPlans: () => ({ data: [], isLoading: false }),
  useOwnerSubscriptions: () => ({ data: [], isLoading: false }),
  useOwnerAuditLogs: () => ({ data: [], isLoading: false }),
  useOwnerSupportTickets: () => ({ data: suporteState.tickets, isLoading: suporteState.isLoading }),
  useOwnerCompanyActions: () => ownerActionsMock,
}))

describe('owner modules hook-order regressions', () => {
  beforeEach(() => {
    empresasState.isLoading = true
    empresasState.companies = []
    suporteState.isLoading = true
    suporteState.tickets = []
  })

  it('keeps hook order stable in OwnerEmpresasModule when loading flips to data', () => {
    const { rerender } = render(<OwnerEmpresasModule />)

    expect(screen.getByText(/carregando empresas/i)).toBeInTheDocument()

    empresasState.isLoading = false
    empresasState.companies = [
      {
        id: 'empresa-1',
        nome: 'Empresa Alpha',
        dados_empresa: [{ nome_fantasia: 'Alpha' }],
      },
    ]

    rerender(<OwnerEmpresasModule />)

    expect(screen.getByText(/empresas globais/i)).toBeInTheDocument()
    expect(screen.getByText(/alpha/i)).toBeInTheDocument()
  })

  it('keeps hook order stable in OwnerSuporteModule when loading flips to data', () => {
    const { rerender } = render(<OwnerSuporteModule />)

    expect(screen.getByText(/carregando chamados/i)).toBeInTheDocument()

    suporteState.isLoading = false
    suporteState.tickets = [
      {
        id: 'ticket-1',
        subject: 'Falha no login',
        status: 'aberto',
        priority: 'alta',
        updated_at: new Date().toISOString(),
      },
    ]

    rerender(<OwnerSuporteModule />)

    expect(screen.getByText(/^suporte$/i)).toBeInTheDocument()
    expect(screen.getByText(/falha no login/i)).toBeInTheDocument()
  })
})
