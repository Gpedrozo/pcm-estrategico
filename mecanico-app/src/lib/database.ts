// ============================================================
// SQLite Local Database — Offline-first storage
// ============================================================

import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<void> {
  await getDB();
}

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('mecanico_pcm.db');
    await initSchema(db);
  }
  return db;
}

async function initSchema(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS device_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ordens_servico (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL,
      numero_os INTEGER,
      tipo TEXT,
      prioridade TEXT,
      status TEXT,
      tag TEXT,
      equipamento TEXT,
      problema TEXT,
      solicitante TEXT,
      data_solicitacao TEXT,
      data_fechamento TEXT,
      tempo_estimado INTEGER,
      created_at TEXT,
      updated_at TEXT,
      local_updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS execucoes_os (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL,
      os_id TEXT NOT NULL,
      mecanico_id TEXT,
      mecanico_nome TEXT,
      hora_inicio TEXT,
      hora_fim TEXT,
      tempo_execucao INTEGER,
      servico_executado TEXT,
      causa TEXT,
      observacoes TEXT,
      data_execucao TEXT,
      custo_mao_obra REAL DEFAULT 0,
      custo_materiais REAL DEFAULT 0,
      custo_total REAL DEFAULT 0,
      fotos TEXT,
      created_at TEXT,
      sync_status TEXT DEFAULT 'pending',
      local_updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS equipamentos (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL,
      nome TEXT,
      fabricante TEXT,
      modelo TEXT,
      numero_serie TEXT,
      localizacao TEXT,
      qr_code TEXT,
      local_updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mecanicos (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL,
      nome TEXT,
      tipo TEXT,
      ativo INTEGER DEFAULT 1,
      local_updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS autosave (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      saved_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_os_empresa ON ordens_servico(empresa_id);
    CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_servico(status);
    CREATE INDEX IF NOT EXISTS idx_exec_os ON execucoes_os(os_id);
    CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status);
    CREATE INDEX IF NOT EXISTS idx_equip_qr ON equipamentos(qr_code);
  `);
}

// ============================================================
// Device Config helpers
// ============================================================

export async function getDeviceConfig(key: string): Promise<string | null> {
  const database = await getDB();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM device_config WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function saveDeviceConfig(key: string, value: string): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO device_config (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
    [key, value]
  );
}

export async function clearDeviceConfig(): Promise<void> {
  const database = await getDB();
  await database.runAsync('DELETE FROM device_config');
}

// ============================================================
// AutoSave helpers
// ============================================================

export async function saveAutoSave(key: string, data: string): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO autosave (key, data, saved_at) VALUES (?, ?, datetime('now'))`,
    [key, data]
  );
}

export async function getAutoSave(key: string): Promise<string | null> {
  const database = await getDB();
  const row = await database.getFirstAsync<{ data: string }>(
    'SELECT data FROM autosave WHERE key = ?',
    [key]
  );
  return row?.data ?? null;
}

export async function clearAutoSave(key: string): Promise<void> {
  const database = await getDB();
  await database.runAsync('DELETE FROM autosave WHERE key = ?', [key]);
}

// ============================================================
// Ordens de Servico
// ============================================================

export async function getOrdensServico(empresaId?: string, statusFilter?: string): Promise<any[]> {
  const database = await getDB();
  let sql = 'SELECT * FROM ordens_servico';
  const params: any[] = [];
  const conditions: string[] = [];
  if (empresaId) {
    conditions.push('empresa_id = ?');
    params.push(empresaId);
  }
  if (statusFilter && statusFilter !== 'todas') {
    conditions.push('status = ?');
    params.push(statusFilter);
  }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY CASE prioridade WHEN \'emergencial\' THEN 0 WHEN \'alta\' THEN 1 WHEN \'media\' THEN 2 WHEN \'baixa\' THEN 3 END, data_solicitacao DESC';
  return database.getAllAsync(sql, params);
}

export async function getOrdemServicoById(id: string): Promise<any | null> {
  const database = await getDB();
  return database.getFirstAsync('SELECT * FROM ordens_servico WHERE id = ?', [id]);
}

export async function upsertOrdemServico(os: Record<string, any>): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO ordens_servico 
     (id, empresa_id, numero_os, tipo, prioridade, status, tag, equipamento, problema, solicitante, data_solicitacao, data_fechamento, tempo_estimado, created_at, updated_at, local_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [os.id, os.empresa_id, os.numero_os, os.tipo, os.prioridade, os.status, os.tag, os.equipamento, os.problema, os.solicitante, os.data_solicitacao, os.data_fechamento, os.tempo_estimado, os.created_at, os.updated_at]
  );
}

// ============================================================
// Execucoes
// ============================================================

export async function getExecucoesByOS(osId: string): Promise<any[]> {
  const database = await getDB();
  return database.getAllAsync(
    'SELECT * FROM execucoes_os WHERE os_id = ? ORDER BY created_at DESC',
    [osId]
  );
}

export async function upsertExecucao(exec: Record<string, any>): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO execucoes_os 
     (id, empresa_id, os_id, mecanico_id, mecanico_nome, hora_inicio, hora_fim, tempo_execucao, servico_executado, causa, observacoes, data_execucao, custo_mao_obra, custo_materiais, custo_total, fotos, created_at, sync_status, local_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [exec.id, exec.empresa_id, exec.os_id, exec.mecanico_id, exec.mecanico_nome, exec.hora_inicio, exec.hora_fim, exec.tempo_execucao, exec.servico_executado, exec.causa, exec.observacoes, exec.data_execucao, exec.custo_mao_obra, exec.custo_materiais, exec.custo_total, exec.fotos ? JSON.stringify(exec.fotos) : null, exec.created_at, exec.sync_status || 'pending']
  );
}

// ============================================================
// Equipamentos
// ============================================================

export async function getEquipamentoByQR(qrCode: string, empresaId: string): Promise<any | null> {
  const database = await getDB();
  return database.getFirstAsync(
    'SELECT * FROM equipamentos WHERE qr_code = ? AND empresa_id = ?',
    [qrCode, empresaId]
  );
}

export async function upsertEquipamento(eq: Record<string, any>): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO equipamentos 
     (id, empresa_id, nome, fabricante, modelo, numero_serie, localizacao, qr_code, local_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [eq.id, eq.empresa_id, eq.nome, eq.fabricante, eq.modelo, eq.numero_serie, eq.localizacao, eq.qr_code]
  );
}

// ============================================================
// Sync Queue
// ============================================================

export async function addToSyncQueue(item: {
  id: string;
  table_name: string;
  record_id: string;
  operation: string;
  payload: Record<string, any>;
}): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT INTO sync_queue (id, table_name, record_id, operation, payload, status) VALUES (?, ?, ?, ?, ?, 'pending')`,
    [item.id, item.table_name, item.record_id, item.operation, JSON.stringify(item.payload)]
  );
}

export async function getPendingSyncItems(): Promise<any[]> {
  const database = await getDB();
  return database.getAllAsync(
    "SELECT * FROM sync_queue WHERE status IN ('pending', 'error') ORDER BY created_at ASC LIMIT 50"
  );
}

export async function markSyncItemDone(id: string): Promise<void> {
  const database = await getDB();
  await database.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
}

export async function markSyncItemError(id: string, error: string): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    "UPDATE sync_queue SET status = 'error', retry_count = retry_count + 1, last_error = ? WHERE id = ?",
    [error, id]
  );
}

export async function getSyncQueueCount(): Promise<number> {
  const database = await getDB();
  const row = await database.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM sync_queue WHERE status IN ('pending', 'error')"
  );
  return row?.cnt ?? 0;
}