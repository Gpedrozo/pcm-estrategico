// @ts-nocheck
import { supabase } from '@/integrations/supabase/client'

const db = supabase as any

export type OwnerAction =
  | 'list_companies'
  | 'block_company'
  | 'change_plan'
  | 'platform_stats'
  | 'create_system_admin'

export interface OwnerUser {
  id: string
  nome?: string
  email?: string
  ativo?: boolean
  ultimo_login_em?: string
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
  status?: string
  renewal_at?: string
  trial_ends_at?: string
  payment_status?: string
  updated_at?: string
}

export interface OwnerAuditLog {
  id: string
  actor_user_id?: string
  actor_email?: string
  action?: string
  table_name?: string
  record_id?: string
  metadata?: unknown
  source?: string
  severity?: string
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
  owner_notes?: string
  assigned_to?: string
  created_at?: string
  updated_at?: string
}

export async function callOwnerAdmin<T = unknown>(payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('owner-portal-admin', {
    body: payload,
  })

  if (error) throw error
  return data as T
}

export async function listPlatformCompanies() {
  return callOwnerAdmin<{ companies: Array<Record<string, unknown>> }>({ action: 'list_companies' })
}

export async function getPlatformStats() {
  return callOwnerAdmin<Record<string, unknown>>({ action: 'platform_stats' })
}

export async function listGlobalUsers(limit = 100): Promise<OwnerUser[]> {
  const { data, error } = await db
    .from('usuarios')
    .select('id,nome,email,ativo,ultimo_login_em,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as OwnerUser[]
}

export async function listPlans(): Promise<OwnerPlan[]> {
  const { data, error } = await db
    .from('plans')
    .select('id,code,name,description,user_limit,asset_limit,os_limit,storage_limit_mb,price_month,active,updated_at')
    .order('price_month', { ascending: true })

  if (error) throw error
  return (data ?? []) as OwnerPlan[]
}

export async function listSubscriptions(limit = 200): Promise<OwnerSubscription[]> {
  const { data, error } = await db
    .from('subscriptions')
    .select('id,empresa_id,plan_id,status,renewal_at,trial_ends_at,payment_status,updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as OwnerSubscription[]
}

export async function listAuditLogs(limit = 200): Promise<OwnerAuditLog[]> {
  const { data, error } = await db
    .from('audit_logs')
    .select('id,actor_user_id,actor_email,action,table_name,record_id,metadata,source,severity,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as OwnerAuditLog[]
}

export async function listSupportTickets(limit = 200): Promise<OwnerSupportTicket[]> {
  const { data, error } = await db
    .from('support_tickets')
    .select('id,empresa_id,requester_user_id,status,priority,subject,message,owner_notes,assigned_to,created_at,updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as OwnerSupportTicket[]
}
