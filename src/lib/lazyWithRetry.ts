import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const RELOAD_ATTEMPT_KEY = 'pcm-lazy-reload-attempt-v2';
const RELOAD_TS_KEY = 'pcm-lazy-import-reload-v1';
const MAX_RELOAD_ATTEMPTS = 3;
const RELOAD_COOLDOWN_MS = 10_000;
const MAX_IMPORT_RETRIES = 3;
const RETRY_DELAY_MS = 1_500;

export function isDynamicImportFailure(error: unknown): boolean {
  const message = String((error as { message?: string })?.message ?? error ?? '').toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('loading chunk') ||
    message.includes('chunkloaderror') ||
    message.includes('loading css chunk')
  );
}

function getReloadAttempts(): number {
  try {
    return Number(window.sessionStorage.getItem(RELOAD_ATTEMPT_KEY) ?? 0);
  } catch {
    return 0;
  }
}

function incrementReloadAttempt() {
  try {
    const current = getReloadAttempts();
    window.sessionStorage.setItem(RELOAD_ATTEMPT_KEY, String(current + 1));
    window.sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()));
  } catch {
    // noop
  }
}

function isInCooldown(): boolean {
  try {
    const raw = window.sessionStorage.getItem(RELOAD_TS_KEY);
    const at = Number(raw ?? 0);
    return Number.isFinite(at) && at > 0 && Date.now() - at <= RELOAD_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function clearReloadState() {
  try {
    window.sessionStorage.removeItem(RELOAD_ATTEMPT_KEY);
    window.sessionStorage.removeItem(RELOAD_TS_KEY);
    window.sessionStorage.removeItem('pcm.boundary.chunk_reload.at.v1');
    window.sessionStorage.removeItem('pcm-chunk-reload-at-v1');
  } catch {
    // noop
  }
}

export async function purgeAllCachesAndServiceWorkers() {
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

async function fetchFreshIndex(): Promise<void> {
  try {
    await fetch('/', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
  } catch {
    // noop – just priming the CDN edge with fresh content
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function retryImport<T>(importer: () => Promise<T>, retries: number): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await importer();
    } catch (error) {
      if (attempt === retries || !isDynamicImportFailure(error)) {
        throw error;
      }
      // Before retrying, force-fetch the index.html to bust CDN cache
      if (attempt === 0) {
        await fetchFreshIndex();
      }
      await wait(RETRY_DELAY_MS * (attempt + 1));
    }
  }
  throw new Error('retryImport: exhausted');
}

function doFullReload() {
  incrementReloadAttempt();
  void purgeAllCachesAndServiceWorkers()
    .then(() => fetchFreshIndex())
    .finally(() => {
      const target = new URL(window.location.href);
      // Clean up old recovery params
      target.searchParams.delete('recoverChunk');
      target.searchParams.delete('chunk_reload');
      target.searchParams.set('v', Date.now().toString());
      window.location.replace(target.toString());
    });
}

export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await retryImport(importer, MAX_IMPORT_RETRIES);
      clearReloadState();
      return module;
    } catch (error) {
      if (typeof window === 'undefined' || !isDynamicImportFailure(error)) {
        throw error;
      }

      const attempts = getReloadAttempts();
      if (attempts < MAX_RELOAD_ATTEMPTS && !isInCooldown()) {
        doFullReload();
        // Keep suspense pending while navigation occurs
        await new Promise(() => {});
      }

      throw error;
    }
  });
}
