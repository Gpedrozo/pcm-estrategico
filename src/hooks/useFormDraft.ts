import { useCallback, useEffect, useRef } from 'react';

/**
 * Reads a draft from sessionStorage synchronously.
 * Call this INSIDE a useState initializer to avoid the 1-frame flash.
 *
 * Usage:
 *   const [formData, setFormData] = useState(() => readDraft('draft:my-form') ?? defaultValue);
 */
export function readDraft<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore corrupt data
  }
  return null;
}

/**
 * Persists form state in sessionStorage so the user can navigate away
 * and come back without losing data.
 *
 * @param key   unique key per form (e.g. "draft:fechar-os")
 * @param state current form state (must be JSON-serialisable)
 * @param setState setter to restore the saved draft (only used for backward compat)
 */
export function useFormDraft<T>(
  key: string,
  state: T,
  setState?: (val: T) => void,
) {
  const restoredRef = useRef(false);

  // Backward-compatible: restore via callback on mount (once) if setState provided
  useEffect(() => {
    if (!setState || restoredRef.current) return;
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

  // Save draft on every state change
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
