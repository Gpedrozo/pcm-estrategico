import {
  TENANT_BASE_DOMAIN,
  TAB_CLOSE_MARKER_STORAGE_KEY,
  TAB_CLOSE_MARKER_MAX_AGE_MS,
  SESSION_TRANSFER_MAX_AGE_MS,
  SESSION_TRANSFER_REDIRECT_STORAGE_KEY,
  SESSION_TRANSFER_REDIRECT_MAX_AGE_MS,
  SESSION_TRANSFER_CONSUMED_STORAGE_KEY,
  SESSION_TRANSFER_PARAM,
  CROSS_DOMAIN_REDIRECT_MARKER_STORAGE_KEY,
  CROSS_DOMAIN_REDIRECT_MARKER_MAX_AGE_MS,
  LOGOUT_MARKER_PARAM,
  LOGOUT_REASON_PARAM,
  AUTH_REDIRECT_RETRY_STORAGE_KEY,
  AUTH_REDIRECT_RETRY_MAX,
} from '@/lib/authConstants';
import { getSessionTransferFromUrl } from '@/lib/sessionTransfer';

export function isTenantBaseDomain(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === TENANT_BASE_DOMAIN || normalized === `www.${TENANT_BASE_DOMAIN}`;
}

export function stripAuthHandoffFromUrl() {
  const queryParams = new URLSearchParams(window.location.search);
  queryParams.delete(LOGOUT_MARKER_PARAM);
  queryParams.delete(LOGOUT_REASON_PARAM);
  queryParams.delete(SESSION_TRANSFER_PARAM);
  queryParams.delete('st_access');
  queryParams.delete('st_refresh');
  queryParams.delete('st_issued');

  const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '');
  hashParams.delete('session_transfer');
  hashParams.delete('st_access');
  hashParams.delete('st_refresh');
  hashParams.delete('st_issued');

  const nextQuery = queryParams.toString();
  const nextHash = hashParams.toString();
  const cleanedUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${nextHash ? `#${nextHash}` : ''}`;
  window.history.replaceState({}, document.title, cleanedUrl);
}

export function getNavigationType(): string | null {
  try {
    const entry = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return entry?.type ?? null;
  } catch {
    return null;
  }
}

export function shouldForceLogoutByClosedWindowMarker() {
  try {
    const transfer = getSessionTransferFromUrl();
    if (transfer.token) {
      window.localStorage.removeItem(TAB_CLOSE_MARKER_STORAGE_KEY);
      return false;
    }

    const crossDomainRedirectRaw = window.localStorage.getItem(CROSS_DOMAIN_REDIRECT_MARKER_STORAGE_KEY);
    if (crossDomainRedirectRaw) {
      const parsed = JSON.parse(crossDomainRedirectRaw) as { at?: number };
      const markerAt = Number(parsed?.at ?? 0);
      window.localStorage.removeItem(CROSS_DOMAIN_REDIRECT_MARKER_STORAGE_KEY);
      if (Number.isFinite(markerAt) && markerAt > 0 && (Date.now() - markerAt) <= CROSS_DOMAIN_REDIRECT_MARKER_MAX_AGE_MS) {
        window.localStorage.removeItem(TAB_CLOSE_MARKER_STORAGE_KEY);
        return false;
      }
    }

    const navigationType = getNavigationType();
    if (navigationType === 'reload' || navigationType === 'back_forward') {
      return false;
    }

    const raw = window.localStorage.getItem(TAB_CLOSE_MARKER_STORAGE_KEY);
    if (!raw) return false;

    window.localStorage.removeItem(TAB_CLOSE_MARKER_STORAGE_KEY);

    const parsed = JSON.parse(raw) as { at?: number };
    const markerAt = Number(parsed?.at ?? 0);
    if (!Number.isFinite(markerAt) || markerAt <= 0) return false;

    return (Date.now() - markerAt) <= TAB_CLOSE_MARKER_MAX_AGE_MS;
  } catch {
    return false;
  }
}

export function markSessionTransferRedirectInProgress() {
  try {
    window.sessionStorage.setItem(
      SESSION_TRANSFER_REDIRECT_STORAGE_KEY,
      JSON.stringify({ at: Date.now() }),
    );
  } catch {
    // noop
  }
}

export function isSessionTransferRedirectInProgress() {
  try {
    const raw = window.sessionStorage.getItem(SESSION_TRANSFER_REDIRECT_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { at?: number };
    const markerAt = Number(parsed?.at ?? 0);
    if (!Number.isFinite(markerAt) || markerAt <= 0) {
      window.sessionStorage.removeItem(SESSION_TRANSFER_REDIRECT_STORAGE_KEY);
      return false;
    }
    if ((Date.now() - markerAt) > SESSION_TRANSFER_REDIRECT_MAX_AGE_MS) {
      window.sessionStorage.removeItem(SESSION_TRANSFER_REDIRECT_STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearSessionTransferRedirectInProgress() {
  try {
    window.sessionStorage.removeItem(SESSION_TRANSFER_REDIRECT_STORAGE_KEY);
  } catch {
    // noop
  }
}

export function isCrossDomainRedirectInProgress() {
  try {
    const raw = window.localStorage.getItem(CROSS_DOMAIN_REDIRECT_MARKER_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { at?: number };
    const markerAt = Number(parsed?.at ?? 0);
    if (!Number.isFinite(markerAt) || markerAt <= 0) {
      window.localStorage.removeItem(CROSS_DOMAIN_REDIRECT_MARKER_STORAGE_KEY);
      return false;
    }
    if ((Date.now() - markerAt) > CROSS_DOMAIN_REDIRECT_MARKER_MAX_AGE_MS) {
      window.localStorage.removeItem(CROSS_DOMAIN_REDIRECT_MARKER_STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function markConsumedSessionTransfer(encoded: string) {
  try {
    window.sessionStorage.setItem(
      SESSION_TRANSFER_CONSUMED_STORAGE_KEY,
      JSON.stringify({ encoded, at: Date.now() }),
    );
  } catch {
    // noop
  }
}

export function wasSessionTransferAlreadyConsumed(encoded: string) {
  try {
    const raw = window.sessionStorage.getItem(SESSION_TRANSFER_CONSUMED_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { encoded?: string; at?: number };
    const markerAt = Number(parsed?.at ?? 0);
    if (String(parsed?.encoded ?? '') !== encoded) return false;
    if (!Number.isFinite(markerAt) || markerAt <= 0) return false;
    return (Date.now() - markerAt) <= SESSION_TRANSFER_MAX_AGE_MS;
  } catch {
    return false;
  }
}

export function getRedirectRetryCount() {
  try {
    const raw = window.sessionStorage.getItem(AUTH_REDIRECT_RETRY_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { count?: number };
    const count = Number(parsed?.count ?? 0);
    return Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;
  } catch {
    return 0;
  }
}

export function markRedirectRetryAttempt() {
  const nextCount = getRedirectRetryCount() + 1;
  try {
    window.sessionStorage.setItem(
      AUTH_REDIRECT_RETRY_STORAGE_KEY,
      JSON.stringify({ count: nextCount, at: Date.now() }),
    );
  } catch {
    // noop
  }
  return nextCount;
}

export function clearRedirectRetryAttempts() {
  try {
    window.sessionStorage.removeItem(AUTH_REDIRECT_RETRY_STORAGE_KEY);
  } catch {
    // noop
  }
}

export function shouldBlockCrossDomainRedirect() {
  return getRedirectRetryCount() >= AUTH_REDIRECT_RETRY_MAX;
}

export function getRetryCountFromCurrentUrl() {
  try {
    const raw = new URLSearchParams(window.location.search).get('retry_count');
    const parsed = Number(raw ?? 0);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.trunc(parsed);
  } catch {
    return 0;
  }
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timer: number | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer !== null) {
      window.clearTimeout(timer);
    }
  }
}
