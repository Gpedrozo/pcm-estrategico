import { AlertTriangle } from "lucide-react";

export function EnvironmentGuard({ children }: { children: React.ReactNode }) {
  const hasEnvironment = Boolean(import.meta.env.VITE_SUPABASE_URL || import.meta.env.DEV);

  if (!hasEnvironment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-lg rounded-lg border border-destructive/40 bg-card p-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
          <h1 className="text-xl font-semibold">Ambiente não configurado</h1>
          <p className="text-sm text-muted-foreground">
            Defina a variável <strong>VITE_SUPABASE_URL</strong> para inicializar a aplicação.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
