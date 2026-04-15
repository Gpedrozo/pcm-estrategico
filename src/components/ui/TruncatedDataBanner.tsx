import { AlertTriangle } from 'lucide-react';

interface TruncatedDataBannerProps {
  visible: boolean;
  limit?: number;
  entity?: string;
}

/**
 * Exibe aviso quando uma listagem foi truncada pelo limite de consulta.
 * Usar em páginas cujos hooks retornam `isTruncated: true`.
 */
export function TruncatedDataBanner({ visible, limit = 500, entity }: TruncatedDataBannerProps) {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        {entity
          ? `Exibindo apenas os ${limit} ${entity} mais recentes.`
          : `Exibindo apenas os ${limit} registros mais recentes.`}{' '}
        Use filtros ou a exportação para acessar o histórico completo.
      </span>
    </div>
  );
}
