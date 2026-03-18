import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const SESSION_TRANSFER_PARAM = 'session_transfer';
const SESSION_LOOKUP_RETRIES = 5;
const SESSION_LOOKUP_DELAY_MS = 220;
const SESSION_TRANSFER_CREATE_RETRIES = 3;

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function resolveActiveSession(initialSession: Session | null): Promise<Session | null> {
  let current = initialSession;

  if (current?.access_token && current?.refresh_token) {
    return current;
  }

  for (let attempt = 0; attempt < SESSION_LOOKUP_RETRIES; attempt += 1) {
    if (attempt > 0) {
      await sleep(SESSION_LOOKUP_DELAY_MS);
    }

    const { data } = await supabase.auth.getSession();
    const candidate = data?.session ?? null;
    if (candidate?.access_token && candidate?.refresh_token) {
      return candidate;
    }
  }

  return null;
}

export async function createSessionTransferCode(sessionData: Session | null, targetHost: string): Promise<string | null> {
  const normalizedTargetHost = String(targetHost || '').trim().toLowerCase();
  let activeSession = await resolveActiveSession(sessionData);

  if (!activeSession?.access_token || !activeSession?.refresh_token) {
    logger.warn('session_transfer_create_missing_active_session', {
      targetHost: normalizedTargetHost,
    });
    return null;
  }

  for (let attempt = 1; attempt <= SESSION_TRANSFER_CREATE_RETRIES; attempt += 1) {
    const { data, error } = await supabase.functions.invoke('session-transfer', {
      headers: {
        Authorization: `Bearer ${activeSession.access_token}`,
        'x-allow-password-change': '1',
      },
      body: {
        action: 'create',
        access_token: activeSession.access_token,
        refresh_token: activeSession.refresh_token,
        target_host: normalizedTargetHost,
        ttl_seconds: 45,
      },
    });

    if (!error) {
      const code = String((data as { code?: string } | null)?.code ?? '').trim();
      if (code) {
        logger.info('session_transfer_create_success', {
          targetHost: normalizedTargetHost,
          attempt,
        });
        return code;
      }
    }

    logger.warn('session_transfer_create_failed', {
      targetHost: normalizedTargetHost,
      attempt,
      error: error?.message ?? 'empty code',
    });

    if (attempt < SESSION_TRANSFER_CREATE_RETRIES) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      const refreshedSession = refreshed?.session ?? null;
      if (refreshedSession?.access_token && refreshedSession?.refresh_token) {
        activeSession = refreshedSession;
      }
      await sleep(150 * attempt);
    }
  }

  return null;
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
