import { cn } from '@/lib/utils';
import type { StatusOS } from '@/types';

interface OSStatusBadgeProps {
  status: StatusOS;
  className?: string;
}

const statusConfig: Record<StatusOS, { label: string; className: string }> = {
  ABERTA: { label: 'Aberta', className: 'status-aberta' },
  EM_ANDAMENTO: { label: 'Em Andamento', className: 'status-andamento' },
  AGUARDANDO_MATERIAL: { label: 'Aguard. Material', className: 'bg-orange-500/10 text-orange-500 border border-orange-500/20' },
  AGUARDANDO_APROVACAO: { label: 'Aguard. Aprovação', className: 'bg-purple-500/10 text-purple-500 border border-purple-500/20' },
  FECHADA: { label: 'Fechada', className: 'status-fechada' },
};

export function OSStatusBadge({ status, className }: OSStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium", config.className, className)}>
      {config.label}
    </span>
  );
}
