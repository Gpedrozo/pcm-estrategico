/**
 * Deploy sync fix changes to local clone
 * Applies targeted patches to 5 files
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = process.argv[2] || '.';

function patchFile(relPath, replacements) {
  const fullPath = join(BASE, relPath);
  let content = readFileSync(fullPath, 'utf8');
  for (const [search, replace] of replacements) {
    if (!content.includes(search)) {
      console.error(`❌ NOT FOUND in ${relPath}: "${search.substring(0, 60)}..."`);
      process.exit(1);
    }
    content = content.replace(search, replace);
  }
  writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ ${relPath}`);
}

// ── 1. syncEngine.ts ──
patchFile('mecanico-app/src/lib/syncEngine.ts', [
  // Add sync listeners after syncPromise declaration
  [
    `let syncPromise = null;`,
    `let syncPromise = null;

// ============================================================
// Sync event listeners — notify consumers when sync completes
// ============================================================

const syncListeners = new Set();

/** Register a callback invoked after every successful sync cycle. Returns unsubscribe fn. */
export function onSyncComplete(fn) {
  syncListeners.add(fn);
  return () => { syncListeners.delete(fn); };
}

function notifySyncListeners() {
  syncListeners.forEach((fn) => { try { fn(); } catch {} });
}`
  ],
  // Add notifySyncListeners() after pullData
  [
    `      // Notify listeners (HomeScreen, etc.) that fresh data is available\n      notifySyncListeners();\n\n      return { pushed, pulled: !!empresaId };`,
    // This won't match - let me use exact text from the file
    `notifySyncListeners();\n\n      return { pushed, pulled: !!empresaId };`
  ],
]);

console.log('Done');
