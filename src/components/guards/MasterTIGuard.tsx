import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";

export function MasterTIGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isHydrating, authStatus, isMasterTI } = useAuth();

  if (isLoading || isHydrating || authStatus === 'loading' || authStatus === 'hydrating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (authStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
          <p className="text-sm text-muted-foreground">Erro ao carregar sessão.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || authStatus !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  if (!isMasterTI) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
