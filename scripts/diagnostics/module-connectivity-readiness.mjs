import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const APP_FILE = path.join(SRC_DIR, 'App.tsx');
const PAGES_DIR = path.join(SRC_DIR, 'pages');
const OUT_DIR = path.join(ROOT, 'reports');
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

const MODULE_SEQUENCE = [
  'Principal',
  'Dashboard',
  'Ordens de Serviço',
  'Solicitações',
  'Backlog',
  'Emitir O.S',
  'Fechar O.S',
  'Portal Mecânico',
  'Histórico',
  'Planejamento',
  'Lubrificação',
  'Programação',
  'Preventiva',
  'Preditiva',
  'Inspeções',
  'Análises',
  'FMEA/RCM',
  'Causa Raiz',
  'Inteligência IA',
  'Melhorias',
  'Catálogos',
  'Hierarquia',
  'Equipamentos',
  'Mecânicos',
  'Materiais',
  'Fornecedores',
  'Contratos',
  'Catálogos Técnicos',
  'Relatórios',
  'Custos',
  'Segurança',
  'SSMA',
  'Ajuda',
  'Suporte',
  'Manuais de Operação',
  'Administração',
  'Central Admin',
];

const MODULE_ROUTE_MAP = {
  Principal: ['/dashboard'],
  Dashboard: ['/dashboard'],
  'Ordens de Serviço': ['/solicitacoes', '/backlog', '/os/nova', '/os/fechar', '/os/portal-mecanico', '/os/historico'],
  'Solicitações': ['/solicitacoes'],
  Backlog: ['/backlog'],
  'Emitir O.S': ['/os/nova'],
  'Fechar O.S': ['/os/fechar'],
  'Portal Mecânico': ['/os/portal-mecanico'],
  'Histórico': ['/os/historico'],
  Planejamento: ['/programacao', '/preventiva', '/preditiva', '/inspecoes', '/lubrificacao'],
  'Lubrificação': ['/lubrificacao'],
  'Programação': ['/programacao'],
  Preventiva: ['/preventiva'],
  Preditiva: ['/preditiva'],
  'Inspeções': ['/inspecoes'],
  'Análises': ['/fmea', '/rca', '/inteligencia-causa-raiz', '/melhorias'],
  'FMEA/RCM': ['/fmea'],
  'Causa Raiz': ['/rca'],
  'Inteligência IA': ['/inteligencia-causa-raiz'],
  Melhorias: ['/melhorias'],
  Catálogos: ['/hierarquia', '/equipamentos', '/mecanicos', '/materiais', '/fornecedores', '/contratos', '/documentos'],
  Hierarquia: ['/hierarquia'],
  Equipamentos: ['/equipamentos'],
  'Mecânicos': ['/mecanicos'],
  Materiais: ['/materiais'],
  Fornecedores: ['/fornecedores'],
  Contratos: ['/contratos'],
  'Catálogos Técnicos': ['/documentos'],
  'Relatórios': ['/relatorios', '/custos'],
  Custos: ['/custos'],
  Segurança: ['/ssma'],
  SSMA: ['/ssma'],
  Ajuda: ['/suporte', '/manuais-operacao'],
  Suporte: ['/suporte'],
  'Manuais de Operação': ['/manuais-operacao', '/manuais-operacao/usuario', '/manuais-operacao/admin', '/manuais-operacao/master-ti'],
  Administração: ['/administracao'],
  'Central Admin': ['/administracao'],
};

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

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

function normalizePath(p) {
  return p.split(path.sep).join('/');
}

function rel(p) {
  return normalizePath(path.relative(ROOT, p));
}

function extractProjectRefFromUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

function decodeJwtPayload(token) {
  if (!token) return null;
  const parts = String(token).split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function parseRouteComponentMap(appContent) {
  const lazyMap = new Map();
  const lazyRe = /const\s+([A-Za-z0-9_]+)\s*=\s*lazy\(\(\)\s*=>\s*import\(['\"]([^'\"]+)['\"]\)\)/g;
  let m;
  while ((m = lazyRe.exec(appContent)) !== null) {
    lazyMap.set(m[1], m[2]);
  }

  const routeMap = new Map();
  const routeRe = /<Route\s+path=\"([^\"]+)\"\s+element=\{<([A-Za-z0-9_]+)\s*\/>\}\s*\/>/g;
  while ((m = routeRe.exec(appContent)) !== null) {
    const routePath = m[1];
    const componentName = m[2];
    routeMap.set(routePath, componentName);
  }

  return { lazyMap, routeMap };
}

function resolveLazyImportToFile(importPath) {
  const base = path.resolve(SRC_DIR, importPath.replace(/^\.\//, ''));
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;

  for (const ext of EXTENSIONS) {
    const withExt = `${base}${ext}`;
    if (fs.existsSync(withExt)) return withExt;
  }

  for (const ext of EXTENSIONS) {
    const idx = path.join(base, `index${ext}`);
    if (fs.existsSync(idx)) return idx;
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

function resolveImport(fromFile, importPath) {
  if (!(importPath.startsWith('@/') || importPath.startsWith('./') || importPath.startsWith('../'))) {
    return null;
  }

  const fromDir = path.dirname(fromFile);
  const candidates = [];

  if (importPath.startsWith('@/')) {
    candidates.push(path.join(SRC_DIR, importPath.slice(2)));
  } else {
    candidates.push(path.resolve(fromDir, importPath));
  }

  for (const base of candidates) {
    if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
    for (const ext of EXTENSIONS) {
      const withExt = `${base}${ext}`;
      if (fs.existsSync(withExt)) return withExt;
    }
    for (const ext of EXTENSIONS) {
      const idx = path.join(base, `index${ext}`);
      if (fs.existsSync(idx)) return idx;
    }
  }

  return null;
}

function collectDependencyGraph(entryFiles) {
  const visited = new Set();
  const stack = [...entryFiles];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const content = readFileSafe(current);
    const imports = extractImports(content);

    for (const imp of imports) {
      const resolved = resolveImport(current, imp);
      if (!resolved) continue;
      if (!resolved.startsWith(SRC_DIR)) continue;
      if (!visited.has(resolved)) stack.push(resolved);
    }
  }

  return [...visited];
}

function extractTablesAndRpc(content) {
  const tables = new Map();
  const rpc = new Set();

  const fromRe = /\.from\((['\"])([a-zA-Z0-9_]+)\1\)/g;
  let m;
  while ((m = fromRe.exec(content)) !== null) {
    const table = m[2];
    const after = content.slice(m.index, m.index + 220);
    const opMatch = after.match(/\.(select|insert|update|upsert|delete)\s*\(/);
    const op = opMatch ? opMatch[1] : 'unknown';

    if (!tables.has(table)) tables.set(table, new Set());
    tables.get(table).add(op);
  }

  const rpcRe = /\.rpc\((['\"])([a-zA-Z0-9_]+)\1\)/g;
  while ((m = rpcRe.exec(content)) !== null) {
    rpc.add(m[2]);
  }

  return { tables, rpc };
}

function mergeTableOps(target, source) {
  for (const [table, ops] of source.entries()) {
    if (!target.has(table)) target.set(table, new Set());
    for (const op of ops) target.get(table).add(op);
  }
}

function tableOpsToObject(map) {
  const out = {};
  for (const [table, ops] of [...map.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    out[table] = [...ops].sort();
  }
  return out;
}

function hasMissingTableError(errorMessage) {
  const normalized = String(errorMessage || '').toLowerCase();
  return normalized.includes('could not find the table') || normalized.includes('relation') && normalized.includes('does not exist');
}

async function probeTables(supabase, tables) {
  const results = [];

  for (const table of tables) {
    try {
      const { error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        results.push({
          table,
          ok: false,
          missing: hasMissingTableError(error.message),
          message: error.message,
          code: error.code ?? null,
          hint: error.hint ?? null,
        });
      } else {
        results.push({ table, ok: true, count: typeof count === 'number' ? count : null });
      }
    } catch (error) {
      results.push({ table, ok: false, missing: false, message: String(error) });
    }
  }

  return results;
}

async function run() {
  const appContent = readFileSafe(APP_FILE);
  const { lazyMap, routeMap } = parseRouteComponentMap(appContent);

  const envUrl = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const envKey = String(
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  ).trim();

  const projectRefFromUrl = extractProjectRefFromUrl(envUrl);
  const projectRefFromKey = decodeJwtPayload(envKey)?.ref ?? null;
  const projectRefMatch = Boolean(projectRefFromUrl && projectRefFromKey && projectRefFromUrl === projectRefFromKey);

  const canProbeRuntime = Boolean(envUrl && envKey);
  const supabase = canProbeRuntime ? createClient(envUrl, envKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

  const modules = [];
  const uniqueTables = new Set();
  const uniqueRpc = new Set();

  for (const moduleName of MODULE_SEQUENCE) {
    const routes = MODULE_ROUTE_MAP[moduleName] || [];
    const components = routes
      .map((routePath) => routeMap.get(routePath))
      .filter(Boolean);

    const entryFiles = components
      .map((componentName) => lazyMap.get(componentName))
      .filter(Boolean)
      .map((importPath) => resolveLazyImportToFile(importPath))
      .filter(Boolean);

    const graph = collectDependencyGraph(entryFiles);
    const tableOps = new Map();
    const rpc = new Set();

    for (const file of graph) {
      const content = readFileSafe(file);
      const extracted = extractTablesAndRpc(content);
      mergeTableOps(tableOps, extracted.tables);
      for (const fn of extracted.rpc) rpc.add(fn);
    }

    for (const t of tableOps.keys()) uniqueTables.add(t);
    for (const fn of rpc) uniqueRpc.add(fn);

    modules.push({
      module: moduleName,
      routes,
      components,
      entryFiles: entryFiles.map(rel),
      dependencyFiles: graph.map(rel).sort(),
      tableOps: tableOpsToObject(tableOps),
      rpc: [...rpc].sort(),
    });
  }

  let tableProbeResults = [];
  if (supabase) {
    tableProbeResults = await probeTables(supabase, [...uniqueTables].sort());
  }

  const missingTables = tableProbeResults.filter((r) => !r.ok && r.missing).map((r) => r.table);

  const moduleStatus = modules.map((m) => {
    const tables = Object.keys(m.tableOps);
    const missingForModule = tables.filter((t) => missingTables.includes(t));
    return {
      module: m.module,
      ok: missingForModule.length === 0,
      missingTables: missingForModule,
      tablesChecked: tables.length,
      rpcCount: m.rpc.length,
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    environment: {
      supabaseUrl: envUrl || null,
      projectRefFromUrl,
      projectRefFromKey,
      projectRefMatch,
      runtimeProbeEnabled: canProbeRuntime,
      runtimeProbeKeyType: envKey
        ? (envKey.startsWith('sb_publishable_') ? 'publishable' : envKey.startsWith('eyJ') ? 'jwt' : 'unknown')
        : null,
    },
    summary: {
      modulesOrdered: MODULE_SEQUENCE.length,
      modulesWithRisk: moduleStatus.filter((m) => !m.ok).length,
      uniqueTables: uniqueTables.size,
      uniqueRpc: uniqueRpc.size,
      runtimeProbedTables: tableProbeResults.length,
      missingTablesDetected: missingTables.length,
    },
    moduleStatus,
    modules,
    tableProbeResults,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[.:]/g, '-');
  const outJson = path.join(OUT_DIR, `MODULE_CONNECTIVITY_READINESS_${stamp}.json`);
  const outMd = path.join(OUT_DIR, `MODULE_CONNECTIVITY_READINESS_${stamp}.md`);

  fs.writeFileSync(outJson, JSON.stringify(report, null, 2));

  const lines = [];
  lines.push('# Readiness de Conectividade de Modulos');
  lines.push('');
  lines.push(`Gerado em: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Ambiente Supabase');
  lines.push(`- URL configurada: ${report.environment.supabaseUrl ? 'sim' : 'nao'}`);
  lines.push(`- Project ref URL: ${report.environment.projectRefFromUrl ?? 'n/a'}`);
  lines.push(`- Project ref KEY: ${report.environment.projectRefFromKey ?? 'n/a'}`);
  lines.push(`- URL/KEY coerentes: ${report.environment.projectRefMatch ? 'sim' : 'nao/indefinido'}`);
  lines.push(`- Probe runtime habilitado: ${report.environment.runtimeProbeEnabled ? 'sim' : 'nao'}`);
  lines.push('');
  lines.push('## Resumo');
  lines.push(`- Modulos na sequencia solicitada: ${report.summary.modulesOrdered}`);
  lines.push(`- Modulos com risco: ${report.summary.modulesWithRisk}`);
  lines.push(`- Tabelas unicas mapeadas: ${report.summary.uniqueTables}`);
  lines.push(`- RPC unicas mapeadas: ${report.summary.uniqueRpc}`);
  lines.push(`- Tabelas validadas em runtime: ${report.summary.runtimeProbedTables}`);
  lines.push(`- Tabelas faltantes detectadas: ${report.summary.missingTablesDetected}`);
  lines.push('');
  lines.push('## Status por Modulo');
  lines.push('');

  for (const item of moduleStatus) {
    lines.push(`### ${item.module}`);
    lines.push(`- Status: ${item.ok ? 'OK' : 'RISCO'}`);
    lines.push(`- Tabelas checadas: ${item.tablesChecked}`);
    lines.push(`- RPC: ${item.rpcCount}`);
    if (item.missingTables.length > 0) {
      lines.push(`- Tabelas ausentes: ${item.missingTables.join(', ')}`);
    }
    lines.push('');
  }

  fs.writeFileSync(outMd, `${lines.join('\n')}\n`);

  console.log(`MODULE_READINESS_JSON=${rel(outJson)}`);
  console.log(`MODULE_READINESS_MD=${rel(outMd)}`);
  console.log(`MODULES_WITH_RISK=${report.summary.modulesWithRisk}`);
  console.log(`MISSING_TABLES=${report.summary.missingTablesDetected}`);
}

run().catch((error) => {
  console.error('[module-connectivity-readiness] fail', error?.message || error);
  process.exitCode = 1;
});
