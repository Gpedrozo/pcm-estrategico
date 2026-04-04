import { useCallback, useEffect, useRef } from 'react';

/**
 * Persists form state in sessionStorage so the user can navigate away
 * and come back without losing data.
 *
 * @param key   unique key per form (e.g. "draft:fechar-os")
 * @param state current form state (must be JSON-serialisable)
 * @param setState setter to restore the saved draft
 */
export function useFormDraft<T>(
  key: string,
  state: T,
  setState: (val: T) => void,
) {
  const restoredRef = useRef(false);

  // Restore draft on mount (once)
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        setState(parsed);
      }
    } catch {
      // ignore corrupt data
    }
  }, [key, setState]);

  // Save draft on every state change (debounced via effect)
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // quota exceeded – ignore
    }
  }, [key, state]);

  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(key);
  }, [key]);

  return { clearDraft };
}
