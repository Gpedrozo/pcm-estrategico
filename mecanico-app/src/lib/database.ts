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
      tempo_execucao_bruto INTEGER,
      tempo_pausas INTEGER DEFAULT 0,
      tempo_execucao_liquido INTEGER,
      servico_executado TEXT,
      causa TEXT,
      observacoes TEXT,
      data_execucao TEXT,
      data_inicio TEXT,
      data_fim TEXT,
      custo_mao_obra REAL DEFAULT 0,
      custo_materiais REAL DEFAULT 0,
      custo_terceiros REAL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS paradas_equipamento (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL,
      equipamento_id TEXT,
      os_id TEXT,
      mecanico_id TEXT,
      mecanico_nome TEXT,
      tipo TEXT NOT NULL,
      inicio TEXT NOT NULL,
      fim TEXT,
      observacao TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      sync_status TEXT DEFAULT 'pending',
      local_updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS requisicoes_material (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL,
      os_id TEXT,
      mecanico_id TEXT,
      mecanico_nome TEXT,
      material_id TEXT,
      descricao_livre TEXT,
      quantidade REAL NOT NULL,
      status TEXT DEFAULT 'pendente',
      observacao TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      sync_status TEXT DEFAULT 'pending',
      local_updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS materiais (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL,
      codigo TEXT,
      descricao TEXT,
      unidade TEXT,
      estoque_atual REAL,
      local_updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documentos_tecnicos (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL,
      equipamento_id TEXT,
      tipo TEXT,
      nome TEXT,
      arquivo_url TEXT,
      created_at TEXT,
      local_updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS solicitacoes_manutencao (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL,
      numero_solicitacao INTEGER,
      equipamento_id TEXT,
      tag TEXT,
      solicitante_nome TEXT NOT NULL,
      solicitante_setor TEXT,
      descricao_falha TEXT NOT NULL,
      impacto TEXT DEFAULT 'MEDIO',
      classificacao TEXT DEFAULT 'PROGRAMAVEL',
      status TEXT DEFAULT 'PENDENTE',
      os_id TEXT,
      observacoes TEXT,
      usuario_aprovacao TEXT,
      data_aprovacao TEXT,
      data_limite TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced',
      local_updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_os_empresa ON ordens_servico(empresa_id);
    CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_servico(status);
    CREATE INDEX IF NOT EXISTS idx_exec_os ON execucoes_os(os_id);
    CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status);
    CREATE INDEX IF NOT EXISTS idx_equip_qr ON equipamentos(qr_code);
    CREATE INDEX IF NOT EXISTS idx_parada_os ON paradas_equipamento(os_id);
    CREATE INDEX IF NOT EXISTS idx_parada_equip ON paradas_equipamento(equipamento_id);
    CREATE INDEX IF NOT EXISTS idx_req_os ON requisicoes_material(os_id);
    CREATE INDEX IF NOT EXISTS idx_mat_empresa ON materiais(empresa_id);
    CREATE INDEX IF NOT EXISTS idx_doc_equip ON documentos_tecnicos(equipamento_id);
    CREATE INDEX IF NOT EXISTS idx_solic_empresa ON solicitacoes_manutencao(empresa_id);
    CREATE INDEX IF NOT EXISTS idx_solic_status ON solicitacoes_manutencao(status);
  `);

  // Migrations for existing devices (ALTER TABLE is idempotent via try/catch)
  await applyColumnMigrations(database);
}

// ============================================================
// Column Migrations (for existing devices with old schema)
// Each ALTER TABLE is wrapped in try/catch — SQLite throws
// "duplicate column name" if column already exists, which is safe to ignore.
// ============================================================

async function applyColumnMigrations(database: SQLite.SQLiteDatabase) {
  const alterations = [
    'ALTER TABLE execucoes_os ADD COLUMN tempo_execucao_bruto INTEGER',
    'ALTER TABLE execucoes_os ADD COLUMN tempo_pausas INTEGER DEFAULT 0',
    'ALTER TABLE execucoes_os ADD COLUMN tempo_execucao_liquido INTEGER',
    'ALTER TABLE execucoes_os ADD COLUMN custo_terceiros REAL DEFAULT 0',
    'ALTER TABLE execucoes_os ADD COLUMN data_inicio TEXT',
    'ALTER TABLE execucoes_os ADD COLUMN data_fim TEXT',
  ];

  for (const sql of alterations) {
    try {
      await database.runAsync(sql);
    } catch {
      // Column already exists — safe to ignore
    }
  }
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

export async function removeDeviceConfigKeys(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const database = await getDB();
  const placeholders = keys.map(() => '?').join(',');
  await database.runAsync(`DELETE FROM device_config WHERE key IN (${placeholders})`, keys);
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

// ============================================================
// Mecanicos
// ============================================================

export async function getMecanicos(empresaId: string): Promise<any[]> {
  const database = await getDB();
  return database.getAllAsync(
    'SELECT * FROM mecanicos WHERE empresa_id = ? AND ativo = 1 ORDER BY nome ASC',
    [empresaId]
  );
}

export async function getMecanicoById(id: string): Promise<any | null> {
  const database = await getDB();
  return database.getFirstAsync('SELECT * FROM mecanicos WHERE id = ?', [id]);
}

export async function upsertMecanico(m: Record<string, any>): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO mecanicos (id, empresa_id, nome, tipo, ativo, local_updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    [m.id, m.empresa_id, m.nome, m.tipo, m.ativo ?? 1]
  );
}

// ============================================================
// Paradas de Equipamento
// ============================================================

export async function getParadasByOS(osId: string): Promise<any[]> {
  const database = await getDB();
  return database.getAllAsync(
    'SELECT * FROM paradas_equipamento WHERE os_id = ? ORDER BY inicio DESC',
    [osId]
  );
}

export async function getParadaAberta(equipamentoId: string): Promise<any | null> {
  const database = await getDB();
  return database.getFirstAsync(
    'SELECT * FROM paradas_equipamento WHERE equipamento_id = ? AND fim IS NULL ORDER BY inicio DESC LIMIT 1',
    [equipamentoId]
  );
}

export async function upsertParada(p: Record<string, any>): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO paradas_equipamento 
     (id, empresa_id, equipamento_id, os_id, mecanico_id, mecanico_nome, tipo, inicio, fim, observacao, created_at, updated_at, sync_status, local_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [p.id, p.empresa_id, p.equipamento_id, p.os_id, p.mecanico_id, p.mecanico_nome, p.tipo, p.inicio, p.fim, p.observacao, p.created_at, p.updated_at, p.sync_status || 'pending']
  );
}

// ============================================================
// Requisicoes de Material
// ============================================================

export async function getRequisicoesByOS(osId: string): Promise<any[]> {
  const database = await getDB();
  return database.getAllAsync(
    'SELECT * FROM requisicoes_material WHERE os_id = ? ORDER BY created_at DESC',
    [osId]
  );
}

export async function upsertRequisicao(r: Record<string, any>): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO requisicoes_material 
     (id, empresa_id, os_id, mecanico_id, mecanico_nome, material_id, descricao_livre, quantidade, status, observacao, created_at, sync_status, local_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [r.id, r.empresa_id, r.os_id, r.mecanico_id, r.mecanico_nome, r.material_id, r.descricao_livre, r.quantidade, r.status || 'pendente', r.observacao, r.created_at, r.sync_status || 'pending']
  );
}

// ============================================================
// Materiais (catálogo — read only local)
// ============================================================

export async function getMateriais(empresaId: string, busca?: string): Promise<any[]> {
  const database = await getDB();
  if (busca) {
    return database.getAllAsync(
      "SELECT * FROM materiais WHERE empresa_id = ? AND (descricao LIKE ? OR codigo LIKE ?) ORDER BY descricao ASC LIMIT 50",
      [empresaId, `%${busca}%`, `%${busca}%`]
    );
  }
  return database.getAllAsync(
    'SELECT * FROM materiais WHERE empresa_id = ? ORDER BY descricao ASC LIMIT 100',
    [empresaId]
  );
}

export async function upsertMaterial(m: Record<string, any>): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO materiais (id, empresa_id, codigo, descricao, unidade, estoque_atual, local_updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [m.id, m.empresa_id, m.codigo, m.descricao, m.unidade, m.estoque_atual]
  );
}

// ============================================================
// Documentos Técnicos (read only local)
// ============================================================

export async function getDocumentosByEquipamento(equipamentoId: string): Promise<any[]> {
  const database = await getDB();
  return database.getAllAsync(
    'SELECT * FROM documentos_tecnicos WHERE equipamento_id = ? ORDER BY nome ASC',
    [equipamentoId]
  );
}

export async function upsertDocumento(d: Record<string, any>): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO documentos_tecnicos (id, empresa_id, equipamento_id, tipo, nome, arquivo_url, created_at, local_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [d.id, d.empresa_id, d.equipamento_id, d.tipo, d.nome, d.arquivo_url, d.created_at]
  );
}

// ============================================================
// Equipamentos — busca por nome/tag
// ============================================================

export async function searchEquipamentos(empresaId: string, busca: string): Promise<any[]> {
  const database = await getDB();
  return database.getAllAsync(
    "SELECT * FROM equipamentos WHERE empresa_id = ? AND (nome LIKE ? OR qr_code LIKE ?) ORDER BY nome ASC LIMIT 30",
    [empresaId, `%${busca}%`, `%${busca}%`]
  );
}

export async function getAllEquipamentos(empresaId: string): Promise<any[]> {
  const database = await getDB();
  return database.getAllAsync(
    'SELECT * FROM equipamentos WHERE empresa_id = ? ORDER BY nome ASC LIMIT 200',
    [empresaId]
  );
}

export async function getEquipamentoById(id: string): Promise<any | null> {
  const database = await getDB();
  return database.getFirstAsync('SELECT * FROM equipamentos WHERE id = ?', [id]);
}

// ============================================================
// OS Stats (contadores para dashboard)
// ============================================================

export async function getOSStats(empresaId: string): Promise<{ abertas: number; programadas: number; emAndamento: number; finalizadasHoje: number }> {
  const database = await getDB();
  const hoje = new Date().toISOString().split('T')[0];

  const abertas = await database.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM ordens_servico WHERE empresa_id = ? AND UPPER(status) IN ('ABERTA', 'SOLICITADA', 'EMITIDA')",
    [empresaId]
  );
  const programadas = await database.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM ordens_servico WHERE empresa_id = ? AND UPPER(status) = 'PROGRAMADA'",
    [empresaId]
  );
  const emAndamento = await database.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM ordens_servico WHERE empresa_id = ? AND UPPER(status) IN ('EM_ANDAMENTO', 'EM_EXECUCAO')",
    [empresaId]
  );
  const finalizadas = await database.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM ordens_servico WHERE empresa_id = ? AND UPPER(status) IN ('CONCLUIDA', 'FECHADA') AND data_fechamento LIKE ?",
    [empresaId, `${hoje}%`]
  );

  return {
    abertas: abertas?.cnt ?? 0,
    programadas: programadas?.cnt ?? 0,
    emAndamento: emAndamento?.cnt ?? 0,
    finalizadasHoje: finalizadas?.cnt ?? 0,
  };
}

// ============================================================
// OS — busca a próxima OS mais urgente
// ============================================================

export async function getProximaOS(empresaId: string): Promise<any | null> {
  const database = await getDB();
  return database.getFirstAsync(
    `SELECT * FROM ordens_servico WHERE empresa_id = ? AND UPPER(status) IN ('ABERTA', 'SOLICITADA', 'EMITIDA', 'EM_ANDAMENTO', 'EM_EXECUCAO')
     ORDER BY CASE UPPER(prioridade) WHEN 'EMERGENCIAL' THEN 0 WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 WHEN 'BAIXA' THEN 3 ELSE 4 END, data_solicitacao ASC
     LIMIT 1`,
    [empresaId]
  );
}

// ============================================================
// Execucoes — buscar todas do mecânico (histórico)
// ============================================================

export async function getExecucoesHistorico(empresaId: string, limit: number = 50): Promise<any[]> {
  const database = await getDB();
  return database.getAllAsync(
    `SELECT e.*, o.numero_os, o.equipamento, o.problema, o.tipo as os_tipo
     FROM execucoes_os e
     LEFT JOIN ordens_servico o ON e.os_id = o.id
     WHERE e.empresa_id = ?
     ORDER BY e.created_at DESC
     LIMIT ?`,
    [empresaId, limit]
  );
}

// ============================================================
// Execucoes — buscar atividade em andamento de um mecânico
// ============================================================

export async function getExecucaoEmAndamento(mecanicoId: string): Promise<any | null> {
  const database = await getDB();
  return database.getFirstAsync(
    "SELECT * FROM execucoes_os WHERE mecanico_id = ? AND hora_inicio IS NOT NULL AND hora_fim IS NULL ORDER BY hora_inicio DESC LIMIT 1",
    [mecanicoId]
  );
}

// ============================================================
// Solicitações de Manutenção
// ============================================================

export async function getSolicitacoes(empresaId: string, statusFilter?: string): Promise<any[]> {
  const database = await getDB();
  let sql = 'SELECT * FROM solicitacoes_manutencao WHERE empresa_id = ?';
  const params: any[] = [empresaId];
  if (statusFilter && statusFilter !== 'todas') {
    sql += ' AND status = ?';
    params.push(statusFilter);
  }
  sql += ' ORDER BY CASE classificacao WHEN \'EMERGENCIAL\' THEN 0 WHEN \'URGENTE\' THEN 1 WHEN \'PROGRAMAVEL\' THEN 2 END, created_at DESC';
  return database.getAllAsync(sql, params);
}

export async function getSolicitacaoById(id: string): Promise<any | null> {
  const database = await getDB();
  return database.getFirstAsync('SELECT * FROM solicitacoes_manutencao WHERE id = ?', [id]);
}

export async function upsertSolicitacao(s: Record<string, any>): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO solicitacoes_manutencao 
     (id, empresa_id, numero_solicitacao, equipamento_id, tag, solicitante_nome, solicitante_setor, descricao_falha, impacto, classificacao, status, os_id, observacoes, usuario_aprovacao, data_aprovacao, data_limite, created_at, updated_at, sync_status, local_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [s.id, s.empresa_id, s.numero_solicitacao, s.equipamento_id, s.tag, s.solicitante_nome, s.solicitante_setor, s.descricao_falha, s.impacto || 'MEDIO', s.classificacao || 'PROGRAMAVEL', s.status || 'PENDENTE', s.os_id, s.observacoes, s.usuario_aprovacao, s.data_aprovacao, s.data_limite, s.created_at, s.updated_at, s.sync_status || 'synced']
  );
}

export async function getSolicitacoesStats(empresaId: string): Promise<{ pendentes: number; aprovadas: number; total: number }> {
  const database = await getDB();
  const pendentes = await database.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM solicitacoes_manutencao WHERE empresa_id = ? AND status = 'PENDENTE'",
    [empresaId]
  );
  const aprovadas = await database.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM solicitacoes_manutencao WHERE empresa_id = ? AND status = 'APROVADA'",
    [empresaId]
  );
  const total = await database.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM solicitacoes_manutencao WHERE empresa_id = ?",
    [empresaId]
  );
  return {
    pendentes: pendentes?.cnt ?? 0,
    aprovadas: aprovadas?.cnt ?? 0,
    total: total?.cnt ?? 0,
  };
}