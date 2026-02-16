import { Progress } from '@/components/ui/progress';

interface ConfidenceScoreBarProps {
  score: number;
}

export function ConfidenceScoreBar({ score }: ConfidenceScoreBarProps) {
  const getColor = () => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getLabel = () => {
    if (score >= 80) return 'Alta Confiança';
    if (score >= 60) return 'Confiança Moderada';
    if (score >= 40) return 'Confiança Baixa';
    return 'Confiança Muito Baixa';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Score de Confiança</span>
        <span className={`text-lg font-bold ${getColor()}`}>{score}%</span>
      </div>
      <Progress value={score} className="h-3" />
      <p className={`text-xs font-medium ${getColor()}`}>{getLabel()}</p>
    </div>
  );
}
