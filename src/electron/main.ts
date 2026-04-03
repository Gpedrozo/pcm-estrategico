/**
 * FASE 3.1 IMPLEMENTATION START
 * Desktop App Offline-First Foundation
 * Date: 2026-04-02
 * 
 * Stage 1: Electron Main Process Setup
 * Setup the basic Electron app structure with IPC communication
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import isDev from 'electron-is-dev';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

/**
 * Create the browser window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.ts'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:5173' // Vite dev server
    : `file://${path.join(__dirname, '../dist/index.html')}`; // Production build

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * App event handlers
 */
app.on('ready', createWindow);

app.on('window-all-closed', () => {
  // On macOS, apps stay open until user quits explicitly
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * IPC Handlers - Database operations
 */

ipcMain.handle('db:initialize', async () => {
  // Placeholder — will be implemented with SQLite initialization
  console.log('[IPC] Database initialization requested');
  return { success: true, message: 'Database initialized' };
});

ipcMain.handle('db:query', async (event, sql: string, params?: any[]) => {
  // Placeholder — will be implemented with actual SQLite queries
  console.log('[IPC] Query requested:', sql);
  return { success: true, data: [] };
});

ipcMain.handle('db:execute', async (event, sql: string, params?: any[]) => {
  // Placeholder — will be implemented with actual SQLite execution
  console.log('[IPC] Execute requested:', sql);
  return { success: true, changes: 0 };
});

/**
 * IPC Handlers - Sync status
 */

ipcMain.handle('sync:getStatus', async () => {
  // Placeholder — will return sync status
  return {
    isOnline: navigator.onLine,
    pendingCount: 0,
    lastSyncAt: null,
  };
});

ipcMain.handle('sync:queue', async () => {
  // Placeholder — will return pending operations
  return { operations: [] };
});

/**
 * IPC Handlers - Auth
 */

ipcMain.handle('auth:getSession', async () => {
  // Placeholder — will retrieve cached auth session
  return { user: null, session: null };
});

/**
 * Online/Offline detection
 */
ipcMain.handle('connection:check', async () => {
  const isOnline = mainWindow?.webContents.session?.cookies !== undefined;
  return { isOnline };
});

export default app;
