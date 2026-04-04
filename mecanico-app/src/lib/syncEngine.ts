// ============================================================
// Sync Engine — Background sync with exponential backoff
// ============================================================

import * as Network from 'expo-network';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
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

async function pushPendingChanges(): Promise<number> {
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

        const { error } = await supabase.from(table).upsert(serverPayload);
        if (error) throw error;

        // If execucao with fotos, upload them
        if (table === 'execucoes_os' && fotos && Array.isArray(fotos)) {
          for (const fotoUri of fotos) {
            try {
              await uploadPhoto(payload.id, fotoUri, payload.empresa_id);
            } catch (photoErr) {
              console.warn('[sync] photo upload failed:', photoErr);
            }
          }
        }
      } else if (item.operation === 'DELETE') {
        const { error } = await supabase.from(table).delete().eq('id', item.record_id);
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

async function uploadPhoto(execucaoId: string, localUri: string, empresaId: string): Promise<void> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const ext = localUri.split('.').pop() || 'jpg';
  const path = `${empresaId}/execucoes/${execucaoId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('execucoes-fotos')
    .upload(path, blob, { contentType: `image/${ext}` });

  if (error) throw error;
}

// ============================================================
// Pull — Fetch latest data from server into local DB
// ============================================================

// Ensure supabase client has a valid authenticated session.
// If no session exists, try re-auth via edge function using stored device_token.
async function ensureSession(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return true;

    // No session — try to restore via edge function
    const deviceToken = await getDeviceConfig('device_token');
    if (!deviceToken) {
      console.warn('[sync] no session and no device_token — cannot authenticate');
      return false;
    }

    console.log('[sync] no active session, re-authenticating via edge function...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/mecanico-device-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ device_token: deviceToken }),
    });

    const data = await response.json();
    if (!data?.ok || !data?.access_token) {
      console.warn('[sync] edge function re-auth failed:', data?.error || 'unknown');
      return false;
    }

    const { error } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    if (error) {
      console.warn('[sync] setSession failed:', error.message);
      return false;
    }

    console.log('[sync] session restored successfully');
    return true;
  } catch (err) {
    console.warn('[sync] ensureSession error:', err);
    return false;
  }
}

export async function pullData(empresaId: string, forceFullRefresh = false): Promise<void> {
  if (!empresaId) return;

  // Ensure we have a valid authenticated session before querying PostgREST
  const hasSession = await ensureSession();
  if (!hasSession) {
    console.warn('[sync] pullData aborted — no valid session');
    return;
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
    supabase
    .from('ordens_servico')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('data_solicitacao', { ascending: false })
  ).limit(1000);

  if (osError) {
    console.error('[sync] ordens_servico query error:', osError.message, osError.code);
  }

  if (osList) {
    for (const os of osList) {
      await upsertOrdemServico(os);
    }
    console.log(`[sync] pulled ${osList.length} OS${lastSync ? ' (incremental)' : ' (full)'}`);
  }

  // Pull Execucoes
  const { data: execList } = await withTimestamp(
    supabase
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
  const { data: eqList } = await withTimestamp(
    supabase
    .from('equipamentos')
    .select('*')
    .eq('empresa_id', empresaId)
  ).limit(1000);

  if (eqList) {
    for (const eq of eqList) {
      await upsertEquipamento(eq);
    }
  }

  // Pull Mecanicos — tenta query direta, fallback para RPC SECURITY DEFINER
  let mecList: any[] | null = null;
  const { data: mecDirect, error: mecErr } = await supabase
    .from('mecanicos')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .limit(500);

  if (!mecErr && mecDirect && mecDirect.length > 0) {
    mecList = mecDirect;
  } else {
    // Fallback: RPC que bypassa RLS
    try {
      const { data: mecRpc } = await supabase.rpc('listar_mecanicos_empresa', {
        p_empresa_id: empresaId,
      });
      if (mecRpc && mecRpc.length > 0) {
        mecList = mecRpc;
      }
    } catch { /* ignore rpc error */ }
  }

  if (mecList) {
    for (const mec of mecList) {
      await upsertMecanico({ ...mec, empresa_id: empresaId, ativo: true });
    }
  }

  // Pull Materiais (catálogo)
  const { data: matList } = await withTimestamp(
    supabase
    .from('materiais')
    .select('id, empresa_id, codigo, nome, unidade, estoque_atual')
    .eq('empresa_id', empresaId)
  ).limit(1000);

  if (matList) {
    for (const mat of matList) {
      await upsertMaterial({ ...mat, descricao: mat.nome });
    }
  }

  // Pull Documentos Técnicos
  const { data: docList } = await withTimestamp(
    supabase
    .from('documentos_tecnicos')
    .select('id, empresa_id, equipamento_id, tipo, titulo, arquivo_url, created_at')
    .eq('empresa_id', empresaId)
  ).limit(500);

  if (docList) {
    for (const doc of docList) {
      await upsertDocumento({ ...doc, nome: doc.titulo });
    }
  }

  // Pull Paradas
  const { data: paradaList } = await withTimestamp(
    supabase
    .from('paradas_equipamento')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('inicio', { ascending: false })
  ).limit(500);

  if (paradaList) {
    for (const p of paradaList) {
      await upsertParada({ ...p, sync_status: 'synced' });
    }
  }

  // Pull Requisicoes
  const { data: reqList } = await withTimestamp(
    supabase
    .from('requisicoes_material')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
  ).limit(500);

  if (reqList) {
    for (const r of reqList) {
      await upsertRequisicao({ ...r, sync_status: 'synced' });
    }
  }

  // Pull Solicitações de Manutenção
  const { data: solicList } = await withTimestamp(
    supabase
    .from('solicitacoes_manutencao')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
  ).limit(500);

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

      // Push first
      const pushed = await pushPendingChanges();

      // Then pull
      const empresaId = await getDeviceConfig('empresa_id');
      if (empresaId) {
        await pullData(empresaId, forceFullRefresh);
      }

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

  syncTimer = setTimeout(tick, 5000); // First sync after 5s
}

export function stopSyncTimer() {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
}