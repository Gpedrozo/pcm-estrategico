// ============================================================
// useRealtimeRefresh — Auto-refresh hook for screens
// Registers a callback with RealtimeProvider that fires
// when any watched table changes for the current empresa.
// ============================================================

import { useEffect, useRef } from 'react';
import { useRealtime } from '../contexts/RealtimeProvider';

/**
 * Calls `onRefresh` automatically when Supabase Realtime detects
 * a change in any of the watched tables.
 *
 * @param key   Unique key for this subscription (e.g. screen name)
 * @param onRefresh  Function to reload data
 */
export function useRealtimeRefresh(key: string, onRefresh: () => void) {
  const { subscribe, unsubscribe } = useRealtime();
  const cbRef = useRef(onRefresh);
  cbRef.current = onRefresh;

  useEffect(() => {
    const handler = () => cbRef.current();
    subscribe(key, handler);
    return () => unsubscribe(key);
  }, [key, subscribe, unsubscribe]);
}
