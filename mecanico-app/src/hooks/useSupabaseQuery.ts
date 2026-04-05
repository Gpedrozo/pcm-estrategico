// ============================================================
// useSupabaseQuery — Hook padronizado para data fetching
// Unifica: loading, error, data, refresh, pull-to-refresh
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSupabaseQueryOptions {
  /** Se false, a query não é executada automaticamente */
  enabled?: boolean;
}

interface UseSupabaseQueryReturn<T> {
  /** Dados retornados */
  data: T | null;
  /** Carregando pela primeira vez */
  loading: boolean;
  /** Erro da última execução */
  error: string | null;
  /** Pull-to-refresh em andamento */
  refreshing: boolean;
  /** Recarregar dados (full loading indicator) */
  reload: () => Promise<void>;
  /** Refresh silencioso (pull-to-refresh, sem loading full) */
  refresh: () => Promise<void>;
}

export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: { message: string } | null }>,
  deps: any[],
  options?: UseSupabaseQueryOptions,
): UseSupabaseQueryReturn<T> {
  const { enabled = true } = options || {};
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      if (!mountedRef.current) return;

      if (result.error) {
        setError(result.error.message);
      } else {
        setData(result.data);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err?.message || 'Erro inesperado ao carregar dados.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  // Carregamento inicial e ao trocar deps
  useEffect(() => {
    load();
  }, [load]);

  const reload = useCallback(async () => {
    await load(false);
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
  }, [load]);

  return { data, loading, error, refreshing, reload, refresh };
}
