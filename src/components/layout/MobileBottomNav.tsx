import { NavLink, useLocation } from 'react-router-dom';
import { Home, ClipboardList, Plus, HelpCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
}

const mechanicNav: NavItem[] = [
  { label: 'Início', icon: Home, to: '/mecanico' },
  { label: 'Minhas OS', icon: ClipboardList, to: '/mecanico/historico' },
  { label: 'Solicitar', icon: Plus, to: '/mecanico/solicitar' },
  { label: 'Ajuda', icon: HelpCircle, to: '/suporte' },
];

const operatorNav: NavItem[] = [
  { label: 'Início', icon: Home, to: '/operador' },
  { label: 'Solicitar', icon: Plus, to: '/operador/solicitar' },
  { label: 'Status', icon: MessageSquare, to: '/operador/historico' },
  { label: 'Ajuda', icon: HelpCircle, to: '/suporte' },
];

export function MobileBottomNav() {
  const { effectiveRole } = useAuth();
  const location = useLocation();

  const items = effectiveRole === 'SOLICITANTE' ? operatorNav : mechanicNav;

  const isActive = (path: string) => {
    if (path === '/mecanico' || path === '/operador') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const active = isActive(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors active:scale-95',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn('h-6 w-6', active && 'stroke-[2.5]')} />
              <span className={cn('text-[10px]', active ? 'font-bold' : 'font-medium')}>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
