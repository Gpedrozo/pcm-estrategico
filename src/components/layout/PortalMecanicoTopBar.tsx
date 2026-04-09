import { LogOut, Wrench } from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';
import { usePortalMecanico } from '@/contexts/PortalMecanicoContext';

export function PortalMecanicoTopBar() {
  const { branding } = useBranding();
  const { mecanico, logout } = usePortalMecanico();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-slate-900 text-white flex items-center justify-between px-4 shadow-lg">
      <div className="flex items-center gap-3 min-w-0">
        {branding?.logo_menu_url ? (
          <img
            src={branding.logo_menu_url}
            alt={branding.nome_fantasia || 'Logo'}
            className="w-9 h-9 rounded-lg object-contain bg-white/10 p-0.5 flex-shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Wrench className="h-5 w-5 text-white" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">
            {branding?.nome_fantasia || 'PCM Estratégico'}
          </p>
          <p className="text-xs text-slate-300 truncate">
            {mecanico?.nome || 'Portal do Mecânico'}
            {mecanico?.especialidade && (
              <span className="text-slate-400"> · {mecanico.especialidade}</span>
            )}
          </p>
        </div>
      </div>

      {mecanico && (
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-sm font-medium"
          title="Sair do portal"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      )}
    </header>
  );
}
