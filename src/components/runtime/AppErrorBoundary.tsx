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
