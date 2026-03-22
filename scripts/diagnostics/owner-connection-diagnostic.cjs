const fs = require('fs');

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  const txt = fs.readFileSync(file, 'utf8');
  const out = {};
  for (const line of txt.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i <= 0) continue;
    const k = trimmed.slice(0, i).trim();
    let v = trimmed.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

function redact(v) {
  if (!v) return null;
  if (v.length <= 10) return '***';
  return v.slice(0, 5) + '...' + v.slice(-4);
}

async function safeJson(res) {
  const text = await res.text();
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

async function runTest(name, fn) {
  const started = Date.now();
  try {
    const r = await fn();
    return { name, ok: r.ok, status: r.status ?? null, detail: r.detail ?? null, ms: Date.now() - started };
  } catch (e) {
    return { name, ok: false, status: null, detail: String(e && e.message ? e.message : e), ms: Date.now() - started };
  }
}

function projectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split('.')[0];
  } catch {
    return null;
  }
}

function reportPath() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  if (!fs.existsSync('reports')) fs.mkdirSync('reports', { recursive: true });
  return `reports/OWNER_CONNECTION_DIAGNOSTIC_${ts}.json`;
}

(async () => {
  const env = { ...loadEnv('.env'), ...loadEnv('.env.local'), ...process.env };
  const baseUrl = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;

  if (!baseUrl || !anonKey) {
    throw new Error('Ambiente sem VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY');
  }

  const diagEmail = env.OWNER_DIAG_EMAIL || 'pedrozo@gppis.com.br';
  const diagPassword = env.OWNER_DIAG_PASSWORD || null;

  const tests = [];

  tests.push(await runTest('auth_health', async () => {
    const res = await fetch(baseUrl + '/auth/v1/health', { headers: { apikey: anonKey } });
    const body = await safeJson(res);
    return { ok: res.ok, status: res.status, detail: body.json || body.text.slice(0, 300) };
  }));

  tests.push(await runTest('auth_password_invalid_probe', async () => {
    const res = await fetch(baseUrl + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: diagEmail, password: 'SenhaInvalidaForcada!123' }),
    });
    const body = await safeJson(res);
    const msg = (body.json && (body.json.msg || body.json.message || body.json.error_description || body.json.error)) || body.text;
    const schemaBroken = String(msg || '').toLowerCase().includes('database error querying schema');
    const ok = (res.status === 400 || res.status === 401) && !schemaBroken;
    return { ok, status: res.status, detail: { message: String(msg || '').slice(0, 400), payload: body.json || null } };
  }));

  tests.push(await runTest('edge_auth_login_probe', async () => {
    const res = await fetch(baseUrl + '/functions/v1/auth-login', {
      method: 'POST',
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
        origin: 'https://owner.gppis.com.br',
      },
      body: JSON.stringify({ email: diagEmail, password: 'SenhaInvalidaForcada!123' }),
    });
    const body = await safeJson(res);
    const msg = (body.json && (body.json.error || body.json.message || body.json.details?.auth_message)) || body.text;
    const schemaBroken =
      String(msg || '').toLowerCase().includes('database error querying schema') ||
      String(msg || '').toLowerCase().includes('auth schema misconfigured');

    return { ok: !schemaBroken, status: res.status, detail: { message: String(msg || '').slice(0, 500), payload: body.json || null } };
  }));

  tests.push(await runTest('edge_owner_portal_health_unauth', async () => {
    const res = await fetch(baseUrl + '/functions/v1/owner-portal-admin', {
      method: 'POST',
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
        origin: 'https://owner.gppis.com.br',
      },
      body: JSON.stringify({ action: 'health_check' }),
    });
    const body = await safeJson(res);
    const unauthorized = res.status === 401 || res.status === 403;
    return { ok: unauthorized, status: res.status, detail: body.json || body.text.slice(0, 500) };
  }));

  if (diagPassword) {
    tests.push(await runTest('auth_password_real_credentials', async () => {
      const res = await fetch(baseUrl + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: diagEmail, password: diagPassword }),
      });
      const body = await safeJson(res);
      const msg = (body.json && (body.json.msg || body.json.message || body.json.error_description || body.json.error)) || body.text;
      return { ok: res.ok, status: res.status, detail: { message: String(msg || '').slice(0, 400), payload: body.json || null } };
    }));
  }

  const failed = tests.filter((t) => !t.ok);
  const report = {
    generated_at: new Date().toISOString(),
    supabase: {
      url: baseUrl,
      anon_key: redact(anonKey),
      project_ref: projectRefFromUrl(baseUrl),
      owner_env_present: Boolean(env.VITE_OWNER_SUPABASE_URL || env.VITE_OWNER_SUPABASE_ANON_KEY || env.VITE_OWNER_SUPABASE_PUBLISHABLE_KEY),
      tenant_base_domain: env.VITE_TENANT_BASE_DOMAIN || null,
    },
    tests,
    summary: {
      total: tests.length,
      failed: failed.length,
      healthy: failed.length === 0,
      likely_root_cause: failed.some((t) => t.name === 'auth_password_invalid_probe' || t.name === 'edge_auth_login_probe')
        ? 'supabase_auth_schema_or_auth_backend'
        : 'none',
    },
  };

  const outPath = reportPath();
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('DIAGNOSTIC_REPORT=' + outPath);
  console.log(JSON.stringify(report.summary, null, 2));
  for (const t of tests) {
    const flag = t.ok ? 'OK' : 'FAIL';
    console.log(flag + ' | ' + t.name + ' | status=' + t.status + ' | ms=' + t.ms);
    if (!t.ok) {
      console.log('  detail=' + JSON.stringify(t.detail).slice(0, 500));
    }
  }
})();
