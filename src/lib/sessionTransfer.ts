import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const SESSION_TRANSFER_PARAM = 'session_transfer';

export async function createSessionTransferCode(sessionData: Session | null, targetHost: string): Promise<string | null> {
  if (!sessionData?.access_token || !sessionData?.refresh_token) return null;

  const { data, error } = await supabase.functions.invoke('session-transfer', {
    headers: {
      Authorization: `Bearer ${sessionData.access_token}`,
      'x-allow-password-change': '1',
    },
    body: {
      action: 'create',
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token,
      target_host: String(targetHost || '').trim().toLowerCase(),
      ttl_seconds: 45,
    },
  });

  if (error) {
    logger.warn('session_transfer_create_failed', { error: error.message });
    return null;
  }

  const code = String((data as { code?: string } | null)?.code ?? '').trim();
  if (code) {
    logger.info('session_transfer_create_success', {
      targetHost: String(targetHost || '').trim().toLowerCase(),
    });
  }
  return code || null;
}

export async function createSessionTransferHash(sessionData: Session | null, targetHost: string): Promise<string | null> {
  const transferCode = await createSessionTransferCode(sessionData, targetHost);
  if (transferCode) {
    return `${SESSION_TRANSFER_PARAM}=${encodeURIComponent(transferCode)}`;
  }

  logger.warn('session_transfer_missing_token_abort_redirect', {
    targetHost: String(targetHost || '').trim().toLowerCase(),
  });
  return null;
}

export function getSessionTransferFromUrl() {
  const searchParams = new URLSearchParams(window.location.search);
  const queryValue = String(searchParams.get(SESSION_TRANSFER_PARAM) ?? '').trim();
  if (queryValue) {
    return { token: queryValue, source: 'query' as const };
  }

  const rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  if (!rawHash) return { token: null, source: null as const };
  const hashParams = new URLSearchParams(rawHash);
  const hashValue = String(hashParams.get(SESSION_TRANSFER_PARAM) ?? '').trim();
  if (hashValue) {
    return { token: hashValue, source: 'hash' as const };
  }

  return { token: null, source: null as const };
}

export async function consumeSessionTransferCode(code: string, targetHost: string): Promise<{ access_token: string; refresh_token: string; issued_at: number } | null> {
  const normalizedCode = String(code || '').trim();
  if (!normalizedCode) return null;

  logger.info('session_transfer_consume_attempt', {
    targetHost: String(targetHost || '').trim().toLowerCase(),
  });

  const { data, error } = await supabase.functions.invoke('session-transfer', {
    body: {
      action: 'consume',
      code: normalizedCode,
      target_host: String(targetHost || '').trim().toLowerCase(),
    },
  });

  if (error) {
    logger.warn('session_transfer_consume_code_failed', { error: error.message });
    return null;
  }

  const payload = data as { access_token?: string; refresh_token?: string; issued_at?: number } | null;
  const access_token = String(payload?.access_token ?? '').trim();
  const refresh_token = String(payload?.refresh_token ?? '').trim();
  const issued_at = Number(payload?.issued_at ?? 0);

  if (!access_token || !refresh_token || !Number.isFinite(issued_at)) {
    return null;
  }

  logger.info('session_transfer_consume_success', {
    targetHost: String(targetHost || '').trim().toLowerCase(),
  });

  return { access_token, refresh_token, issued_at };
}
