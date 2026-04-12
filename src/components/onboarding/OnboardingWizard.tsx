import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlantas } from '@/hooks/useHierarquia';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useMecanicos } from '@/hooks/useMecanicos';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, ArrowRight, Factory, Wrench, Users, FileText, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  href: string;
}

export function OnboardingWizard() {
  const { user: _user } = useAuth();
  const { data: plantas } = usePlantas();
  const { data: equipamentos } = useEquipamentos();
  const { data: mecanicos } = useMecanicos();
  const { data: ordens } = useOrdensServico();

  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('pcm-onboarding-dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const steps = useMemo((): OnboardingStep[] => [
    {
      id: 'hierarquia',
      title: 'Cadastrar Hierarquia',
      description: 'Crie plantas, áreas e sistemas para organizar seus ativos.',
      icon: Factory,
      completed: (plantas?.length ?? 0) > 0,
      href: '/hierarquia',
    },
    {
      id: 'equipamentos',
      title: 'Cadastrar Equipamentos',
      description: 'Adicione equipamentos com TAG, criticidade e localização.',
      icon: Wrench,
      completed: (equipamentos?.length ?? 0) > 0,
      href: '/equipamentos',
    },
    {
      id: 'mecanicos',
      title: 'Cadastrar Mecânicos',
      description: 'Registre sua equipe técnica para atribuição de OS.',
      icon: Users,
      completed: (mecanicos?.length ?? 0) > 0,
      href: '/mecanicos',
    },
    {
      id: 'os',
      title: 'Emitir Primeira OS',
      description: 'Crie uma ordem de serviço para iniciar o controle de manutenção.',
      icon: FileText,
      completed: (ordens?.length ?? 0) > 0,
      href: '/os/nova',
    },
  ], [plantas, equipamentos, mecanicos, ordens]);

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = Math.round((completedCount / steps.length) * 100);
  const allComplete = completedCount === steps.length;

  if (dismissed || allComplete) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('pcm-onboarding-dismissed', 'true');
    } catch {
      // Ignore localStorage errors
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Configuração Inicial
          </CardTitle>
          <button
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Dispensar
          </button>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedCount}/{steps.length} etapas concluídas
            </span>
            <Badge variant="secondary">{progress}%</Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.id}
              to={step.href}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                step.completed
                  ? 'bg-green-50 dark:bg-green-950/20'
                  : 'bg-background hover:bg-accent'
              }`}
            >
              {step.completed ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${step.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">{step.description}</p>
              </div>
              <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              {!step.completed && <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
