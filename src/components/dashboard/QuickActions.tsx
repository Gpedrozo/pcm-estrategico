import { Link } from 'react-router-dom';
import { 
  FilePlus, 
  FileCheck, 
  Calendar, 
  AlertTriangle, 
  Wrench,
  ClipboardList,
  Settings,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  href: string;
  variant?: 'default' | 'secondary' | 'outline';
  badge?: number;
}

interface QuickActionsProps {
  osAbertas?: number;
  planosVencidos?: number;
}

export function QuickActions({ osAbertas = 0, planosVencidos = 0 }: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      label: 'Nova O.S',
      icon: <FilePlus className="h-4 w-4" />,
      href: '/os/nova',
      variant: 'default',
    },
    {
      label: 'Fechar O.S',
      icon: <FileCheck className="h-4 w-4" />,
      href: '/os/fechar',
      variant: 'secondary',
      badge: osAbertas,
    },
    {
      label: 'Programação',
      icon: <Calendar className="h-4 w-4" />,
      href: '/programacao',
      variant: 'outline',
    },
    {
      label: 'Backlog',
      icon: <AlertTriangle className="h-4 w-4" />,
      href: '/backlog',
      variant: 'outline',
    },
    {
      label: 'Preventivas',
      icon: <Wrench className="h-4 w-4" />,
      href: '/preventiva',
      variant: 'outline',
      badge: planosVencidos,
    },
    {
      label: 'Solicitações',
      icon: <ClipboardList className="h-4 w-4" />,
      href: '/solicitacoes',
      variant: 'outline',
    },
    {
      label: 'Relatórios',
      icon: <BarChart3 className="h-4 w-4" />,
      href: '/relatorios',
      variant: 'outline',
    },
    {
      label: 'Configurações',
      icon: <Settings className="h-4 w-4" />,
      href: '/usuarios',
      variant: 'outline',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {actions.map((action) => (
            <Link key={action.href} to={action.href}>
              <Button 
                variant={action.variant || 'outline'} 
                className="w-full h-auto py-3 flex flex-col gap-1 relative"
              >
                {action.icon}
                <span className="text-xs">{action.label}</span>
                {action.badge !== undefined && action.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                    {action.badge}
                  </span>
                )}
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
