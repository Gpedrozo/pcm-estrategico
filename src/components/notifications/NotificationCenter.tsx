import { useState, useEffect } from 'react';
import { Bell, Check, AlertTriangle, Info, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const unreadCount = notifications.filter(n => !n.read).length;

  // Generate notifications from system events
  useEffect(() => {
    if (!user) return;

    const generateSystemNotifications = async () => {
      const notifs: Notification[] = [];

      // Check for pending OS (backlog)
      const { data: pendingOS } = await supabase
        .from('ordens_servico')
        .select('id, numero_os, prioridade, data_solicitacao')
        .in('status', ['ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_MATERIAL'])
        .order('data_solicitacao', { ascending: true })
        .limit(5);

      if (pendingOS && pendingOS.length > 0) {
        const urgentOS = pendingOS.filter(os => os.prioridade === 'URGENTE');
        if (urgentOS.length > 0) {
          notifs.push({
            id: 'urgent-os',
            type: 'error',
            title: 'O.S Urgentes Pendentes',
            message: `${urgentOS.length} ordem(s) de serviço urgente(s) aguardando atendimento`,
            read: false,
            created_at: new Date().toISOString(),
            link: '/backlog',
          });
        }

        if (pendingOS.length > 10) {
          notifs.push({
            id: 'high-backlog',
            type: 'warning',
            title: 'Backlog Elevado',
            message: `Você tem ${pendingOS.length} ordens de serviço pendentes`,
            read: false,
            created_at: new Date().toISOString(),
            link: '/backlog',
          });
        }
      }

      // Check for overdue preventive maintenance
      const today = new Date().toISOString().split('T')[0];
      const { data: overduePlans } = await supabase
        .from('planos_preventivos')
        .select('id, nome, proxima_execucao')
        .eq('ativo', true)
        .lt('proxima_execucao', today)
        .limit(5);

      if (overduePlans && overduePlans.length > 0) {
        notifs.push({
          id: 'overdue-preventive',
          type: 'warning',
          title: 'Preventivas Atrasadas',
          message: `${overduePlans.length} plano(s) preventivo(s) com execução atrasada`,
          read: false,
          created_at: new Date().toISOString(),
          link: '/preventiva',
        });
      }

      // Check for low stock materials
      const { data: lowStockMaterials } = await supabase
        .from('materiais')
        .select('id, nome, estoque_atual, estoque_minimo')
        .eq('ativo', true);

      const belowMinimum = lowStockMaterials?.filter(m => m.estoque_atual < m.estoque_minimo) || [];
      if (belowMinimum.length > 0) {
        notifs.push({
          id: 'low-stock',
          type: 'warning',
          title: 'Estoque Baixo',
          message: `${belowMinimum.length} material(is) abaixo do estoque mínimo`,
          read: false,
          created_at: new Date().toISOString(),
          link: '/materiais',
        });
      }

      // Check for critical measurements (preditiva)
      const { data: criticalMeasurements } = await supabase
        .from('medicoes_preditivas')
        .select('id, tag, valor, limite_critico')
        .eq('status', 'CRITICO')
        .limit(5);

      if (criticalMeasurements && criticalMeasurements.length > 0) {
        notifs.push({
          id: 'critical-measurements',
          type: 'error',
          title: 'Medições Críticas',
          message: `${criticalMeasurements.length} equipamento(s) com medições em nível crítico`,
          read: false,
          created_at: new Date().toISOString(),
          link: '/preditiva',
        });
      }

      // Add welcome notification
      notifs.push({
        id: 'welcome',
        type: 'info',
        title: 'Bem-vindo ao PCM Estratégico',
        message: 'Use Ctrl+K para navegação rápida entre módulos',
        read: true,
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      });

      setNotifications(notifs);
    };

    generateSystemNotifications();

    // Set up real-time subscription for new OS
    const channel = supabase
      .channel('os-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ordens_servico',
        },
        (payload) => {
          const newOS = payload.new as any;
          setNotifications(prev => [
            {
              id: `new-os-${newOS.id}`,
              type: newOS.prioridade === 'URGENTE' ? 'error' : 'info',
              title: 'Nova O.S Criada',
              message: `O.S #${newOS.numero_os} - ${newOS.equipamento}`,
              read: false,
              created_at: new Date().toISOString(),
              link: '/backlog',
            },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notificações</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={markAllAsRead}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 hover:bg-muted/50 cursor-pointer transition-colors relative group',
                    !notification.read && 'bg-muted/30'
                  )}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.link) {
                      window.location.href = notification.link;
                      setOpen(false);
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notification.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  {!notification.read && (
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
