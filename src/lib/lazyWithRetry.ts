import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const LAZY_RELOAD_MARKER = 'pcm-lazy-import-reload-v1';
const LAZY_RELOAD_COOLDOWN_MS = 45_000;

function isDynamicImportFailure(error: unknown): boolean {
  const message = String((error as { message?: string })?.message ?? error ?? '').toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('loading chunk') ||
    message.includes('chunkloaderror')
  );
}

function hasReloadedRecently() {
  try {
    const now = Date.now();
    for (const key of [LAZY_RELOAD_MARKER, 'pcm-chunk-reload-at-v1', 'pcm.boundary.chunk_reload.at.v1']) {
      const raw = window.sessionStorage.getItem(key);
      const at = Number(raw ?? 0);
      if (Number.isFinite(at) && at > 0 && now - at <= LAZY_RELOAD_COOLDOWN_MS) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

function markReload() {
  try {
    window.sessionStorage.setItem(LAZY_RELOAD_MARKER, String(Date.now()));
  } catch {
    // noop
  }
}

function clearReloadMarkOnSuccess() {
  try {
    window.sessionStorage.removeItem(LAZY_RELOAD_MARKER);
  } catch {
    // noop
  }
}

async function purgeAllCachesAndServiceWorkers() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
  } catch {
    // noop
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // noop
  }
}

export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await importer();
      clearReloadMarkOnSuccess();
      return module;
    } catch (error) {
      if (typeof window !== 'undefined' && isDynamicImportFailure(error) && !hasReloadedRecently()) {
        markReload();
        void purgeAllCachesAndServiceWorkers().finally(() => {
          const current = new URL(window.location.href);
          current.searchParams.set('recoverChunk', Date.now().toString());
          window.location.replace(current.toString());
        });

        // Mantem suspense pendente enquanto a navegacao ocorre.
        await new Promise(() => {
          // intentional noop
        });
      }

      throw error;
    }
  });
}
