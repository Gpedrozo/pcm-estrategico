import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { writeAuditLog } from '@/lib/audit';
import { captureError } from '@/lib/monitoring';
import { isDynamicImportFailure, purgeAllCachesAndServiceWorkers } from '@/lib/lazyWithRetry';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
  isChunkError: boolean;
};

function nuclearReload() {
  // Clear ALL session markers
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && (key.includes('pcm') || key.includes('chunk') || key.includes('reload'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    try { window.sessionStorage.clear(); } catch { /* noop */ }
  }

  // Clear localStorage deploy markers
  try {
    window.localStorage.removeItem('pcm-last-build-hash');
  } catch { /* noop */ }

  void purgeAllCachesAndServiceWorkers()
    .then(() => fetch('/', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }).catch(() => {}))
    .finally(() => {
      // Navigate to root with cache bust, avoiding any stale route
      window.location.replace(`/?force_reload=${Date.now()}`);
    });
}

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
    isChunkError: false,
  };

  static getDerivedStateFromError(error: unknown): State {
    const isChunk = isDynamicImportFailure(error);
    return {
      hasError: true,
      message: String((error as { message?: string })?.message ?? error ?? 'Erro inesperado de renderizacao.'),
      isChunkError: isChunk,
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    // For chunk errors, always attempt nuclear reload on first boundary hit
    if (isDynamicImportFailure(error)) {
      nuclearReload();
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

    captureError(error, details);

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
          <h1 className="text-xl font-semibold">
            {this.state.isChunkError ? 'Atualizacao em andamento' : 'Falha ao carregar a aplicacao'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {this.state.isChunkError
              ? 'Uma nova versao do sistema foi publicada. Limpando cache e recarregando...'
              : 'O sistema encontrou um erro inesperado. Tente recarregar a pagina.'}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => nuclearReload()}
              className="rounded-md border border-primary bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
            >
              Limpar cache e recarregar
            </button>
            <button
              onClick={() => {
                try { window.sessionStorage.clear(); } catch { /* noop */ }
                window.location.assign('/login');
              }}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Voltar ao login
            </button>
          </div>
          {!this.state.isChunkError && (
            <p className="text-xs text-muted-foreground/80 break-all">{this.state.message}</p>
          )}
        </div>
      </div>
    );
  }
}
