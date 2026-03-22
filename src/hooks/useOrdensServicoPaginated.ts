import { usePaginatedQuery, FilterState } from './usePaginatedQuery';
import { OrdemServicoRow } from './useOrdensServico';
import { useAuth } from '@/contexts/AuthContext';

export interface UseOrdensServicoPaginatedOptions {
  pageSize?: number;
  status?: string[];
  tipo?: string;
  prioridade?: string;
  searchTerm?: string;
}

export function useOrdensServicoPaginated(options: UseOrdensServicoPaginatedOptions = {}) {
  const { pageSize = 20, status, tipo, prioridade, searchTerm } = options;
  const { tenantId } = useAuth();

  const filters: FilterState = {};

  if (tenantId) {
    filters.empresa_id = tenantId;
  }
  if (status && status.length > 0) {
    filters.status = status;
  }
  if (tipo) {
    filters.tipo = tipo;
  }
  if (prioridade) {
    filters.prioridade = prioridade;
  }
  if (searchTerm) {
    filters.equipamento = `%${searchTerm}%`;
  }

  return usePaginatedQuery<OrdemServicoRow>({
    queryKey: ['ordens-servico', tenantId],
    tableName: 'ordens_servico',
    select: '*',
    defaultPageSize: pageSize,
    defaultSorting: { column: 'numero_os', direction: 'desc' },
    filters,
    enabled: !!tenantId,
  });
}

export function useBacklogPaginated(pageSize = 20) {
  const { tenantId } = useAuth();

  return usePaginatedQuery<OrdemServicoRow>({
    queryKey: ['backlog', tenantId],
    tableName: 'ordens_servico',
    select: '*',
    defaultPageSize: pageSize,
    defaultSorting: { column: 'data_solicitacao', direction: 'asc' },
    filters: {
      empresa_id: tenantId || '',
      status: ['ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_MATERIAL', 'AGUARDANDO_APROVACAO'],
    },
    enabled: !!tenantId,
  });
}
