import { Outlet, Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, Loader2 } from 'lucide-react';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { GlobalSearch } from './GlobalSearch';
import { useState } from 'react';
import { useBranding } from '@/contexts/BrandingContext';
import { useTenant } from '@/contexts/TenantContext';

export function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { branding } = useBranding();
  const { tenant, tenantError, isTenantLoading } = useTenant();
  const [commandOpen, setCommandOpen] = useState(false);

  if (isLoading || isTenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (tenantError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Acesso bloqueado</h1>
          <p className="text-muted-foreground">{tenantError}</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <CommandPalette />
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-4">
            <SidebarTrigger className="p-2 hover:bg-muted rounded-md">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <GlobalSearch onOpen={() => {
              const event = new KeyboardEvent('keydown', {
                key: 'k',
                metaKey: true,
                bubbles: true,
              });
              document.dispatchEvent(event);
            }} />
            <div className="flex-1" />
            <span className="text-sm font-medium text-foreground hidden lg:block">
              {branding?.nome_sistema || tenant?.nome || 'PCM Estratégico'}
            </span>
            <NotificationCenter />
            <span className="text-sm text-muted-foreground hidden md:block">
              {new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
