import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  callOwnerAdmin,
  changePlan as changePlanRequest,
  cleanupCompanyData,
  createCompany,
  createPlatformOwner,
  createPlan,
  createSubscription,
  createSystemAdmin,
  createUser,
  deleteCompanyByOwner,
  deleteContract,
  getCompanySettings,
  getOwnerBackendHealth,
  getPlatformStats,
  impersonateCompany,
  listAuditLogs,
  listContracts,
  listDatabaseTables,
  listGlobalUsers,
  listPlans,
  listPlatformCompanies,
  listPlatformOwners,
  listSubscriptions,
  listSupportTickets,
  purgeTableData,
  regenerateContract,
  respondSupportTicket,
  setCompanyStatus,
  setSubscriptionStatus,
  setUserStatus,
  stopImpersonation,
  updateCompany,
  updateCompanySettings,
  updateContract,
  updatePlan,
  updateSubscriptionBilling,
} from '@/services/ownerPortal.service'

export const ownerQueryKeys = {
  stats: ['owner', 'stats'] as const,
  health: ['owner', 'backend-health'] as const,
  companies: ['owner', 'companies'] as const,
  users: (empresaId?: string | null) => ['owner', 'users', empresaId ?? null] as const,
  plans: ['owner', 'plans'] as const,
  subscriptions: ['owner', 'subscriptions'] as const,
  contracts: ['owner', 'contracts'] as const,
  support: ['owner', 'support-tickets'] as const,
  audit: (filters?: unknown) => ['owner', 'audit-logs', filters ?? null] as const,
  settings: (empresaId?: string | null) => ['owner', 'settings', empresaId ?? null] as const,
  platformOwners: ['owner', 'platform-owners'] as const,
  databaseTables: ['owner', 'database', 'tables'] as const,
}

const invalidateOwnerReads = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['owner'] })
}

export function useOwnerStats() {
  return useQuery({
    queryKey: ownerQueryKeys.stats,
    queryFn: getPlatformStats,
    staleTime: 20_000,
  })
}

export function useOwnerBackendHealth() {
  return useQuery({
    queryKey: ownerQueryKeys.health,
    queryFn: getOwnerBackendHealth,
    staleTime: 15_000,
    retry: 1,
  })
}

export function useOwnerCompanies() {
  return useQuery({
    queryKey: ownerQueryKeys.companies,
    queryFn: listPlatformCompanies,
    staleTime: 20_000,
  })
}

export function useOwnerUsers(empresaId?: string) {
  return useQuery({
    queryKey: ownerQueryKeys.users(empresaId ?? null),
    queryFn: () => listGlobalUsers(empresaId),
    staleTime: 20_000,
  })
}

export function useOwnerPlans() {
  return useQuery({
    queryKey: ownerQueryKeys.plans,
    queryFn: listPlans,
    staleTime: 20_000,
  })
}

export function useOwnerSubscriptions() {
  return useQuery({
    queryKey: ownerQueryKeys.subscriptions,
    queryFn: () => listSubscriptions(500),
    staleTime: 20_000,
  })
}

export function useOwnerContracts() {
  return useQuery({
    queryKey: ownerQueryKeys.contracts,
    queryFn: listContracts,
    staleTime: 20_000,
  })
}

export function useOwnerSupportTickets() {
  return useQuery({
    queryKey: ownerQueryKeys.support,
    queryFn: listSupportTickets,
    staleTime: 15_000,
  })
}

export function useOwnerAuditLogs(filters?: {
  empresa_id?: string
  user_id?: string
  module?: string
  from?: string
  to?: string
}) {
  return useQuery({
    queryKey: ownerQueryKeys.audit(filters),
    queryFn: () => listAuditLogs(filters),
    staleTime: 15_000,
  })
}

export function useOwnerCompanySettings(empresaId?: string | null) {
  return useQuery({
    queryKey: ownerQueryKeys.settings(empresaId),
    queryFn: () => {
      if (!empresaId) return Promise.resolve({ settings: [] as Array<{ chave: string; valor: Record<string, unknown> }> })
      return getCompanySettings(empresaId)
    },
    staleTime: 15_000,
  })
}

export function useOwnerMasterOwners() {
  return useQuery({
    queryKey: ownerQueryKeys.platformOwners,
    queryFn: listPlatformOwners,
    staleTime: 15_000,
  })
}

export function useOwnerDatabaseTables(enabled = true, refetchInterval: number | false = false, empresaId?: string | null) {
  return useQuery({
    queryKey: [...ownerQueryKeys.databaseTables, empresaId ?? null],
    queryFn: () => listDatabaseTables(empresaId ?? null),
    enabled,
    staleTime: 10_000,
    refetchInterval,
    refetchIntervalInBackground: true,
  })
}

export function useOwnerCompanyActions() {
  const qc = useQueryClient()

  const createCompanyMutation = useMutation({
    mutationFn: createCompany,
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const updateCompanyMutation = useMutation({
    mutationFn: ({ empresaId, company }: { empresaId: string; company: Record<string, unknown> }) => updateCompany(empresaId, company),
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const blockCompany = useMutation({
    mutationFn: ({ empresaId, reason }: { empresaId: string; reason?: string }) => setCompanyStatus(empresaId, 'blocked', reason),
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const setCompanyLifecycle = useMutation({
    mutationFn: ({ empresaId, status, reason }: { empresaId: string; status: string; reason?: string }) =>
      setCompanyStatus(empresaId, status, reason),
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const setUserStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) => setUserStatus(userId, status),
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const createPlanMutation = useMutation({
    mutationFn: createPlan,
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const updatePlanMutation = useMutation({
    mutationFn: updatePlan,
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const changePlan = useMutation({
    mutationFn: changePlanRequest,
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const createSubscriptionMutation = useMutation({
    mutationFn: createSubscription,
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const setSubscriptionStatusMutation = useMutation({
    mutationFn: ({ empresaId, status }: { empresaId: string; status: string }) => setSubscriptionStatus(empresaId, status),
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const updateSubscriptionBillingMutation = useMutation({
    mutationFn: updateSubscriptionBilling,
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const updateContractMutation = useMutation({
    mutationFn: ({ contractId, content, summary, status }: { contractId: string; content: string; summary?: string; status?: string }) =>
      updateContract(contractId, content, summary, status),
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const regenerateContractMutation = useMutation({
    mutationFn: regenerateContract,
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const deleteContractMutation = useMutation({
    mutationFn: deleteContract,
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const respondSupportMutation = useMutation({
    mutationFn: ({ ticketId, response, status }: { ticketId: string; response: string; status?: string }) =>
      respondSupportTicket(ticketId, response, status),
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const updateCompanySettingsMutation = useMutation({
    mutationFn: ({ empresaId, settings }: { empresaId: string; settings: Record<string, unknown> }) =>
      updateCompanySettings(empresaId, settings),
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const startImpersonationMutation = useMutation({
    mutationFn: ({ empresaId }: { empresaId: string }) => impersonateCompany(empresaId),
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const stopImpersonationMutation = useMutation({
    mutationFn: ({ empresaId, empresaNome, reason }: { empresaId?: string; empresaNome?: string; reason?: string }) =>
      stopImpersonation({ empresa_id: empresaId, empresa_nome: empresaNome, reason }),
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const createSystemAdminMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) => createSystemAdmin(userId),
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const createPlatformOwnerMutation = useMutation({
    mutationFn: createPlatformOwner,
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const cleanupCompanyDataMutation = useMutation({
    mutationFn: cleanupCompanyData,
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const purgeTableDataMutation = useMutation({
    mutationFn: purgeTableData,
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const deleteCompanyByOwnerMutation = useMutation({
    mutationFn: deleteCompanyByOwner,
    onSuccess: () => invalidateOwnerReads(qc),
  })

  const customOwnerActionMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => callOwnerAdmin(payload),
    onSuccess: () => invalidateOwnerReads(qc),
  })

  return {
    blockCompany,
    setCompanyLifecycle,
    createCompanyMutation,
    updateCompanyMutation,
    createUserMutation,
    setUserStatusMutation,
    createPlanMutation,
    updatePlanMutation,
    changePlan,
    createSubscriptionMutation,
    setSubscriptionStatusMutation,
    updateSubscriptionBillingMutation,
    updateContractMutation,
    regenerateContractMutation,
    deleteContractMutation,
    respondSupportMutation,
    updateCompanySettingsMutation,
    startImpersonationMutation,
    stopImpersonationMutation,
    createSystemAdminMutation,
    createPlatformOwnerMutation,
    cleanupCompanyDataMutation,
    purgeTableDataMutation,
    deleteCompanyByOwnerMutation,
    customOwnerActionMutation,
  }
}
