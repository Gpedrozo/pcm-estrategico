import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  ClipboardList,
  Search,
  Calendar,
  History,
  Plus,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
}

const navItems: NavItem[] = [
  { label: 'Início', icon: Home, to: '/portal-mecanico' },
  { label: 'Minhas OS', icon: ClipboardList, to: '/portal-mecanico/historico' },
  { label: 'Solicitar', icon: Plus, to: '/portal-mecanico/solicitar' },
  { label: 'Equipam.', icon: Search, to: '/portal-mecanico/equipamentos' },
  { label: 'Preventivas', icon: Calendar, to: '/portal-mecanico/preventivas' },
];

export function PortalMecanicoNav() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/portal-mecanico') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
      >
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const active = isActive(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors',
                  active ? 'text-orange-400' : 'text-slate-400'
                )}
              >
                <item.icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
                <span className={cn('text-[10px]', active ? 'font-bold' : 'font-medium')}>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Desktop horizontal nav */}
      <nav className="hidden md:block fixed top-16 left-0 right-0 z-40 bg-slate-800 border-b border-slate-700">
        <div className="max-w-5xl mx-auto flex items-center gap-1 px-4 h-12">
          {navItems.map((item) => {
            const active = isActive(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
