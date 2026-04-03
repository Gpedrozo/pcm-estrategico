/**
 * FASE 3.1 IMPLEMENTATION START
 * SQLite Database Client
 * Date: 2026-04-02
 * 
 * Local SQLite database that mirrors Supabase schema
 * Enables offline data storage and querying
 */

import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import path from 'path';
import { app } from 'electron';

/**
 * Initialize SQLite connection
 * Database file stored in app user data directory
 */
export class SQLiteClient {
  private db: Database | null = null;
  private dbPath: string;

  constructor() {
    // Store database in user data directory (~/.pcm-estrategico/app.db)
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'app.db');
  }

  /**
   * Open database connection
   */
  async open(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(new Error(`Database open error: ${err.message}`));
        } else {
          console.log(`[SQLite] Database opened at ${this.dbPath}`);
          resolve();
        }
      });
    });
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Run query (SELECT)
   */
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve((rows || []) as T[]);
      });
    });
  }

  /**
   * Run query (single row)
   */
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }

  /**
   * Run execute (INSERT, UPDATE, DELETE)
   */
  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  /**
   * Initialize schema (create tables if not exist)
   */
  async initializeSchema(): Promise<void> {
    const schemas = [
      // Equipamentos table
      `CREATE TABLE IF NOT EXISTS equipamentos (
        id TEXT PRIMARY KEY,
        empresa_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        nome TEXT NOT NULL,
        criticidade TEXT DEFAULT 'C',
        nivel_risco TEXT DEFAULT 'MEDIO',
        localizacao TEXT,
        fabricante TEXT,
        modelo TEXT,
        numero_serie TEXT,
        data_instalacao TEXT,
        sistema_id TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at TEXT,
        updated_at TEXT,
        _synced BOOLEAN DEFAULT 0,
        _version INTEGER DEFAULT 1,
        _local_changed_at TEXT,
        _remote_changed_at TEXT
      )`,

      // Sync queue (pending operations)
      `CREATE TABLE IF NOT EXISTS _sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation TEXT CHECK(operation IN ('CREATE', 'UPDATE', 'DELETE')),
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        payload TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SENT', 'ERROR')),
        error_message TEXT
      )`,

      // Sync history
      `CREATE TABLE IF NOT EXISTS _sync_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP,
        operation_count INTEGER,
        status TEXT,
        errors TEXT
      )`,

      // Auth session cache
      `CREATE TABLE IF NOT EXISTS _auth_session (
        key TEXT PRIMARY KEY,
        value TEXT,
        expires_at TEXT
      )`,

      // Create indexes for performance
      `CREATE INDEX IF NOT EXISTS idx_equipamentos_empresa 
       ON equipamentos(empresa_id)`,
      
      `CREATE INDEX IF NOT EXISTS idx_equipamentos_synced 
       ON equipamentos(_synced)`,
      
      `CREATE INDEX IF NOT EXISTS idx_sync_queue_status 
       ON _sync_queue(status)`,
    ];

    for (const schema of schemas) {
      try {
        await this.run(schema);
      } catch (err) {
        console.error(`[SQLite] Schema init error: ${err}`);
      }
    }

    console.log('[SQLite] Schema initialized');
  }

  /**
   * Transaction support
   */
  async transaction<T>(
    callback: (client: SQLiteClient) => Promise<T>
  ): Promise<T> {
    try {
      await this.run('BEGIN TRANSACTION');
      const result = await callback(this);
      await this.run('COMMIT');
      return result;
    } catch (err) {
      await this.run('ROLLBACK');
      throw err;
    }
  }
}

/**
 * Singleton instance
 */
export const sqliteClient = new SQLiteClient();
