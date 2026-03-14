const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const PAGES_DIR = path.join(SRC_DIR, 'pages');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const FUNCTIONS_DIR = path.join(ROOT, 'supabase', 'functions');
const OUT_JSON = path.join(ROOT, 'docs', 'MODULE_DB_USAGE_AUDIT_20260313.json');
const OUT_MD = path.join(ROOT, 'docs', 'MODULE_DB_USAGE_AUDIT_20260313.md');

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full, predicate));
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

function read(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function toUnix(p) {
  return p.split(path.sep).join('/');
}

function rel(p) {
  return toUnix(path.relative(ROOT, p));
}

function resolveImport(fromFile, importPath) {
  const fromDir = path.dirname(fromFile);

  const tryTargets = [];

  if (importPath.startsWith('@/')) {
    tryTargets.push(path.join(SRC_DIR, importPath.slice(2)));
  } else if (importPath.startsWith('./') || importPath.startsWith('../')) {
    tryTargets.push(path.resolve(fromDir, importPath));
  } else {
    return null;
  }

  for (const base of tryTargets) {
    if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;

    for (const ext of EXTENSIONS) {
      const fileWithExt = `${base}${ext}`;
      if (fs.existsSync(fileWithExt)) return fileWithExt;
    }

    for (const ext of EXTENSIONS) {
      const idx = path.join(base, `index${ext}`);
      if (fs.existsSync(idx)) return idx;
    }
  }

  return null;
}

function extractImports(content) {
  const imports = [];
  const re = /import\s+(?:type\s+)?[\s\S]*?from\s+['\"]([^'\"]+)['\"]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    imports.push(m[1]);
  }
  return imports;
}

function extractTablesAndRpc(content) {
  const tableOps = new Map();
  const rpc = new Set();

  const fromRe = /\.from\((['\"])([a-zA-Z0-9_]+)\1\)/g;
  let m;
  while ((m = fromRe.exec(content)) !== null) {
    const table = m[2];
    const after = content.slice(m.index, m.index + 220);
    const opMatch = after.match(/\.(select|insert|update|upsert|delete)\s*\(/);
    const op = opMatch ? opMatch[1] : 'unknown';

    if (!tableOps.has(table)) tableOps.set(table, new Set());
    tableOps.get(table).add(op);
  }

  const rpcRe = /\.rpc\((['\"])([a-zA-Z0-9_]+)\1\)/g;
  while ((m = rpcRe.exec(content)) !== null) {
    rpc.add(m[2]);
  }

  return { tableOps, rpc };
}

function mergeTableOps(target, source) {
  for (const [table, ops] of source.entries()) {
    if (!target.has(table)) target.set(table, new Set());
    for (const op of ops) target.get(table).add(op);
  }
}

function listPageEntries() {
  return walk(PAGES_DIR, (f) => EXTENSIONS.includes(path.extname(f)))
    .filter((f) => !f.endsWith('.test.tsx') && !f.endsWith('.test.ts') && !f.endsWith('.spec.tsx') && !f.endsWith('.spec.ts'));
}

function collectModuleGraph(entryFile) {
  const visited = new Set();
  const stack = [entryFile];
  const graphFiles = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    graphFiles.push(current);

    const content = read(current);
    const imports = extractImports(content);

    for (const imp of imports) {
      const resolved = resolveImport(current, imp);
      if (!resolved) continue;
      if (!resolved.startsWith(SRC_DIR)) continue;
      if (!visited.has(resolved)) stack.push(resolved);
    }
  }

  return graphFiles;
}

function parseCreatedTables() {
  const migrationFiles = walk(MIGRATIONS_DIR, (f) => f.endsWith('.sql'));
  const created = new Set();
  const createRe = /CREATE TABLE(?: IF NOT EXISTS)?\s+public\.([a-zA-Z0-9_]+)/gi;

  for (const file of migrationFiles) {
    const content = read(file);
    let m;
    while ((m = createRe.exec(content)) !== null) {
      created.add(m[1]);
    }
  }

  return created;
}

function parseFunctionTablesAndRpc() {
  const fnFiles = walk(FUNCTIONS_DIR, (f) => f.endsWith('.ts') || f.endsWith('.js'));
  const tableOps = new Map();
  const rpc = new Set();

  for (const file of fnFiles) {
    const content = read(file);
    const extracted = extractTablesAndRpc(content);
    mergeTableOps(tableOps, extracted.tableOps);
    for (const fn of extracted.rpc) rpc.add(fn);
  }

  return { tableOps, rpc, files: fnFiles.map(rel) };
}

function parseAllFrontendTablesAndRpc() {
  const srcFiles = walk(SRC_DIR, (f) => EXTENSIONS.includes(path.extname(f)));
  const tableOps = new Map();
  const rpc = new Set();

  for (const file of srcFiles) {
    const content = read(file);
    const extracted = extractTablesAndRpc(content);
    mergeTableOps(tableOps, extracted.tableOps);
    for (const fn of extracted.rpc) rpc.add(fn);
  }

  return { tableOps, rpc, files: srcFiles.map(rel) };
}

function toPlainTableOps(map) {
  const out = {};
  for (const [table, ops] of [...map.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    out[table] = [...ops].sort();
  }
  return out;
}

function main() {
  const pageFiles = listPageEntries();
  const moduleAudits = [];

  const globalModuleTableOps = new Map();
  const globalModuleRpc = new Set();

  for (const pageFile of pageFiles) {
    const moduleName = path.basename(pageFile).replace(path.extname(pageFile), '');
    const graph = collectModuleGraph(pageFile);

    const tableOps = new Map();
    const rpc = new Set();

    for (const file of graph) {
      const content = read(file);
      const extracted = extractTablesAndRpc(content);
      mergeTableOps(tableOps, extracted.tableOps);
      for (const fn of extracted.rpc) rpc.add(fn);
    }

    mergeTableOps(globalModuleTableOps, tableOps);
    for (const fn of rpc) globalModuleRpc.add(fn);

    moduleAudits.push({
      module: moduleName,
      entry: rel(pageFile),
      dependencyFileCount: graph.length,
      dependencyFiles: graph.map(rel).sort(),
      tables: toPlainTableOps(tableOps),
      rpc: [...rpc].sort(),
    });
  }

  moduleAudits.sort((a, b) => a.module.localeCompare(b.module));

  const createdTables = parseCreatedTables();
  const frontendUsage = parseAllFrontendTablesAndRpc();
  const functionUsage = parseFunctionTablesAndRpc();

  const moduleUsedTables = new Set(Object.keys(toPlainTableOps(globalModuleTableOps)));
  const frontendUsedTables = new Set(Object.keys(toPlainTableOps(frontendUsage.tableOps)));
  const functionUsedTables = new Set(Object.keys(toPlainTableOps(functionUsage.tableOps)));

  const allUsedTables = new Set([...frontendUsedTables, ...functionUsedTables]);
  const unusedCandidateTables = [...createdTables].filter((t) => !allUsedTables.has(t)).sort();

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      modulesAudited: moduleAudits.length,
      createdTablesInMigrations: createdTables.size,
      tablesUsedByModules: moduleUsedTables.size,
      tablesUsedByFrontendGlobal: frontendUsedTables.size,
      tablesUsedByEdgeFunctions: functionUsedTables.size,
      tablesUsedOverall: allUsedTables.size,
      unusedCandidateTables: unusedCandidateTables.length,
    },
    global: {
      moduleTableOps: toPlainTableOps(globalModuleTableOps),
      moduleRpc: [...globalModuleRpc].sort(),
      frontendTableOps: toPlainTableOps(frontendUsage.tableOps),
      frontendRpc: [...frontendUsage.rpc].sort(),
      frontendFiles: frontendUsage.files.sort(),
      functionTableOps: toPlainTableOps(functionUsage.tableOps),
      functionRpc: [...functionUsage.rpc].sort(),
      edgeFunctionFiles: functionUsage.files.sort(),
      createdTables: [...createdTables].sort(),
      unusedCandidateTables,
    },
    modules: moduleAudits,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  const lines = [];
  lines.push('# Auditoria de Uso de Tabelas por Modulo');
  lines.push('');
  lines.push(`Gerado em: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Resumo');
  lines.push('');
  lines.push(`- Modulos auditados: ${report.summary.modulesAudited}`);
  lines.push(`- Tabelas criadas em migrations: ${report.summary.createdTablesInMigrations}`);
  lines.push(`- Tabelas usadas pelos modulos: ${report.summary.tablesUsedByModules}`);
  lines.push(`- Tabelas usadas no frontend (global): ${report.summary.tablesUsedByFrontendGlobal}`);
  lines.push(`- Tabelas usadas por edge functions: ${report.summary.tablesUsedByEdgeFunctions}`);
  lines.push(`- Tabelas usadas no total: ${report.summary.tablesUsedOverall}`);
  lines.push(`- Candidatas sem uso (modulos + edge): ${report.summary.unusedCandidateTables}`);
  lines.push('');

  lines.push('## Candidatas Sem Uso');
  lines.push('');
  if (unusedCandidateTables.length === 0) {
    lines.push('- Nenhuma candidata encontrada.');
  } else {
    for (const t of unusedCandidateTables) lines.push(`- ${t}`);
  }
  lines.push('');

  lines.push('## Uso por Modulo (Pagina -> Dependencias Locais)');
  lines.push('');
  for (const mod of moduleAudits) {
    const tableEntries = Object.entries(mod.tables);
    lines.push(`### ${mod.module}`);
    lines.push('');
    lines.push(`- Entrada: ${mod.entry}`);
    lines.push(`- Arquivos no grafo: ${mod.dependencyFileCount}`);
    lines.push(`- Tabelas acessadas: ${tableEntries.length}`);

    if (tableEntries.length === 0) {
      lines.push('- Sem acesso direto a tabelas Supabase no grafo local.');
    } else {
      for (const [table, ops] of tableEntries) {
        lines.push(`- ${table}: ${ops.join(', ')}`);
      }
    }

    if (mod.rpc.length > 0) {
      lines.push(`- RPC: ${mod.rpc.join(', ')}`);
    }

    lines.push('');
  }

  fs.writeFileSync(OUT_MD, `${lines.join('\n')}\n`);

  console.log('Relatorio JSON:', rel(OUT_JSON));
  console.log('Relatorio MD:', rel(OUT_MD));
  console.log('Candidatas sem uso:', unusedCandidateTables.length);
  if (unusedCandidateTables.length > 0) {
    console.log(unusedCandidateTables.join(', '));
  }
}

main();
