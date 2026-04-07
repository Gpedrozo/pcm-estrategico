// [REMOVED] Orphan file — not imported by any production code. Safe to delete.
// All owner hooks are now exclusively in useOwner2Portal.ts
export {}

/* eslint-disable */
/* Original dead code below — nothing imports this file.

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

export function useOwnerStats(enabled = true) {
  return useQuery({
    queryKey: ownerQueryKeys.stats,
    queryFn: getPlatformStats,
    enabled,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: 0,
  })
}

export function useOwnerBackendHealth(enabled = true) {
  return useQuery({
    queryKey: ownerQueryKeys.health,
    queryFn: getOwnerBackendHealth,
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useOwnerCompanies(enabled = true) {
  return useQuery({
    queryKey: ownerQueryKeys.companies,
    queryFn: listPlatformCompanies,
    enabled,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: 0,
  })
}

export function useOwnerUsers(empresaId?: string, enabled = true) {
  return useQuery({
    queryKey: ownerQueryKeys.users(empresaId ?? null),
    queryFn: () => listGlobalUsers(empresaId),
    enabled,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: 0,
  })
}

export function useOwnerPlans(enabled = true) {
  return useQuery({
    queryKey: ownerQueryKeys.plans,
    queryFn: listPlans,
    enabled,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: 0,
  })
}

export function useOwnerSubscriptions(enabled = true) {
  return useQuery({
    queryKey: ownerQueryKeys.subscriptions,
    queryFn: () => listSubscriptions(500),
    enabled,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: 0,
  })
}

export function useOwnerContracts(enabled = true) {
  return useQuery({
    queryKey: ownerQueryKeys.contracts,
    queryFn: listContracts,
    enabled,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: 0,
  })
}

export function useOwnerSupportTickets(enabled = true) {
  return useQuery({
    queryKey: ownerQueryKeys.support,
    queryFn: listSupportTickets,
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: 0,
  })
}

export function useOwnerAuditLogs(filters?: {
  empresa_id?: string
  user_id?: string
  module?: string
  from?: string
  to?: string
}, enabled = true) {
  return useQuery({
    queryKey: ownerQueryKeys.audit(filters),
    queryFn: () => listAuditLogs(filters),
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: 0,
  })
}

export function useOwnerCompanySettings(empresaId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ownerQueryKeys.settings(empresaId),
    queryFn: () => {
      if (!empresaId) return Promise.resolve({ settings: [] as Array<{ chave: string; valor: Record<string, unknown> }> })
      return getCompanySettings(empresaId)
    },
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: 0,
  })
}

export function useOwnerMasterOwners(enabled = true) {
  return useQuery({
    queryKey: ownerQueryKeys.platformOwners,
    queryFn: listPlatformOwners,
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: 0,
  })
}

export function useOwnerDatabaseTables(enabled = true, refetchInterval: number | false = false, empresaId?: string | null) {
  const computeRefetchInterval = () => {
    if (refetchInterval === false) return false
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return false
    }
    return refetchInterval
  }

  return useQuery({
    queryKey: [...ownerQueryKeys.databaseTables, empresaId ?? null],
    queryFn: () => listDatabaseTables(empresaId ?? null),
    enabled,
    staleTime: 10_000,
    refetchInterval: computeRefetchInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: 0,
  })
}

export function useOwnerCompanyActions() {
  const qc = useQueryClient()

  const auditOwner = (action: string, table: string, severity?: 'info' | 'warning' | 'critical') => () => {
    invalidateOwnerReads(qc)
    writeAuditLog({ action, table, source: 'useOwnerPortal', severity })
  }

  const createCompanyMutation = useMutation({
    mutationFn: createCompany,
    onSuccess: auditOwner('CREATE_COMPANY', 'empresas'),
  })

  const updateCompanyMutation = useMutation({
    mutationFn: ({ empresaId, company }: { empresaId: string; company: Record<string, unknown> }) => updateCompany(empresaId, company),
    onSuccess: auditOwner('UPDATE_COMPANY', 'empresas'),
  })

  const blockCompany = useMutation({
    mutationFn: ({ empresaId, reason }: { empresaId: string; reason?: string }) => setCompanyStatus(empresaId, 'blocked', reason),
    onSuccess: auditOwner('BLOCK_COMPANY', 'empresas', 'warning'),
  })

  const setCompanyLifecycle = useMutation({
    mutationFn: ({ empresaId, status, reason }: { empresaId: string; status: string; reason?: string }) =>
      setCompanyStatus(empresaId, status, reason),
    onSuccess: auditOwner('SET_COMPANY_LIFECYCLE', 'empresas', 'warning'),
  })

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: auditOwner('CREATE_USER', 'profiles'),
  })

  const setUserStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) => setUserStatus(userId, status),
    onSuccess: auditOwner('SET_USER_STATUS', 'profiles', 'warning'),
  })

  const createPlanMutation = useMutation({
    mutationFn: createPlan,
    onSuccess: auditOwner('CREATE_PLAN', 'planos'),
  })

  const updatePlanMutation = useMutation({
    mutationFn: updatePlan,
    onSuccess: auditOwner('UPDATE_PLAN', 'planos'),
  })

  const changePlan = useMutation({
    mutationFn: changePlanRequest,
    onSuccess: auditOwner('CHANGE_PLAN', 'assinaturas', 'warning'),
  })

  const createSubscriptionMutation = useMutation({
    mutationFn: createSubscription,
    onSuccess: auditOwner('CREATE_SUBSCRIPTION', 'assinaturas'),
  })

  const setSubscriptionStatusMutation = useMutation({
    mutationFn: ({ empresaId, status }: { empresaId: string; status: string }) => setSubscriptionStatus(empresaId, status),
    onSuccess: auditOwner('SET_SUBSCRIPTION_STATUS', 'assinaturas', 'warning'),
  })

  const updateSubscriptionBillingMutation = useMutation({
    mutationFn: updateSubscriptionBilling,
    onSuccess: auditOwner('UPDATE_SUBSCRIPTION_BILLING', 'assinaturas'),
  })

  const updateContractMutation = useMutation({
    mutationFn: ({ contractId, content, summary, status }: { contractId: string; content: string; summary?: string; status?: string }) =>
      updateContract(contractId, content, summary, status),
    onSuccess: auditOwner('UPDATE_CONTRACT', 'contratos_plataforma'),
  })

  const regenerateContractMutation = useMutation({
    mutationFn: regenerateContract,
    onSuccess: auditOwner('REGENERATE_CONTRACT', 'contratos_plataforma'),
  })

  const deleteContractMutation = useMutation({
    mutationFn: deleteContract,
    onSuccess: auditOwner('DELETE_CONTRACT', 'contratos_plataforma', 'warning'),
  })

  const respondSupportMutation = useMutation({
    mutationFn: ({ ticketId, response, status }: { ticketId: string; response: string; status?: string }) =>
      respondSupportTicket(ticketId, response, status),
    onSuccess: auditOwner('RESPOND_SUPPORT_TICKET', 'support_tickets'),
  })

  const updateCompanySettingsMutation = useMutation({
    mutationFn: ({ empresaId, settings }: { empresaId: string; settings: Record<string, unknown> }) =>
      updateCompanySettings(empresaId, settings),
    onSuccess: auditOwner('UPDATE_COMPANY_SETTINGS', 'configuracoes_sistema'),
  })

  const setUserInactivityTimeoutMutation = useMutation({
    mutationFn: ({ userId, inactivityTimeoutMinutes }: { userId: string; inactivityTimeoutMinutes: number }) =>
      setUserInactivityTimeout(userId, inactivityTimeoutMinutes),
    onSuccess: auditOwner('SET_USER_INACTIVITY_TIMEOUT', 'profiles'),
  })

  const startImpersonationMutation = useMutation({
    mutationFn: ({ empresaId }: { empresaId: string }) => impersonateCompany(empresaId),
    onSuccess: auditOwner('START_IMPERSONATION', 'empresas', 'critical'),
  })

  const stopImpersonationMutation = useMutation({
    mutationFn: ({ empresaId, empresaNome, reason }: { empresaId?: string; empresaNome?: string; reason?: string }) =>
      stopImpersonation({ empresa_id: empresaId, empresa_nome: empresaNome, reason }),
    onSuccess: auditOwner('STOP_IMPERSONATION', 'empresas', 'warning'),
  })

  const createSystemAdminMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) => createSystemAdmin(userId),
    onSuccess: auditOwner('CREATE_SYSTEM_ADMIN', 'profiles', 'critical'),
  })

  const createPlatformOwnerMutation = useMutation({
    mutationFn: createPlatformOwner,
    onSuccess: auditOwner('CREATE_PLATFORM_OWNER', 'profiles', 'critical'),
  })

  const cleanupCompanyDataMutation = useMutation({
    mutationFn: cleanupCompanyData,
    onSuccess: auditOwner('CLEANUP_COMPANY_DATA', 'empresas', 'critical'),
  })

  const purgeTableDataMutation = useMutation({
    mutationFn: purgeTableData,
    onSuccess: auditOwner('PURGE_TABLE_DATA', 'empresas', 'critical'),
  })

  const deleteCompanyByOwnerMutation = useMutation({
    mutationFn: deleteCompanyByOwner,
    onSuccess: auditOwner('DELETE_COMPANY', 'empresas', 'critical'),
  })

  const customOwnerActionMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => callOwnerAdmin(payload),
    onSuccess: auditOwner('CUSTOM_OWNER_ACTION', 'owner_admin'),
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
    setUserInactivityTimeoutMutation,
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
*/
