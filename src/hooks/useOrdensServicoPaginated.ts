import { usePaginatedQuery, FilterState } from './usePaginatedQuery';
import { OrdemServicoRow } from './useOrdensServico';

export interface UseOrdensServicoPaginatedOptions {
  pageSize?: number;
  status?: string[];
  tipo?: string;
  prioridade?: string;
  searchTerm?: string;
}

export function useOrdensServicoPaginated(options: UseOrdensServicoPaginatedOptions = {}) {
  const { pageSize = 20, status, tipo, prioridade, searchTerm } = options;

  const filters: FilterState = {};
  
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
    queryKey: ['ordens-servico'],
    tableName: 'ordens_servico',
    select: '*',
    defaultPageSize: pageSize,
    defaultSorting: { column: 'numero_os', direction: 'desc' },
    filters,
  });
}

export function useBacklogPaginated(pageSize = 20) {
  return usePaginatedQuery<OrdemServicoRow>({
    queryKey: ['backlog'],
    tableName: 'ordens_servico',
    select: '*',
    defaultPageSize: pageSize,
    defaultSorting: { column: 'data_solicitacao', direction: 'asc' },
    filters: {
      status: ['ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_MATERIAL', 'AGUARDANDO_APROVACAO'],
    },
  });
}
