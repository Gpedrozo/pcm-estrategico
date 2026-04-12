import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, unauthorizedResponse } from "../_shared/auth.ts";
import { fail, ok, preflight, rejectIfOriginNotAllowed } from "../_shared/response.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { z } from "../_shared/validation.ts";

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const TENANT_BASE_DOMAIN = (Deno.env.get("TENANT_BASE_DOMAIN")
  ?? Deno.env.get("VITE_TENANT_BASE_DOMAIN")
  ?? "gppis.com.br")
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "");

const CF_API_TOKEN = (Deno.env.get("CF_API_TOKEN") ?? "").trim();
const CF_ACCOUNT_ID = (Deno.env.get("CF_ACCOUNT_ID") ?? "").trim();
const CF_PAGES_PROJECT_NAME = (Deno.env.get("CF_PAGES_PROJECT_NAME") ?? "").trim();
const CF_API_BASE_URL = "https://api.cloudflare.com/client/v4";
const CF_PAGES_AUTO_DOMAIN_ENABLED = (Deno.env.get("CF_PAGES_AUTO_DOMAIN_ENABLED") ?? "true").toLowerCase() !== "false";
const DOMAIN_SYNC_SECRET = (Deno.env.get("DOMAIN_SYNC_SECRET") ?? "").trim();
const DEFAULT_SYNC_BATCH_LIMIT = Number(Deno.env.get("DOMAIN_SYNC_BATCH_LIMIT") ?? "200");

function normalizeToken(input: string | null) {
  if (!input) return "";
  const value = input.trim();
  if (!value) return "";
  if (value.toLowerCase().startsWith("bearer ")) return value.slice(7).trim();
  return value;
}

function buildManagedTenantDomain(slug: string) {
  const safeSlug = (slug ?? "").trim().toLowerCase();
  if (!safeSlug || !TENANT_BASE_DOMAIN) return null;
  return `${safeSlug}.${TENANT_BASE_DOMAIN}`;
}

function isBaseTenantDomain(domain: string) {
  const normalized = (domain ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return normalized.endsWith(`.${TENANT_BASE_DOMAIN}`);
}

function resolveTargetDomain(slug: string, dominioCustom: string | null) {
  const custom = (dominioCustom ?? "").trim().toLowerCase();
  if (custom && isBaseTenantDomain(custom)) return custom;
  return buildManagedTenantDomain(slug);
}

async function cloudflareApiRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${CF_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      ...(init.headers ?? {}),
    },
  });

  const rawText = await response.text().catch(() => "");
  const payload = rawText ? JSON.parse(rawText) : null;

  if (!response.ok || !payload?.success) {
    const apiMessage = payload?.errors?.[0]?.message
      ?? payload?.messages?.[0]?.message
      ?? rawText
      ?? `HTTP ${response.status}`;
    throw new Error(`Cloudflare API error: ${apiMessage}`);
  }

  return payload;
}

async function listCloudflareCustomDomains() {
  const accountId = encodeURIComponent(CF_ACCOUNT_ID);
  const projectName = encodeURIComponent(CF_PAGES_PROJECT_NAME);
  const route = `/accounts/${accountId}/pages/projects/${projectName}/domains`;
  const payload = await cloudflareApiRequest(route, { method: "GET" });
  const domains = Array.isArray(payload?.result) ? payload.result : [];
  return new Set(domains.map((item: any) => (item?.name ?? "").toLowerCase()).filter(Boolean));
}

async function createCloudflareCustomDomain(domain: string) {
  const accountId = encodeURIComponent(CF_ACCOUNT_ID);
  const projectName = encodeURIComponent(CF_PAGES_PROJECT_NAME);
  const route = `/accounts/${accountId}/pages/projects/${projectName}/domains`;

  await cloudflareApiRequest(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: domain }),
  });
}

function ensureConfigured() {
  if (!CF_PAGES_AUTO_DOMAIN_ENABLED) {
    return "CF_PAGES_AUTO_DOMAIN_ENABLED=false";
  }
  if (!CF_API_TOKEN) return "CF_API_TOKEN nao configurado";
  if (!CF_ACCOUNT_ID) return "CF_ACCOUNT_ID nao configurado";
  if (!CF_PAGES_PROJECT_NAME) return "CF_PAGES_PROJECT_NAME nao configurado";
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return preflight(req, "POST,OPTIONS", "x-domain-sync-secret");

  const denied = rejectIfOriginNotAllowed(req);
  if (denied) return denied;

  if (req.method !== "POST") {
    return fail("Method not allowed", 405, null, req);
  }

  const headerSecret = normalizeToken(req.headers.get("x-domain-sync-secret"));
  const bearerSecret = normalizeToken(req.headers.get("authorization"));

  if (!DOMAIN_SYNC_SECRET) {
    return fail("DOMAIN_SYNC_SECRET not configured — rejecting (fail-closed)", 500, null, req);
  }

  {
    const authorized = headerSecret === DOMAIN_SYNC_SECRET || bearerSecret === DOMAIN_SYNC_SECRET;
    if (!authorized) return unauthorizedResponse(req);
  }

  // Rate limit: 30 requests per 60s per IP
  const syncIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
  const rl = await enforceRateLimit(adminClient(), { scope: "tenant_domain_sync", identifier: syncIp, maxRequests: 30, windowSeconds: 60 });
  if (!rl.allowed) return fail("Rate limit exceeded", 429, null, req);

  const configError = ensureConfigured();
  if (configError) {
    return fail("Cloudflare nao configurado para sincronizacao automatica", 400, { reason: configError }, req);
  }

  const rawPayload = await req.json().catch(() => ({}));
  const DomainSyncSchema = z.object({
    dry_run: z.boolean().optional(),
    limit: z.number().int().min(1).max(1000).optional(),
  });
  const parsed = DomainSyncSchema.safeParse(rawPayload);
  if (!parsed.success) return fail("Invalid request body", 400, null, req);
  const payload = parsed.data;
  const dryRun = Boolean(payload?.dry_run);
  const requestedLimit = Number(payload?.limit ?? DEFAULT_SYNC_BATCH_LIMIT);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(1000, Math.trunc(requestedLimit))) : 200;

  const admin = adminClient();

  const { data: companies, error: companyError } = await admin
    .from("empresas")
    .select("id,slug,nome")
    .not("slug", "is", null)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (companyError) {
    return fail("Falha ao carregar empresas para sincronizacao", 400, { reason: companyError.message }, req);
  }

  const companyRows = Array.isArray(companies) ? companies : [];
  const companyIds = companyRows.map((item: any) => item.id).filter(Boolean);

  const configMap = new Map<string, string>();
  if (companyIds.length > 0) {
    const { data: configs, error: configQueryError } = await admin
      .from("empresa_config")
      .select("empresa_id,dominio_custom")
      .in("empresa_id", companyIds);

    if (configQueryError) {
      return fail("Falha ao carregar configuracoes de dominio", 400, { reason: configQueryError.message }, req);
    }

    for (const row of configs ?? []) {
      const empresaId = row?.empresa_id;
      const domain = row?.dominio_custom;
      if (!empresaId || !domain) continue;
      configMap.set(String(empresaId), String(domain));
    }
  }

  const candidates = [] as Array<{ empresa_id: string; slug: string; domain: string }>;
  for (const row of companyRows) {
    const slug = (row?.slug ?? "").trim().toLowerCase();
    if (!slug) continue;

    const domain = resolveTargetDomain(slug, configMap.get(String(row.id)) ?? null);
    if (!domain) continue;
    if (!isBaseTenantDomain(domain)) continue;

    candidates.push({ empresa_id: row.id, slug, domain });
  }

  let existingDomains: Set<string>;
  try {
    existingDomains = await listCloudflareCustomDomains();
  } catch (cfError: any) {
    return fail("Falha ao listar dominios no Cloudflare", 502, { reason: cfError?.message ?? "unknown" }, req);
  }

  let alreadyProvisioned = 0;
  const missing = [] as Array<{ empresa_id: string; slug: string; domain: string }>;

  for (const item of candidates) {
    if (existingDomains.has(item.domain)) {
      alreadyProvisioned += 1;
      continue;
    }
    missing.push(item);
  }

  const toProcess = missing.slice(0, limit);

  const created = [] as string[];
  const errors = [] as Array<{ domain: string; reason: string }>;

  if (!dryRun) {
    for (const item of toProcess) {
      try {
        await createCloudflareCustomDomain(item.domain);
        created.push(item.domain);
      } catch (error: any) {
        errors.push({
          domain: item.domain,
          reason: error?.message ?? "erro desconhecido",
        });
      }
    }
  }

  return ok({
    success: errors.length === 0,
    dry_run: dryRun,
    base_domain: TENANT_BASE_DOMAIN,
    total_companies_with_slug: candidates.length,
    already_provisioned: alreadyProvisioned,
    missing_before_run: missing.length,
    processed_in_this_run: toProcess.length,
    created_count: dryRun ? 0 : created.length,
    created_domains: dryRun ? [] : created,
    errors,
    remaining_after_run: Math.max(0, missing.length - (dryRun ? 0 : created.length)),
  }, 200, req);
});
