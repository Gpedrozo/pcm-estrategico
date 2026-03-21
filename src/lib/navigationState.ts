import type { AppRole } from '@/lib/security';
import { getPostLoginPath } from '@/lib/security';

const LAST_ROUTE_STORAGE_KEY = 'pcm.nav.last_route.v1';

const BLOCKED_PREFIXES = ['/login', '/forgot-password', '/reset-password', '/change-password'];

export function isPersistableAppPath(path: string): boolean {
  if (!path) return false;
  if (!path.startsWith('/')) return false;
  if (path === '/') return false;
  return !BLOCKED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function persistLastAppRoute(pathWithSearch: string) {
  if (!isPersistableAppPath(pathWithSearch)) return;
  try {
    window.sessionStorage.setItem(LAST_ROUTE_STORAGE_KEY, pathWithSearch);
  } catch {
    // noop
  }
}

export function consumePreferredPostLoginPath(role: AppRole, hostname?: string): string {
  const fallback = getPostLoginPath(role, hostname);

  try {
    const raw = window.sessionStorage.getItem(LAST_ROUTE_STORAGE_KEY);
    if (!raw || !isPersistableAppPath(raw)) {
      return fallback;
    }
    return raw;
  } catch {
    return fallback;
  }
}
