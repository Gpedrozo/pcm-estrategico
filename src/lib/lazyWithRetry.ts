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
    const raw = window.sessionStorage.getItem(LAZY_RELOAD_MARKER);
    const at = Number(raw ?? 0);
    return Number.isFinite(at) && at > 0 && Date.now() - at <= LAZY_RELOAD_COOLDOWN_MS;
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
        const current = new URL(window.location.href);
        current.searchParams.set('recoverChunk', Date.now().toString());
        window.location.replace(current.toString());

        // Mantem suspense pendente enquanto a navegacao ocorre.
        await new Promise(() => {
          // intentional noop
        });
      }

      throw error;
    }
  });
}
