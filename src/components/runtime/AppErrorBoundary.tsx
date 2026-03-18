import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { writeAuditLog } from '@/lib/audit';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

const BOUNDARY_CHUNK_RELOAD_MARKER = 'pcm.boundary.chunk_reload.at.v1';
const BOUNDARY_CHUNK_RELOAD_COOLDOWN_MS = 30_000;

function isDynamicChunkLoadError(raw: unknown) {
  const message = String((raw as { message?: string })?.message ?? raw ?? '').toLowerCase();

  return (
    message.includes('failed to fetch dynamically imported module')
    || message.includes('importing a module script failed')
    || message.includes('loading chunk')
    || message.includes('chunkloaderror')
  );
}

function hasRecentBoundaryChunkReload() {
  try {
    const raw = window.sessionStorage.getItem(BOUNDARY_CHUNK_RELOAD_MARKER);
    const timestamp = Number(raw ?? 0);
    return Number.isFinite(timestamp) && timestamp > 0 && (Date.now() - timestamp) <= BOUNDARY_CHUNK_RELOAD_COOLDOWN_MS;
  } catch {
    return false;
  }
}

async function clearCachesForChunkRecovery() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // noop
  }

  try {
    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((cacheName) =>
            cacheName.includes('workbox')
            || cacheName.includes('vite-pwa')
            || cacheName.includes('supabase-cache'))
          .map((cacheName) => caches.delete(cacheName)),
      );
    }
  } catch {
    // noop
  }
}

function recoverFromBoundaryChunkError(error: unknown) {
  if (!isDynamicChunkLoadError(error)) return false;
  if (hasRecentBoundaryChunkReload()) return false;

  try {
    const now = Date.now();
    window.sessionStorage.setItem(BOUNDARY_CHUNK_RELOAD_MARKER, String(now));
    void clearCachesForChunkRecovery().finally(() => {
      const targetUrl = new URL(window.location.href);
      targetUrl.searchParams.set('chunk_reload', String(now));
      window.location.replace(targetUrl.toString());
    });
    return true;
  } catch {
    return false;
  }
}

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: String((error as { message?: string })?.message ?? error ?? 'Erro inesperado de renderizacao.'),
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    if (recoverFromBoundaryChunkError(error)) {
      return;
    }

    const details = {
      message: String((error as { message?: string })?.message ?? error ?? 'unknown_error'),
      stack: (error as { stack?: string })?.stack ?? null,
      componentStack: errorInfo.componentStack,
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    };

    logger.error('react_render_crash', details);

    void writeAuditLog({
      action: 'CLIENT_RENDER_CRASH',
      table: 'client_runtime',
      source: 'app_error_boundary',
      severity: 'critical',
      metadata: details,
    }).catch(() => null);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg rounded-lg border border-destructive/40 bg-card p-6 text-center space-y-4">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <h1 className="text-xl font-semibold">Falha ao carregar a aplicacao</h1>
          <p className="text-sm text-muted-foreground">
            O sistema encontrou um erro inesperado apos o login. Tente recarregar a pagina.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Recarregar
            </button>
            <button
              onClick={() => {
                const next = encodeURIComponent(`${window.location.pathname}${window.location.search}` || '/dashboard');
                window.location.assign(`/login?next=${next}`);
              }}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Voltar ao login
            </button>
          </div>
          <p className="text-xs text-muted-foreground/80 break-all">{this.state.message}</p>
        </div>
      </div>
    );
  }
}
