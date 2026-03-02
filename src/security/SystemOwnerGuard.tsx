import { ReactNode, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface SystemOwnerGuardProps {
  children: ReactNode;
}

export function SystemOwnerGuard({ children }: SystemOwnerGuardProps) {
  const { user, session, isAuthenticated, isLoading, isSystemOwner, logout } = useAuth();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const validateAccess = async () => {
      if (isLoading) return;

      if (!isAuthenticated || !session?.user || !user?.id || !isSystemOwner) {
        if (isAuthenticated && session?.user && user?.id && !isSystemOwner) {
          await logout();
          navigate("/login", { replace: true });
        }
        if (!cancelled) {
          setIsAuthorized(false);
          setIsChecking(false);
        }
        return;
      }

      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      if (expiresAt > 0 && expiresAt <= Date.now()) {
        await logout();
        navigate("/login", { replace: true });
        if (!cancelled) {
          setIsAuthorized(false);
          setIsChecking(false);
        }
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "SYSTEM_OWNER")
        .maybeSingle();

      const hasSystemOwnerRole = Boolean(roleData);

      if (!hasSystemOwnerRole) {
        await logout();
        navigate("/login", { replace: true });
      }

      if (!cancelled) {
        setIsAuthorized(hasSystemOwnerRole);
        setIsChecking(false);
      }
    };

    void validateAccess();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, isSystemOwner, logout, navigate, session, user?.id]);

  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
