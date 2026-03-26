/**
 * offlineSync.ts — Infraestrutura offline para o APK do mecânico.
 * 
 * Usa IndexedDB para armazenar:
 * - Cache de OS do mecânico (leitura offline)
 * - Fila de ações pendentes (escrita offline → sync quando online)
 * - Fotos capturadas offline (blobs)
 * 
 * Sincroniza automaticamente quando detecta conexão.
 */

const DB_NAME = 'pcm_offline';
const DB_VERSION = 1;

interface PendingAction {
  id: string;
  tipo: 'UPDATE_OS' | 'CREATE_SOLICITACAO' | 'UPLOAD_FOTO';
  payload: Record<string, unknown>;
  criado_em: string;
  tentativas: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('ordens_cache')) {
        db.createObjectStore('ordens_cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending_actions')) {
        db.createObjectStore('pending_actions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('fotos_offline')) {
        db.createObjectStore('fotos_offline', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('device_config')) {
        db.createObjectStore('device_config', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ─── Ordens Cache ─── */

export async function cacheOrdens(ordens: Record<string, unknown>[]) {
  const db = await openDB();
  const tx = db.transaction('ordens_cache', 'readwrite');
  const store = tx.objectStore('ordens_cache');
  // Limpa e reescreve
  store.clear();
  for (const os of ordens) {
    store.put(os);
  }
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOrdensCache(): Promise<Record<string, unknown>[]> {
  const db = await openDB();
  const tx = db.transaction('ordens_cache', 'readonly');
  const store = tx.objectStore('ordens_cache');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ─── Pending Actions (fila de sync) ─── */

export async function addPendingAction(action: Omit<PendingAction, 'id' | 'criado_em' | 'tentativas'>) {
  const db = await openDB();
  const tx = db.transaction('pending_actions', 'readwrite');
  const store = tx.objectStore('pending_actions');
  const entry: PendingAction = {
    ...action,
    id: crypto.randomUUID(),
    criado_em: new Date().toISOString(),
    tentativas: 0,
  };
  store.put(entry);
  return new Promise<PendingAction>((resolve, reject) => {
    tx.oncomplete = () => resolve(entry);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingActions(): Promise<PendingAction[]> {
  const db = await openDB();
  const tx = db.transaction('pending_actions', 'readonly');
  const store = tx.objectStore('pending_actions');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function removePendingAction(id: string) {
  const db = await openDB();
  const tx = db.transaction('pending_actions', 'readwrite');
  tx.objectStore('pending_actions').delete(id);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updatePendingActionRetry(id: string) {
  const db = await openDB();
  const tx = db.transaction('pending_actions', 'readwrite');
  const store = tx.objectStore('pending_actions');
  return new Promise<void>((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => {
      const action = req.result as PendingAction;
      if (action) {
        action.tentativas += 1;
        store.put(action);
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/* ─── Fotos Offline ─── */

export async function saveFotoOffline(id: string, blob: Blob, osId: string) {
  const db = await openDB();
  const tx = db.transaction('fotos_offline', 'readwrite');
  tx.objectStore('fotos_offline').put({ id, blob, osId, criado_em: new Date().toISOString() });
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getFotosOffline(osId?: string): Promise<{ id: string; blob: Blob; osId: string }[]> {
  const db = await openDB();
  const tx = db.transaction('fotos_offline', 'readonly');
  const store = tx.objectStore('fotos_offline');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result;
      resolve(osId ? all.filter((f: { osId: string }) => f.osId === osId) : all);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function removeFotoOffline(id: string) {
  const db = await openDB();
  const tx = db.transaction('fotos_offline', 'readwrite');
  tx.objectStore('fotos_offline').delete(id);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ─── Device Config (vinculação do device) ─── */

export async function saveDeviceConfig(key: string, value: unknown) {
  const db = await openDB();
  const tx = db.transaction('device_config', 'readwrite');
  tx.objectStore('device_config').put({ key, value });
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDeviceConfig(key: string): Promise<unknown | null> {
  const db = await openDB();
  const tx = db.transaction('device_config', 'readonly');
  const store = tx.objectStore('device_config');
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearDeviceConfig() {
  const db = await openDB();
  const tx = db.transaction('device_config', 'readwrite');
  tx.objectStore('device_config').clear();
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ─── Network status + Auto-sync ─── */

export function isOnline(): boolean {
  return navigator.onLine;
}

let syncInProgress = false;

export async function syncPendingActions(
  executor: (action: PendingAction) => Promise<boolean>,
): Promise<{ synced: number; failed: number }> {
  if (syncInProgress) return { synced: 0, failed: 0 };
  syncInProgress = true;
  let synced = 0;
  let failed = 0;

  try {
    const actions = await getPendingActions();
    for (const action of actions) {
      if (!isOnline()) break;
      try {
        const ok = await executor(action);
        if (ok) {
          await removePendingAction(action.id);
          synced++;
        } else {
          await updatePendingActionRetry(action.id);
          failed++;
        }
      } catch {
        await updatePendingActionRetry(action.id);
        failed++;
      }
    }
  } finally {
    syncInProgress = false;
  }

  return { synced, failed };
}

export function registerAutoSync(executor: (action: PendingAction) => Promise<boolean>) {
  const doSync = () => {
    if (isOnline()) syncPendingActions(executor);
  };
  window.addEventListener('online', doSync);
  // Sync a cada 60s se online
  const interval = setInterval(() => {
    if (isOnline()) syncPendingActions(executor);
  }, 60000);

  return () => {
    window.removeEventListener('online', doSync);
    clearInterval(interval);
  };
}
