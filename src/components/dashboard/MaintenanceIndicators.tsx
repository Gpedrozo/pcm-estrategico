import { Activity, Clock, Gauge, AlertTriangle } from 'lucide-react';
import type { Indicadores } from '@/types';

interface MaintenanceIndicatorsProps {
  indicadores: Indicadores;
}

export function MaintenanceIndicators({ indicadores }: MaintenanceIndicatorsProps) {
  const formatHours = (hours: number) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    return `${hours}h`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* MTBF */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-info/10">
            <Clock className="h-5 w-5 text-info" />
          </div>
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            MTBF
          </span>
        </div>
        <p className="text-2xl font-bold font-mono text-foreground">
          {formatHours(indicadores.mtbf)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Tempo Médio Entre Falhas
        </p>
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-info rounded-full transition-all"
            style={{ width: `${Math.min((indicadores.mtbf / 1000) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* MTTR */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-warning/10">
            <Activity className="h-5 w-5 text-warning" />
          </div>
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            MTTR
          </span>
        </div>
        <p className="text-2xl font-bold font-mono text-foreground">
          {indicadores.mttr}h
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Tempo Médio Para Reparo
        </p>
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-warning rounded-full transition-all"
            style={{ width: `${Math.min((indicadores.mttr / 8) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Disponibilidade */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-success/10">
            <Gauge className="h-5 w-5 text-success" />
          </div>
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Disponibilidade
          </span>
        </div>
        <p className="text-2xl font-bold font-mono text-foreground">
          {indicadores.disponibilidade.toFixed(1)}%
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          MTBF / (MTBF + MTTR)
        </p>
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-success rounded-full transition-all"
            style={{ width: `${indicadores.disponibilidade}%` }}
          />
        </div>
      </div>

      {/* Backlog */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Backlog
          </span>
        </div>
        <p className="text-2xl font-bold font-mono text-foreground">
          {indicadores.backlogQuantidade}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          O.S pendentes • {formatHours(indicadores.backlogTempo)} acumuladas
        </p>
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-destructive rounded-full transition-all"
            style={{ width: `${Math.min((indicadores.backlogQuantidade / 10) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
