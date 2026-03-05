// @ts-nocheck
import { supabase } from '@/integrations/supabase/client'

export type OwnerAction =
  | 'dashboard'
  | 'list_companies'
  | 'create_company'
  | 'update_company'
  | 'set_company_status'
  | 'list_users'
  | 'create_user'
  | 'set_user_status'
  | 'list_plans'
  | 'create_plan'
  | 'update_plan'
  | 'list_subscriptions'
  | 'create_subscription'
  | 'set_subscription_status'
  | 'list_contracts'
  | 'update_contract'
  | 'regenerate_contract'
  | 'delete_contract'
  | 'list_support_tickets'
  | 'respond_support_ticket'
  | 'list_audit_logs'
  | 'get_company_settings'
  | 'update_company_settings'
  | 'block_company'
  | 'change_plan'
  | 'platform_stats'
  | 'create_system_admin'
  | 'impersonate_company'
  | 'stop_impersonation'

export interface OwnerCompany {
  id: string
  nome?: string
  slug?: string
  status?: string
  created_at?: string
  updated_at?: string
  dados_empresa?: {
    razao_social?: string
    nome_fantasia?: string
    cnpj?: string
  }[]
}

export interface OwnerUser {
  id: string
  nome?: string
  email?: string
  empresa_id?: string
  user_roles?: Array<{ role: string }>
  created_at?: string
}

export interface OwnerPlan {
  id: string
  code?: string
  name?: string
  description?: string
  user_limit?: number
  asset_limit?: number
  os_limit?: number
  storage_limit_mb?: number
  price_month?: number
  active?: boolean
  updated_at?: string
}

export interface OwnerSubscription {
  id: string
  empresa_id?: string
  plan_id?: string
  amount?: number
  payment_method?: string
  period?: string
  starts_at?: string
  ends_at?: string
  renewal_at?: string
  status?: string
  payment_status?: string
  plans?: { id: string; code?: string; name?: string; user_limit?: number } | null
  empresas?: { id: string; nome?: string } | null
  updated_at?: string
}

export interface OwnerAuditLog {
  id: string
  actor_id?: string
  action_type?: string
  table_name?: string
  operation?: string
  record_id?: string
  details?: unknown
  source?: string
  severity?: string
  empresa_id?: string
  created_at?: string
}

export interface OwnerSupportTicket {
  id: string
  empresa_id?: string
  requester_user_id?: string
  status?: string
  priority?: string
  subject?: string
  message?: string
  owner_response?: string
  owner_responder_id?: string
  responded_at?: string
  empresas?: { id: string; nome?: string } | null
  profiles?: { id: string; nome?: string; email?: string } | null
  created_at?: string
  updated_at?: string
}

export interface OwnerContract {
  id: string
  empresa_id?: string
  subscription_id?: string
  plan_id?: string
  content?: string
  generated_at?: string
  starts_at?: string
  ends_at?: string
  amount?: number
  payment_method?: string
  version?: number
  status?: string
  created_at?: string
  updated_at?: string
  empresas?: { id: string; nome?: string } | null
  plans?: { id: string; code?: string; name?: string } | null
}

export async function callOwnerAdmin<T = unknown>(payload: Record<string, unknown>) {
  const action = String(payload?.action ?? 'unknown_action')

  const extractProjectRefFromUrl = (url?: string | null) => {
    if (!url) return null
    try {
      return new URL(url).hostname.split('.')[0] || null
    } catch {
      return null
    }
  }

  const decodeJwtRef = (token?: string | null) => {
    if (!token) return null
    const tokenParts = token.split('.')
    if (tokenParts.length < 2) return null
    try {
      const base64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
      const decoded = atob(padded)
      const payload = JSON.parse(decoded) as Record<string, unknown>
      return (payload?.ref as string | undefined) ?? null
    } catch {
      return null
    }
  }

  const clearMismatchedAuthStorage = (expectedProjectRef?: string | null) => {
    if (typeof window === 'undefined') return
    try {
      const authTokenKeyPattern = /^sb-[a-z0-9]+-auth-token$/i
      for (const storageKey of Object.keys(window.localStorage)) {
        if (!authTokenKeyPattern.test(storageKey)) continue
        if (expectedProjectRef && storageKey.includes(`sb-${expectedProjectRef}-auth-token`)) continue
        window.localStorage.removeItem(storageKey)
      }

      if (!expectedProjectRef) {
        window.localStorage.removeItem('supabase.auth.token')
      }
    } catch {
    }
  }

  const invokeOwnerAdmin = async (accessToken?: string | null) => {
    return supabase.functions.invoke('owner-portal-admin', {
      body: payload,
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : undefined,
    })
  }

  const parseEdgeErrorMessage = async (error: unknown) => {
    const response = (error as any)?.context

    if (response) {
      try {
        if (typeof response.json === 'function') {
          const parsed = await response.json()
          const message = parsed?.error || parsed?.message || parsed?.details?.reason
          if (message) return String(message)
        }

        if (typeof response.text === 'function') {
          const rawText = await response.text()
          if (rawText) {
            try {
              const parsedText = JSON.parse(rawText)
              const messageFromText = parsedText?.error || parsedText?.message || parsedText?.details?.reason
              if (messageFromText) return String(messageFromText)
            } catch {
              return String(rawText)
            }
          }
        }
      } catch {
      }
    }

    return String((error as any)?.message || '')
  }

  const isJwtError = (message: string) => {
    const normalized = message.toLowerCase()
    return normalized.includes('invalid jwt') ||
      normalized.includes('invalid token') ||
      normalized.includes('jwt expired') ||
      normalized.includes('token has expired') ||
      normalized.includes('missing bearer token')
  }

  const invoke = async (allowRetry: boolean): Promise<T> => {
    const expectedProjectRef = extractProjectRefFromUrl((supabase as any)?.supabaseUrl as string | undefined)
    const { data: sessionData } = await supabase.auth.getSession()
    const currentToken = sessionData?.session?.access_token ?? null

    if (!currentToken) {
      clearMismatchedAuthStorage(expectedProjectRef)
      throw new Error('Sessão expirada ou inválida. Faça login novamente no Owner Portal.')
    }

    const currentTokenRef = decodeJwtRef(currentToken)
    if (!currentTokenRef || (expectedProjectRef && currentTokenRef !== expectedProjectRef)) {
      clearMismatchedAuthStorage(expectedProjectRef)
      await supabase.auth.signOut()
      throw new Error('Sessão inválida para este ambiente. Faça login novamente no Owner Portal.')
    }

    const { data, error } = await invokeOwnerAdmin(currentToken)

    if (!error) return data as T

    const parsedMessage = await parseEdgeErrorMessage(error)

    if (allowRetry && isJwtError(parsedMessage)) {
      if (sessionData?.session) {
        const { error: refreshError } = await supabase.auth.refreshSession()
        if (!refreshError) {
          const { data: refreshedSessionData } = await supabase.auth.getSession()
          const refreshedToken = refreshedSessionData?.session?.access_token ?? null

          if (!refreshedToken) {
            clearMismatchedAuthStorage(expectedProjectRef)
            await supabase.auth.signOut()
            throw new Error('Sessão expirada ou inválida. Faça login novamente no Owner Portal.')
          }

          const refreshedTokenRef = decodeJwtRef(refreshedToken)
          if (!refreshedTokenRef || (expectedProjectRef && refreshedTokenRef !== expectedProjectRef)) {
            clearMismatchedAuthStorage(expectedProjectRef)
            await supabase.auth.signOut()
            throw new Error('Sessão inválida para este ambiente. Faça login novamente no Owner Portal.')
          }

          const retryResponse = await invokeOwnerAdmin(refreshedToken)

          if (!retryResponse.error) {
            return retryResponse.data as T
          }

          const retryMessage = await parseEdgeErrorMessage(retryResponse.error)
          throw new Error(retryMessage || 'Sessão atualizada, mas a requisição ainda falhou.')
        }
      }

      clearMismatchedAuthStorage(expectedProjectRef)
      await supabase.auth.signOut()
      throw new Error('Sessão expirada ou inválida. Faça login novamente no Owner Portal.')
    }

    if (parsedMessage.includes('non-2xx')) {
      throw new Error(`Falha na ação ${action}. O backend retornou erro sem detalhe; tente novamente e, se persistir, verifique logs da edge function owner-portal-admin.`)
    }

    throw new Error(parsedMessage || 'Falha ao processar requisição no owner portal.')
  }

  return invoke(true)
}

export async function listPlatformCompanies() {
  return callOwnerAdmin<{ companies: OwnerCompany[] }>({ action: 'list_companies' })
}

export async function getPlatformStats() {
  return callOwnerAdmin<Record<string, unknown>>({ action: 'dashboard' })
}

export async function createCompany(payload: {
  company: {
    nome: string
    slug?: string
    razao_social?: string
    nome_fantasia?: string
    cnpj?: string
    endereco?: string
    telefone?: string
    email?: string
    responsavel?: string
    segmento?: string
    status?: string
  }
  user: {
    nome: string
    email: string
    password?: string
    role: string
  }
  subscription?: {
    plan_id: string
    amount?: number
    payment_method?: string
    period?: 'monthly' | 'quarterly' | 'yearly' | 'custom'
    starts_at?: string
    ends_at?: string | null
    renewal_at?: string | null
    status?: 'ativa' | 'atrasada' | 'cancelada' | 'teste'
    payment_status?: string
  }
}) {
  return callOwnerAdmin({ action: 'create_company', ...payload })
}

export async function updateCompany(empresaId: string, company: Record<string, unknown>) {
  return callOwnerAdmin({ action: 'update_company', empresa_id: empresaId, company })
}

export async function setCompanyStatus(empresaId: string, status: string, reason?: string) {
  return callOwnerAdmin({ action: 'set_company_status', empresa_id: empresaId, status, reason })
}

export async function listGlobalUsers(empresaId?: string): Promise<OwnerUser[]> {
  const data = await callOwnerAdmin<{ users: OwnerUser[] }>({ action: 'list_users', empresa_id: empresaId ?? null })
  return data.users ?? []
}

export async function listPlans(): Promise<OwnerPlan[]> {
  const data = await callOwnerAdmin<{ plans: OwnerPlan[] }>({ action: 'list_plans' })
  return data.plans ?? []
}

export async function createPlan(plan: Record<string, unknown>) {
  return callOwnerAdmin({ action: 'create_plan', plan })
}

export async function updatePlan(plan: Record<string, unknown>) {
  return callOwnerAdmin({ action: 'update_plan', plan })
}

export async function listSubscriptions(): Promise<OwnerSubscription[]> {
  const data = await callOwnerAdmin<{ subscriptions: OwnerSubscription[] }>({ action: 'list_subscriptions' })
  return data.subscriptions ?? []
}

export async function createSubscription(subscription: Record<string, unknown>) {
  return callOwnerAdmin({ action: 'create_subscription', subscription })
}

export async function setSubscriptionStatus(empresaId: string, status: string) {
  return callOwnerAdmin({ action: 'set_subscription_status', empresa_id: empresaId, status })
}

export async function createUser(user: Record<string, unknown>) {
  return callOwnerAdmin({ action: 'create_user', user })
}

export async function setUserStatus(userId: string, status: string) {
  return callOwnerAdmin({ action: 'set_user_status', user_id: userId, status })
}

export async function listAuditLogs(filters?: Record<string, unknown>): Promise<OwnerAuditLog[]> {
  const data = await callOwnerAdmin<{ logs: OwnerAuditLog[] }>({ action: 'list_audit_logs', filters: filters ?? {} })
  return data.logs ?? []
}

export async function listSupportTickets(): Promise<OwnerSupportTicket[]> {
  const data = await callOwnerAdmin<{ tickets: OwnerSupportTicket[] }>({ action: 'list_support_tickets' })
  return data.tickets ?? []
}

export async function respondSupportTicket(ticketId: string, response: string, status = 'resolvido') {
  return callOwnerAdmin({ action: 'respond_support_ticket', ticket_id: ticketId, response, status })
}

export async function listContracts(): Promise<OwnerContract[]> {
  const data = await callOwnerAdmin<{ contracts: OwnerContract[] }>({ action: 'list_contracts' })
  return data.contracts ?? []
}

export async function updateContract(contractId: string, content: string, summary?: string, status?: string) {
  return callOwnerAdmin({ action: 'update_contract', contract_id: contractId, content, summary, status })
}

export async function regenerateContract(contractId: string) {
  return callOwnerAdmin({ action: 'regenerate_contract', contract_id: contractId })
}

export async function deleteContract(contractId: string) {
  return callOwnerAdmin({ action: 'delete_contract', contract_id: contractId })
}

export async function getCompanySettings(empresaId: string) {
  return callOwnerAdmin<{ settings: Array<{ chave: string; valor: Record<string, unknown> }> }>({
    action: 'get_company_settings',
    empresa_id: empresaId,
  })
}

export async function updateCompanySettings(
  empresaId: string,
  settings: {
    modules?: Record<string, boolean>
    limits?: Record<string, number>
    features?: Record<string, boolean>
  },
) {
  return callOwnerAdmin({ action: 'update_company_settings', empresa_id: empresaId, settings })
}

export async function impersonateCompany(empresaId: string) {
  return callOwnerAdmin<{
    success: boolean
    impersonation?: {
      empresa_id: string
      empresa_nome?: string | null
      company_status?: string | null
      issued_at?: string
      expires_at?: string
    }
  }>({ action: 'impersonate_company', empresa_id: empresaId })
}

export async function stopImpersonation(params?: { empresa_id?: string; empresa_nome?: string; reason?: string }) {
  return callOwnerAdmin<{ success: boolean }>({
    action: 'stop_impersonation',
    empresa_id: params?.empresa_id,
    empresa_nome: params?.empresa_nome,
    reason: params?.reason,
  })
}
