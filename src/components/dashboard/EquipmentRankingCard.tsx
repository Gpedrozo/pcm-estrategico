import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, AlertTriangle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface EquipmentRankingData {
  tag: string;
  nome: string;
  falhas: number;
  custoTotal: number;
  mtbf: number;
  tendencia: 'up' | 'down' | 'stable';
  criticidade: 'A' | 'B' | 'C';
}

interface EquipmentRankingCardProps {
  data: EquipmentRankingData[];
  title?: string;
  type?: 'falhas' | 'custo';
}

export function EquipmentRankingCard({ 
  data, 
  title = "Ranking de Equipamentos",
  type = 'falhas'
}: EquipmentRankingCardProps) {
  const sortedData = [...data].sort((a, b) => 
    type === 'falhas' ? b.falhas - a.falhas : b.custoTotal - a.custoTotal
  ).slice(0, 5);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getCriticidadeStyle = (criticidade: string) => {
    switch (criticidade) {
      case 'A':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'B':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-success/10 text-success border-success/20';
    }
  };

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-destructive" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-success" />;
      default:
        return null;
    }
  };

  if (sortedData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Sem dados disponíveis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedData.map((equip, index) => (
            <div
              key={equip.tag}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm font-bold">
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-primary font-medium text-sm">
                    {equip.tag}
                  </span>
                  <Badge variant="outline" className={`text-xs ${getCriticidadeStyle(equip.criticidade)}`}>
                    {equip.criticidade}
                  </Badge>
                  {getTendenciaIcon(equip.tendencia)}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {equip.nome}
                </p>
              </div>

              <div className="text-right">
                {type === 'falhas' ? (
                  <>
                    <div className="flex items-center gap-1 justify-end">
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                      <span className="font-bold text-destructive">{equip.falhas}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">falhas</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold">{formatCurrency(equip.custoTotal)}</p>
                    <p className="text-xs text-muted-foreground">{equip.falhas} OS</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <Link to="/equipamentos">
            <Button variant="ghost" className="w-full gap-2 text-sm">
              Ver todos os equipamentos
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
