import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  callOwnerAdmin,
  getPlatformStats,
  listAuditLogs,
  listGlobalUsers,
  listPlans,
  listPlatformCompanies,
  listSubscriptions,
  listSupportTickets,
} from '@/services/ownerPortal.service'

export function useOwnerStats() {
  return useQuery({
    queryKey: ['owner', 'stats'],
    queryFn: getPlatformStats,
    staleTime: 30_000,
  })
}

export function useOwnerCompanies() {
  return useQuery({
    queryKey: ['owner', 'companies'],
    queryFn: listPlatformCompanies,
    staleTime: 30_000,
  })
}

export function useOwnerUsers() {
  return useQuery({
    queryKey: ['owner', 'users'],
    queryFn: () => listGlobalUsers(500),
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

export function useOwnerAuditLogs() {
  return useQuery({
    queryKey: ['owner', 'audit-logs'],
    queryFn: () => listAuditLogs(300),
    staleTime: 15_000,
  })
}

export function useOwnerSupportTickets() {
  return useQuery({
    queryKey: ['owner', 'support-tickets'],
    queryFn: () => listSupportTickets(300),
    staleTime: 15_000,
  })
}

export function useOwnerCompanyActions() {
  const qc = useQueryClient()

  const blockCompany = useMutation({
    mutationFn: (params: { empresa_id: string; reason?: string }) =>
      callOwnerAdmin({ action: 'block_company', ...params }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'companies'] }),
  })

  const changePlan = useMutation({
    mutationFn: (params: { empresa_id: string; plano_codigo: string }) =>
      callOwnerAdmin({ action: 'change_plan', ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'companies'] })
      qc.invalidateQueries({ queryKey: ['owner', 'subscriptions'] })
    },
  })

  return { blockCompany, changePlan }
}
