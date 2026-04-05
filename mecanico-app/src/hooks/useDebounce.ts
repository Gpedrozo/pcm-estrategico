// ============================================================
// useDebounce — Debounce de valor para filtros/buscas
// Uso: const debouncedSearch = useDebounce(searchText, 300);
// ============================================================

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
