import { useState, useCallback, useMemo } from 'react';
import { useEquipamentosSearch } from '@/hooks/useDashboardOptimized';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Equipamentos Async Search Component
 * 
 * Features:
 * - Server-side search with debounce
 * - Pagination (50 items per page)
 * - Real-time result count
 * - Max 50 items loaded at a time
 * 
 * Replaces: old "carrega todos os 5000+ equipamentos"
 */
interface EquipamentosSearchProps {
  onSelect?: (equipamento: any) => void;
  disabled?: boolean;
}

export function EquipamentosAsyncSearch({ onSelect, disabled }: EquipamentosSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);

    if (debounceTimer) clearTimeout(debounceTimer);

    const timer = setTimeout(() => {
      setDebouncedSearch(term);
      setPage(0); // Reset pagination on new search
    }, 300); // 300ms debounce

    setDebounceTimer(timer);
  }, [debounceTimer]);

  // Query with debounced search
  const { data, isLoading, error } = useEquipamentosSearch(debouncedSearch, page);

  const handleSelect = useCallback(
    (equipamento: any) => {
      onSelect?.(equipamento);
      setSearchTerm('');
      setDebouncedSearch('');
      setPage(0);
    },
    [onSelect]
  );

  const hasResults = data?.items && data.items.length > 0;
  const isLastPage = !data?.hasMore;

  return (
    <div className="space-y-2">
      <Input
        type="text"
        placeholder="Buscar equipamento (nome, localização, modelo)..."
        value={searchTerm}
        onChange={(e) => handleSearchChange(e.target.value)}
        disabled={disabled || isLoading}
        className="w-full"
      />

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Buscando...
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500">
          Erro na busca: {error instanceof Error ? error.message : 'Desconhecido'}
        </p>
      )}

      {hasResults && (
        <Card className="max-h-72 overflow-y-auto">
          <ul className="divide-y">
            {data.items.map((item: any) => (
              <li key={item.id}>
                <button
                  onClick={() => handleSelect(item)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition"
                >
                  <div className="font-medium text-sm">{item.nome}</div>
                  <div className="text-xs text-gray-500">
                    {item.tipo && `${item.tipo} • `}
                    {item.localizacao && `Loc: ${item.localizacao}`}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {/* Pagination controls */}
          {data.total > 50 && (
            <div className="flex items-center justify-between border-t px-3 py-2 bg-gray-50">
              <span className="text-xs text-gray-600">
                Página {page + 1} de {Math.ceil(data.total / 50)} ({data.total} total)
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isLastPage}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {!isLoading && debouncedSearch && !hasResults && (
        <p className="text-sm text-gray-500">Nenhum equipamento encontrado para "{debouncedSearch}"</p>
      )}

      {!searchTerm && !isLoading && (
        <p className="text-xs text-gray-400">Digite para buscar equipamentos (máx 50 por página)</p>
      )}
    </div>
  );
}
