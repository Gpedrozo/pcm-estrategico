// ============================================================
// RealtimeProvider — Supabase Realtime channels for live sync
// Subscribes to key tables after JWT auth and notifies screens
// ============================================================

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

type RefreshCallback = () => void;

interface RealtimeContextValue {
  /** true when realtime channels are connected */
  connected: boolean;
  /** 'connected' | 'connecting' | 'disconnected' */
  status: 'connected' | 'connecting' | 'disconnected';
  /** Register a callback to be called when any subscribed table changes */
  subscribe: (key: string, cb: RefreshCallback) => void;
  /** Unregister a callback */
  unsubscribe: (key: string) => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  connected: false,
  status: 'disconnected',
  subscribe: () => {},
  unsubscribe: () => {},
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

const WATCHED_TABLES = [
  'ordens_servico',
  'execucoes_os',
  'solicitacoes_manutencao',
  'equipamentos',
  'maintenance_schedule',
];

const DEBOUNCE_MS = 500;

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { empresaId, isLoggedIn, isDeviceBound } = useAuth();
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const listenersRef = useRef<Map<string, RefreshCallback>>(new Map());
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subscribe = useCallback((key: string, cb: RefreshCallback) => {
    listenersRef.current.set(key, cb);
  }, []);

  const unsubscribe = useCallback((key: string) => {
    listenersRef.current.delete(key);
  }, []);

  const notifyAll = useCallback(() => {
    // Debounce: batch rapid changes into one refresh
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      listenersRef.current.forEach((cb) => {
        try { cb(); } catch {}
      });
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    // Only connect when we have a valid session (JWT authenticated + empresa)
    if (!empresaId || !isDeviceBound) {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');
    const channels: RealtimeChannel[] = [];

    WATCHED_TABLES.forEach((table) => {
      const channel = supabase
        .channel(`realtime-${table}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: `empresa_id=eq.${empresaId}`,
          },
          () => { notifyAll(); }
        )
        .subscribe((st) => {
          if (st === 'SUBSCRIBED') {
            // Check if all channels are subscribed
            const allReady = channels.every((ch) => (ch as any).state === 'joined');
            if (allReady) setStatus('connected');
          }
        });

      channels.push(channel);
    });

    channelsRef.current = channels;

    // After a short delay, if some channels connected, mark as connected
    const fallback = setTimeout(() => {
      if (channels.length > 0) setStatus('connected');
    }, 3000);

    return () => {
      clearTimeout(fallback);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      channels.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
      setStatus('disconnected');
    };
  }, [empresaId, isDeviceBound, notifyAll]);

  return (
    <RealtimeContext.Provider
      value={{
        connected: status === 'connected',
        status,
        subscribe,
        unsubscribe,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
