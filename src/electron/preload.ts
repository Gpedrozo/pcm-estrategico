/**
 * FASE 3.1 IMPLEMENTATION START
 * Electron Context Bridge (IPC Preload)
 * Date: 2026-04-02
 * 
 * Exposes safe IPC channels to React app
 * Enables communication between Electron main → React renderer
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Database API
 * React components use: window.api.db.initialize(), db.query(), db.execute()
 */
const dbApi = {
  initialize: () => ipcRenderer.invoke('db:initialize'),
  query: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
  execute: (sql: string, params?: any[]) => ipcRenderer.invoke('db:execute', sql, params),
};

/**
 * Sync API
 * React components use: window.api.sync.getStatus(), sync.queue()
 */
const syncApi = {
  getStatus: () => ipcRenderer.invoke('sync:getStatus'),
  queue: () => ipcRenderer.invoke('sync:queue'),
  
  // Event listeners for sync updates
  onSyncStarted: (callback: () => void) => {
    ipcRenderer.on('sync:started', callback);
    return () => ipcRenderer.removeListener('sync:started', callback);
  },
  onSyncComplete: (callback: (result: any) => void) => {
    ipcRenderer.on('sync:complete', callback);
    return () => ipcRenderer.removeListener('sync:complete', callback);
  },
  onSyncError: (callback: (error: string) => void) => {
    ipcRenderer.on('sync:error', callback);
    return () => ipcRenderer.removeListener('sync:error', callback);
  },
};

/**
 * Auth API
 * React components use: window.api.auth.getSession()
 */
const authApi = {
  getSession: () => ipcRenderer.invoke('auth:getSession'),
  logout: () => ipcRenderer.invoke('auth:logout'),
};

/**
 * Connection API
 * React components use: window.api.connection.check()
 */
const connectionApi = {
  check: () => ipcRenderer.invoke('connection:check'),
  
  // Event listeners for connection changes
  onOnline: (callback: () => void) => {
    ipcRenderer.on('connection:online', callback);
    return () => ipcRenderer.removeListener('connection:online', callback);
  },
  onOffline: (callback: () => void) => {
    ipcRenderer.on('connection:offline', callback);
    return () => ipcRenderer.removeListener('connection:offline', callback);
  },
};

/**
 * Expose APIs to React via window.api
 * Usage in React: const status = await window.api.db.query(sql)
 */
contextBridge.exposeInMainWorld('api', {
  db: dbApi,
  sync: syncApi,
  auth: authApi,
  connection: connectionApi,
  
  /**
   * Platform info
   */
  platform: process.platform as 'win32' | 'darwin' | 'linux',
  isDev: process.env.NODE_ENV === 'development',
});

/**
 * TypeScript type declaration
 * Add to window.d.ts for type safety in React
 */
declare global {
  interface Window {
    api: {
      db: typeof dbApi;
      sync: typeof syncApi;
      auth: typeof authApi;
      connection: typeof connectionApi;
      platform: 'win32' | 'darwin' | 'linux';
      isDev: boolean;
    };
  }
}
