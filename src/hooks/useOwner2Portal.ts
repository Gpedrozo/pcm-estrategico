import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invokeOwner2, type Owner2Action } from '@/services/owner2Portal.service'

const owner2Keys = {
  health: ['owner2', 'health'] as const,
  dashboard: ['owner2', 'dashboard'] as const,
  companies: ['owner2', 'companies'] as const,
  users: ['owner2', 'users'] as const,
  plans: ['owner2', 'plans'] as const,
  subscriptions: ['owner2', 'subscriptions'] as const,
  contracts: ['owner2', 'contracts'] as const,
  tickets: ['owner2', 'tickets'] as const,
  audits: ['owner2', 'audits'] as const,
  owners: ['owner2', 'owners'] as const,
  tables: (empresaId?: string) => ['owner2', 'tables', empresaId ?? null] as const,
  settings: (empresaId?: string) => ['owner2', 'settings', empresaId ?? null] as const,
}

function invalidateOwner2(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['owner2'] })
}

export function useOwner2Health(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.health,
    queryFn: () => invokeOwner2({ action: 'health_check' }),
    enabled,
    staleTime: 15_000,
    retry: 1,
  })
}

export function useOwner2Dashboard(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.dashboard,
    queryFn: () => invokeOwner2({ action: 'dashboard' }),
    enabled,
    staleTime: 15_000,
    retry: 0,
  })
}

export function useOwner2Companies(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.companies,
    queryFn: () => invokeOwner2<{ companies: Array<Record<string, unknown>> }>({ action: 'list_companies' }),
    enabled,
    retry: 0,
  })
}

export function useOwner2Users(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.users,
    queryFn: () => invokeOwner2<{ users: Array<Record<string, unknown>> }>({ action: 'list_users' }),
    enabled,
    retry: 0,
  })
}

export function useOwner2Plans(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.plans,
    queryFn: () => invokeOwner2<{ plans: Array<Record<string, unknown>> }>({ action: 'list_plans' }),
    enabled,
    retry: 0,
  })
}

export function useOwner2Subscriptions(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.subscriptions,
    queryFn: () => invokeOwner2<{ subscriptions: Array<Record<string, unknown>> }>({ action: 'list_subscriptions', limit: 500 }),
    enabled,
    retry: 0,
  })
}

export function useOwner2Contracts(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.contracts,
    queryFn: () => invokeOwner2<{ contracts: Array<Record<string, unknown>> }>({ action: 'list_contracts' }),
    enabled,
    retry: 0,
  })
}

export function useOwner2Tickets(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.tickets,
    queryFn: () => invokeOwner2<{ tickets: Array<Record<string, unknown>> }>({ action: 'list_support_tickets' }),
    enabled,
    retry: 0,
  })
}

export function useOwner2Audits(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.audits,
    queryFn: () => invokeOwner2<{ logs: Array<Record<string, unknown>> }>({ action: 'list_audit_logs', filters: {} }),
    enabled,
    retry: 0,
  })
}

export function useOwner2PlatformOwners(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.owners,
    queryFn: () => invokeOwner2<{ owners: Array<Record<string, unknown>> }>({ action: 'list_platform_owners' }),
    enabled,
    retry: 0,
  })
}

export function useOwner2Tables(empresaId?: string, enabled = true) {
  return useQuery({
    queryKey: owner2Keys.tables(empresaId),
    queryFn: () => invokeOwner2<{ tables: Array<Record<string, unknown>> }>({ action: 'list_database_tables', empresa_id: empresaId ?? null }),
    enabled,
    retry: 0,
  })
}

export function useOwner2Settings(empresaId?: string, enabled = true) {
  return useQuery({
    queryKey: owner2Keys.settings(empresaId),
    queryFn: () => {
      if (!empresaId) return Promise.resolve({ settings: [] as Array<Record<string, unknown>> })
      return invokeOwner2<{ settings: Array<Record<string, unknown>> }>({ action: 'get_company_settings', empresa_id: empresaId })
    },
    enabled,
    retry: 0,
  })
}

export function useOwner2Actions() {
  const qc = useQueryClient()

  const execute = useMutation({
    mutationFn: ({ action, payload }: { action: Owner2Action; payload?: Record<string, unknown> }) =>
      invokeOwner2({ action, ...(payload ?? {}) }),
    onSuccess: () => invalidateOwner2(qc),
  })

  return { execute }
}
