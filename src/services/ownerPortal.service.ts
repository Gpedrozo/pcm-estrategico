import { supabase } from '@/integrations/supabase/client'

export type OwnerAction =
  | 'health_check'
  | 'dashboard'
  | 'platform_stats'
  | 'list_companies'
  | 'create_company'
  | 'update_company'
  | 'set_company_status'
  | 'block_company'
  | 'list_users'
  | 'create_user'
  | 'set_user_status'
  | 'list_plans'
  | 'create_plan'
  | 'update_plan'
  | 'list_subscriptions'
  | 'create_subscription'
  | 'set_subscription_status'
  | 'update_subscription_billing'
  | 'list_contracts'
  | 'update_contract'
  | 'regenerate_contract'
  | 'delete_contract'
  | 'list_support_tickets'
  | 'respond_support_ticket'
  | 'list_audit_logs'
  | 'get_company_settings'
  | 'update_company_settings'
  | 'change_plan'
  | 'create_system_admin'
  | 'impersonate_company'
  | 'stop_impersonation'
  | 'list_platform_owners'
  | 'create_platform_owner'
  | 'list_database_tables'
  | 'cleanup_company_data'
  | 'purge_table_data'
  | 'delete_company'

export interface OwnerCompany {
  id: string
  nome?: string | null
  slug?: string | null
  status?: string | null
}

export interface OwnerUser {
  id: string
  nome?: string | null
  email?: string | null
  empresa_id?: string | null
  status?: 'ativo' | 'inativo' | string
}

export interface OwnerPlan {
  id: string
  code?: string | null
  name?: string | null
  description?: string | null
  user_limit?: number | null
  module_flags?: Record<string, unknown> | null
  data_limit_mb?: number | null
  premium_features?: unknown[] | null
  company_limit?: number | null
  price_month?: number | null
  active?: boolean | null
}

export interface OwnerSubscription {
  id: string
  empresa_id?: string | null
  plan_id?: string | null
  amount?: number | null
  status?: string | null
  payment_status?: string | null
  payment_method?: string | null
  starts_at?: string | null
  ends_at?: string | null
  renewal_at?: string | null
}

export interface OwnerAuditLog {
  id: string
  action_type?: string | null
  source?: string | null
  severity?: string | null
  empresa_id?: string | null
  created_at?: string | null
  details?: Record<string, unknown> | null
}

export interface OwnerSupportTicket {
  id: string
  empresa_id?: string | null
  status?: string | null
  priority?: string | null
  subject?: string | null
  message?: string | null
  owner_response?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface OwnerContract {
  id: string
  empresa_id?: string | null
  plan_id?: string | null
  status?: string | null
  content?: string | null
  summary?: string | null
  amount?: number | null
  starts_at?: string | null
  ends_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface PlatformOwnerRow {
  user_id: string
  empresa_id?: string | null
  role?: string | null
  profile?: {
    id?: string
    nome?: string
    email?: string
    empresa_id?: string
  } | null
}

export interface OwnerDatabaseTable {
  table_name: string
  total_rows: number
  has_empresa_id: boolean
}

export interface OwnerBackendHealth {
  service: string
  status: 'ok' | string
  version: string
  supported_actions: OwnerAction[]
  timestamp: string
}

export interface OwnerActionPayload {
  action: OwnerAction
  [key: string]: unknown
}

export interface OwnerApiResponse<T = unknown> {
  success?: boolean
  error?: string
  details?: unknown
  data?: T
  [key: string]: unknown
}

export interface OwnerErrorResponse {
  success: false
  error: string
  details?: unknown
  trace_id?: string
}

export const isOwnerActionPayload = (value: unknown): value is OwnerActionPayload => {
  if (!value || typeof value !== 'object') return false
  const action = (value as Record<string, unknown>).action
  return typeof action === 'string' && action.length > 0
}

export const isOwnerErrorResponse = (value: unknown): value is OwnerErrorResponse => {
  if (!value || typeof value !== 'object') return false
  const maybe = value as Record<string, unknown>
  return maybe.success === false && typeof maybe.error === 'string'
}

const isUnsupportedActionMessage = (value: unknown) => {
  const msg = String(value ?? '').toLowerCase()
  return msg.includes('unsupported action') || msg.includes('missing action')
}

const isMissingTableMessage = (value: unknown) => {
  const msg = String(value ?? '').toLowerCase()
  return msg.includes('could not find the table') || msg.includes('does not exist') || msg.includes('schema cache')
}

const isEmpresaForeignKeyMessage = (value: unknown) => {
  const msg = String(value ?? '').toLowerCase()
  return msg.includes('violates foreign key constraint') && msg.includes('empresa')
}

const parseErrorMessage = async (error: unknown) => {
  const unsafeError = error as { context?: unknown; message?: unknown } | null
  if (!unsafeError) return 'Falha desconhecida ao executar operação Owner.'
  const context = unsafeError?.context

  const status = Number((context as any)?.status)
  const statusText = String((context as any)?.statusText ?? '').trim()
  const withStatus = (message: string) => {
    if (!Number.isFinite(status) || status <= 0) return message
    const prefix = statusText ? `HTTP ${status} ${statusText}` : `HTTP ${status}`
    return message ? `${prefix}: ${message}` : prefix
  }

  if (context) {
    try {
      const jsonReader = typeof context.clone === 'function' ? context.clone() : context
      if (typeof jsonReader.json === 'function') {
        const json = await jsonReader.json()
        const msg = String(json?.error ?? json?.message ?? json?.details?.reason ?? '').trim()
        if (msg) return withStatus(msg)
      }
    } catch {
      // Ignore parse error and continue fallback.
    }

    try {
      const textReader = typeof context.clone === 'function' ? context.clone() : context
      if (typeof textReader.text === 'function') {
        const txt = String(await textReader.text()).trim()
        if (txt) {
          try {
            const parsed = JSON.parse(txt)
            const parsedMsg = String(parsed?.error ?? parsed?.message ?? parsed?.details?.reason ?? '').trim()
            if (parsedMsg) return withStatus(parsedMsg)
          } catch {
            return withStatus(txt)
          }
        }
      }
    } catch {
      // Ignore parse error and continue fallback.
    }
  }

  const direct = String(unsafeError?.message ?? '').trim()
  if (direct) return withStatus(direct)

  return withStatus('Falha desconhecida ao executar operação Owner.')
}

export async function callOwnerAdmin<T = unknown>(payload: OwnerActionPayload) {
  if (!isOwnerActionPayload(payload)) {
    throw new Error('Payload owner inválido: action obrigatória.')
  }

  const { data: sessionResult } = await supabase.auth.getSession()
  const token = sessionResult?.session?.access_token

  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente para continuar.')
  }

  const { data, error } = await supabase.functions.invoke('owner-portal-admin', {
    body: payload,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (error) {
    const message = await parseErrorMessage(error)
    throw new Error(message)
  }

  if (isOwnerErrorResponse(data)) {
    throw new Error(data.error)
  }

  return data as T
}

export async function listPlatformCompanies() {
  return callOwnerAdmin<{ companies: OwnerCompany[] }>({ action: 'list_companies' })
}

export async function getPlatformStats() {
  return callOwnerAdmin<Record<string, unknown>>({ action: 'dashboard' })
}

export async function createCompany(payload: {
  company: Record<string, unknown>
  user: Record<string, unknown>
  subscription?: Record<string, unknown>
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
  return Array.isArray(data?.users) ? data.users : []
}

export async function createUser(user: Record<string, unknown>) {
  return callOwnerAdmin({ action: 'create_user', user })
}

export async function setUserStatus(userId: string, status: string) {
  return callOwnerAdmin({ action: 'set_user_status', user_id: userId, status })
}

export async function listPlans(): Promise<OwnerPlan[]> {
  const data = await callOwnerAdmin<{ plans: OwnerPlan[] }>({ action: 'list_plans' })
  return Array.isArray(data?.plans) ? data.plans : []
}

export async function createPlan(plan: Record<string, unknown>) {
  return callOwnerAdmin({ action: 'create_plan', plan })
}

export async function updatePlan(plan: Record<string, unknown>) {
  return callOwnerAdmin({ action: 'update_plan', plan })
}

export async function listSubscriptions(limit = 500): Promise<OwnerSubscription[]> {
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(2000, Math.trunc(Number(limit)))) : 500
  const data = await callOwnerAdmin<{ subscriptions: OwnerSubscription[] }>({ action: 'list_subscriptions', limit: safeLimit })
  return Array.isArray(data?.subscriptions) ? data.subscriptions : []
}

export async function createSubscription(subscription: Record<string, unknown>) {
  return callOwnerAdmin({ action: 'create_subscription', subscription })
}

export async function setSubscriptionStatus(empresaId: string, status: string) {
  return callOwnerAdmin({ action: 'set_subscription_status', empresa_id: empresaId, status })
}

export async function updateSubscriptionBilling(params: {
  subscriptionId?: string
  empresaId?: string
  billing: Record<string, unknown>
}) {
  return callOwnerAdmin({
    action: 'update_subscription_billing',
    subscription_id: params.subscriptionId,
    empresa_id: params.empresaId,
    billing: params.billing,
  })
}

export async function listContracts(): Promise<OwnerContract[]> {
  const data = await callOwnerAdmin<{ contracts: OwnerContract[] }>({ action: 'list_contracts' })
  return Array.isArray(data?.contracts) ? data.contracts : []
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

export async function listSupportTickets(): Promise<OwnerSupportTicket[]> {
  const data = await callOwnerAdmin<{ tickets: OwnerSupportTicket[] }>({ action: 'list_support_tickets' })
  return Array.isArray(data?.tickets) ? data.tickets : []
}

export async function respondSupportTicket(ticketId: string, response: string, status = 'resolvido') {
  return callOwnerAdmin({ action: 'respond_support_ticket', ticket_id: ticketId, response, status })
}

export async function listAuditLogs(filters?: Record<string, unknown>): Promise<OwnerAuditLog[]> {
  const data = await callOwnerAdmin<{ logs: OwnerAuditLog[] }>({ action: 'list_audit_logs', filters: filters ?? {} })
  return Array.isArray(data?.logs) ? data.logs : []
}

export async function getCompanySettings(empresaId: string) {
  return callOwnerAdmin<{ settings: Array<{ chave: string; valor: Record<string, unknown> }> }>({
    action: 'get_company_settings',
    empresa_id: empresaId,
  })
}

export async function updateCompanySettings(empresaId: string, settings: Record<string, unknown>) {
  return callOwnerAdmin({ action: 'update_company_settings', empresa_id: empresaId, settings })
}

export async function changePlan(params: { empresa_id: string; plano_codigo: string }) {
  return callOwnerAdmin({ action: 'change_plan', ...params })
}

export async function createSystemAdmin(userId: string) {
  return callOwnerAdmin({ action: 'create_system_admin', user_id: userId })
}

export async function impersonateCompany(empresaId: string) {
  return callOwnerAdmin({ action: 'impersonate_company', empresa_id: empresaId })
}

export async function stopImpersonation(params?: { empresa_id?: string; empresa_nome?: string; reason?: string }) {
  return callOwnerAdmin({ action: 'stop_impersonation', ...params })
}

export async function listPlatformOwners(): Promise<PlatformOwnerRow[]> {
  const data = await callOwnerAdmin<{ owners: PlatformOwnerRow[] }>({ action: 'list_platform_owners' })
  return Array.isArray(data?.owners) ? data.owners : []
}

export async function createPlatformOwner(payload: {
  nome: string
  email: string
  password?: string
  role?: string
}) {
  return callOwnerAdmin({
    action: 'create_platform_owner',
    owner_user: {
      nome: payload.nome,
      email: payload.email,
      password: payload.password,
      role: payload.role ?? 'SYSTEM_ADMIN',
    },
  })
}

export async function listDatabaseTables(empresaId?: string | null): Promise<OwnerDatabaseTable[]> {
  try {
    const data = await callOwnerAdmin<{ tables: OwnerDatabaseTable[] }>({ action: 'list_database_tables', empresa_id: empresaId ?? null })
    return Array.isArray(data?.tables) ? data.tables : []
  } catch (err: any) {
    const msg = String(err?.message ?? err ?? '')
    if (!isUnsupportedActionMessage(msg)) {
      throw err
    }

    // Fallback para ambientes com edge function legada sem a action list_database_tables.
    const { data: rows, error } = await supabase.rpc('owner_list_database_tables' as any, {
      p_empresa_id: empresaId ?? null,
    })
    if (error) {
      throw new Error(`Falha ao listar tabelas via fallback RPC: ${error.message}`)
    }

    const parsed = (Array.isArray(rows) ? rows : []).map((row: any) => ({
      table_name: String(row?.table_name ?? ''),
      total_rows: Number(row?.total_rows ?? 0),
      has_empresa_id: Boolean(row?.has_empresa_id),
    })).filter((row) => row.table_name)

    return parsed
  }
}

export async function getOwnerBackendHealth(): Promise<OwnerBackendHealth> {
  try {
    return await callOwnerAdmin<OwnerBackendHealth>({ action: 'health_check' })
  } catch (err: any) {
    const msg = String(err?.message ?? err ?? '').toLowerCase()
    if (isUnsupportedActionMessage(msg)) {
      return {
        service: 'owner-portal-admin',
        status: 'ok',
        version: 'legacy-v1-fallback',
        supported_actions: [
          'dashboard',
          'platform_stats',
          'list_companies',
          'list_users',
          'list_plans',
          'list_subscriptions',
          'list_contracts',
          'list_support_tickets',
          'list_audit_logs',
          'get_company_settings',
        ],
        timestamp: new Date().toISOString(),
      }
    }
    throw err
  }
}

export async function cleanupCompanyData(payload: {
  empresa_id: string
  keep_company_core?: boolean
  keep_billing_data?: boolean
  include_auth_users?: boolean
  auth_password: string
}) {
  return callOwnerAdmin({ action: 'cleanup_company_data', ...payload })
}

export async function purgeTableData(payload: {
  table_name: string
  empresa_id?: string
  auth_password: string
}) {
  return callOwnerAdmin({ action: 'purge_table_data', ...payload })
}

export async function deleteCompanyByOwner(payload: {
  empresa_id: string
  include_auth_users?: boolean
  auth_password: string
}) {
  const health = await getOwnerBackendHealth().catch(() => null)
  const supported = new Set(Array.isArray(health?.supported_actions) ? health.supported_actions : [])
  if (supported.size > 0 && !supported.has('delete_company' as OwnerAction)) {
    throw new Error('Acao delete_company indisponivel no backend owner. Atualize a edge function owner-portal-admin antes de excluir empresas.')
  }

  // Operacao destrutiva deve ocorrer apenas no backend owner-portal-admin.
  return callOwnerAdmin({ action: 'delete_company', ...payload })
}
