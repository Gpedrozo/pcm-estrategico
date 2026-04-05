// ============================================================
// Sync Engine — Background sync with exponential backoff
// ============================================================

import * as Network from 'expo-network';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY, createAuthenticatedClient } from './supabase';
import {
  getPendingSyncItems,
  markSyncItemDone,
  markSyncItemError,
  upsertOrdemServico,
  upsertExecucao,
  upsertEquipamento,
  upsertMecanico,
  upsertMaterial,
  upsertDocumento,
  upsertParada,
  upsertRequisicao,
  upsertSolicitacao,
  getDeviceConfig,
  saveDeviceConfig,
} from './database';

const MAX_RETRIES = 5;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncPromise: Promise<{ pushed: number; pulled: boolean }> | null = null;

// ============================================================
// Sync event listeners — notify consumers when sync completes
// ============================================================

type SyncListener = () => void;
const syncListeners: Set<SyncListener> = new Set();

/** Register a callback invoked after every successful sync cycle. Returns unsubscribe fn. */
export function onSyncComplete(fn: SyncListener): () => void {
  syncListeners.add(fn);
  return () => { syncListeners.delete(fn); };
}

function notifySyncListeners() {
  syncListeners.forEach((fn) => { try { fn(); } catch {} });
}

export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

// ============================================================
// Push — Send pending local changes to server
// ============================================================

async function pushPendingChanges(db: SupabaseClient): Promise<number> {
  const items = await getPendingSyncItems();
  let synced = 0;

  for (const item of items) {
    if (item.retry_count >= MAX_RETRIES) continue;

    try {
      const payload = JSON.parse(item.payload);
      const table = item.table_name;

      if (item.operation === 'INSERT' || item.operation === 'UPDATE') {
        // Remove local-only fields before sending
        const { sync_status, local_updated_at, fotos, ...serverPayload } = payload;

        const { error } = await db.from(table).upsert(serverPayload);
        if (error) throw error;

        // If execucao with fotos, upload them
        if (table === 'execucoes_os' && fotos && Array.isArray(fotos)) {
          for (const fotoUri of fotos) {
            try {
              await uploadPhoto(db, payload.id, fotoUri, payload.empresa_id);
            } catch (photoErr) {
              console.warn('[sync] photo upload failed:', photoErr);
            }
          }
        }
      } else if (item.operation === 'DELETE') {
        const { error } = await db.from(table).delete().eq('id', item.record_id);
        if (error) throw error;
      }

      await markSyncItemDone(item.id);
      synced++;
    } catch (err: any) {
      await markSyncItemError(item.id, err?.message || String(err));
    }
  }

  return synced;
}

async function uploadPhoto(db: SupabaseClient, execucaoId: string, localUri: string, empresaId: string): Promise<void> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const ext = localUri.split('.').pop() || 'jpg';
  const path = `${empresaId}/execucoes/${execucaoId}/${Date.now()}.${ext}`;

  const { error } = await db.storage
    .from('execucoes-fotos')
    .upload(path, blob, { contentType: `image/${ext}` });

  if (error) throw error;
}

// ============================================================
// Pull — Fetch latest data from server into local DB
// ============================================================

// Module-level cached access token for authenticated queries
let cachedAccessToken: string | null = null;

/**
 * Get an access token from:
 * 1. Existing supabase session
 * 2. Module-level cached token
 * 3. Persisted token in SQLite device_config
 * 4. Edge function re-auth using device_token
 */
export async function getAccessToken(): Promise<string | null> {
  // 1. Check existing supabase session
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      cachedAccessToken = session.access_token;
      return session.access_token;
    }
  } catch { /* ignore */ }

  // 2. Use module-level cached token if available
  if (cachedAccessToken) {
    console.log('[sync] using cached access_token');
    return cachedAccessToken;
  }

  // 3. Check persisted token in SQLite
  const persistedToken = await getDeviceConfig('access_token');
  if (persistedToken) {
    console.log('[sync] using persisted access_token from device_config');
    cachedAccessToken = persistedToken;
    return persistedToken;
  }

  // 4. Re-auth via edge function
  const deviceToken = await getDeviceConfig('device_token');
  if (!deviceToken) {
    console.warn('[sync] no device_token — cannot authenticate');
    return null;
  }

  console.log('[sync] no session, re-authenticating via edge function...');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/mecanico-device-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ device_token: deviceToken }),
    });

    const data = await response.json();
    if (!data?.ok || !data?.access_token) {
      console.warn('[sync] edge function re-auth failed:', data?.error || 'unknown');
      return null;
    }

    console.log('[sync] got access_token from edge function');
    cachedAccessToken = data.access_token;

    // Persist token in SQLite for next sync cycle
    await saveDeviceConfig('access_token', data.access_token);
    if (data.refresh_token) {
      await saveDeviceConfig('refresh_token', data.refresh_token);
    }

    // Also try setSession (best-effort, non-blocking)
    supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    }).then(({ error }) => {
      if (error) console.warn('[sync] setSession failed (non-fatal):', error.message);
      else console.log('[sync] setSession succeeded');
    }).catch(() => {});

    return data.access_token;
  } catch (err) {
    console.warn('[sync] re-auth fetch error:', err);
    return null;
  }
}

export async function pullData(empresaId: string, forceFullRefresh = false, db?: SupabaseClient): Promise<void> {
  if (!empresaId) return;

  // If no authenticated client provided, create one
  if (!db) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.warn('[sync] pullData aborted — no access token');
      return;
    }
    db = createAuthenticatedClient(accessToken);
  }
  console.log('[sync] pullData starting with authenticated client...');

  // Incremental sync: use last_sync_timestamp to only fetch changed records
  // forceFullRefresh = true when user manually pulls to refresh
  const lastSync = forceFullRefresh ? null : await getDeviceConfig('last_sync_timestamp');
  const sinceTs = lastSync || '1970-01-01T00:00:00Z';

  // Helper: build query with optional updated_at filter
  function withTimestamp(query: any) {
    if (lastSync) {
      return query.gte('updated_at', sinceTs);
    }
    return query;
  }

  // Pull Ordens de Servico
  const { data: osList, error: osError } = await withTimestamp(
    db
    .from('ordens_servico')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('data_solicitacao', { ascending: false })
  ).limit(1000);

  if (osError) {
    console.error('[sync] ordens_servico error:', osError.message, osError.code, osError.details);
  }

  if (osList) {
    for (const os of osList) {
      await upsertOrdemServico(os);
    }
    console.log(`[sync] pulled ${osList.length} OS${lastSync ? ' (incremental)' : ' (full)'}`);
  } else {
    console.warn('[sync] ordens_servico returned null/empty');
  }

  // Pull Execucoes
  const { data: execList } = await withTimestamp(
    db
    .from('execucoes_os')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
  ).limit(1000);

  if (execList) {
    for (const exec of execList) {
      await upsertExecucao({ ...exec, sync_status: 'synced' });
    }
  }

  // Pull Equipamentos
  const { data: eqList, error: eqError } = await withTimestamp(
    db
    .from('equipamentos')
    .select('*')
    .eq('empresa_id', empresaId)
  ).limit(1000);

  if (eqError) {
    console.error('[sync] equipamentos error:', eqError.message, eqError.code);
  }
  if (eqList) {
    for (const eq of eqList) {
      // Map Supabase 'tag' column to SQLite 'qr_code'
      await upsertEquipamento({ ...eq, qr_code: eq.qr_code || eq.tag });
    }
    console.log(`[sync] pulled ${eqList.length} equipamentos`);
  }

  // Pull Mecanicos — tenta query direta, fallback para RPC SECURITY DEFINER
  let mecList: any[] | null = null;
  const { data: mecDirect, error: mecErr } = await db
    .from('mecanicos')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .limit(500);

  if (mecErr) {
    console.warn('[sync] mecanicos direct error:', mecErr.message, mecErr.code);
  }

  if (!mecErr && mecDirect && mecDirect.length > 0) {
    mecList = mecDirect;
  } else {
    // Fallback: RPC que bypassa RLS
    try {
      const { data: mecRpc, error: rpcErr } = await db.rpc('listar_mecanicos_empresa', {
        p_empresa_id: empresaId,
      });
      if (rpcErr) console.warn('[sync] mecanicos RPC error:', rpcErr.message);
      if (mecRpc && mecRpc.length > 0) {
        mecList = mecRpc;
      }
    } catch (e) {
      console.warn('[sync] mecanicos RPC exception:', e);
    }
  }

  if (mecList) {
    for (const mec of mecList) {
      await upsertMecanico({ ...mec, empresa_id: empresaId, ativo: true });
    }
  }

  // Pull Materiais (catálogo)
  const { data: matList, error: matError } = await withTimestamp(
    db
    .from('materiais')
    .select('id, empresa_id, codigo, nome, unidade, estoque_atual')
    .eq('empresa_id', empresaId)
  ).limit(1000);

  if (matError) console.error('[sync] materiais error:', matError.message, matError.code);
  if (matList) {
    for (const mat of matList) {
      await upsertMaterial({ ...mat, descricao: mat.nome });
    }
    console.log(`[sync] pulled ${matList.length} materiais`);
  }

  // Pull Documentos Técnicos
  const { data: docList, error: docError } = await withTimestamp(
    db
    .from('documentos_tecnicos')
    .select('id, empresa_id, equipamento_id, tipo, titulo, arquivo_url, created_at')
    .eq('empresa_id', empresaId)
  ).limit(500);

  if (docError) console.error('[sync] documentos error:', docError.message, docError.code);
  if (docList) {
    for (const doc of docList) {
      await upsertDocumento({ ...doc, nome: doc.titulo });
    }
    console.log(`[sync] pulled ${docList.length} documentos`);
  }

  // Pull Paradas
  const { data: paradaList, error: paradaError } = await withTimestamp(
    db
    .from('paradas_equipamento')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('inicio', { ascending: false })
  ).limit(500);

  if (paradaError) console.error('[sync] paradas error:', paradaError.message, paradaError.code);
  if (paradaList) {
    for (const p of paradaList) {
      await upsertParada({ ...p, sync_status: 'synced' });
    }
    console.log(`[sync] pulled ${paradaList.length} paradas`);
  }

  // Pull Requisicoes
  const { data: reqList, error: reqError } = await withTimestamp(
    db
    .from('requisicoes_material')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
  ).limit(500);

  if (reqError) console.error('[sync] requisicoes error:', reqError.message, reqError.code);
  if (reqList) {
    for (const r of reqList) {
      await upsertRequisicao({ ...r, sync_status: 'synced' });
    }
    console.log(`[sync] pulled ${reqList.length} requisições`);
  }

  // Pull Solicitações de Manutenção
  const { data: solicList, error: solicError } = await withTimestamp(
    db
    .from('solicitacoes_manutencao')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
  ).limit(500);

  if (solicError) console.error('[sync] solicitacoes error:', solicError.message, solicError.code);
  if (solicList) {
    for (const s of solicList) {
      await upsertSolicitacao({ ...s, sync_status: 'synced' });
    }
    console.log(`[sync] pulled ${solicList.length} solicitações${lastSync ? ' (incremental)' : ' (full)'}`);
  }

  // Save sync timestamp for next incremental pull
  await saveDeviceConfig('last_sync_timestamp', new Date().toISOString());
}

// ============================================================
// Full Sync Cycle
// ============================================================

export async function runSyncCycle(forceFullRefresh = false): Promise<{ pushed: number; pulled: boolean }> {
  // If a sync is already running, wait for it to finish
  if (syncPromise) {
    const result = await syncPromise;
    // If caller needs forced full refresh and previous was not forced, run again
    if (!forceFullRefresh) return result;
  }

  const doSync = async (): Promise<{ pushed: number; pulled: boolean }> => {
    try {
      const online = await isOnline();
      if (!online) return { pushed: 0, pulled: false };

      // Get access token once for the entire sync cycle
      const accessToken = await getAccessToken();
      if (!accessToken) {
        console.warn('[sync] cycle aborted — no access token');
        return { pushed: 0, pulled: false };
      }
      const db = createAuthenticatedClient(accessToken);

      // Push first (using authenticated client)
      const pushed = await pushPendingChanges(db);

      // Then pull (using same authenticated client)
      const empresaId = await getDeviceConfig('empresa_id');
      if (empresaId) {
        await pullData(empresaId, forceFullRefresh, db);
      }

      // Notify listeners (HomeScreen, etc.) that fresh data is available
      notifySyncListeners();

      return { pushed, pulled: !!empresaId };
    } catch (err) {
      console.error('[sync] cycle error:', err);
      return { pushed: 0, pulled: false };
    }
  };

  syncPromise = doSync();
  try {
    return await syncPromise;
  } finally {
    syncPromise = null;
  }
}

// ============================================================
// Background Sync Timer (exponential backoff on error)
// ============================================================

let backoffMs = 30_000; // Start at 30s
const MAX_BACKOFF = 300_000; // 5 min max
const NORMAL_INTERVAL = 30_000; // 30s when healthy

export function startSyncTimer() {
  stopSyncTimer();

  async function tick() {
    try {
      const result = await runSyncCycle();
      if (result.pushed > 0 || result.pulled) {
        backoffMs = NORMAL_INTERVAL; // Reset on success
      }
    } catch {
      backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF);
    }
    syncTimer = setTimeout(tick, backoffMs);
  }

  syncTimer = setTimeout(tick, 500); // First sync nearly immediate
}

export function stopSyncTimer() {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
}