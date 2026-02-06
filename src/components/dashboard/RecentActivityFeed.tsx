import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Wrench,
  Zap
} from 'lucide-react';
import { format, subDays, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface RecentActivity {
  id: string;
  type: 'os_created' | 'os_closed' | 'preventive_executed' | 'alert' | 'measurement';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  tag?: string;
}

interface RecentActivityFeedProps {
  activities: RecentActivity[];
  onViewAll?: () => void;
}

export function RecentActivityFeed({ activities, onViewAll }: RecentActivityFeedProps) {
  const getIcon = (type: RecentActivity['type'], status?: RecentActivity['status']) => {
    switch (type) {
      case 'os_created':
        return <Wrench className="h-4 w-4" />;
      case 'os_closed':
        return <CheckCircle className="h-4 w-4" />;
      case 'preventive_executed':
        return <Clock className="h-4 w-4" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4" />;
      case 'measurement':
        return <Zap className="h-4 w-4" />;
      default:
        return <Wrench className="h-4 w-4" />;
    }
  };

  const getIconBgColor = (type: RecentActivity['type'], status?: RecentActivity['status']) => {
    if (status === 'error') return 'bg-destructive/10 text-destructive';
    if (status === 'warning') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    if (status === 'success') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    
    switch (type) {
      case 'os_created':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'os_closed':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'preventive_executed':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'alert':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      case 'measurement':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = parseISO(timestamp);
    const days = differenceInDays(new Date(), date);
    
    if (days === 0) {
      return format(date, "'Hoje,' HH:mm", { locale: ptBR });
    } else if (days === 1) {
      return format(date, "'Ontem,' HH:mm", { locale: ptBR });
    } else if (days < 7) {
      return format(date, "EEEE, HH:mm", { locale: ptBR });
    }
    return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Atividade Recente</CardTitle>
          {onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              Ver tudo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma atividade recente</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-4 relative">
                  <div className={cn(
                    'relative z-10 flex h-10 w-10 items-center justify-center rounded-full',
                    getIconBgColor(activity.type, activity.status)
                  )}>
                    {getIcon(activity.type, activity.status)}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{activity.title}</p>
                      {activity.tag && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {activity.tag}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
