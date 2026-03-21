import { useTenantAdminConfig } from '@/hooks/useTenantAdminConfig';

export interface TenantPadronizacoesConfig {
  classificacoes_os: string[];
  prioridades_os: string[];
  status_os: string[];
  tipos_falha: string[];
}

export const TENANT_PADRONIZACOES_DEFAULT: TenantPadronizacoesConfig = {
  classificacoes_os: ['EMERGENCIAL', 'URGENTE', 'PROGRAMAVEL'],
  prioridades_os: ['URGENTE', 'ALTA', 'MEDIA', 'BAIXA'],
  status_os: ['ABERTA', 'EM_ANDAMENTO', 'PENDENTE', 'CONCLUIDA'],
  tipos_falha: ['ELETRICA', 'MECANICA', 'INSTRUMENTACAO', 'LUBRIFICACAO'],
};

const SLA_CLASSIFICACAO_DEFAULT: Record<string, number> = {
  EMERGENCIAL: 2,
  URGENTE: 8,
  PROGRAMAVEL: 72,
};

export function useTenantPadronizacoes() {
  return useTenantAdminConfig<TenantPadronizacoesConfig>(
    'tenant.admin.padronizacoes',
    TENANT_PADRONIZACOES_DEFAULT,
  );
}

export function resolveSlaHorasByClassificacao(classificacao: string | null | undefined): number {
  const key = String(classificacao ?? '').trim().toUpperCase();
  if (!key) return SLA_CLASSIFICACAO_DEFAULT.PROGRAMAVEL;
  return SLA_CLASSIFICACAO_DEFAULT[key] ?? SLA_CLASSIFICACAO_DEFAULT.PROGRAMAVEL;
}

export function resolvePrioridadeFromClassificacao(classificacao: string | null | undefined): string {
  const key = String(classificacao ?? '').trim().toUpperCase();
  if (key === 'EMERGENCIAL') return 'URGENTE';
  if (key === 'URGENTE') return 'ALTA';
  return 'MEDIA';
}

export function getPriorityToneClass(priority: string, prioritiesOrder?: string[]): string {
  const normalized = String(priority ?? '').trim().toUpperCase();
  const order = (prioritiesOrder ?? TENANT_PADRONIZACOES_DEFAULT.prioridades_os).map((item) => item.toUpperCase());
  const index = order.findIndex((item) => item === normalized);

  if (index === 0) return 'bg-destructive/10 text-destructive';
  if (index === 1) return 'bg-warning/10 text-warning';
  if (index === 2) return 'bg-info/10 text-info';
  return 'bg-muted text-muted-foreground';
}
