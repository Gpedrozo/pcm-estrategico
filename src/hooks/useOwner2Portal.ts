import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type OwnerAction as Owner2Action } from '@/services/ownerPortal.service'
import {
  callOwnerAdmin,
  getCompanySettings,
  getOwnerBackendHealth,
  getPlatformStats,
  listAuditLogs,
  listContracts,
  listDatabaseTables,
  listGlobalUsers,
  listPlans,
  listPlatformCompanies,
  listPlatformOwners,
  listSubscriptions,
  listSupportTickets,
} from '@/services/ownerPortal.service'
import { writeAuditLog } from '@/lib/audit'

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
    queryFn: () => getOwnerBackendHealth(),
    enabled,
    retry: 1,
  })
}

export function useOwner2Dashboard(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.dashboard,
    queryFn: () => getPlatformStats(),
    enabled,
    retry: 0,
  })
}

export function useOwner2Companies(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.companies,
    queryFn: async () => {
      try {
        const data = await listPlatformCompanies()
        const companies = Array.isArray((data as any)?.companies) ? (data as any).companies : []
        if (companies.length > 0) return { companies }
      } catch { /* edge function failed, try direct fallback */ }

      // Direct Supabase fallback – bypasses edge function
      const { data: rows } = await (await import('@/integrations/supabase/client')).supabase
        .from('empresas')
        .select('id,nome,slug,status,created_at,updated_at')
        .order('created_at', { ascending: false })
        .limit(5000)

      return { companies: Array.isArray(rows) ? rows : [] }
    },
    enabled,
    retry: 1,
  })
}

export function useOwner2Users(empresaId?: string, enabled = true, includeDeleted = false) {
  return useQuery({
    queryKey: [...owner2Keys.users, empresaId ?? null, includeDeleted],
    queryFn: async () => ({ users: await listGlobalUsers(empresaId, includeDeleted) }),
    enabled,
    retry: 0,
  })
}

export function useOwner2Plans(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.plans,
    queryFn: async () => ({ plans: await listPlans() }),
    enabled,
    retry: 0,
  })
}

export function useOwner2Subscriptions(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.subscriptions,
    queryFn: async () => ({ subscriptions: await listSubscriptions(500) }),
    enabled,
    retry: 0,
  })
}

export function useOwner2Contracts(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.contracts,
    queryFn: async () => ({ contracts: await listContracts() }),
    enabled,
    retry: 0,
  })
}

export function useOwner2Tickets(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.tickets,
    queryFn: async () => ({ tickets: await listSupportTickets() }),
    enabled,
    refetchInterval: 30_000,
    retry: 0,
  })
}

export function useOwner2Audits(filters?: Record<string, unknown>, enabled = true) {
  return useQuery({
    queryKey: [...owner2Keys.audits, filters ?? null],
    queryFn: async () => ({ logs: await listAuditLogs(filters) }),
    enabled,
    retry: 0,
  })
}

export function useOwner2PlatformOwners(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.owners,
    queryFn: async () => ({ owners: await listPlatformOwners() }),
    enabled,
    retry: 0,
  })
}

export function useOwner2Tables(
  empresaId?: string,
  enabled = true,
  refetchInterval: number | false = false,
) {
  const computeRefetchInterval = () => {
    if (refetchInterval === false) return false
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false
    return refetchInterval
  }

  return useQuery({
    queryKey: owner2Keys.tables(empresaId),
    queryFn: async () => ({ tables: await listDatabaseTables(empresaId ?? null) }),
    enabled,
    refetchInterval: computeRefetchInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: 0,
  })
}

export function useOwner2Settings(empresaId?: string, enabled = true) {
  return useQuery({
    queryKey: owner2Keys.settings(empresaId),
    queryFn: async () => {
      if (!empresaId) return { settings: [] as Array<Record<string, unknown>> }
      return getCompanySettings(empresaId)
    },
    enabled,
    retry: 0,
  })
}

export function useOwner2Actions() {
  const qc = useQueryClient()

  const normalizePayload = (action: Owner2Action, payload?: Record<string, unknown>) => {
    const source = payload ?? {}

    if (action === 'update_subscription_billing' && !('billing' in source)) {
      return {
        action,
        subscription_id: source.subscription_id,
        empresa_id: source.empresa_id,
        billing: {
          amount: source.amount,
          payment_status: source.payment_status,
          payment_method: source.payment_method,
          due_date: source.due_date,
          paid_at: source.paid_at,
        },
      }
    }

    if (action === 'list_audit_logs' && !('filters' in source)) {
      return {
        action,
        filters: source,
      }
    }

    return { action, ...source }
  }

  const execute = useMutation({
    mutationFn: ({ action, payload }: { action: Owner2Action; payload?: Record<string, unknown> }) =>
      callOwnerAdmin(normalizePayload(action, payload) as any),
    onSuccess: (_data, variables) => {
      invalidateOwner2(qc)
      writeAuditLog({ action: `OWNER2_${variables.action}`, table: 'owner_admin', source: 'useOwner2Portal' })
    },
  })

  return { execute }
}
