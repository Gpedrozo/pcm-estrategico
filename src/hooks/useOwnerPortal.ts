import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  callOwnerAdmin,
  createCompany,
  createPlatformOwner,
  createPlan,
  createSubscription,
  createUser,
  deleteContract,
  getCompanySettings,
  getPlatformStats,
  getOwnerBackendHealth,
  listAuditLogs,
  listContracts,
  listGlobalUsers,
  listPlans,
  listPlatformOwners,
  listPlatformCompanies,
  listSubscriptions,
  listSupportTickets,
  regenerateContract,
  respondSupportTicket,
  setCompanyStatus,
  setSubscriptionStatus,
  setUserStatus,
  stopImpersonation,
  impersonateCompany,
  updateCompany,
  updateCompanySettings,
  updateContract,
  updatePlan,
  updateSubscriptionBilling,
  listDatabaseTables,
  cleanupCompanyData,
  purgeTableData,
  deleteCompanyByOwner,
} from '@/services/ownerPortal.service'

export function useOwnerStats() {
  return useQuery({
    queryKey: ['owner', 'stats'],
    queryFn: getPlatformStats,
    staleTime: 30_000,
  })
}

export function useOwnerBackendHealth() {
  return useQuery({
    queryKey: ['owner', 'backend-health'],
    queryFn: getOwnerBackendHealth,
    staleTime: 20_000,
    retry: 1,
  })
}

export function useOwnerCompanies() {
  return useQuery({
    queryKey: ['owner', 'companies'],
    queryFn: listPlatformCompanies,
    staleTime: 30_000,
  })
}

export function useOwnerUsers(empresaId?: string) {
  return useQuery({
    queryKey: ['owner', 'users', empresaId ?? null],
    queryFn: () => listGlobalUsers(empresaId),
    staleTime: 30_000,
  })
}

export function useOwnerPlans() {
  return useQuery({
    queryKey: ['owner', 'plans'],
    queryFn: listPlans,
    staleTime: 30_000,
  })
}

export function useOwnerSubscriptions() {
  return useQuery({
    queryKey: ['owner', 'subscriptions'],
    queryFn: () => listSubscriptions(500),
    staleTime: 30_000,
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
    queryKey: ['owner', 'audit-logs', filters ?? null],
    queryFn: () => listAuditLogs(filters),
    staleTime: 15_000,
  })
}

export function useOwnerSupportTickets() {
  return useQuery({
    queryKey: ['owner', 'support-tickets'],
    queryFn: () => listSupportTickets(),
    staleTime: 15_000,
  })
}

export function useOwnerContracts() {
  return useQuery({
    queryKey: ['owner', 'contracts'],
    queryFn: listContracts,
    staleTime: 15_000,
  })
}

export function useOwnerCompanySettings(empresaId?: string | null) {
  return useQuery({
    queryKey: ['owner', 'company-settings', empresaId ?? null],
    queryFn: async () => {
      if (!empresaId) return { settings: [] }
      return getCompanySettings(empresaId)
    },
    staleTime: 15_000,
  })
}

export function useOwnerMasterOwners() {
  return useQuery({
    queryKey: ['owner', 'platform-owners'],
    queryFn: listPlatformOwners,
    staleTime: 15_000,
  })
}

export function useOwnerDatabaseTables(enabled = true) {
  return useQuery({
    queryKey: ['owner', 'database', 'tables'],
    queryFn: listDatabaseTables,
    staleTime: 10_000,
    enabled,
  })
}

export function useOwnerCompanyActions() {
  const qc = useQueryClient()

  const createCompanyMutation = useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'companies'] })
      qc.invalidateQueries({ queryKey: ['owner', 'stats'] })
      qc.invalidateQueries({ queryKey: ['owner', 'subscriptions'] })
      qc.invalidateQueries({ queryKey: ['owner', 'contracts'] })
      qc.invalidateQueries({ queryKey: ['owner', 'users'] })
    },
  })

  const updateCompanyMutation = useMutation({
    mutationFn: ({ empresaId, company }: { empresaId: string; company: Record<string, unknown> }) => updateCompany(empresaId, company),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'companies'] }),
  })

  const blockCompany = useMutation({
    mutationFn: ({ empresaId, reason }: { empresaId: string; reason?: string }) =>
      setCompanyStatus(empresaId, 'blocked', reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'companies'] })
      qc.invalidateQueries({ queryKey: ['owner', 'stats'] })
    },
  })

  const setCompanyLifecycle = useMutation({
    mutationFn: ({ empresaId, status, reason }: { empresaId: string; status: string; reason?: string }) =>
      setCompanyStatus(empresaId, status, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'companies'] })
      qc.invalidateQueries({ queryKey: ['owner', 'stats'] })
    },
  })

  const startImpersonationMutation = useMutation({
    mutationFn: ({ empresaId }: { empresaId: string }) => impersonateCompany(empresaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'audit-logs'] })
    },
  })

  const stopImpersonationMutation = useMutation({
    mutationFn: ({ empresaId, empresaNome, reason }: { empresaId?: string; empresaNome?: string; reason?: string }) =>
      stopImpersonation({ empresa_id: empresaId, empresa_nome: empresaNome, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'audit-logs'] })
    },
  })

  const changePlan = useMutation({
    mutationFn: (params: { empresa_id: string; plano_codigo: string }) =>
      callOwnerAdmin({ action: 'change_plan', ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'companies'] })
      qc.invalidateQueries({ queryKey: ['owner', 'subscriptions'] })
      qc.invalidateQueries({ queryKey: ['owner', 'contracts'] })
    },
  })

  const createPlanMutation = useMutation({
    mutationFn: createPlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'plans'] }),
  })

  const updatePlanMutation = useMutation({
    mutationFn: updatePlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'plans'] }),
  })

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'users'] }),
  })

  const setUserStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) => setUserStatus(userId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'users'] }),
  })

  const createSubscriptionMutation = useMutation({
    mutationFn: createSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'subscriptions'] })
      qc.invalidateQueries({ queryKey: ['owner', 'contracts'] })
      qc.invalidateQueries({ queryKey: ['owner', 'stats'] })
    },
  })

  const setSubscriptionStatusMutation = useMutation({
    mutationFn: ({ empresaId, status }: { empresaId: string; status: string }) => setSubscriptionStatus(empresaId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'subscriptions'] })
      qc.invalidateQueries({ queryKey: ['owner', 'stats'] })
    },
  })

  const updateSubscriptionBillingMutation = useMutation({
    mutationFn: ({
      subscriptionId,
      empresaId,
      billing,
    }: {
      subscriptionId?: string
      empresaId?: string
      billing: {
        amount?: number
        period?: 'monthly' | 'quarterly' | 'yearly' | 'custom'
        payment_method?: string
        payment_status?: string
        status?: 'ativa' | 'atrasada' | 'cancelada' | 'teste'
        renewal_at?: string | null
        starts_at?: string | null
        ends_at?: string | null
      }
    }) => updateSubscriptionBilling({ subscriptionId, empresaId, billing }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'subscriptions'] })
      qc.invalidateQueries({ queryKey: ['owner', 'stats'] })
      qc.invalidateQueries({ queryKey: ['owner', 'contracts'] })
    },
  })

  const respondSupportMutation = useMutation({
    mutationFn: ({ ticketId, response, status }: { ticketId: string; response: string; status?: string }) =>
      respondSupportTicket(ticketId, response, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'support-tickets'] }),
  })

  const updateContractMutation = useMutation({
    mutationFn: ({ contractId, content, summary, status }: { contractId: string; content: string; summary?: string; status?: string }) =>
      updateContract(contractId, content, summary, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'contracts'] }),
  })

  const regenerateContractMutation = useMutation({
    mutationFn: (contractId: string) => regenerateContract(contractId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'contracts'] }),
  })

  const deleteContractMutation = useMutation({
    mutationFn: (contractId: string) => deleteContract(contractId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'contracts'] }),
  })

  const updateCompanySettingsMutation = useMutation({
    mutationFn: ({ empresaId, settings }: { empresaId: string; settings: { modules?: Record<string, boolean>; limits?: Record<string, number>; features?: Record<string, boolean> } }) =>
      updateCompanySettings(empresaId, settings),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['owner', 'company-settings', variables.empresaId] })
    },
  })

  const createPlatformOwnerMutation = useMutation({
    mutationFn: createPlatformOwner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'platform-owners'] })
      qc.invalidateQueries({ queryKey: ['owner', 'users'] })
      qc.invalidateQueries({ queryKey: ['owner', 'audit-logs'] })
    },
  })

  const cleanupCompanyDataMutation = useMutation({
    mutationFn: cleanupCompanyData,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'database', 'tables'] })
      qc.invalidateQueries({ queryKey: ['owner', 'companies'] })
      qc.invalidateQueries({ queryKey: ['owner', 'users'] })
      qc.invalidateQueries({ queryKey: ['owner', 'stats'] })
      qc.invalidateQueries({ queryKey: ['owner', 'audit-logs'] })
    },
  })

  const purgeTableDataMutation = useMutation({
    mutationFn: purgeTableData,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'database', 'tables'] })
      qc.invalidateQueries({ queryKey: ['owner', 'companies'] })
      qc.invalidateQueries({ queryKey: ['owner', 'users'] })
      qc.invalidateQueries({ queryKey: ['owner', 'stats'] })
      qc.invalidateQueries({ queryKey: ['owner', 'audit-logs'] })
    },
  })

  const deleteCompanyByOwnerMutation = useMutation({
    mutationFn: deleteCompanyByOwner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'database', 'tables'] })
      qc.invalidateQueries({ queryKey: ['owner', 'companies'] })
      qc.invalidateQueries({ queryKey: ['owner', 'users'] })
      qc.invalidateQueries({ queryKey: ['owner', 'subscriptions'] })
      qc.invalidateQueries({ queryKey: ['owner', 'contracts'] })
      qc.invalidateQueries({ queryKey: ['owner', 'stats'] })
      qc.invalidateQueries({ queryKey: ['owner', 'audit-logs'] })
    },
  })

  return {
    blockCompany,
    changePlan,
    createCompanyMutation,
    updateCompanyMutation,
    setCompanyLifecycle,
    startImpersonationMutation,
    stopImpersonationMutation,
    createPlanMutation,
    updatePlanMutation,
    createUserMutation,
    setUserStatusMutation,
    createSubscriptionMutation,
    setSubscriptionStatusMutation,
    updateSubscriptionBillingMutation,
    respondSupportMutation,
    updateContractMutation,
    regenerateContractMutation,
    deleteContractMutation,
    updateCompanySettingsMutation,
    createPlatformOwnerMutation,
    cleanupCompanyDataMutation,
    purgeTableDataMutation,
    deleteCompanyByOwnerMutation,
  }
}
