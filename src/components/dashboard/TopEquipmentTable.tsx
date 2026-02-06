import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopEquipmentItem {
  tag: string;
  equipamento: string;
  totalOS: number;
  corretivas: number;
  preventivas: number;
  mtbf?: number;
  disponibilidade?: number;
}

interface TopEquipmentTableProps {
  data: TopEquipmentItem[];
  title?: string;
  showMetrics?: boolean;
}

export function TopEquipmentTable({ 
  data, 
  title = "Equipamentos com Mais O.S",
  showMetrics = true 
}: TopEquipmentTableProps) {
  const maxOS = Math.max(...data.map(d => d.totalOS), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum dado disponível</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((item, index) => (
              <div 
                key={item.tag} 
                className="relative p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-mono font-medium text-primary">{item.tag}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {item.equipamento}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{item.totalOS}</p>
                    <p className="text-xs text-muted-foreground">ordens</p>
                  </div>
                </div>

                <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(item.totalOS / maxOS) * 100}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-destructive" />
                      <span className="text-muted-foreground">Corretivas:</span>
                      <span className="font-medium">{item.corretivas}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-muted-foreground">Preventivas:</span>
                      <span className="font-medium">{item.preventivas}</span>
                    </div>
                  </div>
                  
                  {showMetrics && item.disponibilidade !== undefined && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-xs',
                        item.disponibilidade >= 95 && 'border-emerald-500/50 text-emerald-600',
                        item.disponibilidade >= 85 && item.disponibilidade < 95 && 'border-amber-500/50 text-amber-600',
                        item.disponibilidade < 85 && 'border-red-500/50 text-red-600'
                      )}
                    >
                      {item.disponibilidade.toFixed(1)}% disp.
                    </Badge>
                  )}
                </div>

                {/* Critical indicator for high corrective ratio */}
                {item.corretivas > item.preventivas * 2 && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="destructive" className="text-xs gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Alta correção
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
