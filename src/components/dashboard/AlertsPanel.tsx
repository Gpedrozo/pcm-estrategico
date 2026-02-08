import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Clock, 
  Package, 
  Wrench, 
  ChevronDown, 
  ChevronUp,
  Bell,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Alert {
  id: string;
  type: 'urgente' | 'sla' | 'estoque' | 'preventiva' | 'preditiva';
  title: string;
  description: string;
  count?: number;
  link: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface AlertsPanelProps {
  alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'urgente':
        return <AlertTriangle className="h-4 w-4" />;
      case 'sla':
        return <Clock className="h-4 w-4" />;
      case 'estoque':
        return <Package className="h-4 w-4" />;
      case 'preventiva':
        return <Wrench className="h-4 w-4" />;
      case 'preditiva':
        return <Bell className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertStyles = (priority: Alert['priority']) => {
    switch (priority) {
      case 'critical':
        return {
          bg: 'bg-destructive/10',
          border: 'border-destructive/30',
          iconColor: 'text-destructive',
          badge: 'bg-destructive text-destructive-foreground',
        };
      case 'high':
        return {
          bg: 'bg-warning/10',
          border: 'border-warning/30',
          iconColor: 'text-warning',
          badge: 'bg-warning text-warning-foreground',
        };
      case 'medium':
        return {
          bg: 'bg-info/10',
          border: 'border-info/30',
          iconColor: 'text-info',
          badge: 'bg-info/10 text-info',
        };
      default:
        return {
          bg: 'bg-muted',
          border: 'border-border',
          iconColor: 'text-muted-foreground',
          badge: 'bg-muted text-muted-foreground',
        };
    }
  };

  const criticalCount = alerts.filter(a => a.priority === 'critical').length;
  const highCount = alerts.filter(a => a.priority === 'high').length;

  if (alerts.length === 0) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-medium text-success">Tudo em ordem!</p>
              <p className="text-sm text-muted-foreground">Não há alertas ativos no momento.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={criticalCount > 0 ? 'border-destructive/30' : highCount > 0 ? 'border-warning/30' : ''}>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Alertas Ativos
            <Badge variant="destructive" className="ml-2">
              {alerts.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-2">
          {alerts.slice(0, 5).map((alert) => {
            const styles = getAlertStyles(alert.priority);
            return (
              <Link key={alert.id} to={alert.link}>
                <div
                  className={`p-3 rounded-lg border ${styles.bg} ${styles.border} hover:shadow-md transition-shadow cursor-pointer`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded ${styles.iconColor}`}>
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{alert.title}</p>
                        {alert.count && (
                          <Badge className={styles.badge}>{alert.count}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {alerts.length > 5 && (
            <div className="text-center pt-2">
              <Button variant="link" size="sm">
                Ver todos os {alerts.length} alertas
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
