// ============================================================
// Sync Engine — Background sync with exponential backoff
// ============================================================

import * as Network from 'expo-network';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY, createAuthenticatedClient } from './supabase';
import { logger } from './logger';
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
  removeDeviceConfigKeys,
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
  syncListeners.forEach((fn) => { try { fn(); } catch (err) { logger.warn('sync', 'listener error', { error: err }); } });
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
              logger.warn('sync', 'photo upload failed', { error: photoErr });
            }
          }
        }
      } else if (item.operation === 'DELETE') {
        const { error } = await db.from(table).delete().eq('id', item.record_id).eq('empresa_id', payload.empresa_id);
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
let legacyTokenCachePurged = false;

/** Decode JWT payload and check expiration (with 60s buffer) */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const exp = payload.exp;
    if (!exp) return true;
    return Date.now() >= (exp - 60) * 1000; // 60s safety buffer
  } catch {
    return true;
  }
}

/** Force re-authentication via edge function using device_token */
async function reauthViaEdgeFunction(): Promise<string | null> {
  const deviceToken = await getDeviceConfig('device_token');
  if (!deviceToken) {
    logger.warn('sync', 'no device_token — cannot authenticate');
    return null;
  }

  logger.info('sync', 're-authenticating via edge function...');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/mecanico-device-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ device_token: deviceToken }),
    });

    const data = await response.json();
    if (!data?.ok || !data?.access_token) {
      logger.warn('sync', 'edge function re-auth failed', { error: data?.error || 'unknown' });
      return null;
    }

    logger.info('sync', 'got fresh access_token from edge function');
    cachedAccessToken = data.access_token;

    // Security hardening: never persist auth tokens in SQLite device_config.

    // Also try setSession (best-effort, non-blocking)
    supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    }).then(({ error }) => {
      if (error) logger.warn('sync', 'setSession failed (non-fatal)', { error: error.message });
      else logger.info('sync', 'setSession succeeded');
    }).catch(() => {});

    return data.access_token;
  } catch (err) {
    logger.warn('sync', 're-auth fetch error', { error: err });
    return null;
  }
}

/**
 * Get a VALID (non-expired) access token from:
 * 1. Existing supabase session (auto-refreshed)
 * 2. Module-level cached token (if not expired)
 * 3. Edge function re-auth using device_token
 */
export async function getAccessToken(): Promise<string | null> {
  // One-time cleanup for legacy versions that cached tokens in SQLite.
  if (!legacyTokenCachePurged) {
    await removeDeviceConfigKeys(['access_token', 'refresh_token']);
    legacyTokenCachePurged = true;
  }

  // 1. Check existing supabase session (supabase-js auto-refreshes)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && !isTokenExpired(session.access_token)) {
      cachedAccessToken = session.access_token;
      return session.access_token;
    }
  } catch { /* ignore — supabase.auth.getSession unavailable at startup */ }

  // 2. Use module-level cached token if not expired
  if (cachedAccessToken && !isTokenExpired(cachedAccessToken)) {
    logger.info('sync', 'using cached access_token');
    return cachedAccessToken;
  }

  // 3. Last resort: re-auth via edge function
  return reauthViaEdgeFunction();
}

/** Clear cached token (called when server returns auth error) */
export function clearCachedToken() {
  cachedAccessToken = null;
}

export async function pullData(empresaId: string, forceFullRefresh = false, db?: SupabaseClient, _isRetry = false): Promise<void> {
  if (!empresaId) return;

  // If no authenticated client provided, create one
  if (!db) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      logger.warn('sync', 'pullData aborted — no access token');
      return;
    }
    db = createAuthenticatedClient(accessToken);
  }
  logger.info('sync', 'pullData starting with authenticated client...');

  // Helper: detect auth errors (401, JWT expired, etc.)
  function isAuthError(error: any): boolean {
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    const code = error.code || '';
    return code === '401' || code === 'PGRST301' || msg.includes('jwt') || msg.includes('expired') || msg.includes('invalid claim') || msg.includes('not authorized');
  }

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
    logger.error('sync', 'ordens_servico error', { message: osError.message, code: osError.code, details: osError.details });

    // If auth error on first query, re-authenticate and retry entire pull
    if (isAuthError(osError) && !_isRetry) {
      logger.warn('sync', 'auth error detected — clearing token and retrying...');
      clearCachedToken();
      const freshToken = await getAccessToken();
      if (freshToken) {
        const freshDb = createAuthenticatedClient(freshToken);
        return pullData(empresaId, forceFullRefresh, freshDb, true);
      }
      logger.error('sync', 're-auth failed — aborting pull');
      return;
    }
  }

  if (osList) {
    for (const os of osList) {
      await upsertOrdemServico(os);
    }
    logger.info('sync', `pulled ${osList.length} OS${lastSync ? ' (incremental)' : ' (full)'}`);
  } else {
    logger.warn('sync', 'ordens_servico returned null/empty');
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
    logger.error('sync', 'equipamentos error', { message: eqError.message, code: eqError.code });
  }
  if (eqList) {
    for (const eq of eqList) {
      // Map Supabase 'tag' column to SQLite 'qr_code'
      await upsertEquipamento({ ...eq, qr_code: eq.qr_code || eq.tag });
    }
    logger.info('sync', `pulled ${eqList.length} equipamentos`);
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
    logger.warn('sync', 'mecanicos direct error', { error: mecErr.message, code: mecErr.code });
  }

  if (!mecErr && mecDirect && mecDirect.length > 0) {
    mecList = mecDirect;
  } else {
    // Fallback: RPC que bypassa RLS
    try {
      const { data: mecRpc, error: rpcErr } = await db.rpc('listar_mecanicos_empresa', {
        p_empresa_id: empresaId,
      });
      if (rpcErr) logger.warn('sync', 'mecanicos RPC error', { error: rpcErr.message });
      if (mecRpc && mecRpc.length > 0) {
        mecList = mecRpc;
      }
    } catch (e) {
      logger.warn('sync', 'mecanicos RPC exception', { error: e });
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

  if (matError) logger.error('sync', 'materiais error', { message: matError.message, code: matError.code });
  if (matList) {
    for (const mat of matList) {
      await upsertMaterial({ ...mat, descricao: mat.nome });
    }
    logger.info('sync', `pulled ${matList.length} materiais`);
  }

  // Pull Documentos Técnicos
  const { data: docList, error: docError } = await withTimestamp(
    db
    .from('documentos_tecnicos')
    .select('id, empresa_id, equipamento_id, tipo, titulo, arquivo_url, created_at')
    .eq('empresa_id', empresaId)
  ).limit(500);

  if (docError) logger.error('sync', 'documentos error', { message: docError.message, code: docError.code });
  if (docList) {
    for (const doc of docList) {
      await upsertDocumento({ ...doc, nome: doc.titulo });
    }
    logger.info('sync', `pulled ${docList.length} documentos`);
  }

  // Pull Paradas
  const { data: paradaList, error: paradaError } = await withTimestamp(
    db
    .from('paradas_equipamento')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('inicio', { ascending: false })
  ).limit(500);

  if (paradaError) logger.error('sync', 'paradas error', { message: paradaError.message, code: paradaError.code });
  if (paradaList) {
    for (const p of paradaList) {
      await upsertParada({ ...p, sync_status: 'synced' });
    }
    logger.info('sync', `pulled ${paradaList.length} paradas`);
  }

  // Pull Requisicoes
  const { data: reqList, error: reqError } = await withTimestamp(
    db
    .from('requisicoes_material')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
  ).limit(500);

  if (reqError) logger.error('sync', 'requisicoes error', { message: reqError.message, code: reqError.code });
  if (reqList) {
    for (const r of reqList) {
      await upsertRequisicao({ ...r, sync_status: 'synced' });
    }
    logger.info('sync', `pulled ${reqList.length} requisições`);
  }

  // Pull Solicitações de Manutenção
  const { data: solicList, error: solicError } = await withTimestamp(
    db
    .from('solicitacoes_manutencao')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
  ).limit(500);

  if (solicError) logger.error('sync', 'solicitacoes error', { message: solicError.message, code: solicError.code });
  if (solicList) {
    for (const s of solicList) {
      await upsertSolicitacao({ ...s, sync_status: 'synced' });
    }
    logger.info('sync', `pulled ${solicList.length} solicitações${lastSync ? ' (incremental)' : ' (full)'}`);
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
        logger.warn('sync', 'cycle aborted — no access token');
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
      logger.error('sync', 'cycle error', { error: err });
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
    } catch (err) {
      logger.warn('sync', 'sync cycle error — applying backoff', { error: err });
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