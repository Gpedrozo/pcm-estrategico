/**
 * FASE 3.1 IMPLEMENTATION START
 * React Hook: useElectronOfflineSync
 * Date: 2026-04-02
 * 
 * Hook for Electron-based offline sync (replaces useOfflineSync for desktop)
 * Used in components to show sync status UI
 */

import { useEffect, useState, useCallback } from 'react';

declare global {
  interface Window {
    api?: {
      db: any;
      sync: any;
      auth: any;
      connection: any;
    };
  }
}

export interface ElectronSyncStatus {
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  isSyncing: boolean;
  error: string | null;
}

/**
 * Hook for monitoring Electron sync status (Desktop app only)
 * Returns: { isOnline, pendingCount, isSyncing, error, lastSyncAt }
 * 
 * Usage in component:
 * const { isOnline, pendingCount, error } = useElectronOfflineSync();
 */
export function useElectronOfflineSync() {
  const [status, setStatus] = useState<ElectronSyncStatus>({
    isOnline: true,
    pendingCount: 0,
    lastSyncAt: null,
    isSyncing: false,
    error: null,
  });

  // Check initial connection status
  useEffect(() => {
    const checkInitial = async () => {
      if (typeof window === 'undefined' || !window.api) {
        console.warn('[UseSync] Not running in Electron environment');
        return;
      }

      try {
        const { isOnline } = await window.api.connection.check();
        const syncStatus = await window.api.sync.getStatus();
        
        setStatus({
          isOnline,
          pendingCount: syncStatus.pendingCount || 0,
          lastSyncAt: syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt) : null,
          isSyncing: false,
          error: null,
        });
      } catch (err) {
        console.error('[UseSync] Initial check error:', err);
      }
    };

    checkInitial();
  }, []);

  // Listen for online event
  useEffect(() => {
    if (typeof window === 'undefined' || !window.api) return;

    const unsubscribeOnline = window.api.connection.onOnline?.(() => {
      console.log('[UseSync] Going online');
      setStatus((prev) => ({ ...prev, isOnline: true, error: null }));
    });

    return () => unsubscribeOnline?.();
  }, []);

  // Listen for offline event
  useEffect(() => {
    if (typeof window === 'undefined' || !window.api) return;

    const unsubscribeOffline = window.api.connection.onOffline?.(() => {
      console.log('[UseSync] Going offline');
      setStatus((prev) => ({ ...prev, isOnline: false }));
    });

    return () => unsubscribeOffline?.();
  }, []);

  // Listen for sync started
  useEffect(() => {
    if (typeof window === 'undefined' || !window.api) return;

    const unsubscribeSyncStarted = window.api.sync.onSyncStarted?.(() => {
      console.log('[UseSync] Sync started');
      setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    });

    return () => unsubscribeSyncStarted?.();
  }, []);

  // Listen for sync complete
  useEffect(() => {
    if (typeof window === 'undefined' || !window.api) return;

    const unsubscribeSyncComplete = window.api.sync.onSyncComplete?.((result: any) => {
      console.log('[UseSync] Sync complete:', result);
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        pendingCount: result.pendingCount || 0,
        lastSyncAt: new Date(),
        error: null,
      }));
    });

    return () => unsubscribeSyncComplete?.();
  }, []);

  // Listen for sync error
  useEffect(() => {
    if (typeof window === 'undefined' || !window.api) return;

    const unsubscribeSyncError = window.api.sync.onSyncError?.((error: string) => {
      console.error('[UseSync] Sync error:', error);
      setStatus((prev) => ({ ...prev, isSyncing: false, error }));
    });

    return () => unsubscribeSyncError?.();
  }, []);

  // Periodic status check (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (typeof window === 'undefined' || !window.api) return;

      try {
        const syncStatus = await window.api.sync.getStatus();
        setStatus((prev) => ({
          ...prev,
          pendingCount: syncStatus.pendingCount || 0,
          lastSyncAt: syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt) : prev.lastSyncAt,
        }));
      } catch (err) {
        console.error('[UseSync] Status check error:', err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return status;
}
