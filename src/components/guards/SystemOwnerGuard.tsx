import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";

export function SystemOwnerGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isSystemOwner } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isSystemOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
