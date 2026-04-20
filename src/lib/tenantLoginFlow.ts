const TENANT_BASE_DOMAIN = (import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gppis.com.br').toLowerCase();

export const AUTH_RETRY_COUNT_PARAM = 'retry_count';
export const AUTH_RETRY_COUNT_MAX = 2;
export const HANDOFF_FAILED_PARAM = 'handoff_failed';

export function getTenantBaseDomain() {
  return TENANT_BASE_DOMAIN;
}

export function isBaseTenantHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === TENANT_BASE_DOMAIN || normalized === `www.${TENANT_BASE_DOMAIN}`;
}

export function isTenantSubdomainHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return !isBaseTenantHost(normalized) && normalized.endsWith(`.${TENANT_BASE_DOMAIN}`);
}

export function resolveTenantHostSlug(hostname: string) {
  const normalized = hostname.toLowerCase();
  if (!isTenantSubdomainHost(normalized)) return null;
  const slug = normalized.replace(`.${TENANT_BASE_DOMAIN}`, '').split('.')[0]?.trim().toLowerCase() || '';
  return slug || null;
}

export function getRetryCountFromSearch(search: string) {
  const raw = new URLSearchParams(search).get(AUTH_RETRY_COUNT_PARAM);
  const parsed = Number(raw ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.trunc(parsed);
}

export function isHandoffFailedSearch(search: string) {
  return new URLSearchParams(search).get(HANDOFF_FAILED_PARAM) === '1';
}

export function buildTenantLoginUrl(
  targetHost: string,
  options?: {
    retryCount?: number;
    handoffFailed?: boolean;
    email?: string;
    next?: string;
    transferHash?: string;
    protocol?: string;
  },
) {
  const protocol = options?.protocol || window.location.protocol;
  const params = new URLSearchParams();

  if (typeof options?.retryCount === 'number') {
    params.set(AUTH_RETRY_COUNT_PARAM, String(Math.max(0, Math.trunc(options.retryCount))));
  }

  if (options?.handoffFailed) {
    params.set(HANDOFF_FAILED_PARAM, '1');
  }

  const email = String(options?.email ?? '').trim().toLowerCase();
  if (email) {
    params.set('email', email);
  }

  const rawNext = String(options?.next ?? '').trim();
  if (rawNext) {
    // Prevent open redirect — only allow same-origin relative paths.
    // Block protocol-relative URLs (//evil.com), backslash tricks (/\evil.com),
    // and encoded variants that browsers may resolve to a different origin.
    const isSafeRelativePath = (p: string) =>
      p.startsWith('/') && !p.startsWith('//') && !/^\/[\\@]/.test(p);

    try {
      const parsed = new URL(rawNext, window.location.origin);
      if (parsed.origin === window.location.origin) {
        const safePath = parsed.pathname + parsed.search;
        if (isSafeRelativePath(safePath)) {
          params.set('next', safePath);
        }
      }
    } catch {
      // If rawNext is already a relative path, use it directly after validation
      if (isSafeRelativePath(rawNext)) {
        params.set('next', rawNext);
      }
    }
  }

  const query = params.toString();
  const hash = options?.transferHash ? `#${options.transferHash}` : '';
  return `${protocol}//${targetHost}/login${query ? `?${query}` : ''}${hash}`;
}
