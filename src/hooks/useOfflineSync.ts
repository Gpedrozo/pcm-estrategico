import { useState, useEffect, useCallback } from 'react';
import {
  getPendingActions,
  isOnline as checkOnline,
  syncPendingActions,
  registerAutoSync,
  addPendingAction,
  cacheOrdens,
  getOrdensCache,
} from '@/lib/offlineSync';
import { supabase } from '@/integrations/supabase/client';

interface OfflineState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSync: Date | null;
}

/**
 * Hook que gerencia estado offline/online e sincronização de ações pendentes.
 * Usado pelas telas do mecânico mobile.
 */
export function useOfflineSync() {
  const [state, setState] = useState<OfflineState>({
    isOnline: checkOnline(),
    pendingCount: 0,
    isSyncing: false,
    lastSync: null,
  });

  const refreshPending = useCallback(async () => {
    const actions = await getPendingActions();
    setState(prev => ({ ...prev, pendingCount: actions.length }));
  }, []);

  // Executor que processa ações pendentes
  const executor = useCallback(async (action: { tipo: string; payload: Record<string, unknown> }) => {
    switch (action.tipo) {
      case 'UPDATE_OS': {
        const { id, empresa_id, ...updates } = action.payload;
        if (!empresa_id) return false;
        const q = supabase.from('ordens_servico').update(updates).eq('id', id as string).eq('empresa_id', empresa_id as string);
        const { error } = await q;
        return !error;
      }
      case 'CREATE_SOLICITACAO': {
        if (!action.payload.empresa_id) return false;
        const { error } = await supabase.from('solicitacoes').insert(action.payload);
        return !error;
      }
      case 'UPLOAD_FOTO': {
        // Fotos offline são tratadas separadamente (blob storage)
        return true;
      }
      default:
        return false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshPending();
    const cleanup = registerAutoSync(executor);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      cleanup();
    };
  }, [executor, refreshPending]);

  const syncNow = useCallback(async () => {
    if (!checkOnline()) return;
    setState(prev => ({ ...prev, isSyncing: true }));
    await syncPendingActions(executor);
    await refreshPending();
    setState(prev => ({ ...prev, isSyncing: false, lastSync: new Date() }));
  }, [executor, refreshPending]);

  const queueAction = useCallback(async (tipo: 'UPDATE_OS' | 'CREATE_SOLICITACAO' | 'UPLOAD_FOTO', payload: Record<string, unknown>) => {
    await addPendingAction({ tipo, payload });
    await refreshPending();
  }, [refreshPending]);

  return {
    ...state,
    syncNow,
    queueAction,
    cacheOrdens,
    getOrdensCache,
    refreshPending,
  };
}
