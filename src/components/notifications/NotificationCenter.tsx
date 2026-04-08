import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { formatDistanceToNow, differenceInDays, isToday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  read: boolean;
  dismissed: boolean;
  created_at: string;
  link?: string;
}

// ---------------------------------------------------------------------------
// localStorage helpers — persist read/dismissed per tenant
// ---------------------------------------------------------------------------

const STORAGE_READ_KEY = (tenantId: string) => `pcm-notif-read-${tenantId}`;
const STORAGE_DISMISSED_KEY = (tenantId: string) => `pcm-notif-dismissed-${tenantId}`;

function getStoredSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? JSON.parse(raw) as string[] : []);
  } catch {
    return new Set();
  }
}

function persistSet(key: string, set: Set<string>) {
  try {
    // keep max 200 entries to avoid localStorage bloat
    const arr = [...set].slice(-200);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch { /* quota exceeded — degrade gracefully */ }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const tenantId = user?.tenantId;

  // Refs for persisted sets (avoid stale closures)
  const readSetRef = useRef<Set<string>>(new Set());
  const dismissedSetRef = useRef<Set<string>>(new Set());

  // Load persisted state on tenant change
  useEffect(() => {
    if (!tenantId) return;
    readSetRef.current = getStoredSet(STORAGE_READ_KEY(tenantId));
    dismissedSetRef.current = getStoredSet(STORAGE_DISMISSED_KEY(tenantId));
  }, [tenantId]);

  // Visible (non-dismissed) notifications
  const visibleNotifications = notifications.filter(n => !n.dismissed);
  const unreadCount = visibleNotifications.filter(n => !n.read).length;

  // Generate notifications from system events
  useEffect(() => {
    if (!tenantId) return;

    let isActive = true;

    const generateSystemNotifications = async () => {
      const notifs: Notification[] = [];
      const readIds = readSetRef.current;
      const dismissedIds = dismissedSetRef.current;

      // --- OS Urgentes (com contexto rico) ---
      try {
        const { data: pendingOS, error: osErr } = await supabase
          .from('ordens_servico')
          .select('id, numero_os, prioridade, data_solicitacao, tag')
          .eq('empresa_id', tenantId)
          .in('status', ['ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_MATERIAL'])
          .order('data_solicitacao', { ascending: true })
          .limit(20);

        if (!osErr && pendingOS && pendingOS.length > 0) {
          const urgentOS = pendingOS.filter(os => os.prioridade === 'URGENTE');

          // Individual notification per urgent OS (up to 3 most recent)
          urgentOS.slice(0, 3).forEach(os => {
            const hoursAgo = Math.round(
              (Date.now() - new Date(os.data_solicitacao).getTime()) / 3600000
            );
            const nId = `urgent-os-${os.id}`;
            notifs.push({
              id: nId,
              type: 'error',
              title: `OS #${os.numero_os} URGENTE`,
              message: `${os.tag || 'Equipamento'} — aberta há ${hoursAgo}h`,
              read: readIds.has(nId),
              dismissed: dismissedIds.has(nId),
              created_at: os.data_solicitacao,
              link: '/backlog',
            });
          });

          if (urgentOS.length > 3) {
            const nId = 'urgent-os-more';
            notifs.push({
              id: nId,
              type: 'error',
              title: 'O.S Urgentes Pendentes',
              message: `+ ${urgentOS.length - 3} outra(s) urgente(s) aguardando`,
              read: readIds.has(nId),
              dismissed: dismissedIds.has(nId),
              created_at: new Date().toISOString(),
              link: '/backlog',
            });
          }

          // Backlog warning — now uses actual count (limit 20 is enough to detect)
          if (pendingOS.length >= 15) {
            const nId = 'high-backlog';
            notifs.push({
              id: nId,
              type: 'warning',
              title: 'Backlog Elevado',
              message: `${pendingOS.length}+ ordens de serviço pendentes`,
              read: readIds.has(nId),
              dismissed: dismissedIds.has(nId),
              created_at: new Date().toISOString(),
              link: '/backlog',
            });
          }
        }
      } catch { /* network/RLS error — skip silently */ }

      // --- Preventivas Atrasadas (com nome e dias) ---
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: overduePlans, error: prevErr } = await supabase
          .from('planos_preventivos')
          .select('id, nome, proxima_execucao')
          .eq('empresa_id', tenantId)
          .eq('ativo', true)
          .lt('proxima_execucao', today)
          .order('proxima_execucao', { ascending: true })
          .limit(5);

        if (!prevErr && overduePlans && overduePlans.length > 0) {
          const details = overduePlans
            .slice(0, 3)
            .map(p => {
              const days = differenceInDays(new Date(), new Date(p.proxima_execucao));
              return `${p.nome} (${days}d)`;
            })
            .join(' · ');
          const extra = overduePlans.length > 3 ? ` + ${overduePlans.length - 3} mais` : '';

          const nId = 'overdue-preventive';
          notifs.push({
            id: nId,
            type: 'warning',
            title: `${overduePlans.length} Preventiva(s) Atrasada(s)`,
            message: `${details}${extra}`,
            read: readIds.has(nId),
            dismissed: dismissedIds.has(nId),
            created_at: overduePlans[0].proxima_execucao,
            link: '/preventiva',
          });
        }
      } catch { /* skip */ }

      // --- Estoque Baixo (com nome e quantidade) ---
      try {
        const { data: lowStockMaterials, error: matErr } = await supabase
          .from('materiais')
          .select('id, nome, estoque_atual, estoque_minimo')
          .eq('empresa_id', tenantId)
          .eq('ativo', true);

        if (!matErr && lowStockMaterials) {
          const belowMinimum = lowStockMaterials.filter(m => m.estoque_atual < m.estoque_minimo);
          if (belowMinimum.length > 0) {
            const details = belowMinimum
              .slice(0, 3)
              .map(m => `${m.nome}: ${m.estoque_atual}/${m.estoque_minimo}`)
              .join(' · ');
            const extra = belowMinimum.length > 3 ? ` + ${belowMinimum.length - 3} mais` : '';

            const nId = 'low-stock';
            notifs.push({
              id: nId,
              type: 'warning',
              title: `${belowMinimum.length} Material(is) Abaixo do Mínimo`,
              message: `${details}${extra}`,
              read: readIds.has(nId),
              dismissed: dismissedIds.has(nId),
              created_at: new Date().toISOString(),
              link: '/materiais',
            });
          }
        }
      } catch { /* skip */ }

      // --- Medições Críticas (com TAG e valor) ---
      try {
        const { data: criticalMeasurements, error: medErr } = await supabase
          .from('medicoes_preditivas')
          .select('id, tag, valor, limite_critico, tipo_medicao')
          .eq('empresa_id', tenantId)
          .eq('status', 'CRITICO')
          .limit(5);

        if (!medErr && criticalMeasurements && criticalMeasurements.length > 0) {
          const details = criticalMeasurements
            .slice(0, 3)
            .map(m => `${m.tag} ${m.tipo_medicao ?? ''}: ${m.valor}${m.limite_critico ? ` (lim: ${m.limite_critico})` : ''}`.trim())
            .join(' · ');

          const nId = 'critical-measurements';
          notifs.push({
            id: nId,
            type: 'error',
            title: `${criticalMeasurements.length} Medição(ões) Crítica(s)`,
            message: details,
            read: readIds.has(nId),
            dismissed: dismissedIds.has(nId),
            created_at: new Date().toISOString(),
            link: '/preditiva',
          });
        }
      } catch { /* skip */ }

      // --- Treinamentos SSMA vencendo ou vencidos ---
      try {
        const { data: treinamentos, error: trErr } = await supabase
          .from('treinamentos_ssma')
          .select('id, colaborador_nome, tipo_curso, nome_curso, data_validade, dias_alerta_antes, status')
          .eq('empresa_id', tenantId)
          .in('status', ['PROXIMO_VENCIMENTO', 'VENCIDO'])
          .order('data_validade', { ascending: true })
          .limit(10);

        if (!trErr && treinamentos && treinamentos.length > 0) {
          const vencidos = treinamentos.filter((t: any) => t.status === 'VENCIDO');
          const vencendo = treinamentos.filter((t: any) => t.status === 'PROXIMO_VENCIMENTO');

          if (vencidos.length > 0) {
            const details = vencidos
              .slice(0, 3)
              .map((t: any) => `${t.colaborador_nome} — ${t.tipo_curso}`)
              .join(' · ');
            const extra = vencidos.length > 3 ? ` + ${vencidos.length - 3} mais` : '';

            const nId = 'treinamentos-vencidos';
            notifs.push({
              id: nId,
              type: 'error',
              title: `${vencidos.length} Treinamento(s) Vencido(s)`,
              message: `${details}${extra}`,
              read: readIds.has(nId),
              dismissed: dismissedIds.has(nId),
              created_at: new Date().toISOString(),
              link: '/ssma',
            });
          }

          if (vencendo.length > 0) {
            const details = vencendo
              .slice(0, 3)
              .map((t: any) => {
                const dias = t.data_validade
                  ? Math.ceil((new Date(t.data_validade).getTime() - Date.now()) / 86400000)
                  : 0;
                return `${t.colaborador_nome} — ${t.tipo_curso} (${dias}d)`;
              })
              .join(' · ');
            const extra = vencendo.length > 3 ? ` + ${vencendo.length - 3} mais` : '';

            const nId = 'treinamentos-vencendo';
            notifs.push({
              id: nId,
              type: 'warning',
              title: `${vencendo.length} Treinamento(s) Próximo(s) do Vencimento`,
              message: `${details}${extra}`,
              read: readIds.has(nId),
              dismissed: dismissedIds.has(nId),
              created_at: new Date().toISOString(),
              link: '/ssma',
            });
          }
        }
      } catch { /* skip */ }

      // Welcome (always read)
      const wId = 'welcome';
      notifs.push({
        id: wId,
        type: 'info',
        title: 'Bem-vindo ao PCM Estratégico',
        message: 'Use Ctrl+K para navegação rápida entre módulos',
        read: true,
        dismissed: dismissedIds.has(wId),
        created_at: new Date(Date.now() - 86400000).toISOString(),
      });

      if (!isActive) return;
      setNotifications(notifs);
    };

    generateSystemNotifications();

    // Real-time — scoped channel per tenant
    const channel = supabase
      .channel(`notif-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ordens_servico',
          filter: `empresa_id=eq.${tenantId}`,
        },
        (payload) => {
          const newOS = payload.new as {
            id?: string;
            prioridade?: string;
            numero_os?: string;
            tag?: string;
            equipamento?: string;
          };
          const nId = `new-os-${newOS.id ?? Date.now()}`;
          setNotifications(prev => [
            {
              id: nId,
              type: newOS.prioridade === 'URGENTE' ? 'error' : 'info',
              title: 'Nova O.S Criada',
              message: `OS #${newOS.numero_os ?? '?'} — ${newOS.tag || newOS.equipamento || 'Equipamento'}`,
              read: false,
              dismissed: false,
              created_at: new Date().toISOString(),
              link: '/backlog',
            },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  // --- Actions (persisted) ---

  const markAsRead = useCallback((id: string) => {
    if (!tenantId) return;
    readSetRef.current.add(id);
    persistSet(STORAGE_READ_KEY(tenantId), readSetRef.current);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, [tenantId]);

  const markAllAsRead = useCallback(() => {
    if (!tenantId) return;
    setNotifications(prev => {
      prev.forEach(n => readSetRef.current.add(n.id));
      persistSet(STORAGE_READ_KEY(tenantId), readSetRef.current);
      return prev.map(n => ({ ...n, read: true }));
    });
  }, [tenantId]);

  const dismissNotification = useCallback((id: string) => {
    if (!tenantId) return;
    dismissedSetRef.current.add(id);
    persistSet(STORAGE_DISMISSED_KEY(tenantId), dismissedSetRef.current);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, dismissed: true } : n))
    );
  }, [tenantId]);

  // --- Helpers ---

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getTimeGroup = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Hoje';
    if (isThisWeek(d, { weekStartsOn: 1 })) return 'Esta Semana';
    return 'Anteriores';
  };

  // Group visible notifications by time
  const grouped = visibleNotifications.reduce<Record<string, Notification[]>>((acc, n) => {
    const group = getTimeGroup(n.created_at);
    (acc[group] ??= []).push(n);
    return acc;
  }, {});
  const groupOrder = ['Hoje', 'Esta Semana', 'Anteriores'];

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
      <PopoverContent className="w-96 p-0" align="end">
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
        <ScrollArea className="h-[360px]">
          {visibleNotifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            <div>
              {groupOrder.map(group => {
                const items = grouped[group];
                if (!items || items.length === 0) return null;
                return (
                  <div key={group}>
                    <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/40">
                      {group}
                    </div>
                    <div className="divide-y">
                      {items.map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            'p-4 hover:bg-muted/50 cursor-pointer transition-colors relative group',
                            !notification.read && 'bg-muted/30'
                          )}
                          onClick={() => {
                            markAsRead(notification.id);
                            if (notification.link) {
                              navigate(notification.link);
                              setOpen(false);
                            }
                          }}
                        >
                          <div className="flex gap-3">
                            <div className="mt-0.5">{getIcon(notification.type)}</div>
                            <div className="flex-1 space-y-1 min-w-0">
                              <p className="text-sm font-medium leading-none">
                                {notification.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                {formatDistanceToNow(new Date(notification.created_at), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
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
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
