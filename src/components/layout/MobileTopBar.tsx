import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { Settings } from 'lucide-react';

export function MobileTopBar() {
  const { user, logout } = useAuth();
  const { branding } = useBranding();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/95 backdrop-blur border-b border-border flex items-center justify-between px-4"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center gap-3 min-w-0">
        {branding?.logo_menu_url ? (
          <img
            src={branding.logo_menu_url}
            alt={branding.nome_fantasia || 'Logo'}
            className="w-8 h-8 rounded-md object-contain bg-primary/10 p-0.5 flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <Settings className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">
            {branding?.nome_fantasia || branding?.razao_social || 'PCM Estratégico'}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {user?.nome}
          </p>
        </div>
      </div>
      <button
        onClick={() => logout()}
        className="p-2 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors touch-target"
        title="Sair"
        aria-label="Sair do sistema"
      >
        <LogOut className="h-5 w-5 text-muted-foreground" />
      </button>
    </header>
  );
}
