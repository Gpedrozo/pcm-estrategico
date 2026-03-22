import { ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { logger } from '@/lib/logger';

interface EnvironmentGuardProps {
  children: ReactNode;
  hostnameOverride?: string;
}

const OWNER_HOSTNAME = "owner.gppis.com.br";

export function EnvironmentGuard({ children, hostnameOverride }: EnvironmentGuardProps) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hostname = hostnameOverride ?? window.location.hostname;
    const isOwnerEnv = hostname === OWNER_HOSTNAME;
    const isOwnerRoute = location.pathname.startsWith("/owner");

    if (isOwnerEnv && !isOwnerRoute) {
      navigate("/owner", { replace: true });
      return;
    }

    if (!isOwnerEnv && isOwnerRoute) {
      logger.warn('environment_guard_blocked_owner_route', { hostname });
      navigate("/", { replace: true });
    }
  }, [hostnameOverride, location.pathname, navigate]);

  return <>{children}</>;
}
