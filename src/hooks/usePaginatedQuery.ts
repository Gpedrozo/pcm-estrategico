import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo } from 'react';

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface SortingState {
  column: string;
  direction: 'asc' | 'desc';
}

export interface FilterState {
  [key: string]: string | string[] | undefined;
}

export interface UsePaginatedQueryOptions<T> {
  queryKey: string[];
  tableName: string;
  select?: string;
  defaultPageSize?: number;
  defaultSorting?: SortingState;
  filters?: FilterState;
  enabled?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  pageCount: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  pagination: PaginationState;
  sorting: SortingState | null;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  setSorting: React.Dispatch<React.SetStateAction<SortingState | null>>;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  filters: FilterState;
  refetch: () => void;
}

export function usePaginatedQuery<T>({
  queryKey,
  tableName,
  select = '*',
  defaultPageSize = 20,
  defaultSorting,
  filters: initialFilters = {},
  enabled = true,
}: UsePaginatedQueryOptions<T>): PaginatedResult<T> {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });
  
  const [sorting, setSorting] = useState<SortingState | null>(defaultSorting || null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // Build query key including pagination, sorting, and filters
  const fullQueryKey = useMemo(() => [
    ...queryKey,
    'paginated',
    pagination.pageIndex,
    pagination.pageSize,
    sorting?.column,
    sorting?.direction,
    JSON.stringify(filters),
  ], [queryKey, pagination, sorting, filters]);

  // Count query
  const { data: totalCount = 0 } = useQuery({
    queryKey: [...queryKey, 'count', JSON.stringify(filters)],
    queryFn: async () => {
      let query = supabase
        .from(tableName as any)
        .select('id', { count: 'exact', head: true });

      // Apply filters - using forEach with a local variable to avoid type inference issues
      const filterEntries = Object.entries(filters);
      for (const [key, value] of filterEntries) {
        if (value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            query = (query as any).in(key, value);
          } else if (typeof value === 'string' && value.includes('%')) {
            query = (query as any).ilike(key, value);
          } else {
            query = (query as any).eq(key, value);
          }
        }
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled,
  });

  // Data query with pagination
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: fullQueryKey,
    queryFn: async () => {
      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;

      let query = supabase
        .from(tableName as any)
        .select(select)
        .range(from, to);

      // Apply filters - using for...of to avoid type inference issues
      const filterEntries = Object.entries(filters);
      for (const [key, value] of filterEntries) {
        if (value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            query = (query as any).in(key, value);
          } else if (typeof value === 'string' && value.includes('%')) {
            query = (query as any).ilike(key, value);
          } else {
            query = (query as any).eq(key, value);
          }
        }
      }

      // Apply sorting
      if (sorting) {
        query = query.order(sorting.column, { ascending: sorting.direction === 'asc' });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as T[];
    },
    enabled,
  });

  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  return {
    data: data || [],
    totalCount,
    pageCount,
    isLoading,
    isError,
    error: error as Error | null,
    pagination,
    sorting,
    setPagination,
    setSorting,
    setFilters,
    filters,
    refetch,
  };
}

// Utility hook for simple search with debounce
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useMemo(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
