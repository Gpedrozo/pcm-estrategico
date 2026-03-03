import { supabase } from '@/integrations/supabase/client'

export type OwnerAction =
  | 'list_companies'
  | 'block_company'
  | 'change_plan'
  | 'platform_stats'
  | 'create_system_admin'

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

export async function listGlobalUsers(limit = 100) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id,nome,email,ativo,ultimo_login_em,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function listPlans() {
  const { data, error } = await supabase
    .from('plans')
    .select('id,code,name,description,user_limit,asset_limit,os_limit,storage_limit_mb,price_month,active,updated_at')
    .order('price_month', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function listSubscriptions(limit = 200) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id,empresa_id,plan_id,status,renewal_at,trial_ends_at,payment_status,updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function listAuditLogs(limit = 200) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id,actor_user_id,actor_email,action,table_name,record_id,metadata,source,severity,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function listSupportTickets(limit = 200) {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id,empresa_id,requester_user_id,status,priority,subject,message,owner_notes,assigned_to,created_at,updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}
