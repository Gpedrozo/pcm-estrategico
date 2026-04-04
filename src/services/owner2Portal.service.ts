import { supabase } from '@/integrations/supabase/client'

export type Owner2Action =
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
  | 'move_user_company'
  | 'set_user_password'
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
  | 'set_user_inactivity_timeout'
  | 'change_plan'
  | 'create_system_admin'
  | 'impersonate_company'
  | 'stop_impersonation'
  | 'validate_impersonation'
  | 'list_platform_owners'
  | 'create_platform_owner'
  | 'list_database_tables'
  | 'cleanup_company_data'
  | 'purge_table_data'
  | 'delete_user'
  | 'delete_company'
  | 'asaas_link_subscription'
  | 'asaas_sync_subscription'
  | 'list_subscription_payments'
  | 'enforce_subscription_expiry'

export type Owner2Payload = {
  action: Owner2Action
  [key: string]: unknown
}

async function parseInvokeError(error: unknown) {
  const unsafe = error as { context?: unknown; message?: unknown } | null
  if (!unsafe) return 'Falha desconhecida na execução do Owner2.'

  const context = unsafe.context as { json?: () => Promise<unknown>; text?: () => Promise<string>; status?: number; statusText?: string } | undefined
  const status = Number(context?.status ?? 0)
  const statusText = String(context?.statusText ?? '').trim()
  const prefix = Number.isFinite(status) && status > 0
    ? `${statusText ? `HTTP ${status} ${statusText}` : `HTTP ${status}`}: `
    : ''

  try {
    if (context && typeof context.json === 'function') {
      const data = await context.json() as { error?: string; message?: string; details?: { reason?: string } }
      const message = String(data?.error ?? data?.message ?? data?.details?.reason ?? '').trim()
      if (message) return `${prefix}${message}`
    }
  } catch {
    // noop
  }

  try {
    if (context && typeof context.text === 'function') {
      const raw = String(await context.text()).trim()
      if (raw) return `${prefix}${raw}`
    }
  } catch {
    // noop
  }

  const direct = String(unsafe.message ?? '').trim()
  if (direct) return `${prefix}${direct}`
  return `${prefix}Falha desconhecida na execução do Owner2.`
}

function isUnauthorizedInvokeError(error: unknown) {
  const unsafe = error as { context?: unknown; message?: unknown } | null;
  const context = unsafe?.context as { status?: number } | undefined;
  const status = Number(context?.status ?? 0);
  if (status === 401) return true;

  const message = String(unsafe?.message ?? '').toLowerCase();
  return message.includes('401') || message.includes('unauthorized');
}

async function invokeWithAccessToken<T = unknown>(payload: Owner2Payload, accessToken: string) {
  const { data, error } = await supabase.functions.invoke('owner-portal-admin', {
    body: payload,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    throw error;
  }

  const response = data as { success?: boolean; error?: string };
  if (response?.success === false && response?.error) {
    throw new Error(response.error);
  }

  return data as T;
}

export async function invokeOwner2<T = unknown>(payload: Owner2Payload): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  let accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      throw new Error('Sessão expirada. Faça login novamente para acessar o Owner2.');
    }
    accessToken = refreshed.session?.access_token;
  }

  if (!accessToken) {
    throw new Error('Sessão expirada. Faça login novamente para acessar o Owner2.');
  }

  try {
    return await invokeWithAccessToken<T>(payload, accessToken);
  } catch (error) {
    if (!isUnauthorizedInvokeError(error)) {
      const message = await parseInvokeError(error);
      throw new Error(message);
    }

    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session?.access_token) {
      throw new Error('Sessão expirada. Faça login novamente para acessar o Owner2.');
    }

    try {
      return await invokeWithAccessToken<T>(payload, refreshed.session.access_token);
    } catch (retryError) {
      const message = await parseInvokeError(retryError);
      throw new Error(message);
    }
  }
}
