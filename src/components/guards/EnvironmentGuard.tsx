import { AlertTriangle } from "lucide-react";
import { isOwnerDomain } from "@/lib/security";

export function EnvironmentGuard({
  children,
  allowOwner = false,
}: {
  children: React.ReactNode;
  allowOwner?: boolean;
}) {
  const hasDefaultSupabase = Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
      (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)
  );
  const hasOwnerSupabase = Boolean(
    import.meta.env.VITE_OWNER_SUPABASE_URL &&
      (import.meta.env.VITE_OWNER_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_OWNER_SUPABASE_ANON_KEY)
  );
  const hasEnvironment = Boolean(hasDefaultSupabase || hasOwnerSupabase || import.meta.env.DEV);
  const ownerDomain = isOwnerDomain();

  if (!hasEnvironment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-lg rounded-lg border border-destructive/40 bg-card p-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
          <h1 className="text-xl font-semibold">Ambiente não configurado</h1>
          <p className="text-sm text-muted-foreground">
            Defina <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_PUBLISHABLE_KEY</strong> (ou <strong>VITE_SUPABASE_ANON_KEY</strong>) para inicializar a aplicação.
          </p>
        </div>
      </div>
    );
  }

  if (ownerDomain && !allowOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-lg rounded-lg border border-destructive/40 bg-card p-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
          <h1 className="text-xl font-semibold">Rota inválida para domínio Owner</h1>
          <p className="text-sm text-muted-foreground">
            Este domínio aceita apenas rotas do control plane.
          </p>
        </div>
      </div>
    );
  }

  if (!ownerDomain && allowOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-lg rounded-lg border border-destructive/40 bg-card p-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
          <h1 className="text-xl font-semibold">Rota exclusiva do control plane</h1>
          <p className="text-sm text-muted-foreground">
            Esta rota não está disponível no domínio tenant.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
