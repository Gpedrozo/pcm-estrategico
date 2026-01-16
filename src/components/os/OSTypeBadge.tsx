import { cn } from '@/lib/utils';
import type { TipoOS } from '@/types';

interface OSTypeBadgeProps {
  tipo: TipoOS;
  className?: string;
}

const tipoConfig: Record<TipoOS, { label: string; className: string }> = {
  CORRETIVA: { label: 'Corretiva', className: 'bg-destructive/10 text-destructive border border-destructive/20' },
  PREVENTIVA: { label: 'Preventiva', className: 'bg-info/10 text-info border border-info/20' },
  PREDITIVA: { label: 'Preditiva', className: 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20' },
  INSPECAO: { label: 'Inspeção', className: 'bg-amber-500/10 text-amber-500 border border-amber-500/20' },
  MELHORIA: { label: 'Melhoria', className: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' },
};

export function OSTypeBadge({ tipo, className }: OSTypeBadgeProps) {
  const config = tipoConfig[tipo];
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium", config.className, className)}>
      {config.label}
    </span>
  );
}
