import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from './AppLayout';
import { MobileLayout } from './MobileLayout';
import { Loader2 } from 'lucide-react';

const MOBILE_EXPERIENCE_ROLES = ['TECHNICIAN', 'SOLICITANTE'] as const;

export function ExperienceRouter() {
  const { effectiveRole, isLoading, isHydrating, authStatus } = useAuth();

  if (isLoading || isHydrating || authStatus === 'loading' || authStatus === 'hydrating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isMobileExperience = (MOBILE_EXPERIENCE_ROLES as readonly string[]).includes(effectiveRole);

  if (isMobileExperience) {
    return <MobileLayout />;
  }

  return <AppLayout />;
}
