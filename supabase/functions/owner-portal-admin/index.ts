import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, isOwnerOperator, isSystemOperator, requireUser, unauthorizedResponse } from "../_shared/auth.ts";
import { fail, ok, preflight, rejectIfOriginNotAllowed, resolveCorsHeaders } from "../_shared/response.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { createRequestTrace, traceDurationMs, writeOperationalLog } from "../_shared/observability.ts";
import { failRateLimited, logAuditEvent } from "../_shared/audit.ts";

type Payload = {
  action:
    | "health_check"
    | "dashboard"
    | "list_companies"
    | "create_company"
    | "update_company"
    | "set_company_status"
    | "list_users"
    | "create_user"
    | "set_user_status"
    | "move_user_company"
    | "set_user_password"
    | "list_plans"
    | "create_plan"
    | "update_plan"
    | "list_subscriptions"
    | "create_subscription"
    | "set_subscription_status"
    | "list_contracts"
    | "update_contract"
    | "regenerate_contract"
    | "delete_contract"
    | "list_support_tickets"
    | "respond_support_ticket"
    | "mark_ticket_read_owner"
    | "delete_support_ticket"
    | "list_audit_logs"
    | "get_company_settings"
    | "update_company_settings"
    | "set_user_inactivity_timeout"
    | "change_plan"
    | "platform_stats"
    | "create_system_admin"
    | "impersonate_company"
    | "stop_impersonation"
    | "validate_impersonation"
    | "update_subscription_billing"
    | "list_platform_owners"
    | "create_platform_owner"
    | "cleanup_owner_stress_data"
    | "list_database_tables"
    | "cleanup_company_data"
    | "delete_company"
    | "purge_table_data"
    | "purge_device_users"
    | "delete_support_ticket"
    | "delete_user"
    | "asaas_link_subscription"
    | "asaas_sync_subscription"
    | "list_subscription_payments"
    | "enforce_subscription_expiry"
    | "set_asaas_api_key"
    | "get_asaas_config"
    | "reactivate_company";
  empresa_id?: string;
  include_deleted?: boolean;
  company?: {
    nome: string;
    slug?: string;
    razao_social?: string;
    nome_fantasia?: string;
    cnpj?: string;
    tipo_pessoa?: "PF" | "PJ";
    cpf_cnpj?: string;
    endereco?: string;
    telefone?: string;
    email?: string;
    responsavel?: string;
    segmento?: string;
    status?: string;
    inactivity_timeout_minutes?: number | null;
  };
  user?: {
    nome: string;
    email: string;
    password?: string;
    empresa_id: string;
    role: string;
    status?: string;
    force_password_change?: boolean;
  };
  owner_user?: {
    nome: string;
    email: string;
    password?: string;
    role?: "SYSTEM_ADMIN";
  };
  plan?: {
    id?: string;
    code: string;
    name: string;
    description?: string;
    user_limit?: number;
    module_flags?: Record<string, unknown>;
    data_limit_mb?: number;
    premium_features?: string[];
    company_limit?: number | null;
    price_month?: number;
    active?: boolean;
  };
  subscription?: {
    empresa_id: string;
    plan_id: string;
    amount?: number;
    payment_method?: string;
    period?: "monthly" | "quarterly" | "yearly" | "custom";
    starts_at?: string;
    ends_at?: string | null;
    renewal_at?: string | null;
    status?: "ativa" | "atrasada" | "cancelada" | "teste";
    payment_status?: string;
  };
  contract_id?: string;
  content?: string;
  status?: string;
  summary?: string;
  ticket_id?: string;
  response?: string;
  subscription_id?: string;
  billing?: {
    amount?: number;
    period?: "monthly" | "quarterly" | "yearly" | "custom";
    payment_method?: string;
    payment_status?: string;
    status?: "ativa" | "atrasada" | "cancelada" | "teste";
    renewal_at?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
  };
  limit?: number;
  filters?: {
    empresa_id?: string;
    user_id?: string;
    module?: string;
    from?: string;
    to?: string;
  };
  settings?: {
    modules?: Record<string, boolean>;
    limits?: Record<string, number>;
    features?: Record<string, boolean>;
  };
  plano_codigo?: string;
  reason?: string;
  user_id?: string;
  inactivity_timeout_minutes?: number;
  force_password_change?: boolean;
  new_empresa_id?: string;
  new_password?: string;
  empresa_nome?: string;
  impersonation_session_id?: string;
  impersonation_session_token?: string;
  confirmation_name?: string;
  confirmation_phrase?: string;
  auth_password?: string;
  table_name?: string;
  asaas_customer_id?: string;
  asaas_subscription_id?: string;
  keep_company_core?: boolean;
  keep_billing_data?: boolean;
  include_auth_users?: boolean;
  page?: number;
  page_size?: number;
  attachments?: unknown[];
};

type OwnerActionPayload = Payload;

type OwnerApiResponse<T extends Record<string, unknown> = Record<string, unknown>> = {
  success: true;
  operation_id?: string;
} & T;

type OwnerErrorResponse = {
  success: false;
  error: string;
  trace_id?: string;
};

type CleanupCompanyRowsResult = {
  deletedByTable: Record<string, number>;
  userIds: string[];
  tableErrors: Array<{ table_name: string; error: string }>;
  error?: string;
};

function isOwnerActionPayload(value: unknown): value is OwnerActionPayload {
  if (!value || typeof value !== "object") return false;
  const action = (value as Record<string, unknown>).action;
  return typeof action === "string" && action.length > 0;
}

function okWithOperation<T extends Record<string, unknown>>(
  req: Request,
  payload: T,
  operationId?: string,
) {
  const body: OwnerApiResponse<T> = {
    success: true,
    ...payload,
  };
  if (operationId) body.operation_id = operationId;
  return ok(body, 200, req);
}

function forbiddenResponse(req: Request, traceId?: string) {
  const body: OwnerErrorResponse = {
    success: false,
    error: "Forbidden",
    trace_id: traceId,
  };

  return new Response(JSON.stringify(body), {
    status: 403,
    headers: { ...resolveCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function internalServerErrorResponse(req: Request) {
  return new Response(JSON.stringify({
    success: false,
    error: "Internal server error",
  }), {
    status: 500,
    headers: { ...resolveCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function badRequestResponse(req: Request, message: string, status = 400) {
  return new Response(JSON.stringify({
    success: false,
    error: message,
  }), {
    status,
    headers: { ...resolveCorsHeaders(req), "Content-Type": "application/json" },
  });
}

const SUPPORTED_OWNER_ACTIONS: Payload["action"][] = [
  "health_check",
  "dashboard",
  "list_companies",
  "create_company",
  "update_company",
  "set_company_status",
  "list_users",
  "create_user",
  "set_user_status",
  "move_user_company",
  "set_user_password",
  "list_plans",
  "create_plan",
  "update_plan",
  "list_subscriptions",
  "create_subscription",
  "set_subscription_status",
  "list_contracts",
  "update_contract",
  "regenerate_contract",
  "delete_contract",
  "list_support_tickets",
  "respond_support_ticket",
  "mark_ticket_read_owner",
  "list_audit_logs",
  "get_company_settings",
  "update_company_settings",
  "set_user_inactivity_timeout",
  "change_plan",
  "platform_stats",
  "create_system_admin",
  "impersonate_company",
  "stop_impersonation",
  "validate_impersonation",
  "update_subscription_billing",
  "list_platform_owners",
  "create_platform_owner",
  "cleanup_owner_stress_data",
  "list_database_tables",
  "cleanup_company_data",
  "delete_company",
  "purge_table_data",
  "purge_device_users",
  "delete_user",
  "asaas_link_subscription",
  "asaas_sync_subscription",
  "list_subscription_payments",
  "enforce_subscription_expiry",
  "set_asaas_api_key",
  "get_asaas_config",
  "delete_support_ticket",
  "get_platform_contact",
  "update_platform_contact",
  "reactivate_company",
];

function resolveRateLimitConfig(action: Payload["action"]) {
  const readHeavyActions = new Set<Payload["action"]>([
    "dashboard",
    "platform_stats",
    "list_companies",
    "list_users",
    "list_plans",
    "list_subscriptions",
    "list_contracts",
    "list_support_tickets",
    "list_audit_logs",
    "get_company_settings",
    "list_platform_owners",
    "list_database_tables",
    "list_subscription_payments",
  ]);

  const criticalWriteActions = new Set<Payload["action"]>([
    "cleanup_company_data",
    "purge_table_data",
    "purge_device_users",
    "delete_company",
    "create_platform_owner",
    "create_system_admin",
    "asaas_link_subscription",
    "asaas_sync_subscription",
    "enforce_subscription_expiry",
  ]);

  if (readHeavyActions.has(action)) {
    return {
      maxRequests: 240,
      windowSeconds: 60,
      blockSeconds: 90,
    };
  }

  if (criticalWriteActions.has(action)) {
    return {
      maxRequests: 25,
      windowSeconds: 60,
      blockSeconds: 180,
    };
  }

  return {
    maxRequests: 80,
    windowSeconds: 60,
    blockSeconds: 120,
  };
}

function shouldEnforceRateLimit(action: Payload["action"]) {
  const writeOrSensitiveActions = new Set<Payload["action"]>([
    "create_company",
    "update_company",
    "set_company_status",
    "create_user",
    "set_user_status",
    "delete_user",
    "move_user_company",
    "set_user_password",
    "create_plan",
    "update_plan",
    "create_subscription",
    "set_subscription_status",
    "update_subscription_billing",
    "update_contract",
    "regenerate_contract",
    "delete_contract",
    "respond_support_ticket",
    "update_company_settings",
    "set_user_inactivity_timeout",
    "change_plan",
    "create_system_admin",
    "impersonate_company",
    "stop_impersonation",
    "validate_impersonation",
    "create_platform_owner",
    "cleanup_owner_stress_data",
    "cleanup_company_data",
    "delete_company",
    "purge_table_data",
    "purge_device_users",
    "asaas_link_subscription",
    "asaas_sync_subscription",
    "enforce_subscription_expiry",
  ]);

  return writeOrSensitiveActions.has(action);
}

const OWNER_RATE_LIMIT_ENABLED = (Deno.env.get("OWNER_RATE_LIMIT_ENABLED") ?? "true").toLowerCase() === "true";

/**
 * Verifica se o JWT do usuário contém role de Owner (SYSTEM_OWNER ou SYSTEM_ADMIN).
 * MASTER_TI NÃO tem acesso ao módulo Owner.
 */
function isOwnerOperatorFromJwt(user: any) {
  const appMetadata = (user?.app_metadata ?? {}) as Record<string, unknown>;
  const roleFromToken = String(appMetadata.role ?? "").toUpperCase();
  const rolesFromToken = Array.isArray(appMetadata.roles)
    ? appMetadata.roles.map((value) => String(value).toUpperCase())
    : [];

  const allowed = new Set(["SYSTEM_OWNER", "SYSTEM_ADMIN"]);
  if (roleFromToken && allowed.has(roleFromToken)) return true;
  return rolesFromToken.some((role) => allowed.has(role));
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyActorPassword(input: {
  email?: string | null;
  password?: string | null;
  expectedUserId: string;
}) {
  const email = (input.email ?? "").trim().toLowerCase();
  const password = input.password ?? "";
  if (!email || !password) return false;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !anonKey) return false;

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) return false;

  const payload = await response.json().catch(() => null);
  const authenticatedUserId = payload?.user?.id ?? null;
  return authenticatedUserId === input.expectedUserId;
}

function normalizeSlug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48);
}

function generateTemporaryPassword(length = 14) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let body = "";

  for (let i = 0; i < bytes.length; i++) {
    body += alphabet[bytes[i] % alphabet.length];
  }

  return `Tmp#${body}!`;
}

const TENANT_BASE_DOMAIN = (Deno.env.get("TENANT_BASE_DOMAIN")
  ?? Deno.env.get("VITE_TENANT_BASE_DOMAIN")
  ?? "gppis.com.br")
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "");

function buildManagedTenantDomain(slug: string) {
  if (!TENANT_BASE_DOMAIN) return null;
  return `${slug}.${TENANT_BASE_DOMAIN}`;
}

const CF_PAGES_AUTO_DOMAIN_ENABLED = (Deno.env.get("CF_PAGES_AUTO_DOMAIN_ENABLED") ?? "true").toLowerCase() !== "false";
const CF_PAGES_PROVISION_REQUIRED = (Deno.env.get("CF_PAGES_PROVISION_REQUIRED") ?? "false").toLowerCase() === "true";
const CF_DNS_AUTO_RECORD_ENABLED = (Deno.env.get("CF_DNS_AUTO_RECORD_ENABLED") ?? "true").toLowerCase() !== "false";
const CF_DNS_PROVISION_REQUIRED = (Deno.env.get("CF_DNS_PROVISION_REQUIRED") ?? "false").toLowerCase() === "true";
const CF_API_TOKEN = (Deno.env.get("CF_API_TOKEN") ?? "").trim();
const CF_ACCOUNT_ID = (Deno.env.get("CF_ACCOUNT_ID") ?? "").trim();
const CF_PAGES_PROJECT_NAME = (Deno.env.get("CF_PAGES_PROJECT_NAME") ?? "").trim();
const CF_ZONE_ID = (Deno.env.get("CF_ZONE_ID") ?? "").trim();
const CF_DNS_RECORD_TYPE = (Deno.env.get("CF_DNS_RECORD_TYPE") ?? "CNAME").trim().toUpperCase();
const CF_DNS_RECORD_TARGET = (Deno.env.get("CF_DNS_RECORD_TARGET") ?? "").trim().toLowerCase();
const CF_DNS_RECORD_PROXIED = (Deno.env.get("CF_DNS_RECORD_PROXIED") ?? "true").toLowerCase() !== "false";
const CF_DNS_RECORD_TTL = Number(Deno.env.get("CF_DNS_RECORD_TTL") ?? "1");
const CF_API_BASE_URL = "https://api.cloudflare.com/client/v4";

function mergeWarnings(base: string | null, next: string | null) {
  if (!next) return base;
  if (!base) return next;
  return `${base} ${next}`;
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

async function ensureCloudflarePagesCustomDomain(domain: string): Promise<{ status: "ok" | "skipped" | "error"; message: string }> {
  if (!CF_PAGES_AUTO_DOMAIN_ENABLED) {
    return {
      status: "skipped",
      message: "Provisionamento automatico no Cloudflare desativado (CF_PAGES_AUTO_DOMAIN_ENABLED=false).",
    };
  }

  if (!CF_API_TOKEN || !CF_ACCOUNT_ID || !CF_PAGES_PROJECT_NAME) {
    return {
      status: "skipped",
      message: "Variaveis CF_API_TOKEN, CF_ACCOUNT_ID e CF_PAGES_PROJECT_NAME nao configuradas.",
    };
  }

  const accountId = encodeURIComponent(CF_ACCOUNT_ID);
  const projectName = encodeURIComponent(CF_PAGES_PROJECT_NAME);
  const route = `/accounts/${accountId}/pages/projects/${projectName}/domains`;

  try {
    const listPayload = await cloudflareApiRequest(route, { method: "GET" });
    const domains = Array.isArray(listPayload?.result) ? listPayload.result : [];
    const exists = domains.some((item: any) => (item?.name ?? "").toLowerCase() === domain.toLowerCase());

    if (!exists) {
      await cloudflareApiRequest(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: domain }),
      });
      return {
        status: "ok",
        message: `Dominio ${domain} provisionado no Cloudflare Pages.`,
      };
    }

    return {
      status: "ok",
      message: `Dominio ${domain} ja estava provisionado no Cloudflare Pages.`,
    };
  } catch (error: any) {
    return {
      status: "error",
      message: error?.message ?? "Falha desconhecida ao provisionar dominio no Cloudflare Pages.",
    };
  }
}

async function ensureCloudflareDnsRecord(domain: string): Promise<{ status: "ok" | "skipped" | "error"; message: string }> {
  if (!CF_DNS_AUTO_RECORD_ENABLED) {
    return {
      status: "skipped",
      message: "Provisionamento automatico DNS no Cloudflare desativado (CF_DNS_AUTO_RECORD_ENABLED=false).",
    };
  }

  if (!CF_API_TOKEN || !CF_ZONE_ID || !CF_DNS_RECORD_TARGET) {
    return {
      status: "skipped",
      message: "Variaveis CF_API_TOKEN, CF_ZONE_ID e CF_DNS_RECORD_TARGET nao configuradas.",
    };
  }

  const zoneId = encodeURIComponent(CF_ZONE_ID);
  const normalizedDomain = domain.trim().toLowerCase();
  const recordType = ["A", "AAAA", "CNAME"].includes(CF_DNS_RECORD_TYPE) ? CF_DNS_RECORD_TYPE : "CNAME";
  const ttl = Number.isFinite(CF_DNS_RECORD_TTL) && CF_DNS_RECORD_TTL >= 1 ? Math.trunc(CF_DNS_RECORD_TTL) : 1;

  try {
    const listPayload = await cloudflareApiRequest(
      `/zones/${zoneId}/dns_records?type=${encodeURIComponent(recordType)}&name=${encodeURIComponent(normalizedDomain)}`,
      { method: "GET" },
    );

    const records = Array.isArray(listPayload?.result) ? listPayload.result : [];
    const existing = records.find((item: any) => String(item?.name ?? "").toLowerCase() === normalizedDomain);

    const desiredPayload = {
      type: recordType,
      name: normalizedDomain,
      content: CF_DNS_RECORD_TARGET,
      ttl,
      proxied: CF_DNS_RECORD_PROXIED,
    };

    if (!existing?.id) {
      await cloudflareApiRequest(
        `/zones/${zoneId}/dns_records`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(desiredPayload),
        },
      );

      return {
        status: "ok",
        message: `DNS ${recordType} criado para ${normalizedDomain} -> ${CF_DNS_RECORD_TARGET}.`,
      };
    }

    const currentContent = String(existing.content ?? "").trim().toLowerCase();
    const currentProxied = Boolean(existing.proxied);
    const needsUpdate = currentContent !== CF_DNS_RECORD_TARGET || currentProxied !== CF_DNS_RECORD_PROXIED;

    if (needsUpdate) {
      await cloudflareApiRequest(
        `/zones/${zoneId}/dns_records/${encodeURIComponent(String(existing.id))}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(desiredPayload),
        },
      );

      return {
        status: "ok",
        message: `DNS ${recordType} atualizado para ${normalizedDomain} -> ${CF_DNS_RECORD_TARGET}.`,
      };
    }

    return {
      status: "ok",
      message: `DNS ${recordType} ja provisionado para ${normalizedDomain}.`,
    };
  } catch (error: any) {
    return {
      status: "error",
      message: error?.message ?? "Falha desconhecida ao provisionar DNS no Cloudflare.",
    };
  }
}

async function ensureCloudflareTenantDomain(domain: string): Promise<{
  status: "ok" | "skipped" | "error";
  message: string;
  dns: { status: "ok" | "skipped" | "error"; message: string };
  pages: { status: "ok" | "skipped" | "error"; message: string };
}> {
  const dns = await ensureCloudflareDnsRecord(domain);
  const pages = await ensureCloudflarePagesCustomDomain(domain);

  // Only treat as failure if the API call actually errored (not skipped due to missing credentials)
  const hasDnsFailure = dns.status === "error" && CF_DNS_PROVISION_REQUIRED;
  const hasPagesFailure = pages.status === "error" && CF_PAGES_PROVISION_REQUIRED;

  if (hasDnsFailure || hasPagesFailure) {
    return {
      status: "error",
      message: `DNS: ${dns.message} Pages: ${pages.message}`,
      dns,
      pages,
    };
  }

  // skipped is always acceptable — means credentials not configured
  const status = dns.status === "ok" || pages.status === "ok" ? "ok" : "skipped";
  return {
    status: status === "skipped" ? "ok" : status,
    message: `DNS: ${dns.message} Pages: ${pages.message}`,
    dns,
    pages,
  };
}

function isDuplicateKeyError(message?: string | null) {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("duplicate key") || normalized.includes("unique constraint");
}

function contractTemplate(input: {
  empresaNome: string;
  cnpj?: string | null;
  responsavel?: string | null;
  planoNome: string;
  valor: number;
  formaPagamento?: string | null;
  inicio?: string | null;
  fim?: string | null;
  limiteUsuarios?: number | null;
  modulos?: Record<string, unknown> | null;
}) {
  const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(input.valor ?? 0),
  );

  const fmtDate = (d?: string | null) => {
    if (!d) return "N/A";
    try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; }
  };

  const vigenciaTipo = input.fim ? "determinada" : "indeterminada";
  const inicioFmt = fmtDate(input.inicio);
  const fimFmt = input.fim ? fmtDate(input.fim) : "Indeterminado";
  const dataGeracao = new Date().toLocaleDateString("pt-BR");

  const modulosList = input.modulos
    ? Object.entries(input.modulos)
        .filter(([, v]) => v === true || (typeof v === "string" && v !== ""))
        .map(([k]) => `  - ${k}`)
        .join("\n") || "  Todos os módulos do plano contratado"
    : "  Todos os módulos do plano contratado";

  return `══════════════════════════════════════════════════════════════════
                CONTRATO DE LICENÇA DE USO DE SOFTWARE SaaS
                         PCM ESTRATÉGICO SISTEMAS
══════════════════════════════════════════════════════════════════

Contrato nº gerado automaticamente em ${dataGeracao}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CLÁUSULA 1 — DAS PARTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTRATADA:
PCM Estratégico Sistemas Ltda.
CNPJ: [A ser informado pela CONTRATADA]
Endereço: [A ser informado pela CONTRATADA]
E-mail: comercial@pcmestrategico.com.br
Doravante denominada simplesmente CONTRATADA ou LICENCIANTE.

CONTRATANTE:
Empresa: ${input.empresaNome}
CNPJ: ${input.cnpj ?? "A ser informado"}
Representante Legal: ${input.responsavel ?? "A ser informado"}
Doravante denominada simplesmente CONTRATANTE ou LICENCIADA.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CLÁUSULA 2 — DO OBJETO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2.1. O presente contrato tem por objeto a concessão, pela CONTRATADA à
CONTRATANTE, de licença de uso não exclusiva e intransferível do sistema
"PCM Estratégico" — plataforma de Planejamento e Controle de Manutenção
fornecida na modalidade SaaS (Software as a Service), acessível via
navegador de internet e aplicativo móvel.

2.2. O sistema abrange funcionalidades de gestão de ordens de serviço,
manutenção preventiva, preditiva, lubrificação, inspeções, controle de
equipamentos, materiais, custos, indicadores de desempenho (KPIs), FMEA,
RCA, SSMA, gestão de mecânicos, relatórios gerenciais e demais módulos
disponíveis no plano contratado.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CLÁUSULA 3 — DO PLANO CONTRATADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3.1. Plano: ${input.planoNome}
3.2. Limite de usuários simultâneos: ${input.limiteUsuarios ?? "Conforme plano"}
3.3. Módulos inclusos:
${modulosList}

3.4. A CONTRATADA poderá, a seu critério, disponibilizar novos módulos ou
funcionalidades, que serão incorporados ao plano contratado ou oferecidos
como adicionais mediante aditivo contratual.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CLÁUSULA 4 — DO VALOR E FORMA DE PAGAMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4.1. Valor: ${currency} (${vigenciaTipo === "determinada" ? "pelo período contratado" : "mensal"}).

4.2. Forma de pagamento: ${input.formaPagamento ?? "A definir em comum acordo"}.

4.3. O não pagamento dentro do prazo de vencimento acarretará:
  a) Multa de 2% (dois por cento) sobre o valor em atraso;
  b) Juros de mora de 1% (um por cento) ao mês;
  c) Suspensão do acesso ao sistema após 15 (quinze) dias de inadimplência,
     mediante notificação prévia por e-mail.

4.4. O reajuste anual será feito com base no índice IGPM/FGV acumulado
dos últimos 12 meses, ou por outro índice oficial que venha a substituí-lo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CLÁUSULA 5 — DA VIGÊNCIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5.1. Vigência: ${vigenciaTipo}.
5.2. Início: ${inicioFmt}.
5.3. Término: ${fimFmt}.

5.4. O contrato será renovado automaticamente por períodos iguais e
sucessivos, salvo manifestação contrária de qualquer das partes com
antecedência mínima de 30 (trinta) dias antes do término da vigência.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CLÁUSULA 6 — DAS OBRIGAÇÕES DA CONTRATADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6.1. Disponibilizar o sistema em ambiente seguro, com disponibilidade
mínima de 99,5% (noventa e nove vírgula cinco por cento) mensal,
excluindo-se manutenções programadas previamente comunicadas.

6.2. Realizar backups diários dos dados da CONTRATANTE.

6.3. Manter sigilo absoluto sobre todos os dados e informações da
CONTRATANTE armazenados no sistema.

6.4. Prestar suporte técnico via e-mail e WhatsApp em horário comercial
(segunda a sexta, 08h às 18h).

6.5. Aplicar correções de segurança e atualizações de sistema sem custo
adicional durante a vigência do contrato.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CLÁUSULA 7 — DAS OBRIGAÇÕES DA CONTRATANTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7.1. Utilizar o sistema exclusivamente para as finalidades previstas
neste contrato, não sendo permitida sublicença, cessão ou transferência
a terceiros.

7.2. Manter em sigilo suas credenciais de acesso, sendo responsável
por toda atividade realizada em sua conta.

7.3. Efetuar os pagamentos nas datas de vencimento pactuadas.

7.4. Não realizar engenharia reversa, descompilar, copiar ou tentar
extrair o código-fonte do sistema.

7.5. Comunicar imediatamente a CONTRATADA sobre qualquer incidente
de segurança ou uso não autorizado de suas credenciais.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CLÁUSULA 8 — DA PROPRIEDADE INTELECTUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

8.1. O sistema PCM Estratégico, incluindo código-fonte, design, marcas,
logotipos e documentação, é de propriedade exclusiva da CONTRATADA,
protegido pela Lei nº 9.609/98 (Software) e Lei nº 9.610/98 (Direitos
Autorais).

8.2. A presente licença não confere à CONTRATANTE qualquer direito de
propriedade sobre o sistema, sendo concedido apenas o direito de uso
nos termos aqui estabelecidos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CLÁUSULA 9 — DA PROTEÇÃO DE DADOS (LGPD)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

9.1. A CONTRATADA atuará como Operadora de dados pessoais nos termos
da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD), tratando
os dados pessoais inseridos pela CONTRATANTE exclusivamente para a
prestação do serviço contratado.

9.2. A CONTRATADA adota medidas técnicas e administrativas adequadas
para proteger os dados pessoais contra acessos não autorizados,
vazamentos, destruição ou qualquer forma de tratamento inadequado.

9.3. Em caso de incidente de segurança envolvendo dados pessoais,
a CONTRATADA comunicará a CONTRATANTE em até 48 (quarenta e oito)
horas após tomar ciência do evento.

9.4. Ao término do contrato, a CONTRATADA disponibilizará à
CONTRATANTE a exportação completa de seus dados em formato aberto
(CSV/JSON), procedendo à exclusão definitiva dos dados em até 90
(noventa) dias.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CLÁUSULA 10 — DA LIMITAÇÃO DE RESPONSABILIDADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

10.1. A CONTRATADA não se responsabiliza por:
  a) Dados incorretos inseridos pela CONTRATANTE;
  b) Interrupções causadas por falhas de internet ou infraestrutura
     de terceiros;
  c) Danos indiretos, lucros cessantes ou perdas consequenciais;
  d) Uso do sistema em desacordo com as orientações técnicas.

10.2. A responsabilidade total da CONTRATADA, em qualquer hipótese,
fica limitada ao valor total pago pela CONTRATANTE nos últimos 12
(doze) meses de vigência contratual.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CLÁUSULA 11 — DA RESCISÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

11.1. O presente contrato poderá ser rescindido:
  a) Por qualquer das partes, mediante notificação por escrito com
     antecedência mínima de 30 (trinta) dias;
  b) Imediatamente, em caso de descumprimento de cláusula essencial,
     não sanado no prazo de 15 (quinze) dias após notificação;
  c) Por inadimplência superior a 60 (sessenta) dias.

11.2. Na rescisão por iniciativa da CONTRATANTE sem justa causa antes
do término da vigência estipulada, poderá ser cobrada multa de 20%
(vinte por cento) sobre o saldo remanescente do contrato.

11.3. Após a rescisão, a CONTRATANTE terá prazo de 30 (trinta) dias
para exportar seus dados, findos os quais serão definitivamente excluídos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CLÁUSULA 12 — DA CONFIDENCIALIDADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

12.1. As partes se comprometem a manter sigilo sobre quaisquer
informações técnicas, comerciais ou estratégicas de que tenham
conhecimento em razão deste contrato, por prazo indeterminado, mesmo
após o término da relação contratual.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CLÁUSULA 13 — DAS DISPOSIÇÕES GERAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

13.1. O presente contrato é regido pela legislação brasileira.

13.2. Qualquer alteração deste contrato somente será válida mediante
aditivo por escrito, aceito por ambas as partes.

13.3. A tolerância de qualquer das partes quanto ao descumprimento
de qualquer cláusula não constituirá renúncia ao direito de exigir
o seu cumprimento a qualquer tempo.

13.4. As comunicações entre as partes serão realizadas preferencialmente
por meio eletrônico (e-mail), sendo válidas para todos os efeitos legais.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CLÁUSULA 14 — DO FORO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

14.1. Fica eleito o foro da Comarca de Porto Alegre/RS para dirimir
quaisquer controvérsias oriundas deste contrato, com renúncia expressa
a qualquer outro, por mais privilegiado que seja.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACEITE DIGITAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ao utilizar o sistema PCM Estratégico, a CONTRATANTE declara ter lido,
compreendido e aceito integralmente os termos deste contrato.

O aceite eletrônico (login no sistema ou assinatura digital) possui
validade jurídica nos termos do art. 10, §2º, da Medida Provisória
nº 2.200-2/2001.


CONTRATADA: PCM Estratégico Sistemas Ltda.

CONTRATANTE: ${input.empresaNome}
CNPJ: ${input.cnpj ?? "A ser informado"}
Representante: ${input.responsavel ?? "A ser informado"}

Data de geração: ${dataGeracao}

══════════════════════════════════════════════════════════════════
        Documento gerado automaticamente pelo sistema PCM Estratégico.
        Este contrato possui validade jurídica mediante aceite digital.
══════════════════════════════════════════════════════════════════
`;
}

const ASAAS_API_BASE_URL = (Deno.env.get("ASAAS_API_BASE_URL") ?? "https://api-sandbox.asaas.com/v3").trim().replace(/\/+$/, "");
const ASAAS_API_KEY_ENV = (Deno.env.get("ASAAS_API_KEY") ?? "").trim();

// Dynamic ASAAS key: check DB first (platform config), fallback to env
let _asaasApiKeyFromDb: string | null = null;
let _asaasDbKeyChecked = false;

async function resolveAsaasApiKey(admin: ReturnType<typeof adminClient>): Promise<string> {
  // Check DB config (allows setting from UI)
  if (!_asaasDbKeyChecked) {
    try {
      const { data } = await admin
        .from("configuracoes_sistema")
        .select("valor")
        .is("empresa_id", null)
        .eq("chave", "platform.asaas_api_key")
        .maybeSingle();
      if (data?.valor) {
        let val = data.valor;
        if (typeof val === "string") {
          try { val = JSON.parse(val); } catch { /* keep as string */ }
        }
        _asaasApiKeyFromDb = String(val ?? "").trim();
      }
    } catch { /* ignore */ }
    _asaasDbKeyChecked = true;
  }
  return _asaasApiKeyFromDb || ASAAS_API_KEY_ENV;
}

function isAsaasConfigured() {
  return Boolean(_asaasApiKeyFromDb || ASAAS_API_KEY_ENV);
}

async function isAsaasConfiguredAsync(admin: ReturnType<typeof adminClient>) {
  const key = await resolveAsaasApiKey(admin);
  return Boolean(key);
}

function normalizeDigits(value?: string | null) {
  return String(value ?? "").replace(/\D+/g, "");
}

function normalizeLocalPeriodToAsaasCycle(period?: string | null) {
  const normalized = String(period ?? "monthly").toLowerCase();
  if (normalized === "monthly") return "MONTHLY";
  if (normalized === "quarterly") return "QUARTERLY";
  if (normalized === "yearly") return "YEARLY";
  return "MONTHLY";
}

function normalizeLocalPaymentMethodToAsaasBillingType(paymentMethod?: string | null) {
  const normalized = String(paymentMethod ?? "").toLowerCase();
  if (normalized.includes("pix")) return "PIX";
  if (normalized.includes("boleto")) return "BOLETO";
  return "CREDIT_CARD";
}

function mapAsaasSubscriptionStatus(status?: string | null) {
  const normalized = String(status ?? "").toUpperCase();
  if (normalized === "ACTIVE") return { subscriptionStatus: "ativa", paymentStatus: "paid" };
  if (normalized === "OVERDUE") return { subscriptionStatus: "atrasada", paymentStatus: "late" };
  if (normalized === "INACTIVE" || normalized === "EXPIRED") return { subscriptionStatus: "cancelada", paymentStatus: "failed" };
  return { subscriptionStatus: "teste", paymentStatus: "pending" };
}

function mapAsaasPaymentStatus(status?: string | null) {
  const normalized = String(status ?? "").toUpperCase();
  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(normalized)) return "paid";
  if (normalized === "OVERDUE") return "late";
  if (["PENDING", "AWAITING_RISK_ANALYSIS"].includes(normalized)) return "pending";
  if (["REFUNDED", "REFUND_REQUESTED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "AWAITING_CHARGEBACK_REVERSAL", "DUNNING_REQUESTED"].includes(normalized)) return "refunded";
  if (["CANCELED", "CHARGEBACK", "FAILED"].includes(normalized)) return "failed";
  return "pending";
}

async function asaasRequest(path: string, init: RequestInit = {}, admin?: ReturnType<typeof adminClient>) {
  const apiKey = admin ? await resolveAsaasApiKey(admin) : (_asaasApiKeyFromDb || ASAAS_API_KEY_ENV);
  if (!apiKey) {
    throw new Error("ASAAS_API_KEY nao configurada.");
  }

  const response = await fetch(`${ASAAS_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      access_token: apiKey,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const raw = await response.text().catch(() => "");
  const payload = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    const message = payload?.errors?.[0]?.description
      ?? payload?.errors?.[0]?.code
      ?? payload?.message
      ?? raw
      ?? `HTTP ${response.status}`;
    throw new Error(`Asaas API error: ${message}`);
  }

  return payload;
}

async function ensureAsaasCustomer(admin: ReturnType<typeof adminClient>, empresaId: string) {
  const { data: existingSubscription } = await admin
    .from("subscriptions")
    .select("asaas_customer_id")
    .eq("empresa_id", empresaId)
    .maybeSingle();

  const existingCustomerId = String(existingSubscription?.asaas_customer_id ?? "").trim();
  if (existingCustomerId) return existingCustomerId;

  const externalReference = `empresa:${empresaId}`;
  const existingCustomerResponse = await asaasRequest(`/customers?externalReference=${encodeURIComponent(externalReference)}&limit=1`, {
    method: "GET",
  }, admin);

  const existingCustomer = Array.isArray(existingCustomerResponse?.data) ? existingCustomerResponse.data[0] : null;
  if (existingCustomer?.id) return String(existingCustomer.id);

  const { data: empresa } = await admin
    .from("empresas")
    .select("id,nome")
    .eq("id", empresaId)
    .single();

  const { data: dadosEmpresa } = await admin
    .from("dados_empresa")
    .select("razao_social,nome_fantasia,cnpj,email,telefone")
    .eq("empresa_id", empresaId)
    .maybeSingle();

  const cpfCnpj = normalizeDigits(dadosEmpresa?.cnpj);
  const phone = normalizeDigits(dadosEmpresa?.telefone);
  const customerPayload: Record<string, unknown> = {
    name: String(dadosEmpresa?.razao_social ?? dadosEmpresa?.nome_fantasia ?? empresa?.nome ?? `Empresa ${empresaId}`),
    externalReference,
    email: dadosEmpresa?.email ?? null,
  };

  if (cpfCnpj.length === 11 || cpfCnpj.length === 14) customerPayload.cpfCnpj = cpfCnpj;
  if (phone.length >= 10) customerPayload.phone = phone;

  const created = await asaasRequest("/customers", {
    method: "POST",
    body: JSON.stringify(customerPayload),
  }, admin);

  if (!created?.id) {
    throw new Error("Asaas nao retornou id do cliente.");
  }

  return String(created.id);
}

async function syncAsaasSubscriptionSnapshot(admin: ReturnType<typeof adminClient>, subscriptionRow: any) {
  const asaasSubscriptionId = String(subscriptionRow?.asaas_subscription_id ?? "").trim();
  if (!asaasSubscriptionId) {
    throw new Error("Assinatura sem asaas_subscription_id para sincronizar.");
  }

  const remoteSubscription = await asaasRequest(`/subscriptions/${encodeURIComponent(asaasSubscriptionId)}`, {
    method: "GET",
  }, admin);

  const paymentList = await asaasRequest(`/payments?subscription=${encodeURIComponent(asaasSubscriptionId)}&limit=20`, {
    method: "GET",
  }, admin);

  const payments = Array.isArray(paymentList?.data) ? paymentList.data : [];
  const latestPayment = payments[0] ?? null;

  const mappedSubscription = mapAsaasSubscriptionStatus(remoteSubscription?.status);
  const mappedPaymentStatus = latestPayment ? mapAsaasPaymentStatus(latestPayment?.status) : mappedSubscription.paymentStatus;

  const { error: updateSubscriptionError } = await admin
    .from("subscriptions")
    .update({
      billing_provider: "asaas",
      asaas_customer_id: remoteSubscription?.customer ?? subscriptionRow?.asaas_customer_id ?? null,
      asaas_subscription_id: asaasSubscriptionId,
      status: mappedSubscription.subscriptionStatus,
      payment_status: mappedPaymentStatus,
      renewal_at: remoteSubscription?.nextDueDate ?? subscriptionRow?.renewal_at ?? null,
      billing_metadata: {
        asaas: {
          subscription_status: remoteSubscription?.status ?? null,
          payment_status: latestPayment?.status ?? null,
          cycle: remoteSubscription?.cycle ?? null,
          next_due_date: remoteSubscription?.nextDueDate ?? null,
        },
      },
      asaas_last_event_at: new Date().toISOString(),
    })
    .eq("id", subscriptionRow.id);

  if (updateSubscriptionError) throw updateSubscriptionError;

  if (latestPayment?.id) {
    const paymentPayload = {
      subscription_id: subscriptionRow.id,
      due_at: latestPayment?.dueDate ?? null,
      paid_at: latestPayment?.paymentDate ?? latestPayment?.clientPaymentDate ?? null,
      amount: Number(latestPayment?.value ?? subscriptionRow.amount ?? 0),
      method: latestPayment?.billingType ?? remoteSubscription?.billingType ?? subscriptionRow.payment_method ?? null,
      status: mapAsaasPaymentStatus(latestPayment?.status),
      notes: latestPayment?.description ?? null,
      provider: "asaas",
      provider_payment_id: String(latestPayment.id),
      provider_event: "WEBHOOK_OR_SYNC",
      raw_payload: latestPayment,
      processed_at: new Date().toISOString(),
    };

    const { data: existingPayment } = await admin
      .from("subscription_payments")
      .select("id")
      .eq("provider_payment_id", String(latestPayment.id))
      .maybeSingle();

    if (existingPayment?.id) {
      await admin
        .from("subscription_payments")
        .update(paymentPayload)
        .eq("id", existingPayment.id);
    } else {
      await admin
        .from("subscription_payments")
        .insert(paymentPayload);
    }
  }

  return {
    asaas_subscription_id: asaasSubscriptionId,
    asaas_status: remoteSubscription?.status ?? null,
    latest_payment_id: latestPayment?.id ?? null,
    latest_payment_status: latestPayment?.status ?? null,
  };
}

async function createOrSyncAsaasSubscription(admin: ReturnType<typeof adminClient>, subscriptionRow: any) {
  const customerId = String(subscriptionRow?.asaas_customer_id ?? "").trim() || await ensureAsaasCustomer(admin, String(subscriptionRow.empresa_id));

  const amount = Number(subscriptionRow?.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Valor da assinatura invalido para criar recorrencia no Asaas.");
  }

  const nextDueDate = String(subscriptionRow?.starts_at ?? new Date().toISOString().slice(0, 10));
  const cycle = normalizeLocalPeriodToAsaasCycle(subscriptionRow?.period);
  const billingType = normalizeLocalPaymentMethodToAsaasBillingType(subscriptionRow?.payment_method);

  const createdRemote = await asaasRequest("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: customerId,
      billingType,
      value: amount,
      nextDueDate,
      cycle,
      description: `PCM assinatura ${subscriptionRow?.id}`,
      externalReference: `subscription:${subscriptionRow?.id}`,
    }),
  }, admin);

  const mapped = mapAsaasSubscriptionStatus(createdRemote?.status);

  const { error } = await admin
    .from("subscriptions")
    .update({
      billing_provider: "asaas",
      asaas_customer_id: customerId,
      asaas_subscription_id: createdRemote?.id ?? null,
      status: mapped.subscriptionStatus,
      payment_status: mapped.paymentStatus,
      renewal_at: createdRemote?.nextDueDate ?? subscriptionRow?.renewal_at ?? null,
      asaas_last_event_at: new Date().toISOString(),
      billing_metadata: {
        asaas: {
          cycle: createdRemote?.cycle ?? cycle,
          billing_type: createdRemote?.billingType ?? billingType,
          next_due_date: createdRemote?.nextDueDate ?? nextDueDate,
          status: createdRemote?.status ?? null,
        },
      },
    })
    .eq("id", subscriptionRow.id);

  if (error) throw error;

  return {
    asaas_customer_id: customerId,
    asaas_subscription_id: createdRemote?.id ?? null,
    asaas_status: createdRemote?.status ?? null,
  };
}

async function createContractFromSubscription(
  admin: ReturnType<typeof adminClient>,
  actorUserId: string,
  subscription: any,
) {
  const { data: company } = await admin
    .from("empresas")
    .select("id,nome")
    .eq("id", subscription.empresa_id)
    .single();

  const { data: companyData } = await admin
    .from("dados_empresa")
    .select("razao_social,nome_fantasia,cnpj")
    .eq("empresa_id", subscription.empresa_id)
    .maybeSingle();

  // subscription.plan_id references planos (PT-BR table), try both tables
  // planEnId tracks the plans (EN) UUID — safe to use as FK in contracts.plan_id
  let plan: any = null;
  let planEnId: string | null = null;
  const { data: planoPtBr } = await admin
    .from("planos")
    .select("id,nome,codigo")
    .eq("id", subscription.plan_id)
    .maybeSingle();
  if (planoPtBr) {
    // Map to plans (EN) to get user_limit and module_flags
    // Tenta lookup case-insensitive: planos.codigo pode ser 'FREE'/'STARTER' mas plans.code pode ser 'free'/'STARTER'
    const codigoLower = (planoPtBr.codigo ?? "").toLowerCase();
    const codigoUpper = (planoPtBr.codigo ?? "").toUpperCase();
    const { data: planEn } = await admin
      .from("plans")
      .select("id,name,user_limit,module_flags")
      .or(`code.eq.${codigoLower},code.eq.${codigoUpper},code.eq.${planoPtBr.codigo}`)
      .maybeSingle();
    if (planEn) {
      plan = planEn;
      planEnId = planEn.id;
    } else {
      // plano PT-BR sem correspondente EN: usa nome para o contrato mas planEnId fica null
      // (não podemos passar planos.id como FK de plans.id — são tabelas diferentes)
      plan = { name: planoPtBr.nome, user_limit: null, module_flags: null };
      planEnId = null;
    }
  } else {
    // Fallback: plan_id talvez já referencie plans (EN) diretamente
    const { data: planDirect } = await admin
      .from("plans")
      .select("id,name,user_limit,module_flags")
      .eq("id", subscription.plan_id)
      .maybeSingle();
    plan = planDirect ?? null;
    planEnId = planDirect?.id ?? null;
  }

  const content = contractTemplate({
    empresaNome: companyData?.razao_social ?? companyData?.nome_fantasia ?? company?.nome ?? "Empresa",
    cnpj: companyData?.cnpj,
    responsavel: null,
    planoNome: plan?.name ?? "Plano",
    valor: Number(subscription.amount ?? 0),
    formaPagamento: subscription.payment_method,
    inicio: subscription.starts_at,
    fim: subscription.ends_at,
    limiteUsuarios: plan?.user_limit,
    modulos: plan?.module_flags,
  });

  const { data: existing } = await admin
    .from("contracts")
    .select("id,version")
    .eq("subscription_id", subscription.id)
    .maybeSingle();

  if (existing?.id) {
    const nextVersion = Number(existing.version ?? 1) + 1;

    const { data: updated, error: updateError } = await admin
      .from("contracts")
      .update({
        content,
        starts_at: subscription.starts_at,
        ends_at: subscription.ends_at,
        amount: subscription.amount,
        payment_method: subscription.payment_method,
        version: nextVersion,
        status: "ativo",
        updated_by: actorUserId,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    await admin.from("contract_versions").insert({
      contract_id: existing.id,
      version: nextVersion,
      content,
      change_summary: "Regeneração automática por atualização de assinatura",
      created_by: actorUserId,
    });

    return updated;
  }

  const { data: created, error: createError } = await admin
    .from("contracts")
    .insert({
      empresa_id: subscription.empresa_id,
      subscription_id: subscription.id,
      plan_id: planEnId,  // planEnId = plans(EN).id ou null — nunca planos(PT).id
      content,
      generated_at: new Date().toISOString(),
      starts_at: subscription.starts_at,
      ends_at: subscription.ends_at,
      amount: subscription.amount,
      payment_method: subscription.payment_method,
      version: 1,
      status: "ativo",
      created_by: actorUserId,
      updated_by: actorUserId,
    })
    .select("*")
    .single();

  if (createError) throw createError;

  await admin.from("contract_versions").insert({
    contract_id: created.id,
    version: 1,
    content,
    change_summary: "Geração automática na criação da assinatura",
    created_by: actorUserId,
  });

  return created;
}

async function logPlatformAudit(
  admin: ReturnType<typeof adminClient>,
  payload: {
    actorId: string;
    actorEmail?: string | null;
    empresaId?: string | null;
    actionType: string;
    details?: Record<string, unknown>;
    resultado?: string;
  },
) {
  await admin.from("enterprise_audit_logs").insert({
    usuario_id: payload.actorId,
    usuario_email: payload.actorEmail ?? null,
    empresa_id: payload.empresaId ?? null,
    acao: payload.actionType,
    tabela: "system",
    dados_depois: {
      ...(payload.details ?? {}),
      severity: "info",
      source: "owner-portal-admin",
    },
    resultado: payload.resultado ?? "sucesso",
  });
}

function getOwnerMasterEmail() {
  const configured = (Deno.env.get("OWNER_MASTER_EMAIL") ?? "").trim().toLowerCase();
  return configured || "pedrozo@gppis.com.br";
}

function isOwnerMasterEmail(email?: string | null, ownerMasterEmail?: string) {
  if (!ownerMasterEmail) return false;
  return (email ?? "").trim().toLowerCase() === ownerMasterEmail.toLowerCase();
}

function hasSystemOwnerRole(user: any) {
  const directRole = String(user?.app_metadata?.role ?? user?.user_metadata?.role ?? "").trim().toUpperCase();
  if (directRole === "SYSTEM_OWNER") return true;

  const rolesFromMeta = Array.isArray(user?.app_metadata?.roles)
    ? user.app_metadata.roles
    : Array.isArray(user?.user_metadata?.roles)
      ? user.user_metadata.roles
      : [];

  return rolesFromMeta.some((role: unknown) => String(role ?? "").trim().toUpperCase() === "SYSTEM_OWNER");
}

function isKnownOwnerMasterEmail(email?: string | null) {
  const normalized = (email ?? "").trim().toLowerCase();
  return normalized === "pedrozo@gppis.com.br" || normalized === "pedrozo@gppis.cm.br";
}

async function logOwnerMasterHiddenAudit(
  admin: ReturnType<typeof adminClient>,
  payload: {
    actorId: string;
    actorEmail?: string | null;
    empresaId?: string | null;
    actionType: string;
    details?: Record<string, unknown>;
  },
) {
  await admin.from("enterprise_audit_logs").insert({
    usuario_id: payload.actorId,
    usuario_email: payload.actorEmail ?? null,
    empresa_id: payload.empresaId ?? null,
    acao: payload.actionType,
    tabela: "system",
    dados_depois: {
      ...(payload.details ?? {}),
      severity: "info",
      source: "owner-master-shadow",
    },
    resultado: "sucesso",
  });
}

async function getAuthStatusByUserId(
  admin: ReturnType<typeof adminClient>,
  userIds: string[],
) {
  const statusByUser = new Map<string, "ativo" | "inativo">();
  if (!userIds.length) return statusByUser;

  const target = new Set(userIds);
  const now = Date.now();
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;

    const users = data?.users ?? [];
    for (const authUser of users) {
      const id = authUser?.id;
      if (!id || !target.has(id)) continue;

      const bannedUntil = (authUser as any)?.banned_until as string | null | undefined;
      const isInactive = Boolean(bannedUntil && new Date(bannedUntil).getTime() > now);
      statusByUser.set(id, isInactive ? "inativo" : "ativo");
    }

    if (users.length < 1000 || statusByUser.size >= target.size) {
      break;
    }

    page += 1;
  }

  return statusByUser;
}

const PLATFORM_TABLES = [
  "acoes_corretivas",
  "ai_root_cause_analysis",
  "analise_causa_raiz",
  "anomalias_inspecao",
  "areas",
  "assinaturas",
  "atividades_lubrificacao",
  "atividades_preventivas",
  "audit_logs",
  "auditoria",
  "auditoria_logs",
  "avaliacoes_fornecedores",
  "componentes_equipamento",
  "company_subscriptions",
  "configuracoes_sistema",
  "contract_versions",
  "contracts",
  "contrato_alertas",
  "contratos",
  "dados_empresa",
  "document_layouts",
  "document_sequences",
  "documentos_tecnicos",
  "empresa_config",
  "enterprise_audit_logs",
  "enterprise_impersonation_sessions",
  "enterprise_subscriptions",
  "equipamentos",
  "execucoes_lubrificacao",
  "execucoes_os",
  "execucoes_os_pausas",
  "execucoes_preventivas",
  "fmea",
  "fornecedores",
  "incidentes_ssma",
  "inspecoes",
  "legacy_tenant_rollback_snapshot",
  "maintenance_schedule",
  "maintenance_action_suggestions",
  "materiais",
  "materiais_os",
  "mecanicos",
  "medicoes_preditivas",
  "melhorias",
  "movimentacoes_materiais",
  "notificacoes",
  "orcamentos_manutencao",
  "ordens_servico",
  "permissoes_granulares",
  "permissoes_trabalho",
  "planos_lubrificacao",
  "planos_preventivos",
  "plantas",
  "profiles",
  "rate_limits",
  "rbac_user_roles",
  "security_logs",
  "servicos_preventivos",
  "sistemas",
  "solicitacoes",
  "solicitacoes_manutencao",
  "subscriptions",
  "subscription_payments",
  "support_tickets",
  "system_notifications",
  "templates_preventivos",
  "user_roles",
  "empresas",
];

const COMPANY_CORE_TABLES = new Set([
  "empresas",
  "dados_empresa",
  "configuracoes_sistema",
]);

const TENANT_AUTH_TABLES = new Set([
  "profiles",
  "user_roles",
]);

const TENANT_BILLING_TABLES = new Set([
  "subscriptions",
  "company_subscriptions",
  "contracts",
  "contract_versions",
]);

const PROTECTED_PLATFORM_TABLES = new Set([
  "user_roles",
  "profiles",
]);

function extractReferencedTableFromFkError(message?: string | null) {
  const text = message ?? "";
  const onTableMatches = Array.from(text.matchAll(/on table\s+"([a-zA-Z0-9_]+)"/ig)).map((m) => m[1]);
  if (onTableMatches.length > 0) {
    // FK errors can mention source and dependent tables; last match is usually the dependent table.
    return onTableMatches[onTableMatches.length - 1];
  }

  const allQuoted = Array.from(text.matchAll(/"([a-zA-Z0-9_]+)"/g)).map((m) => m[1]);
  if (allQuoted.length > 1) {
    return allQuoted[allQuoted.length - 1];
  }

  return null;
}

function isForeignKeyError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  const code = String(candidate.code ?? "");
  const message = String(candidate.message ?? "").toLowerCase();
  return code === "23503" || message.includes("foreign key");
}

function isSchemaOrMissingObjectError(message?: string | null) {
  const text = String(message ?? "").toLowerCase();
  return (
    text.includes("schema cache") ||
    text.includes("does not exist") ||
    text.includes("relation") ||
    text.includes("column") ||
    text.includes("cache de esquema") ||
    text.includes("não foi possível encontrar a coluna")
  );
}

async function listDatabaseTables(admin: ReturnType<typeof adminClient>, empresaId?: string | null) {
  const rows: Array<{ table_name: string; total_rows: number; has_empresa_id: boolean }> = [];

  for (const tableName of PLATFORM_TABLES) {
    let totalRows = 0;
    let hasEmpresaId = false;

    const empresaIdProbe = await admin
      .from(tableName)
      .select("empresa_id", { count: "exact", head: true })
      .limit(1);

    hasEmpresaId = !empresaIdProbe.error;

    let countQuery = admin
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (empresaId && hasEmpresaId) {
      countQuery = countQuery.eq("empresa_id", empresaId);
    }

    const countResult = await countQuery;
    if (!countResult.error) {
      totalRows = Number(countResult.count ?? 0);
    }

    rows.push({
      table_name: tableName,
      total_rows: totalRows,
      has_empresa_id: hasEmpresaId,
    });
  }

  rows.sort((a, b) => a.table_name.localeCompare(b.table_name));
  return rows;
}

async function collectCompanyUserIds(admin: ReturnType<typeof adminClient>, empresaId: string) {
  const companyUserIds = new Set<string>();

  const [profilesResult, rolesResult] = await Promise.all([
    admin.from("profiles").select("id").eq("empresa_id", empresaId).limit(5000),
    admin.from("user_roles").select("user_id").eq("empresa_id", empresaId).limit(5000),
  ]);

  for (const row of (profilesResult.data ?? [])) {
    if (row?.id) companyUserIds.add(row.id);
  }

  for (const row of (rolesResult.data ?? [])) {
    if (row?.user_id) companyUserIds.add(row.user_id);
  }

  return Array.from(companyUserIds);
}

async function cleanupCompanyTenantRows(
  admin: ReturnType<typeof adminClient>,
  empresaId: string,
  options: {
    keepCompanyCore: boolean;
    keepBillingData: boolean;
  },
): Promise<CleanupCompanyRowsResult> {
  const allTables = await listDatabaseTables(admin);
  const tenantTables = allTables
    .filter((table) => table.has_empresa_id)
    .map((table) => table.table_name)
    .filter((tableName) => {
      if (options.keepCompanyCore && COMPANY_CORE_TABLES.has(tableName)) return false;
      if (options.keepBillingData && TENANT_BILLING_TABLES.has(tableName)) return false;
      return true;
    });

  const deletedByTable: Record<string, number> = {};
  const tableErrors: Array<{ table_name: string; error: string }> = [];
  // Capture user IDs before row cleanup so auth deletion can still run even if
  // profiles/user_roles are removed during tenant table purge.
  const userIds = await collectCompanyUserIds(admin, empresaId);

  // Repeating passes reduces FK ordering sensitivity because dependent rows are removed first.
  for (let pass = 0; pass < 12; pass += 1) {
    let passDeleted = 0;
    const pendingFkTables = new Set<string>();

    for (const tableName of tenantTables) {
      const { count, error } = await admin
        .from(tableName)
        .delete({ count: "exact" })
        .eq("empresa_id", empresaId);

      if (error) {
        const isFkOrderingError = isForeignKeyError(error);

        if (isFkOrderingError) {
          pendingFkTables.add(tableName);
          continue;
        }

        tableErrors.push({ table_name: tableName, error: String(error.message ?? "delete_failed") });
        continue;
      }

      const removed = Number(count ?? 0);
      if (removed > 0) {
        deletedByTable[tableName] = (deletedByTable[tableName] ?? 0) + removed;
        passDeleted += removed;
      }
    }

    if (passDeleted === 0) {
      if (pendingFkTables.size > 0) {
        for (const tableName of Array.from(pendingFkTables)) {
          tableErrors.push({ table_name: tableName, error: "foreign_key_dependency" });
        }
      }
      break;
    }
  }

  if (userIds.length > 0) {
    const roleDelete = await admin.from("user_roles").delete({ count: "exact" }).in("user_id", userIds);
    if (roleDelete.error) {
      return {
        deletedByTable,
        userIds,
        tableErrors,
        error: `Falha ao limpar perfis de acesso da empresa: ${roleDelete.error.message}`,
      };
    }
    deletedByTable.user_roles = (deletedByTable.user_roles ?? 0) + Number(roleDelete.count ?? 0);

    const profileDelete = await admin.from("profiles").delete({ count: "exact" }).in("id", userIds);
    if (profileDelete.error) {
      return {
        deletedByTable,
        userIds,
        tableErrors,
        error: `Falha ao limpar usuários da empresa: ${profileDelete.error.message}`,
      };
    }
    deletedByTable.profiles = (deletedByTable.profiles ?? 0) + Number(profileDelete.count ?? 0);
  }

  return {
    deletedByTable,
    userIds,
    tableErrors,
  };
}

async function deleteAuthUsers(admin: ReturnType<typeof adminClient>, userIds: string[]) {
  let removed = 0;
  const failed: Array<{ user_id: string; reason: string }> = [];

  for (const userId of userIds) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (!error) {
      removed += 1;
      continue;
    }

    failed.push({
      user_id: userId,
      reason: String(error.message ?? "delete_user_failed"),
    });
  }

  return {
    removed,
    failed,
  };
}

async function collectAuthUsersByCompanyMetadata(
  admin: ReturnType<typeof adminClient>,
  params: { empresaId: string; empresaSlug?: string | null },
) {
  const targetEmpresaId = String(params.empresaId ?? "").trim();
  const targetEmpresaSlug = String(params.empresaSlug ?? "").trim().toLowerCase();
  const matchedUserIds = new Set<string>();

  if (!targetEmpresaId) {
    return [] as string[];
  }

  const perPage = 1000;
  for (let page = 1; page <= 20; page += 1) {
    const { data: pageData, error: pageError } = await admin.auth.admin.listUsers({ page, perPage });
    if (pageError) {
      break;
    }

    const users = Array.isArray(pageData?.users) ? pageData.users : [];
    if (users.length === 0) {
      break;
    }

    for (const user of users) {
      const appMetadata = (user?.app_metadata ?? {}) as Record<string, unknown>;
      const userMetadata = (user?.user_metadata ?? {}) as Record<string, unknown>;

      const metadataEmpresaId = String(
        appMetadata.empresa_id
        ?? userMetadata.empresa_id
        ?? "",
      ).trim();

      const metadataEmpresaSlug = String(
        appMetadata.empresa_slug
        ?? userMetadata.empresa_slug
        ?? "",
      ).trim().toLowerCase();

      const matchesEmpresaId = metadataEmpresaId && metadataEmpresaId === targetEmpresaId;
      const matchesEmpresaSlug = targetEmpresaSlug && metadataEmpresaSlug && metadataEmpresaSlug === targetEmpresaSlug;

      if (matchesEmpresaId || matchesEmpresaSlug) {
        const userId = String(user?.id ?? "").trim();
        if (userId) matchedUserIds.add(userId);
      }
    }

    if (users.length < perPage) {
      break;
    }
  }

  return Array.from(matchedUserIds);
}

async function bestEffortDeleteByEq(
  admin: ReturnType<typeof adminClient>,
  tableName: string,
  columnName: string,
  value: string,
) {
  const { error } = await admin
    .from(tableName)
    .delete()
    .eq(columnName, value);

  if (error) {
    return false;
  }

  return true;
}
async function bestEffortDeleteByIn(
  admin: ReturnType<typeof adminClient>,
  tableName: string,
  columnName: string,
  values: string[],
) {
  if (!values.length) return false;

  const { error } = await admin
    .from(tableName)
    .delete()
    .in(columnName, values);

  if (error) {
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  try {
  if (req.method === "OPTIONS") return preflight(req, "POST, OPTIONS");

  const originDenied = rejectIfOriginNotAllowed(req);
  if (originDenied) return originDenied;

  if (req.method !== "POST") return badRequestResponse(req, "Method not allowed", 405);

  const auth = await requireUser(req);
  if ("error" in auth) return unauthorizedResponse(req);

  const admin = auth.admin;
  const isOwner = isOwnerOperatorFromJwt(auth.user) || await isOwnerOperator(admin, auth.user.id);
  if (!isOwner) return forbiddenResponse(req);

  const rawBody = await req.json().catch(() => null);
  if (!isOwnerActionPayload(rawBody)) return badRequestResponse(req, "Missing action", 400);
  const body = rawBody;

  if (body.action === "health_check") {
    const asaasOk = await isAsaasConfiguredAsync(admin);
    // Check cron health — verify last execution within 25 hours
    let cronHealthy = false;
    let cronLastRun: string | null = null;
    try {
      const { data: cronLog } = await admin
        .from("enterprise_audit_logs")
        .select("created_at")
        .eq("acao", "CRON_ENFORCE_SUBSCRIPTION_EXPIRY")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cronLog) {
        cronLastRun = String((cronLog as Record<string, unknown>).created_at);
        const lastRunMs = new Date(cronLastRun).getTime();
        cronHealthy = (Date.now() - lastRunMs) < 25 * 60 * 60 * 1000; // 25h
      }
    } catch { /* ignore — cron monitoring is best-effort */ }
    return ok({
      service: "owner-portal-admin",
      status: "ok",
      version: "2026-03-11-owner-health-v1",
      asaas_configured: asaasOk,
      cron_subscription_expiry: { healthy: cronHealthy, last_run: cronLastRun },
      cloudflare_provisioning: {
        pages_credentials_configured: Boolean(CF_API_TOKEN && CF_ACCOUNT_ID && CF_PAGES_PROJECT_NAME),
        dns_credentials_configured: Boolean(CF_API_TOKEN && CF_ZONE_ID && CF_DNS_RECORD_TARGET),
      },
      timestamp: new Date().toISOString(),
    }, 200, req);
  }

  const trace = createRequestTrace("edge.owner-portal-admin", req, body.action);
  if (OWNER_RATE_LIMIT_ENABLED && shouldEnforceRateLimit(body.action)) {
    const limitConfig = resolveRateLimitConfig(body.action);
    const rateLimit = await enforceRateLimit(admin, {
      scope: `edge.owner-portal-admin.v3.${body.action}`,
      identifier: auth.user.id ?? auth.user.email ?? null,
      maxRequests: limitConfig.maxRequests,
      windowSeconds: limitConfig.windowSeconds,
      blockSeconds: limitConfig.blockSeconds,
    });

    if (!rateLimit.allowed) {
      await writeOperationalLog(admin, {
        scope: trace.scope,
        action: body.action,
        endpoint: trace.endpoint,
        statusCode: 429,
        durationMs: traceDurationMs(trace),
        empresaId: body.empresa_id ?? null,
        userId: auth.user.id,
        metadata: {
          reason: rateLimit.reason,
        },
        errorMessage: "rate_limited",
      });
      return failRateLimited(req, "Muitas requisições no owner-portal-admin");
    }
  }

  const ownerMasterEmail = getOwnerMasterEmail();

  const { data: ownerRoleRow } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .eq("role", "SYSTEM_OWNER")
    .limit(1)
    .maybeSingle();

  const isOwnerMaster =
    isOwnerMasterEmail(auth.user.email ?? null, ownerMasterEmail)
    || hasSystemOwnerRole(auth.user)
    || Boolean(ownerRoleRow?.user_id)
    || isKnownOwnerMasterEmail(auth.user.email ?? null);

  // SYSTEM_OWNER (role) tem acesso total; email é fallback.
  // SYSTEM_ADMIN NÃO passa aqui → bloqueado de ações destrutivas.
  const isStrictOwnerMaster =
    hasSystemOwnerRole(auth.user)
    || Boolean(ownerRoleRow?.user_id)
    || isOwnerMasterEmail(auth.user.email ?? null, ownerMasterEmail)
    || isKnownOwnerMasterEmail(auth.user.email ?? null);

  const ownerMasterOnlyActions = new Set<Payload["action"]>([
    "list_platform_owners",
    "create_platform_owner",
    "cleanup_owner_stress_data",
    "list_database_tables",
    "cleanup_company_data",
    "delete_company",
    "delete_user",
    "purge_table_data",
    "purge_device_users",
    "delete_support_ticket",
    "asaas_link_subscription",
    "asaas_sync_subscription",
    "list_subscription_payments",
  ]);

  if (ownerMasterOnlyActions.has(body.action) && !isStrictOwnerMaster) {
    console.error(JSON.stringify({
      level: "warn",
      source: "owner-portal-admin",
      event: "owner_master_forbidden",
      expected_email: ownerMasterEmail,
      received_email: auth.user.email ?? null,
      trace_id: trace.requestId,
      action: body.action,
      timestamp: new Date().toISOString(),
    }));
    return forbiddenResponse(req, trace.requestId);
  }

  if (!isStrictOwnerMaster && body.action !== "list_audit_logs") {
    await logOwnerMasterHiddenAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: body.empresa_id ?? null,
      actionType: "OWNER_SHADOW_ACTION",
      details: {
        action: body.action,
        at: new Date().toISOString(),
      },
    }).catch(() => null);
  }

  if (body.action === "dashboard" || body.action === "platform_stats") {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [{ count: totalCompanies }, { count: totalUsers }, { count: activeSubscriptions }, { count: overdueSubscriptions }, { count: newCompaniesMonth }, { count: openTickets }, { data: revenue }, { data: plans }, { data: canceledSubscriptions }] = await Promise.all([
      admin.from("empresas").select("id", { count: "exact", head: true }),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "ativo"),
      admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "ativa"),
      admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "atrasada"),
      admin.from("empresas").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
      admin.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["aberto", "em_andamento"]),
      admin.from("subscriptions").select("amount").eq("status", "ativa"),
      admin.from("subscriptions").select("plan_id, planos(nome)").eq("status", "ativa"),
      admin
        .from("subscriptions")
        .select("id")
        .eq("status", "cancelada")
        .gte("updated_at", thirtyDaysAgo),
    ]);

    let blockedCompanies = 0;
    const blockedCompaniesResult = await admin
      .from("empresas")
      .select("id", { count: "exact", head: true })
      .eq("status", "blocked");

    if (!blockedCompaniesResult.error) {
      blockedCompanies = Number(blockedCompaniesResult.count ?? 0);
    }

    const mrr = (revenue ?? []).reduce((acc: number, item: any) => acc + Number(item.amount ?? 0), 0);
    const arr = mrr * 12;
    const usageByPlan = (plans ?? []).reduce((acc: Record<string, number>, item: any) => {
      const planName = item?.planos?.nome ?? "Sem plano";
      acc[planName] = (acc[planName] ?? 0) + 1;
      return acc;
    }, {});
    const canceledIn30Days = (canceledSubscriptions ?? []).length;
    const churnRate = Number(activeSubscriptions ?? 0) + canceledIn30Days > 0
      ? (canceledIn30Days / (Number(activeSubscriptions ?? 0) + canceledIn30Days)) * 100
      : 0;

    const { data: alerts } = await admin
      .from("enterprise_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    return ok({
      total_companies: totalCompanies ?? 0,
      blocked_companies: blockedCompanies ?? 0,
      total_users: totalUsers ?? 0,
      active_subscriptions: activeSubscriptions ?? 0,
      overdue_subscriptions: overdueSubscriptions ?? 0,
      new_companies_month: newCompaniesMonth ?? 0,
      open_tickets: openTickets ?? 0,
      mrr,
      arr,
      churn_rate: Number(churnRate.toFixed(2)),
      usage_by_plan: usageByPlan,
      system_alerts: alerts ?? [],
      generated_at: new Date().toISOString(),
    }, 200, req);
  }

  if (body.action === "list_companies") {
    const page = Number(body.page ?? 1);
    const pageSize = Math.min(Number(body.page_size ?? 500), 1000);
    const offset = (Math.max(page, 1) - 1) * pageSize;

    // Try with related tables first; fall back to plain query if schema lacks the FK
    let data: any[] | null = null;
    let count: number | null = null;
    let listError: any = null;

    const richSelect = "id,nome,slug,status,created_at,updated_at,dados_empresa(razao_social,nome_fantasia),configuracoes_sistema(chave,valor)";
    const plainSelect = "id,nome,slug,status,created_at,updated_at";

    const result = await admin
      .from("empresas")
      .select(richSelect, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (result.error && result.error.message?.includes("schema cache")) {
      // FK/table missing — retry without related tables
      const fallback = await admin
        .from("empresas")
        .select(plainSelect, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);
      data = fallback.data;
      count = fallback.count;
      listError = fallback.error;
    } else {
      data = result.data;
      count = result.count;
      listError = result.error;
    }

    if (listError) return fail(listError.message, 400, null, req);
    return ok({ companies: data ?? [], total: count ?? 0, page, page_size: pageSize }, 200, req);
  }

  if (body.action === "create_company") {
    if (!body.company?.nome || !body.user?.nome || !body.user?.email) {
      return fail("company and master user fields are required", 400, null, req);
    }

    const companyName = body.company.nome.trim();
    const requestedSlugRaw = body.company.slug?.trim() || null;
    const requestedSlug = requestedSlugRaw ? normalizeSlug(requestedSlugRaw) : null;
    if (requestedSlugRaw && !requestedSlug) {
      return fail("Slug inválido. Use apenas letras, números e hífen.", 400, null, req);
    }

    let slug = (requestedSlug || normalizeSlug(companyName)) || `empresa-${Date.now()}`;

    if (requestedSlug) {
      const { data: sameSlug } = await admin
        .from("empresas")
        .select("id")
        .eq("slug", requestedSlug)
        .maybeSingle();

      if (sameSlug?.id) {
        return fail("Já existe uma empresa com esse slug. Informe outro slug.", 409, null, req);
      }
    } else {
      for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
        const { data: sameSlug } = await admin
          .from("empresas")
          .select("id")
          .eq("slug", candidate)
          .maybeSingle();

        if (!sameSlug?.id) {
          slug = candidate;
          break;
        }
      }
    }

    const { data: insertedCompany, error: companyError } = await admin
      .from("empresas")
      .insert({
        nome: companyName,
        slug,
      })
      .select("id,nome,slug,created_at")
      .single();

    if (companyError) {
      if (isDuplicateKeyError(companyError.message)) {
        return fail("Não foi possível criar a empresa por conflito de dados únicos (slug/código).", 409, { reason: companyError.message }, req);
      }
      return fail(companyError.message, 400, null, req);
    }

    let company = insertedCompany;
    let ensuredSlug = (company?.slug ?? "").trim().toLowerCase();
    let createdAuthUserId: string | null = null;

    const rollbackCreateCompany = async (reason: string) => {
      if (createdAuthUserId) {
        await admin.auth.admin.deleteUser(createdAuthUserId).catch(() => null);
      }

      if (!company?.id) {
        return reason;
      }

      const companyId = company.id;

      const { data: rollbackContracts } = await admin
        .from("contracts")
        .select("id")
        .eq("empresa_id", companyId)
        .limit(5000);

      const { data: rollbackSubscriptions } = await admin
        .from("subscriptions")
        .select("id")
        .eq("empresa_id", companyId)
        .limit(5000);

      const rollbackContractIds = (rollbackContracts ?? []).map((row: any) => row?.id).filter(Boolean);
      const rollbackSubscriptionIds = (rollbackSubscriptions ?? []).map((row: any) => row?.id).filter(Boolean);

      if (rollbackContractIds.length > 0) {
        await admin.from("contract_versions").delete().in("contract_id", rollbackContractIds);
      }

      if (rollbackSubscriptionIds.length > 0) {
        await admin.from("subscription_payments").delete().in("subscription_id", rollbackSubscriptionIds);
      }

      await bestEffortDeleteByEq(admin, "contracts", "empresa_id", companyId);
      await bestEffortDeleteByEq(admin, "subscriptions", "empresa_id", companyId);
      await bestEffortDeleteByEq(admin, "company_subscriptions", "empresa_id", companyId);
      await bestEffortDeleteByEq(admin, "user_roles", "empresa_id", companyId);
      await bestEffortDeleteByEq(admin, "profiles", "empresa_id", companyId);
      await bestEffortDeleteByEq(admin, "empresa_config", "empresa_id", companyId);
      await bestEffortDeleteByEq(admin, "configuracoes_sistema", "empresa_id", companyId);
      await bestEffortDeleteByEq(admin, "dados_empresa", "empresa_id", companyId);
      await bestEffortDeleteByEq(admin, "enterprise_impersonation_sessions", "empresa_id", companyId);
      await bestEffortDeleteByEq(admin, "enterprise_subscriptions", "empresa_id", companyId);
      await bestEffortDeleteByEq(admin, "enterprise_audit_logs", "empresa_id", companyId);
      await bestEffortDeleteByEq(admin, "empresas", "id", companyId);
      return reason;
    };

    if (!ensuredSlug) {
      const fallbackBase = normalizeSlug(companyName) || `empresa-${String(company.id || "").slice(0, 8) || Date.now()}`;
      let fallbackSlug = fallbackBase;

      for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = attempt === 0 ? fallbackBase : `${fallbackBase}-${attempt + 1}`;
        const { data: sameSlugCompany } = await admin
          .from("empresas")
          .select("id")
          .eq("slug", candidate)
          .neq("id", company.id)
          .maybeSingle();

        if (!sameSlugCompany?.id) {
          fallbackSlug = candidate;
          break;
        }
      }

      const { data: updatedCompany, error: slugRepairError } = await admin
        .from("empresas")
        .update({ slug: fallbackSlug })
        .eq("id", company.id)
        .select("id,nome,slug,created_at")
        .single();

      if (slugRepairError || !updatedCompany?.slug) {
        const reason = await rollbackCreateCompany(slugRepairError?.message ?? "missing slug");
        return fail("Falha ao garantir slug da empresa recém-criada.", 400, { reason }, req);
      }

      company = updatedCompany;
      ensuredSlug = (updatedCompany.slug ?? "").trim().toLowerCase();
      slug = ensuredSlug;
    }

    const normalizedDocument = String(body.company.cpf_cnpj ?? body.company.cnpj ?? "").replace(/\D+/g, "");
    let onboardingWarning: string | null = null;

    const { error: companyDataError } = await admin.from("dados_empresa").upsert({
      empresa_id: company.id,
      razao_social: body.company.razao_social ?? companyName,
      nome_fantasia: body.company.nome_fantasia ?? companyName,
      cnpj: normalizedDocument || null,
    }, { onConflict: "empresa_id" });

    if (companyDataError) {
      if (isSchemaOrMissingObjectError(companyDataError.message)) {
        onboardingWarning = mergeWarnings(
          onboardingWarning,
          `Tabela/colunas de dados_empresa indisponíveis neste ambiente. Dados legais foram preservados no perfil de configuração. (${companyDataError.message})`,
        );
      } else {
        const reason = await rollbackCreateCompany(companyDataError.message);
        return fail("Falha ao salvar dados da empresa.", 400, { reason }, req);
      }
    }

    const companyProfileValue = {
      tipo_pessoa: body.company.tipo_pessoa ?? (normalizedDocument.length === 11 ? "PF" : "PJ"),
      cpf_cnpj: normalizedDocument || null,
      endereco: body.company.endereco ?? null,
      telefone: body.company.telefone ?? null,
      email: body.company.email ?? null,
      responsavel: body.company.responsavel ?? null,
      segmento: body.company.segmento ?? null,
    };

    let configError: { message?: string } | null = null;
    const profileUpsert = await admin.from("configuracoes_sistema").upsert({
      empresa_id: company.id,
      chave: "owner.company_profile",
      valor: companyProfileValue,
    }, { onConflict: "empresa_id,chave" });

    if (profileUpsert.error) {
      const fallbackUpdate = await admin
        .from("configuracoes_sistema")
        .update({ valor: companyProfileValue })
        .eq("empresa_id", company.id)
        .eq("chave", "owner.company_profile");

      if (fallbackUpdate.error) {
        const fallbackInsert = await admin
          .from("configuracoes_sistema")
          .insert({
            empresa_id: company.id,
            chave: "owner.company_profile",
            valor: companyProfileValue,
          });

        if (fallbackInsert.error) {
          configError = fallbackInsert.error;
        }
      }
    }

    const inactivityMinutes =
      typeof body.company.inactivity_timeout_minutes === "number" && Number.isFinite(body.company.inactivity_timeout_minutes)
        ? Math.max(0, Math.trunc(body.company.inactivity_timeout_minutes))
        : null;

    const securityPolicyValue = {
      inactivity_timeout_minutes: inactivityMinutes,
    };

    let securityPolicyError: { message?: string } | null = null;
    const securityUpsert = await admin.from("configuracoes_sistema").upsert({
      empresa_id: company.id,
      chave: "owner.security_policy",
      valor: securityPolicyValue,
    }, { onConflict: "empresa_id,chave" });

    if (securityUpsert.error) {
      const fallbackUpdate = await admin
        .from("configuracoes_sistema")
        .update({ valor: securityPolicyValue })
        .eq("empresa_id", company.id)
        .eq("chave", "owner.security_policy");

      if (fallbackUpdate.error) {
        const fallbackInsert = await admin
          .from("configuracoes_sistema")
          .insert({
            empresa_id: company.id,
            chave: "owner.security_policy",
            valor: securityPolicyValue,
          });

        if (fallbackInsert.error) {
          securityPolicyError = fallbackInsert.error;
        }
      }
    }

    if (configError || securityPolicyError) {
      const reason = configError?.message ?? securityPolicyError?.message ?? "unknown";
      if (isSchemaOrMissingObjectError(reason)) {
        onboardingWarning = mergeWarnings(
          onboardingWarning,
          `Configurações iniciais não puderam ser persistidas totalmente neste ambiente legado. (${reason})`,
        );
      } else {
        const rollbackReason = await rollbackCreateCompany(reason);
        return fail(
          "Falha ao salvar configurações iniciais da empresa.",
          400,
          { reason: rollbackReason },
          req,
        );
      }
    }

    // Pre-populate tenant.operational_profile so ConfiguracoesEmpresa page starts filled
    const tenantOperationalValue = {
      endereco: body.company.endereco ?? null,
      telefone: body.company.telefone ?? null,
      email: body.company.email ?? null,
      site: null,
      responsavel_nome: body.company.responsavel ?? null,
      responsavel_cargo: null,
      observacoes: null,
    };

    const tenantOpsUpsert = await admin.from("configuracoes_sistema").upsert({
      empresa_id: company.id,
      chave: "tenant.operational_profile",
      valor: tenantOperationalValue,
    }, { onConflict: "empresa_id,chave" });

    if (tenantOpsUpsert.error) {
      // Non-critical: log warning but don't rollback
      onboardingWarning = mergeWarnings(
        onboardingWarning,
        `tenant.operational_profile não pôde ser pré-populado. (${tenantOpsUpsert.error.message})`,
      );
    }

    const managedDomain = buildManagedTenantDomain(slug);
    if (managedDomain) {
      const domainPayload = {
        empresa_id: company.id,
        dominio_custom: managedDomain,
        nome_exibicao: body.company.nome_fantasia ?? companyName,
      };

      let domainError: { message?: string } | null = null;
      const domainUpsert = await admin.from("empresa_config").upsert(domainPayload, { onConflict: "empresa_id" });
      if (domainUpsert.error) {
        const fallbackUpdate = await admin
          .from("empresa_config")
          .update({
            dominio_custom: managedDomain,
            nome_exibicao: body.company.nome_fantasia ?? companyName,
          })
          .eq("empresa_id", company.id);

        if (fallbackUpdate.error) {
          const fallbackInsert = await admin
            .from("empresa_config")
            .insert(domainPayload);

          if (fallbackInsert.error) {
            domainError = fallbackInsert.error;
          }
        }
      }

      if (domainError) {
        if (isSchemaOrMissingObjectError(domainError.message)) {
          onboardingWarning = mergeWarnings(
            onboardingWarning,
            `Domínio automático não foi persistido em empresa_config neste ambiente legado. (${domainError.message})`,
          );
        } else {
          const reason = await rollbackCreateCompany(domainError.message ?? "domain_config_failed");
          return fail("Falha ao configurar domínio automático da empresa.", 400, { reason }, req);
        }
      }

      const cloudflareProvision = await ensureCloudflareTenantDomain(managedDomain);
      if (cloudflareProvision.status === "error") {
        // Only rollback if provision is explicitly required via env vars
        if (CF_PAGES_PROVISION_REQUIRED || CF_DNS_PROVISION_REQUIRED) {
          const reason = await rollbackCreateCompany(cloudflareProvision.message);
          return fail("Falha ao provisionar DNS/dominio no Cloudflare para o tenant.", 400, { reason }, req);
        }

        onboardingWarning = mergeWarnings(
          onboardingWarning,
          `Dominio da empresa criado no banco, mas com aviso no Cloudflare (DNS/Pages): ${cloudflareProvision.message}`,
        );
      }
    }

    const masterRole = body.user.role ?? "MASTER_TI";
    const password = body.user.password?.trim() || generateTemporaryPassword();

    const normalizedMasterEmail = body.user.email.trim().toLowerCase();

    const { data: createdAuth, error: authError } = await admin.auth.admin.createUser({
      email: normalizedMasterEmail,
      password,
      email_confirm: true,
      app_metadata: {
        empresa_id: company.id,
        empresa_slug: slug,
        role: masterRole,
        roles: [masterRole],
        force_password_change: true,
        must_change_password: true,
      },
      user_metadata: {
        nome: body.user.nome,
        empresa_id: company.id,
        empresa_slug: slug,
        force_password_change: true,
        must_change_password: true,
      },
    });

    const authMasterUserId = createdAuth?.user?.id ?? null;

    if (authError || !authMasterUserId) {
      const authMessage = authError?.message ?? "Failed to create company master user";
      const reason = await rollbackCreateCompany(authMessage);
      return fail(authMessage, 400, { reason }, req);
    }

    createdAuthUserId = authMasterUserId;

    const profilePayloadExtended = {
      id: authMasterUserId,
      empresa_id: company.id,
      nome: body.user.nome,
      email: normalizedMasterEmail,
      force_password_change: true,
    };
    const profilePayloadMinimal = {
      id: authMasterUserId,
      empresa_id: company.id,
      nome: body.user.nome,
      email: normalizedMasterEmail,
    };

    let profileLinkError: { message?: string } | null = null;
    const profileUpsertExtended = await admin.from("profiles").upsert(profilePayloadExtended, { onConflict: "id" });
    if (profileUpsertExtended.error) {
      const profileUpsertMinimal = await admin.from("profiles").upsert(profilePayloadMinimal, { onConflict: "id" });
      if (profileUpsertMinimal.error) {
        const profileUpdateMinimal = await admin
          .from("profiles")
          .update({
            empresa_id: company.id,
            nome: body.user.nome,
            email: normalizedMasterEmail,
          })
          .eq("id", authMasterUserId);

        if (profileUpdateMinimal.error) {
          const profileInsertMinimal = await admin
            .from("profiles")
            .insert(profilePayloadMinimal);

          if (profileInsertMinimal.error) {
            profileLinkError = profileInsertMinimal.error;
          }
        }
      }
    }

    if (profileLinkError) {
      onboardingWarning = mergeWarnings(
        onboardingWarning,
        `Usuário master criado no Auth, porém vínculo em profiles não foi persistido automaticamente. (${profileLinkError.message})`,
      );
    }

    // --- Role assignment: UPSERT then UPDATE fallback ---
    let roleLinkError: { message?: string } | null = null;

    // Primary: upsert with unique index (user_id, empresa_id) — handle_new_user trigger may have created USUARIO
    const { error: roleUpsertError } = await admin
      .from("user_roles")
      .upsert({
        user_id: authMasterUserId,
        empresa_id: company.id,
        role: masterRole,
      }, { onConflict: "user_id,empresa_id" })

    if (roleUpsertError) {
      // Fallback 1: direct UPDATE (works if handle_new_user already created a row)
      const { error: roleUpdateError, data: roleUpdateData } = await admin
        .from("user_roles")
        .update({ role: masterRole })
        .eq("user_id", authMasterUserId)
        .eq("empresa_id", company.id)
        .select("id")

      if (roleUpdateError || !roleUpdateData?.length) {
        // Fallback 2: plain INSERT (if no row exists yet)
        const { error: insertErr } = await admin
          .from("user_roles")
          .insert({
            user_id: authMasterUserId,
            empresa_id: company.id,
            role: masterRole,
          })

        if (insertErr) {
          const insertMsg = (insertErr.message ?? "").toLowerCase()
          // Duplicate = trigger already inserted the role → just update
          if (insertMsg.includes("duplicate") || insertMsg.includes("unique") || insertMsg.includes("23505")) {
            const { error: finalUpdateErr } = await admin
              .from("user_roles")
              .update({ role: masterRole })
              .eq("user_id", authMasterUserId)
              .eq("empresa_id", company.id)
            if (finalUpdateErr) {
              roleLinkError = finalUpdateErr
            }
          } else {
            roleLinkError = insertErr
          }
        }
      }
    }

    if (roleLinkError) {
      onboardingWarning = mergeWarnings(
        onboardingWarning,
        `Vínculo em user_roles não persistido automaticamente. (${roleLinkError.message})`,
      );
    }

    // --- Plan ID resolution ---
    // Frontend sends plan_id from "plans" table (EN). But:
    //   subscriptions.plan_id FK -> planos (PT-BR)
    //   company_subscriptions.plan_id FK -> plans (EN)
    // We need two IDs: one for each table.
    const inputPlanId: string | null = body.subscription?.plan_id ?? null;
    let planIdForSubscriptions: string | null = null;   // FK -> planos
    let planIdForCompanySub: string | null = null;       // FK -> plans

    if (inputPlanId) {
      // Input comes from plans table (frontend select). Map to planos via code.
      try {
        const { data: sourcePlan } = await admin
          .from("plans")
          .select("id,code")
          .eq("id", inputPlanId)
          .maybeSingle();

        if (sourcePlan?.code) {
          planIdForCompanySub = sourcePlan.id;
          // Find equivalent in planos by codigo
          const { data: matchedPlano } = await admin
            .from("planos")
            .select("id")
            .ilike("codigo", sourcePlan.code)
            .eq("ativo", true)
            .maybeSingle();
          planIdForSubscriptions = matchedPlano?.id ?? null;
        }

        if (!planIdForSubscriptions) {
          // Maybe inputPlanId is already a planos ID — check directly
          const { data: directPlano } = await admin
            .from("planos")
            .select("id,codigo")
            .eq("id", inputPlanId)
            .maybeSingle();
          if (directPlano?.id) {
            planIdForSubscriptions = directPlano.id;
            if (!planIdForCompanySub) {
              const { data: mp } = await admin
                .from("plans")
                .select("id")
                .ilike("code", directPlano.codigo ?? "")
                .eq("active", true)
                .maybeSingle();
              planIdForCompanySub = mp?.id ?? null;
            }
          }
        }
      } catch {
        // swallow — fallback below
      }
    }

    // Fallback: no plan provided or mapping failed — pick cheapest active
    if (!planIdForSubscriptions) {
      try {
        const { data: fallbackPlano } = await admin
          .from("planos")
          .select("id,codigo")
          .eq("ativo", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (fallbackPlano?.id) {
          planIdForSubscriptions = fallbackPlano.id;
          if (!planIdForCompanySub) {
            const { data: mp } = await admin
              .from("plans")
              .select("id")
              .ilike("code", fallbackPlano.codigo ?? "")
              .eq("active", true)
              .maybeSingle();
            planIdForCompanySub = mp?.id ?? null;
          }
          if (!inputPlanId) {
            onboardingWarning = mergeWarnings(
              onboardingWarning,
              `Plano inicial não informado. Assinatura criada automaticamente com plano ${fallbackPlano.codigo ?? fallbackPlano.id}.`,
            );
          }
        }
      } catch { /* ignore */ }
    }

    if (!planIdForCompanySub) {
      try {
        const { data: fallbackPlan } = await admin
          .from("plans")
          .select("id")
          .eq("active", true)
          .order("price_month", { ascending: true })
          .limit(1)
          .maybeSingle();
        planIdForCompanySub = fallbackPlan?.id ?? planIdForSubscriptions;
      } catch {
        planIdForCompanySub = planIdForSubscriptions;
      }
    }

    if (!planIdForSubscriptions && !planIdForCompanySub) {
      onboardingWarning = mergeWarnings(
        onboardingWarning,
        "Empresa criada sem assinatura inicial: nenhum plano ativo encontrado.",
      );
    }

    // Alias for backward compat in the rest of the block
    const selectedPlanId = planIdForSubscriptions;
    const selectedPlanIdForCompanySub = planIdForCompanySub;

    let subscription: any = null;
    let contract: any = null;
    let asaasOnboardingResult: Record<string, unknown> | null = null;

    if (selectedPlanId) {
      try {
        const startsAt = body.subscription?.starts_at ?? new Date().toISOString().slice(0, 10);
        const { data: createdSubscription, error: subscriptionError } = await admin
          .from("subscriptions")
          .upsert({
            empresa_id: company.id,
            plan_id: selectedPlanId,
            amount: body.subscription?.amount ?? 0,
            payment_method: body.subscription?.payment_method ?? null,
            period: body.subscription?.period ?? "monthly",
            starts_at: startsAt,
            ends_at: body.subscription?.ends_at ?? null,
            renewal_at: body.subscription?.renewal_at ?? body.subscription?.ends_at ?? null,
            status: body.subscription?.status ?? "teste",
            payment_status: body.subscription?.payment_status ?? null,
          }, { onConflict: "empresa_id" })
          .select("*")
          .single();

        if (subscriptionError || !createdSubscription?.id) {
          const reasonText = subscriptionError?.message ?? "subscription_create_failed";
          onboardingWarning = mergeWarnings(
            onboardingWarning,
            `Assinatura inicial não foi criada automaticamente. (${reasonText})`,
          );
        } else {
        subscription = createdSubscription;

        // Sync company_subscriptions table (used by check_company_plan_limit RPC)
        const companySubStatus = String(createdSubscription.status ?? "teste").toLowerCase();
        const mappedStatus = companySubStatus === "teste" ? "trial" : companySubStatus === "ativa" ? "active" : companySubStatus;
        await admin.from("company_subscriptions").upsert({
          empresa_id: company.id,
          plan_id: selectedPlanIdForCompanySub ?? selectedPlanId,
          status: mappedStatus,
          starts_at: createdSubscription.starts_at ?? startsAt,
          ends_at: createdSubscription.ends_at ?? null,
        }, { onConflict: "empresa_id" }).then((result: any) => {
          const csError = result?.error;
          if (csError && !isSchemaOrMissingObjectError(csError.message)) {
            // Fallback insert
            return admin.from("company_subscriptions").insert({
              empresa_id: company.id,
              plan_id: selectedPlanIdForCompanySub ?? selectedPlanId,
              status: mappedStatus,
              starts_at: createdSubscription.starts_at ?? startsAt,
              ends_at: createdSubscription.ends_at ?? null,
            });
          }
        }).catch(() => null);

        try {
          contract = await createContractFromSubscription(admin, auth.user.id, createdSubscription);
          if (!contract?.id) {
            throw new Error("contract_create_failed");
          }
        } catch (error: any) {
          const reasonText = error?.message ?? "contract_create_failed";
          onboardingWarning = mergeWarnings(
            onboardingWarning,
            `Contrato inicial não pôde ser gerado automaticamente. (${reasonText})`,
          );
        }

        // --- ASAAS auto-sync: create customer + subscription in ASAAS if configured ---
        try {
          const asaasKeyResolved = await resolveAsaasApiKey(admin);
          if (asaasKeyResolved && createdSubscription?.id) {
            asaasOnboardingResult = await createOrSyncAsaasSubscription(admin, createdSubscription);
          }
        } catch (asaasError: any) {
          const asaasMsg = String(asaasError?.message ?? asaasError ?? "Falha ao sincronizar com Asaas");
          onboardingWarning = mergeWarnings(
            onboardingWarning,
            `Cliente/assinatura ASAAS não foi criada automaticamente. (${asaasMsg})`,
          );
          await logPlatformAudit(admin, {
            actorId: auth.user.id,
            actorEmail: auth.user.email,
            empresaId: company.id,
            actionType: "OWNER_ASAAS_CREATE_ON_ONBOARDING_FAILED",
            details: {
              subscription_id: createdSubscription.id,
              reason: asaasMsg,
            },
          }).catch(() => null);
        }
      }
      } catch (subscriptionBlockErr: any) {
        onboardingWarning = mergeWarnings(
          onboardingWarning,
          `Erro inesperado ao criar assinatura/contrato inicial. (${subscriptionBlockErr?.message ?? "unknown"})`,
        );
      }
    }

    // --- Audit & Response (never abort after company+user created) ---
    try {
      await logPlatformAudit(admin, {
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        empresaId: company.id,
        actionType: "OWNER_CREATE_COMPANY",
        details: {
          company_id: company.id,
          master_email: body.user.email,
          subscription_created: Boolean(subscription?.id),
          contract_created: Boolean(contract?.id),
          asaas_synced: Boolean(asaasOnboardingResult),
          warning: onboardingWarning,
        },
      }).catch(() => null);

      await logAuditEvent(admin, {
        action: "OWNER_CREATE_COMPANY",
        entityType: "company",
        entityId: company.id,
        empresaId: company.id,
        userId: auth.user.id,
        payload: {
          company_slug: company.slug,
          master_email: body.user.email,
          subscription_created: Boolean(subscription?.id),
          contract_created: Boolean(contract?.id),
          warning: onboardingWarning,
        },
        severity: "info",
        source: "owner-portal-admin",
        endpoint: trace.endpoint,
        executionMs: traceDurationMs(trace),
        req,
      }).catch(() => null);

      await writeOperationalLog(admin, {
        scope: trace.scope,
        action: body.action,
        endpoint: trace.endpoint,
        statusCode: 200,
        durationMs: traceDurationMs(trace),
        empresaId: company.id,
        userId: auth.user.id,
        metadata: {
          company_id: company.id,
        },
      }).catch(() => null);
    } catch {
      // Logging failures must never prevent company creation response
    }

    return ok({
      company,
      master_user: {
        id: authMasterUserId,
        email: normalizedMasterEmail,
        initial_password: password,
      },
      subscription: subscription
        ? {
          id: subscription.id,
          plan_id: subscription.plan_id,
          status: subscription.status,
        }
        : null,
      contract: contract
        ? {
          id: contract?.id ?? null,
          status: contract?.status ?? null,
          version: contract?.version ?? null,
        }
        : null,
      asaas: asaasOnboardingResult,
      warning: onboardingWarning,
    }, 200, req);
  }

  if (body.action === "update_company") {
    if (!body.empresa_id || !body.company) return fail("empresa_id and company are required", 400, null, req);

    const updatePayload: Record<string, unknown> = {};
    let updateWarning: string | null = null;
    let previousSlug: string | null = null;
    let nextSlug: string | null = null;

    if (body.company.slug) {
      const { data: currentCompany } = await admin
        .from("empresas")
        .select("slug")
        .eq("id", body.empresa_id)
        .maybeSingle();

      previousSlug = currentCompany?.slug ?? null;
      nextSlug = normalizeSlug(body.company.slug);

      if (!nextSlug) {
        return fail("Slug inválido. Use apenas letras, números e hífen.", 400, null, req);
      }
    }

    if (body.company.nome) updatePayload.nome = body.company.nome;
    if (nextSlug) updatePayload.slug = nextSlug;
    const normalizedDocument = String(body.company.cpf_cnpj ?? body.company.cnpj ?? "").replace(/\D+/g, "");

    const { error: empresaError } = await admin
      .from("empresas")
      .update(updatePayload)
      .eq("id", body.empresa_id);
    if (empresaError) {
      if (isDuplicateKeyError(empresaError.message)) {
        return fail("Já existe uma empresa com esse slug. Informe outro slug.", 409, { reason: empresaError.message }, req);
      }
      return fail(empresaError.message, 400, null, req);
    }

    await admin.from("dados_empresa").upsert({
      empresa_id: body.empresa_id,
      razao_social: body.company.razao_social ?? null,
      nome_fantasia: body.company.nome_fantasia ?? null,
      cnpj: normalizedDocument || null,
    }, { onConflict: "empresa_id" });

    await admin.from("configuracoes_sistema").upsert({
      empresa_id: body.empresa_id,
      chave: "owner.company_profile",
      valor: {
        tipo_pessoa: body.company.tipo_pessoa ?? (normalizedDocument.length === 11 ? "PF" : "PJ"),
        cpf_cnpj: normalizedDocument || null,
        endereco: body.company.endereco ?? null,
        telefone: body.company.telefone ?? null,
        email: body.company.email ?? null,
        responsavel: body.company.responsavel ?? null,
        segmento: body.company.segmento ?? null,
      },
    }, { onConflict: "empresa_id,chave" });

    // Sync tenant.operational_profile with owner cadastro data (merge, don't overwrite user edits)
    {
      const { data: existingOps } = await admin
        .from("configuracoes_sistema")
        .select("valor")
        .eq("empresa_id", body.empresa_id)
        .eq("chave", "tenant.operational_profile")
        .maybeSingle();

      const prev = (existingOps?.valor ?? {}) as Record<string, unknown>;
      const synced = {
        endereco: body.company.endereco ?? prev.endereco ?? null,
        telefone: body.company.telefone ?? prev.telefone ?? null,
        email: body.company.email ?? prev.email ?? null,
        site: prev.site ?? null,
        responsavel_nome: body.company.responsavel ?? prev.responsavel_nome ?? null,
        responsavel_cargo: prev.responsavel_cargo ?? null,
        observacoes: prev.observacoes ?? null,
      };

      await admin.from("configuracoes_sistema").upsert({
        empresa_id: body.empresa_id,
        chave: "tenant.operational_profile",
        valor: synced,
      }, { onConflict: "empresa_id,chave" });
    }

    const inactivityMinutes =
      typeof body.company.inactivity_timeout_minutes === "number" && Number.isFinite(body.company.inactivity_timeout_minutes)
        ? Math.max(0, Math.trunc(body.company.inactivity_timeout_minutes))
        : null;

    await admin.from("configuracoes_sistema").upsert({
      empresa_id: body.empresa_id,
      chave: "owner.security_policy",
      valor: {
        inactivity_timeout_minutes: inactivityMinutes,
      },
    }, { onConflict: "empresa_id,chave" });

    if (nextSlug) {
      const nextManagedDomain = buildManagedTenantDomain(nextSlug);
      const previousManagedDomain = previousSlug ? buildManagedTenantDomain(previousSlug) : null;

      if (nextManagedDomain) {
        const { data: currentDomainConfig } = await admin
          .from("empresa_config")
          .select("dominio_custom")
          .eq("empresa_id", body.empresa_id)
          .maybeSingle();

        const currentDomain = currentDomainConfig?.dominio_custom ?? null;
        const shouldUpdateManagedDomain = !currentDomain || currentDomain === previousManagedDomain;

        if (shouldUpdateManagedDomain) {
          const { error: domainUpdateError } = await admin.from("empresa_config").upsert({
            empresa_id: body.empresa_id,
            dominio_custom: nextManagedDomain,
            nome_exibicao: body.company.nome_fantasia ?? body.company.nome ?? null,
          }, { onConflict: "empresa_id" });

          if (domainUpdateError) {
            return fail("Falha ao atualizar domínio automático da empresa.", 400, { reason: domainUpdateError.message }, req);
          }

          const cloudflareProvision = await ensureCloudflareTenantDomain(nextManagedDomain);
          if (cloudflareProvision.status === "error") {
            if (CF_PAGES_PROVISION_REQUIRED || CF_DNS_PROVISION_REQUIRED) {
              return fail("Falha ao provisionar DNS/dominio no Cloudflare para o tenant.", 400, {
                reason: cloudflareProvision.message,
              }, req);
            }

            updateWarning = `Dominio atualizado no banco, mas com aviso no Cloudflare (DNS/Pages): ${cloudflareProvision.message}`;
          }
        }
      }
    }

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: body.empresa_id,
      actionType: "OWNER_UPDATE_COMPANY",
      details: { fields: Object.keys(updatePayload) },
    });

    return ok({ success: true, warning: updateWarning }, 200, req);
  }

  if (body.action === "set_company_status") {
    if (!body.empresa_id) return fail("empresa_id is required", 400, null, req);

    // Verificar senha para bloqueio/desbloqueio de empresa
    if (body.auth_password) {
      const pwOk = await verifyActorPassword({
        email: auth.user.email,
        password: body.auth_password,
        expectedUserId: auth.user.id,
      });
      if (!pwOk) return fail("Senha invalida.", 401, null, req);
    }
    const status = body.status ?? "active";
    const { error } = await admin
      .from("empresas")
      .update({ status })
      .eq("id", body.empresa_id);

    if (error) {
      const message = String(error.message ?? "").toLowerCase();
      const isSchemaMismatch = message.includes("schema cache") || message.includes("does not exist") || message.includes("coluna") || message.includes("column");

      if (!isSchemaMismatch) return fail(error.message, 400, null, req);

      const { error: fallbackError } = await admin
        .from("configuracoes_sistema")
        .upsert({
          empresa_id: body.empresa_id,
          chave: "owner.company_state",
          valor: {
            status,
            reason: body.reason ?? null,
            updated_at: new Date().toISOString(),
          },
        }, { onConflict: "empresa_id,chave" });

      if (fallbackError) return fail(fallbackError.message, 400, null, req);
    }

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: body.empresa_id,
      actionType: "OWNER_SET_COMPANY_STATUS",
      details: { status, reason: body.reason ?? null },
    });

    return ok({ success: true }, 200, req);
  }

  if (body.action === "list_users") {
    let query = admin
      .from("profiles")
      .select("id,nome,email,empresa_id,status,deleted_at,deleted_by,created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (body.empresa_id) query = query.eq("empresa_id", body.empresa_id);

    // Se include_deleted não for true, ocultar usuários excluídos
    if (!body.include_deleted) {
      query = query.neq("status", "excluido");
    }

    const { data, error } = await query;
    if (error) return fail(error.message, 400, null, req);

    const users = data ?? [];
    if (users.length === 0) return ok({ users: [] }, 200, req);

    const userIds = users
      .map((item: any) => item.id)
      .filter(Boolean);

    const rolesQuery = admin
      .from("user_roles")
      .select("user_id,role,empresa_id")
      .in("user_id", userIds);

    if (body.empresa_id) rolesQuery.eq("empresa_id", body.empresa_id);

    const { data: rolesData, error: rolesError } = await rolesQuery;
    if (rolesError) return fail(rolesError.message, 400, null, req);

    const rolesByUser = new Map<string, any[]>();
    for (const row of (rolesData ?? [])) {
      const bucket = rolesByUser.get(row.user_id) ?? [];
      bucket.push({ role: row.role, empresa_id: row.empresa_id });
      rolesByUser.set(row.user_id, bucket);
    }

    // Buscar nomes das empresas para exibição
    const empresaIds = [...new Set(users.map((u: any) => u.empresa_id).filter(Boolean))];
    const empresaNameMap = new Map<string, string>();
    if (empresaIds.length > 0) {
      const { data: empresasData } = await admin
        .from("empresas")
        .select("id,nome")
        .in("id", empresaIds);
      for (const e of (empresasData ?? [])) {
        empresaNameMap.set(e.id, e.nome);
      }
    }

    // Usar status do profiles (já sincronizado) em vez de iterar auth.users
    const merged = users.map((user: any) => {
      const roles = rolesByUser.get(user.id) ?? [];
      const primaryRole = roles.length > 0 ? roles[0].role : null;
      return {
        ...user,
        status: user.status ?? "ativo",
        role: primaryRole,
        empresa_nome: empresaNameMap.get(user.empresa_id) ?? null,
        user_roles: roles,
      };
    });

    return ok({ users: merged }, 200, req);
  }

  if (body.action === "create_user") {
    if (!body.user?.nome || !body.user.email || !body.user.empresa_id || !body.user.role) {
      return fail("user payload is required", 400, null, req);
    }

    // Plan limit check — gracefully skip if no subscription exists yet (new company onboarding)
    let planLimitWarning: string | null = null;
    const { error: planLimitError } = await admin.rpc("check_company_plan_limit", {
      p_empresa_id: body.user.empresa_id,
      p_limit_type: "users",
      p_increment: 1,
    });

    if (planLimitError) {
      const planMsg = planLimitError.message ?? "";
      const isNoSubscription = planMsg.toLowerCase().includes("no active subscription");
      const isPlanLimitExceeded = planMsg.toLowerCase().includes("limit exceeded");

      if (isPlanLimitExceeded) {
        return fail("Limite de usuários do plano atingido.", 403, {
          reason: planLimitError.message,
        }, req);
      }

      if (isNoSubscription) {
        planLimitWarning = "Empresa sem assinatura ativa. Usuário criado sem verificação de limites do plano.";
      } else if (isSchemaOrMissingObjectError(planMsg)) {
        planLimitWarning = "Verificação de limites de plano indisponível neste ambiente.";
      } else {
        planLimitWarning = `Verificação de limites do plano falhou: ${planMsg}. Usuário criado sem enforcement.`;
      }
    }

    const normalizedUserEmail = body.user.email.trim().toLowerCase();
    const normalizedRole = String(body.user.role).trim().toUpperCase();

    const { data: targetCompany, error: targetCompanyError } = await admin
      .from("empresas")
      .select("id,slug")
      .eq("id", body.user.empresa_id)
      .maybeSingle();

    if (targetCompanyError) return fail(targetCompanyError.message, 400, null, req);
    if (!targetCompany?.id) return fail("Empresa do usuário não encontrada.", 404, null, req);

    const password = body.user.password?.trim() || generateTemporaryPassword();

    const forcePasswordChange = body.user.force_password_change !== false;

    const { data: createdAuth, error: createError } = await admin.auth.admin.createUser({
      email: normalizedUserEmail,
      password,
      email_confirm: true,
      app_metadata: {
        empresa_id: body.user.empresa_id,
        empresa_slug: targetCompany.slug ?? null,
        role: normalizedRole,
        roles: [normalizedRole],
        force_password_change: forcePasswordChange,
        must_change_password: forcePasswordChange,
      },
      user_metadata: {
        nome: body.user.nome,
        empresa_id: body.user.empresa_id,
        empresa_slug: targetCompany.slug ?? null,
        force_password_change: forcePasswordChange,
        must_change_password: forcePasswordChange,
      },
    });

    if (createError || !createdAuth?.user?.id) return fail(createError?.message ?? "Failed to create user", 400, null, req);

    let createUserWarning: string | null = null;

    const profilePayloadExtended = {
      id: createdAuth.user.id,
      empresa_id: body.user.empresa_id,
      nome: body.user.nome,
      email: normalizedUserEmail,
      force_password_change: forcePasswordChange,
    };
    const profilePayloadMinimal = {
      id: createdAuth.user.id,
      empresa_id: body.user.empresa_id,
      nome: body.user.nome,
      email: normalizedUserEmail,
    };

    let profileLinkError: { message?: string } | null = null;
    const profileUpsertExtended = await admin.from("profiles").upsert(profilePayloadExtended, { onConflict: "id" });
    if (profileUpsertExtended.error) {
      const profileUpsertMinimal = await admin.from("profiles").upsert(profilePayloadMinimal, { onConflict: "id" });
      if (profileUpsertMinimal.error) {
        const profileUpdateMinimal = await admin
          .from("profiles")
          .update({
            empresa_id: body.user.empresa_id,
            nome: body.user.nome,
            email: normalizedUserEmail,
          })
          .eq("id", createdAuth.user.id);

        if (profileUpdateMinimal.error) {
          const profileInsertMinimal = await admin
            .from("profiles")
            .insert(profilePayloadMinimal);

          if (profileInsertMinimal.error) {
            profileLinkError = profileInsertMinimal.error;
          }
        }
      }
    }

    if (profileLinkError) {
      createUserWarning = mergeWarnings(
        createUserWarning,
        `Usuário criado no Auth, porém vínculo em profiles não foi persistido automaticamente. (${profileLinkError.message})`,
      );
    }

    // --- Role assignment: UPSERT then UPDATE fallback ---
    let roleLinkError: { message?: string } | null = null;

    // Primary: upsert with unique index (user_id, empresa_id) — handle_new_user trigger may have created USUARIO
    const { error: roleUpsertError } = await admin
      .from("user_roles")
      .upsert({
        user_id: createdAuth.user.id,
        empresa_id: body.user.empresa_id,
        role: normalizedRole,
      }, { onConflict: "user_id,empresa_id" })

    if (roleUpsertError) {
      // Fallback 1: direct UPDATE (works if handle_new_user already created a row)
      const { error: roleUpdateError, data: roleUpdateData } = await admin
        .from("user_roles")
        .update({ role: normalizedRole })
        .eq("user_id", createdAuth.user.id)
        .eq("empresa_id", body.user.empresa_id)
        .select("id")

      if (roleUpdateError || !roleUpdateData?.length) {
        // Fallback 2: plain INSERT (if no row exists yet)
        const { error: insertErr } = await admin
          .from("user_roles")
          .insert({
            user_id: createdAuth.user.id,
            empresa_id: body.user.empresa_id,
            role: normalizedRole,
          })

        if (insertErr) {
          const insertMsg = (insertErr.message ?? "").toLowerCase()
          // Duplicate = trigger already inserted the role → just update
          if (insertMsg.includes("duplicate") || insertMsg.includes("unique") || insertMsg.includes("23505")) {
            const { error: finalUpdateErr } = await admin
              .from("user_roles")
              .update({ role: normalizedRole })
              .eq("user_id", createdAuth.user.id)
              .eq("empresa_id", body.user.empresa_id)
            if (finalUpdateErr) {
              roleLinkError = finalUpdateErr
            }
          } else {
            roleLinkError = insertErr
          }
        }
      }
    }

    if (roleLinkError) {
      createUserWarning = mergeWarnings(
        createUserWarning,
        `Vínculo em user_roles não persistido automaticamente. (${roleLinkError.message})`,
      );
    }

    if (body.user.status && body.user.status !== "ativo") {
      await admin.auth.admin.updateUserById(createdAuth.user.id, { ban_duration: "876000h" });
    }

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: body.user.empresa_id,
      actionType: "OWNER_CREATE_USER",
      details: { user_id: createdAuth.user.id, role: normalizedRole },
    });

    await logAuditEvent(admin, {
      action: "OWNER_CREATE_USER",
      entityType: "user",
      entityId: createdAuth.user.id,
      empresaId: body.user.empresa_id,
      userId: auth.user.id,
      payload: {
        role: normalizedRole,
        target_email: normalizedUserEmail,
      },
      severity: "info",
      source: "owner-portal-admin",
      endpoint: trace.endpoint,
      executionMs: traceDurationMs(trace),
      req,
    });

    await writeOperationalLog(admin, {
      scope: trace.scope,
      action: body.action,
      endpoint: trace.endpoint,
      statusCode: 200,
      durationMs: traceDurationMs(trace),
      empresaId: body.user.empresa_id,
      userId: auth.user.id,
      metadata: {
        target_user_id: createdAuth.user.id,
      },
    });

    const finalWarning = mergeWarnings(planLimitWarning, createUserWarning);
    return ok({ success: true, user_id: createdAuth.user.id, warning: finalWarning }, 200, req);
  }

  if (body.action === "move_user_company") {
    const targetEmpresaId = String(body.new_empresa_id ?? body.empresa_id ?? "").trim();
    if (!body.user_id || !targetEmpresaId) return fail("user_id and new_empresa_id are required", 400, null, req);

    // Plan limit check — gracefully skip if no subscription exists
    const { error: planLimitError } = await admin.rpc("check_company_plan_limit", {
      p_empresa_id: targetEmpresaId,
      p_limit_type: "users",
      p_increment: 1,
    });

    if (planLimitError) {
      const planMsg = planLimitError.message ?? "";
      const isPlanLimitExceeded = planMsg.toLowerCase().includes("limit exceeded");
      if (isPlanLimitExceeded) {
        return fail("Limite de usuários do plano da empresa destino atingido.", 403, {
          reason: planLimitError.message,
        }, req);
      }
      // For no subscription or schema errors, allow the move
    }

    const { data: targetCompany, error: targetCompanyError } = await admin
      .from("empresas")
      .select("id,slug")
      .eq("id", targetEmpresaId)
      .maybeSingle();

    if (targetCompanyError) return fail(targetCompanyError.message, 400, null, req);
    if (!targetCompany?.id) return fail("Empresa destino não encontrada.", 404, null, req);

    const { data: existingRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", body.user_id)
      .limit(1);

    const roleToKeep = String(body.user?.role ?? existingRoles?.[0]?.role ?? "USUARIO").trim().toUpperCase();

    const { error: profileError } = await admin
      .from("profiles")
      .update({ empresa_id: targetEmpresaId })
      .eq("id", body.user_id);

    if (profileError) return fail(profileError.message, 400, null, req);

    await admin.from("user_roles").delete().eq("user_id", body.user_id);

    const { error: roleError } = await admin.from("user_roles").insert({
      user_id: body.user_id,
      empresa_id: targetEmpresaId,
      role: roleToKeep,
    });

    if (roleError) return fail(roleError.message, 400, null, req);

    const { data: authUserData } = await admin.auth.admin.getUserById(body.user_id);
    const existingApp = (authUserData?.user?.app_metadata ?? {}) as Record<string, unknown>;
    const existingMeta = (authUserData?.user?.user_metadata ?? {}) as Record<string, unknown>;

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(body.user_id, {
      app_metadata: {
        ...existingApp,
        empresa_id: targetEmpresaId,
        empresa_slug: targetCompany.slug ?? null,
        role: roleToKeep,
        roles: [roleToKeep],
      },
      user_metadata: {
        ...existingMeta,
        empresa_id: targetEmpresaId,
        empresa_slug: targetCompany.slug ?? null,
      },
    });

    if (authUpdateError) return fail(authUpdateError.message, 400, null, req);

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: targetEmpresaId,
      actionType: "OWNER_MOVE_USER_COMPANY",
      details: {
        user_id: body.user_id,
        role: roleToKeep,
      },
    });

    return ok({ success: true }, 200, req);
  }

  if (body.action === "set_user_password") {
    const newPassword = String(body.new_password ?? body.user?.password ?? "").trim();
    const forceChange = body.force_password_change !== false;
    if (!body.user_id || newPassword.length < 8) {
      return fail("user_id and new_password (min 8 chars) are required", 400, null, req);
    }

    const { data: authUserData } = await admin.auth.admin.getUserById(body.user_id);
    const existingApp = (authUserData?.user?.app_metadata ?? {}) as Record<string, unknown>;
    const existingMeta = (authUserData?.user?.user_metadata ?? {}) as Record<string, unknown>;

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(body.user_id, {
      password: newPassword,
      app_metadata: {
        ...existingApp,
        force_password_change: forceChange,
        must_change_password: forceChange,
      },
      user_metadata: {
        ...existingMeta,
        force_password_change: forceChange,
        must_change_password: forceChange,
      },
    });

    if (authUpdateError) return fail(authUpdateError.message, 400, null, req);

    await admin
      .from("profiles")
      .update({ force_password_change: forceChange })
      .eq("id", body.user_id);

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      actionType: "OWNER_SET_USER_PASSWORD",
      details: {
        user_id: body.user_id,
        force_password_change: forceChange,
      },
    });

    return ok({ success: true }, 200, req);
  }

  if (body.action === "set_user_status") {
    if (!body.user_id || !body.status) return fail("user_id and status are required", 400, null, req);

    if (body.user_id === auth.user.id) {
      return fail("Não é permitido alterar o status do próprio usuário.", 400, null, req);
    }

    const { data: targetRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", body.user_id);
    const targetRoleNames = (targetRoles ?? []).map((r: any) => r.role);
    if (targetRoleNames.includes("SYSTEM_OWNER") || targetRoleNames.includes("SYSTEM_ADMIN")) {
      return fail("Não é permitido desativar usuários SYSTEM_OWNER ou SYSTEM_ADMIN via esta ação.", 400, null, req);
    }

    const enabled = body.status === "ativo";
    const { error } = await admin.auth.admin.updateUserById(body.user_id, {
      ban_duration: enabled ? "none" : "876000h",
    });

    if (error) return fail(error.message, 400, null, req);

    // Sincronizar status no profiles
    const newStatus = enabled ? "ativo" : "inativo";
    await admin
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", body.user_id);

    const { data: profileData } = await admin
      .from("profiles")
      .select("empresa_id")
      .eq("id", body.user_id)
      .maybeSingle();

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: profileData?.empresa_id ?? null,
      actionType: "OWNER_SET_USER_STATUS",
      details: {
        user_id: body.user_id,
        status: body.status,
      },
    });

    return ok({ success: true }, 200, req);
  }

  // ── delete_user (hard delete — owner_master only) ──
  if (body.action === "delete_user") {
    if (!body.user_id) return fail("user_id is required", 400, null, req);

    if (body.user_id === auth.user.id) {
      return fail("Não é permitido excluir o próprio usuário.", 400, null, req);
    }

    const { data: targetRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", body.user_id);
    const targetRoleNames = (targetRoles ?? []).map((r: any) => r.role);
    if (targetRoleNames.includes("SYSTEM_OWNER") || targetRoleNames.includes("SYSTEM_ADMIN")) {
      return fail("Não é permitido excluir usuários SYSTEM_OWNER ou SYSTEM_ADMIN.", 400, null, req);
    }

    // Verificar senha do actor para exclusao destrutiva
    const passwordOk = await verifyActorPassword({
      email: auth.user.email,
      password: body.auth_password ?? null,
      expectedUserId: auth.user.id,
    });
    if (!passwordOk) {
      return fail("Senha invalida para confirmar exclusao de usuario.", 401, null, req);
    }

    // Coletar dados do perfil ANTES de deletar (para audit log)
    const { data: profileData } = await admin
      .from("profiles")
      .select("empresa_id,nome,email")
      .eq("id", body.user_id)
      .maybeSingle();

    const cleanupErrors: string[] = [];

    // ── 1. DELETE de tabelas de identidade/roles ──
    try { await admin.from("user_roles").delete().eq("user_id", body.user_id); } catch (e: any) { cleanupErrors.push(`user_roles: ${e.message}`); }
    try { await admin.from("rbac_user_roles").delete().eq("user_id", body.user_id); } catch (e: any) { cleanupErrors.push(`rbac_user_roles: ${e.message}`); }
    try { await admin.from("permissoes_granulares").delete().eq("user_id", body.user_id); } catch (e: any) { cleanupErrors.push(`permissoes_granulares: ${e.message}`); }

    // ── 2. DELETE de tabelas de sessão/tokens ──
    try { await admin.from("auth_session_transfer_tokens").delete().eq("created_by", body.user_id); } catch (e: any) { cleanupErrors.push(`auth_session_transfer_tokens: ${e.message}`); }
    try { await admin.from("owner_impersonation_sessions").delete().eq("owner_user_id", body.user_id); } catch (e: any) { cleanupErrors.push(`owner_impersonation_sessions: ${e.message}`); }

    // ── 3. DELETE de membros_empresa ──
    try { await admin.from("membros_empresa").delete().eq("user_id", body.user_id); } catch (e: any) { cleanupErrors.push(`membros_empresa: ${e.message}`); }

    // ── 4. SET NULL em tabelas operacionais (preservar registros, anonimizar autoria) ──
    try { await admin.from("ordens_servico").update({ usuario_abertura: null }).eq("usuario_abertura", body.user_id); } catch (e: any) { cleanupErrors.push(`ordens_servico.usuario_abertura: ${e.message}`); }
    try { await admin.from("ordens_servico").update({ usuario_fechamento: null }).eq("usuario_fechamento", body.user_id); } catch (e: any) { cleanupErrors.push(`ordens_servico.usuario_fechamento: ${e.message}`); }
    try { await admin.from("movimentacoes_materiais").update({ usuario_id: null }).eq("usuario_id", body.user_id); } catch (e: any) { cleanupErrors.push(`movimentacoes_materiais: ${e.message}`); }
    try { await admin.from("inspecoes").update({ inspetor_id: null }).eq("inspetor_id", body.user_id); } catch (e: any) { cleanupErrors.push(`inspecoes: ${e.message}`); }
    try { await admin.from("execucoes_preventivas").update({ executor_id: null }).eq("executor_id", body.user_id); } catch (e: any) { cleanupErrors.push(`execucoes_preventivas: ${e.message}`); }
    try { await admin.from("execucoes_os_pausas").update({ created_by: null }).eq("created_by", body.user_id); } catch (e: any) { cleanupErrors.push(`execucoes_os_pausas: ${e.message}`); }

    // ── 5. SET NULL em tabelas de suporte/contratos ──
    try { await admin.from("support_tickets").update({ requester_user_id: null }).eq("requester_user_id", body.user_id); } catch (e: any) { cleanupErrors.push(`support_tickets.requester: ${e.message}`); }
    try { await admin.from("support_tickets").update({ user_id: null }).eq("user_id", body.user_id); } catch (e: any) { cleanupErrors.push(`support_tickets.user_id: ${e.message}`); }
    try { await admin.from("support_tickets").update({ owner_responder_id: null }).eq("owner_responder_id", body.user_id); } catch (e: any) { cleanupErrors.push(`support_tickets.owner_responder: ${e.message}`); }
    try { await admin.from("support_tickets").update({ assigned_to: null }).eq("assigned_to", body.user_id); } catch (e: any) { cleanupErrors.push(`support_tickets.assigned_to: ${e.message}`); }
    try { await admin.from("contracts").update({ signed_by: null }).eq("signed_by", body.user_id); } catch (e: any) { cleanupErrors.push(`contracts.signed_by: ${e.message}`); }
    try { await admin.from("contracts").update({ created_by: null }).eq("created_by", body.user_id); } catch (e: any) { cleanupErrors.push(`contracts.created_by: ${e.message}`); }
    try { await admin.from("contracts").update({ updated_by: null }).eq("updated_by", body.user_id); } catch (e: any) { cleanupErrors.push(`contracts.updated_by: ${e.message}`); }
    try { await admin.from("contract_versions").update({ created_by: null }).eq("created_by", body.user_id); } catch (e: any) { cleanupErrors.push(`contract_versions: ${e.message}`); }

    // ── 6. SET NULL em tabelas diversas ──
    try { await admin.from("feature_flags").update({ updated_by: null }).eq("updated_by", body.user_id); } catch (e: any) { cleanupErrors.push(`feature_flags: ${e.message}`); }
    try { await admin.from("dispositivos_moveis").update({ desativado_por: null }).eq("desativado_por", body.user_id); } catch (e: any) { cleanupErrors.push(`dispositivos_moveis: ${e.message}`); }
    try { await admin.from("qrcodes_vinculacao").update({ created_by: null }).eq("created_by", body.user_id); } catch (e: any) { cleanupErrors.push(`qrcodes_vinculacao: ${e.message}`); }
    try { await admin.from("auditoria").update({ usuario_id: null }).eq("usuario_id", body.user_id); } catch (e: any) { cleanupErrors.push(`auditoria: ${e.message}`); }

    // ── 7. Logs de auditoria — preservar para compliance (não anonimizar) ──
    // audit_logs, enterprise_audit_logs, security_logs, operational_logs, system_error_events
    // mantidos intocados por exigência de compliance/rastreabilidade

    // ── 8. Audit log da exclusão ANTES de deletar ──
    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: profileData?.empresa_id ?? null,
      actionType: "OWNER_DELETE_USER",
      details: {
        user_id: body.user_id,
        user_nome: profileData?.nome ?? null,
        user_email: profileData?.email ?? null,
        hard_delete: true,
        cleanup_errors: cleanupErrors.length > 0 ? cleanupErrors : undefined,
      },
    });

    // ── 9. Hard delete do profiles ──
    const { error: deleteProfileError } = await admin
      .from("profiles")
      .delete()
      .eq("id", body.user_id);
    if (deleteProfileError) cleanupErrors.push(`profiles: ${deleteProfileError.message}`);

    // ── 10. Hard delete do auth.users ──
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(body.user_id);
    if (deleteAuthError) return fail(`Falha ao excluir usuário do auth: ${deleteAuthError.message}. Limpeza parcial realizada.`, 400, null, req);

    return ok({ success: true, cleanup_warnings: cleanupErrors.length > 0 ? cleanupErrors : undefined }, 200, req);
  }

  if (body.action === "list_plans") {
    const { data, error } = await admin
      .from("planos")
      .select("*")
      .order("price_month", { ascending: true });
    if (error) return fail(error.message, 400, null, req);
    // Map planos columns to the frontend-expected shape (code/name)
    const plans = (data ?? []).map((p: Record<string, unknown>) => ({
      ...p,
      code: p.codigo ?? p.code,
      name: p.nome ?? p.name,
    }));
    return ok({ plans }, 200, req);
  }

  if (body.action === "create_plan") {
    if (!body.plan?.code || !body.plan?.name) return fail("plan code and name are required", 400, null, req);
    const { data, error } = await admin
      .from("planos")
      .insert({
        codigo: body.plan.code,
        nome: body.plan.name,
        descricao: body.plan.description ?? null,
        limite_usuarios: body.plan.user_limit ?? 10,
        features: body.plan.module_flags ?? {},
        limite_storage_mb: body.plan.data_limit_mb ?? 2048,
        price_month: body.plan.price_month ?? 0,
        ativo: body.plan.active ?? true,
        active: body.plan.active ?? true,
      })
      .select("*")
      .single();
    if (error) return fail(error.message, 400, null, req);
    await logPlatformAudit(admin, { actorId: auth.user.id, actorEmail: auth.user.email, actionType: "OWNER_CREATE_PLAN", details: { plan_id: data.id, code: data.codigo, name: data.nome } });
    return ok({ plan: { ...data, code: data.codigo, name: data.nome } }, 200, req);
  }

  if (body.action === "update_plan") {
    const planId = body.plan?.id?.trim();
    const planCode = body.plan?.code?.trim();
    if (!planId && !planCode) return fail("plan id or code is required", 400, null, req);

    const raw: Record<string, unknown> = {
      codigo: body.plan?.code,
      nome: body.plan?.name,
      descricao: body.plan?.description,
      limite_usuarios: body.plan?.user_limit,
      features: body.plan?.module_flags,
      limite_storage_mb: body.plan?.data_limit_mb,
      price_month: body.plan?.price_month,
      ativo: body.plan?.active,
      active: body.plan?.active,
    };
    const updatePayload = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined));
    if (Object.keys(updatePayload).length === 0) return fail("no fields to update", 400, null, req);

    let query = admin
      .from("planos")
      .update(updatePayload);

    query = planId ? query.eq("id", planId) : query.eq("codigo", planCode);

    const { error } = await query;
    if (error) return fail(error.message, 400, null, req);
    await logPlatformAudit(admin, { actorId: auth.user.id, actorEmail: auth.user.email, actionType: "OWNER_UPDATE_PLAN", details: { plan_id: planId, plan_code: planCode, fields: Object.keys(updatePayload) } });
    return ok({ success: true }, 200, req);
  }

  if (body.action === "list_subscriptions") {
    const requestLimit = Number(body.limit ?? 1000);
    const safeLimit = Number.isFinite(requestLimit)
      ? Math.max(1, Math.min(2000, Math.trunc(requestLimit)))
      : 1000;

    const { data, error } = await admin
      .from("subscriptions")
      .select("*, planos(id,codigo,nome,price_month,limite_usuarios,features), empresas(id,nome)")
      .order("updated_at", { ascending: false })
      .limit(safeLimit);
    if (error) return fail(error.message, 400, null, req);
    return ok({ subscriptions: data ?? [] }, 200, req);
  }

  if (body.action === "list_subscription_payments") {
    const requestLimit = Number(body.limit ?? 300);
    const safeLimit = Number.isFinite(requestLimit)
      ? Math.max(1, Math.min(2000, Math.trunc(requestLimit)))
      : 300;

    let query = admin
      .from("subscription_payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (body.subscription_id) query = query.eq("subscription_id", body.subscription_id);
    if (body.empresa_id) {
      const { data: subsByCompany } = await admin
        .from("subscriptions")
        .select("id")
        .eq("empresa_id", body.empresa_id)
        .limit(2000);

      const ids = (subsByCompany ?? []).map((item: any) => String(item.id));
      if (ids.length === 0) return ok({ payments: [] }, 200, req);
      query = query.in("subscription_id", ids);
    }

    const { data, error } = await query;
    if (error) return fail(error.message, 400, null, req);
    return ok({ payments: data ?? [] }, 200, req);
  }

  if (body.action === "update_subscription_billing") {
    if (!body.subscription_id && !body.empresa_id) {
      return fail("subscription_id or empresa_id is required", 400, null, req);
    }

    const billing = body.billing ?? {};
    const updatePayload: Record<string, unknown> = {};

    if (billing.amount !== undefined) updatePayload.amount = Number(billing.amount ?? 0);
    if (billing.period !== undefined) updatePayload.period = billing.period ?? "monthly";
    if (billing.payment_method !== undefined) updatePayload.payment_method = billing.payment_method ?? null;
    if (billing.payment_status !== undefined) updatePayload.payment_status = billing.payment_status ?? null;
    if (billing.status !== undefined) updatePayload.status = billing.status ?? "ativa";
    if (billing.renewal_at !== undefined) updatePayload.renewal_at = billing.renewal_at ?? null;
    if (billing.starts_at !== undefined) updatePayload.starts_at = billing.starts_at ?? null;
    if (billing.ends_at !== undefined) updatePayload.ends_at = billing.ends_at ?? null;

    if (Object.keys(updatePayload).length === 0) {
      return fail("billing payload is required", 400, null, req);
    }

    let targetQuery = admin
      .from("subscriptions")
      .update(updatePayload)
      .select("id,empresa_id")
      .limit(1);

    if (body.subscription_id) {
      targetQuery = targetQuery.eq("id", body.subscription_id);
    } else {
      targetQuery = targetQuery.eq("empresa_id", body.empresa_id);
    }

    const { data: updatedRows, error } = await targetQuery;
    if (error) return fail(error.message, 400, null, req);

    const updated = (updatedRows ?? [])[0];
    if (!updated?.id) return fail("Subscription not found", 404, null, req);

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: updated.empresa_id ?? body.empresa_id ?? null,
      actionType: "OWNER_UPDATE_SUBSCRIPTION_BILLING",
      details: {
        subscription_id: updated.id,
        fields: Object.keys(updatePayload),
      },
    });

    return ok({ success: true, subscription_id: updated.id }, 200, req);
  }

  if (body.action === "asaas_link_subscription") {
    if (!body.subscription_id && !body.empresa_id) {
      return fail("subscription_id or empresa_id is required", 400, null, req);
    }

    const updatePayload: Record<string, unknown> = {
      billing_provider: "asaas",
      asaas_last_event_at: new Date().toISOString(),
    };

    if (body.asaas_customer_id !== undefined) updatePayload.asaas_customer_id = body.asaas_customer_id || null;
    if (body.asaas_subscription_id !== undefined) updatePayload.asaas_subscription_id = body.asaas_subscription_id || null;

    let query = admin
      .from("subscriptions")
      .update(updatePayload)
      .select("id,empresa_id,asaas_subscription_id")
      .limit(1);

    if (body.subscription_id) query = query.eq("id", body.subscription_id);
    else query = query.eq("empresa_id", body.empresa_id);

    const { data, error } = await query;
    if (error) return fail(error.message, 400, null, req);

    const linked = (data ?? [])[0];
    if (!linked?.id) return fail("Subscription not found", 404, null, req);

    let sync: Record<string, unknown> | null = null;
    if ((await isAsaasConfiguredAsync(admin)) && linked.asaas_subscription_id) {
      try {
        sync = await syncAsaasSubscriptionSnapshot(admin, linked);
      } catch (syncError: any) {
        await logPlatformAudit(admin, {
          actorId: auth.user.id,
          actorEmail: auth.user.email,
          empresaId: linked.empresa_id,
          actionType: "OWNER_ASAAS_SYNC_FAILED",
          details: {
            subscription_id: linked.id,
            reason: String(syncError?.message ?? syncError ?? "unknown_error"),
          },
        });
      }
    }

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: linked.empresa_id,
      actionType: "OWNER_ASAAS_LINK_SUBSCRIPTION",
      details: {
        subscription_id: linked.id,
        asaas_customer_id: body.asaas_customer_id ?? null,
        asaas_subscription_id: body.asaas_subscription_id ?? null,
      },
    });

    return ok({ success: true, subscription_id: linked.id, sync }, 200, req);
  }

  if (body.action === "asaas_sync_subscription") {
    if (!(await isAsaasConfiguredAsync(admin))) {
      return fail("ASAAS_API_KEY nao configurada.", 400, null, req);
    }

    let query = admin
      .from("subscriptions")
      .select("id,empresa_id,amount,payment_method,period,starts_at,renewal_at,asaas_customer_id,asaas_subscription_id")
      .limit(1);

    if (body.subscription_id) query = query.eq("id", body.subscription_id);
    else if (body.empresa_id) query = query.eq("empresa_id", body.empresa_id);
    else return fail("subscription_id or empresa_id is required", 400, null, req);

    const { data, error } = await query;
    if (error) return fail(error.message, 400, null, req);

    const subscription = (data ?? [])[0];
    if (!subscription?.id) return fail("Subscription not found", 404, null, req);

    let sync: Record<string, unknown>;

    if (subscription.asaas_subscription_id) {
      sync = await syncAsaasSubscriptionSnapshot(admin, subscription);
    } else {
      sync = await createOrSyncAsaasSubscription(admin, subscription);
    }

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: subscription.empresa_id,
      actionType: "OWNER_ASAAS_SYNC_SUBSCRIPTION",
      details: {
        subscription_id: subscription.id,
        sync,
      },
    });

    return ok({ success: true, subscription_id: subscription.id, sync }, 200, req);
  }

  if (body.action === "create_subscription") {
    if (!body.subscription?.empresa_id || !body.subscription?.plan_id) {
      return fail("subscription payload is required", 400, null, req);
    }

    // Resolve plan_id: frontend sends plans.id (EN table).
    // DB FK references planos.id (PT-BR table). Map through code, auto-create if missing.
    let resolvedPlanId = body.subscription.plan_id;
    const { data: planEnLookup } = await admin
      .from("plans")
      .select("id,code,name,description,user_limit,data_limit_mb,price_month,module_flags,active")
      .eq("id", body.subscription.plan_id)
      .maybeSingle();
    if (planEnLookup?.code) {
      const { data: planoPtBrLookup } = await admin
        .from("planos")
        .select("id")
        .eq("codigo", planEnLookup.code)
        .maybeSingle();
      if (planoPtBrLookup?.id) {
        resolvedPlanId = planoPtBrLookup.id;
      } else {
        // Auto-create planos record from plans data
        const { data: newPlano } = await admin
          .from("planos")
          .insert({
            codigo: planEnLookup.code,
            nome: planEnLookup.name ?? planEnLookup.code,
            descricao: planEnLookup.description ?? null,
            user_limit: planEnLookup.user_limit ?? 10,
            limite_usuarios: planEnLookup.user_limit ?? 10,
            storage_limit_mb: planEnLookup.data_limit_mb ?? 2048,
            limite_storage_mb: planEnLookup.data_limit_mb ?? 2048,
            price_month: planEnLookup.price_month ?? 0,
            features: planEnLookup.module_flags ?? {},
            ativo: planEnLookup.active ?? true,
            active: planEnLookup.active ?? true,
          })
          .select("id")
          .single();
        if (newPlano?.id) resolvedPlanId = newPlano.id;
      }
    }

    const startsAt = body.subscription.starts_at ?? new Date().toISOString().slice(0, 10);

    const { data, error } = await admin
      .from("subscriptions")
      .upsert({
        empresa_id: body.subscription.empresa_id,
        plan_id: resolvedPlanId,
        amount: body.subscription.amount ?? 0,
        payment_method: body.subscription.payment_method ?? null,
        period: body.subscription.period ?? "monthly",
        starts_at: startsAt,
        ends_at: body.subscription.ends_at ?? null,
        renewal_at: body.subscription.renewal_at ?? body.subscription.ends_at ?? null,
        status: body.subscription.status ?? "teste",
        payment_status: body.subscription.payment_status ?? null,
      }, { onConflict: "empresa_id" })
      .select("*")
      .single();

    if (error) return fail(error.message, 400, null, req);

    const contract = await createContractFromSubscription(admin, auth.user.id, data);

    let asaas: Record<string, unknown> | null = null;
    let asaasWarning: string | null = null;

    const asaasReady = await isAsaasConfiguredAsync(admin);
    if (asaasReady && isStrictOwnerMaster) {
      try {
        asaas = await createOrSyncAsaasSubscription(admin, data);
      } catch (asaasError: any) {
        asaasWarning = String(asaasError?.message ?? asaasError ?? "Falha ao sincronizar com Asaas");

        await logPlatformAudit(admin, {
          actorId: auth.user.id,
          actorEmail: auth.user.email,
          empresaId: data.empresa_id,
          actionType: "OWNER_ASAAS_CREATE_SUBSCRIPTION_FAILED",
          details: {
            subscription_id: data.id,
            reason: asaasWarning,
          },
        });
      }
    } else if (asaasReady && !isStrictOwnerMaster) {
      asaasWarning = "Integracao Asaas restrita ao OWNER_MASTER configurado.";
    }

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: data.empresa_id,
      actionType: "OWNER_CREATE_SUBSCRIPTION",
      details: { subscription_id: data.id, contract_id: contract.id },
    });

    return ok({ subscription: data, contract, asaas, asaas_warning: asaasWarning }, 200, req);
  }

  if (body.action === "set_subscription_status") {
    if (!body.empresa_id || !body.status) return fail("empresa_id and status are required", 400, null, req);
    // State machine: validate allowed transitions
    const validStatuses = ["ativa", "atrasada", "cancelada", "teste", "active", "trial", "past_due", "suspended"];
    if (!validStatuses.includes(String(body.status))) {
      return fail(`Invalid status '${body.status}'. Allowed: ${validStatuses.join(", ")}`, 400, null, req);
    }
    const { error } = await admin
      .from("subscriptions")
      .update({ status: body.status })
      .eq("empresa_id", body.empresa_id);
    if (error) return fail(error.message, 400, null, req);

    // Auto-block empresa when subscription is cancelled/suspended/atrasada
    const blockingStatuses = ["cancelada", "suspended", "atrasada", "past_due"];
    const activatingStatuses = ["ativa", "active"];
    if (blockingStatuses.includes(String(body.status))) {
      await admin.from("empresas").update({ status: "blocked" }).eq("id", body.empresa_id);
    } else if (activatingStatuses.includes(String(body.status))) {
      await admin.from("empresas").update({ status: "active" }).eq("id", body.empresa_id);
    }

    await logPlatformAudit(admin, { actorId: auth.user.id, actorEmail: auth.user.email, empresaId: body.empresa_id, actionType: "OWNER_SET_SUBSCRIPTION_STATUS", details: { status: body.status, empresa_blocked: blockingStatuses.includes(String(body.status)) } });
    return ok({ success: true, empresa_status: blockingStatuses.includes(String(body.status)) ? "blocked" : (activatingStatuses.includes(String(body.status)) ? "active" : "unchanged") }, 200, req);
  }

  if (body.action === "reactivate_company") {
    if (!body.empresa_id) return fail("empresa_id is required", 400, null, req);
    // 1. Reactivate subscription
    const { error: subErr } = await admin
      .from("subscriptions")
      .update({ status: "ativa", payment_status: "paid" })
      .eq("empresa_id", body.empresa_id);
    if (subErr) return fail(subErr.message, 400, null, req);
    // 2. Unblock empresa
    const { error: empErr } = await admin
      .from("empresas")
      .update({ status: "active" })
      .eq("id", body.empresa_id);
    if (empErr) return fail(empErr.message, 400, null, req);
    await logPlatformAudit(admin, { actorId: auth.user.id, actorEmail: auth.user.email, empresaId: body.empresa_id, actionType: "OWNER_REACTIVATE_COMPANY", details: {} });
    return ok({ success: true, message: "Company reactivated: subscription=ativa, empresa=active" }, 200, req);
  }

  if (body.action === "enforce_subscription_expiry") {
    const today = new Date().toISOString().slice(0, 10);

    const { data: expiredSubscriptions, error: expiredError } = await admin
      .from("subscriptions")
      .select("id,empresa_id,status,renewal_at,ends_at")
      .in("status", ["ativa", "teste"])
      .or(`renewal_at.lt.${today},ends_at.lt.${today}`)
      .limit(2000);

    if (expiredError) return fail(expiredError.message, 400, null, req);

    const affected = expiredSubscriptions ?? [];
    if (affected.length === 0) return ok({ success: true, affected_subscriptions: 0, blocked_companies: 0 }, 200, req);

    const subscriptionIds = affected.map((item: any) => item.id).filter(Boolean);
    const companyIds = Array.from(new Set(affected.map((item: any) => item.empresa_id).filter(Boolean)));

    await admin
      .from("subscriptions")
      .update({ status: "atrasada", payment_status: "late" })
      .in("id", subscriptionIds);

    await admin
      .from("empresas")
      .update({ status: "blocked" })
      .in("id", companyIds);

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      actionType: "OWNER_ENFORCE_SUBSCRIPTION_EXPIRY",
      details: {
        affected_subscriptions: subscriptionIds.length,
        blocked_companies: companyIds.length,
        at: today,
      },
    });

    return ok({
      success: true,
      affected_subscriptions: subscriptionIds.length,
      blocked_companies: companyIds.length,
    }, 200, req);
  }

  if (body.action === "list_contracts") {
    const { data, error } = await admin
      .from("contracts")
      .select("*, empresas(id,nome), planos(id,nome,codigo), subscriptions(id,status)")
      .order("generated_at", { ascending: false })
      .limit(1000);
    // Tabela pode não existir se a migration ainda não foi aplicada — retorna lista vazia
    // em vez de 400 para não quebrar a UI do painel.
    if (error) {
      const errMsg = String(error.message ?? "").toLowerCase();
      const tableNotFound = errMsg.includes("does not exist") || errMsg.includes("42p01") || errMsg.includes("relation");
      if (tableNotFound) {
        console.warn("[owner-portal-admin] contracts table not found – migration pending:", error.message);
        return ok({ contracts: [], _warning: "contracts_table_missing" }, 200, req);
      }
      return fail(error.message, 400, null, req);
    }
    return ok({ contracts: data ?? [] }, 200, req);
  }

  if (body.action === "update_contract") {
    if (!body.contract_id || !body.content) return fail("contract_id and content are required", 400, null, req);
    const { data: current } = await admin
      .from("contracts")
      .select("id,version")
      .eq("id", body.contract_id)
      .single();
    const nextVersion = Number(current?.version ?? 1) + 1;

    const { error } = await admin
      .from("contracts")
      .update({
        content: body.content,
        version: nextVersion,
        updated_by: auth.user.id,
        status: body.status ?? undefined,
      })
      .eq("id", body.contract_id);

    if (error) return fail(error.message, 400, null, req);

    await admin.from("contract_versions").insert({
      contract_id: body.contract_id,
      version: nextVersion,
      content: body.content,
      change_summary: body.summary ?? "Edição manual via owner",
      created_by: auth.user.id,
    });

    await logPlatformAudit(admin, { actorId: auth.user.id, actorEmail: auth.user.email, actionType: "OWNER_UPDATE_CONTRACT", details: { contract_id: body.contract_id, version: nextVersion } });
    return ok({ success: true }, 200, req);
  }

  if (body.action === "regenerate_contract") {
    if (!body.contract_id) return fail("contract_id is required", 400, null, req);

    const { data: contract, error: contractError } = await admin
      .from("contracts")
      .select("id,subscription_id")
      .eq("id", body.contract_id)
      .single();
    if (contractError || !contract?.subscription_id) return fail("contract subscription not found", 404, null, req);

    const { data: subscription } = await admin
      .from("subscriptions")
      .select("*")
      .eq("id", contract.subscription_id)
      .single();
    if (!subscription) return fail("subscription not found", 404, null, req);

    const regenerated = await createContractFromSubscription(admin, auth.user.id, subscription);
    await logPlatformAudit(admin, { actorId: auth.user.id, actorEmail: auth.user.email, actionType: "OWNER_REGENERATE_CONTRACT", details: { contract_id: body.contract_id, new_contract_id: regenerated.id } });
    return ok({ contract: regenerated }, 200, req);
  }

  if (body.action === "delete_contract") {
    if (!body.contract_id) return fail("contract_id is required", 400, null, req);
    const { error } = await admin.from("contracts").delete().eq("id", body.contract_id);
    if (error) return fail(error.message, 400, null, req);
    await logPlatformAudit(admin, { actorId: auth.user.id, actorEmail: auth.user.email, actionType: "OWNER_DELETE_CONTRACT", details: { contract_id: body.contract_id } });
    return ok({ success: true }, 200, req);
  }

  if (body.action === "list_support_tickets") {
    const { data, error } = await admin
      .from("support_tickets")
      .select("id,empresa_id,user_id,subject,message,status,priority,owner_response,messages,unread_owner_messages,unread_client_messages,notification_email_pending,notification_whatsapp_pending,last_message_sender,last_message_at,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(1000);
    if (error) return fail(error.message, 400, null, req);

    const tickets = data ?? [];
    if (tickets.length === 0) return ok({ tickets: [] }, 200, req);

    const empresaIds = Array.from(new Set(
      tickets
        .map((item: any) => item.empresa_id)
        .filter(Boolean),
    ));
    const userIds = Array.from(new Set(
      tickets
        .map((item: any) => item.user_id)
        .filter(Boolean),
    ));

    const [empresasResult, profilesResult] = await Promise.all([
      empresaIds.length > 0
        ? admin
          .from("empresas")
          .select("id,nome")
          .in("id", empresaIds)
        : Promise.resolve({ data: [], error: null } as any),
      userIds.length > 0
        ? admin
          .from("profiles")
          .select("id,nome,email")
          .in("id", userIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (empresasResult.error) return fail(empresasResult.error.message, 400, null, req);
    if (profilesResult.error) return fail(profilesResult.error.message, 400, null, req);

    const empresaById = new Map<string, any>();
    for (const empresa of (empresasResult.data ?? [])) {
      empresaById.set(empresa.id, empresa);
    }

    const profileById = new Map<string, any>();
    for (const profile of (profilesResult.data ?? [])) {
      profileById.set(profile.id, profile);
    }

    const merged = tickets.map((ticket: any) => ({
      ...ticket,
      empresas: ticket.empresa_id ? (empresaById.get(ticket.empresa_id) ?? null) : null,
      profiles: ticket.user_id ? (profileById.get(ticket.user_id) ?? null) : null,
    }));

    return ok({ tickets: merged }, 200, req);
  }

  if (body.action === "respond_support_ticket") {
    if (!body.ticket_id || !body.response) return fail("ticket_id and response are required", 400, null, req);

    const now = new Date().toISOString();
    const attachments = Array.isArray(body.attachments) ? body.attachments.filter((u: unknown) => typeof u === "string" && u.trim()) : [];
    const newMessage: Record<string, unknown> = {
      id: crypto.randomUUID(),
      sender: "owner",
      message: body.response,
      attachments,
      channel: "in_app",
      created_at: now,
      sender_user_id: auth.user.id,
    };

    // Fetch current ticket to append message and increment unread counter
    const { data: current, error: fetchErr } = await admin
      .from("support_tickets")
      .select("messages,unread_client_messages,message,created_at,user_id")
      .eq("id", body.ticket_id)
      .single();
    if (fetchErr) return fail(fetchErr.message, 400, null, req);

    const existingMessages = Array.isArray(current?.messages) ? [...current.messages] : [];
    // If messages array is empty, reconstruct from legacy client message
    if (existingMessages.length === 0) {
      const originalMsg = String(current?.message ?? "").trim();
      if (originalMsg) {
        existingMessages.push({
          id: crypto.randomUUID(),
          sender: "client",
          message: originalMsg,
          attachments: [],
          channel: "in_app",
          created_at: current?.created_at ?? now,
          sender_user_id: current?.user_id ?? null,
        });
      }
    }
    existingMessages.push(newMessage);

    const currentUnread = Number(current?.unread_client_messages ?? 0);

    const { error } = await admin
      .from("support_tickets")
      .update({
        owner_response: body.response,
        owner_responder_id: auth.user.id,
        responded_at: now,
        status: body.status && ["aberto","em_analise","resolvido"].includes(body.status) ? body.status : "resolvido",
        messages: existingMessages,
        unread_client_messages: currentUnread + 1,
        last_message_sender: "owner",
        last_message_at: now,
      })
      .eq("id", body.ticket_id);
    if (error) return fail(error.message, 400, null, req);
    await logPlatformAudit(admin, { actorId: auth.user.id, actorEmail: auth.user.email, actionType: "OWNER_RESPOND_SUPPORT_TICKET", details: { ticket_id: body.ticket_id } });
    return ok({ success: true }, 200, req);
  }

  if (body.action === "mark_ticket_read_owner") {
    if (!body.ticket_id) return fail("ticket_id is required", 400, null, req);
    const { error } = await admin
      .from("support_tickets")
      .update({ unread_owner_messages: 0 })
      .eq("id", body.ticket_id)
      .gt("unread_owner_messages", 0);
    if (error) return fail(error.message, 400, null, req);
    return ok({ success: true }, 200, req);
  }

  if (body.action === "delete_support_ticket") {
    if (!body.ticket_id) return fail("ticket_id is required", 400, null, req);
    const { error } = await admin
      .from("support_tickets")
      .delete()
      .eq("id", body.ticket_id);
    if (error) return fail(error.message, 400, null, req);
    await logOwnerMasterHiddenAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: null,
      actionType: "DELETE_SUPPORT_TICKET",
      details: { ticket_id: body.ticket_id, at: new Date().toISOString() },
    }).catch(() => null);
    return ok({ success: true }, 200, req);
  }

  if (body.action === "list_audit_logs") {
    const filters = body.filters ?? {};
    let query = admin
      .from("enterprise_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (filters.empresa_id) query = query.eq("empresa_id", filters.empresa_id);
    if (filters.user_id) query = query.eq("usuario_id", filters.user_id);
    if (filters.from) query = query.gte("created_at", filters.from);
    if (filters.to) query = query.lte("created_at", filters.to);

    const { data, error } = await query;
    if (error) return fail(error.message, 400, null, req);
    return ok({ logs: data ?? [] }, 200, req);
  }

  if (body.action === "get_company_settings") {
    if (!body.empresa_id) return fail("empresa_id is required", 400, null, req);
    const { data, error } = await admin
      .from("configuracoes_sistema")
      .select("chave,valor")
      .eq("empresa_id", body.empresa_id)
      .in("chave", ["owner.features", "owner.limits", "owner.modules", "owner.security_policy"]);
    if (error) return fail(error.message, 400, null, req);
    return ok({ settings: data ?? [] }, 200, req);
  }

  if (body.action === "update_company_settings") {
    if (!body.empresa_id || !body.settings) return fail("empresa_id and settings are required", 400, null, req);
    const rows = [
      { empresa_id: body.empresa_id, chave: "owner.modules", valor: body.settings.modules ?? {} },
      { empresa_id: body.empresa_id, chave: "owner.limits", valor: body.settings.limits ?? {} },
      { empresa_id: body.empresa_id, chave: "owner.features", valor: body.settings.features ?? {} },
    ];

    const { error } = await admin.from("configuracoes_sistema").upsert(rows, { onConflict: "empresa_id,chave" });
    if (error) return fail(error.message, 400, null, req);
    return ok({ success: true }, 200, req);
  }

  // ── Platform contact config (global) ─────────────────────────────────────
  if (body.action === "get_platform_contact") {
    const { data, error } = await admin
      .from("configuracoes_sistema")
      .select("chave,valor")
      .is("empresa_id", null)
      .in("chave", [
        "platform.contact_email",
        "platform.contact_whatsapp",
        "platform.contact_name",
        "platform.expiry_custom_message",
        "platform.grace_period_days",
        "platform.alert_days_before",
      ]);
    if (error) return fail(error.message, 400, null, req);
    const config: Record<string, unknown> = {};
    for (const row of (data ?? [])) {
      const key = String((row as any).chave ?? "").replace("platform.", "");
      let val: unknown = (row as any).valor;
      if (typeof val === "string") {
        try { val = JSON.parse(val); } catch { /* keep as string */ }
      }
      config[key] = val;
    }
    return ok({ config }, 200, req);
  }

  if (body.action === "update_platform_contact") {
    const config = body.config ?? body.payload ?? {};
    if (!config || typeof config !== "object" || Object.keys(config).length === 0) return fail("config object is required", 400, null, req);

    const allowedKeys = [
      "contact_email",
      "contact_whatsapp",
      "contact_name",
      "expiry_custom_message",
      "grace_period_days",
      "alert_days_before",
    ];

    const rows: { empresa_id: null; chave: string; valor: unknown }[] = [];
    for (const [key, value] of Object.entries(config as Record<string, unknown>)) {
      if (!allowedKeys.includes(key)) continue;
      rows.push({
        empresa_id: null,
        chave: `platform.${key}`,
        valor: JSON.stringify(value),
      });
    }

    if (rows.length === 0) return fail("No valid config keys provided", 400, null, req);

    for (const row of rows) {
      const { error } = await admin
        .from("configuracoes_sistema")
        .upsert(row, { onConflict: "empresa_id,chave", ignoreDuplicates: false });
      if (error) {
        // Try insert if upsert fails (NULL empresa_id edge case)
        const { error: insertErr } = await admin
          .from("configuracoes_sistema")
          .update({ valor: row.valor })
          .is("empresa_id", null)
          .eq("chave", row.chave);
        if (insertErr) return fail(`Failed to save ${row.chave}: ${insertErr.message}`, 400, null, req);
      }
    }

    await logPlatformAudit(admin, { actorId: auth.user.id, actorEmail: auth.user.email, actionType: "OWNER_UPDATE_PLATFORM_CONTACT", details: { keys: rows.map((r) => r.chave) } });
    return ok({ success: true }, 200, req);
  }

  // ── ASAAS API Key management (stored in configuracoes_sistema) ───────────
  if (body.action === "get_asaas_config") {
    const key = await resolveAsaasApiKey(admin);
    const masked = key ? `${key.slice(0, 12)}...${"*".repeat(8)}` : "";
    return ok({
      configured: Boolean(key),
      masked_key: masked,
      base_url: ASAAS_API_BASE_URL,
      environment: ASAAS_API_BASE_URL.includes("sandbox") ? "sandbox" : "production",
    }, 200, req);
  }

  if (body.action === "set_asaas_api_key") {
    if (!isOwnerMaster) return fail("Apenas OWNER_MASTER pode configurar a chave ASAAS.", 403, null, req);

    const apiKey = String(body.asaas_api_key ?? body.api_key ?? "").trim();
    if (!apiKey) return fail("asaas_api_key is required", 400, null, req);

    // Validate key format (basic check)
    if (apiKey.length < 20) return fail("Chave API parece invalida (muito curta).", 400, null, req);

    // Test the key against ASAAS API before saving
    try {
      const testResponse = await fetch(`${ASAAS_API_BASE_URL}/finance/getCurrentBalance`, {
        headers: { access_token: apiKey, "Content-Type": "application/json" },
      });
      if (!testResponse.ok && testResponse.status === 401) {
        return fail("Chave API rejeitada pelo ASAAS (401 Unauthorized). Verifique se a chave esta correta.", 400, null, req);
      }
    } catch {
      // Network error — save anyway, user can re-test
    }

    // Save to configuracoes_sistema
    const { error } = await admin
      .from("configuracoes_sistema")
      .upsert(
        { empresa_id: null, chave: "platform.asaas_api_key", valor: JSON.stringify(apiKey) },
        { onConflict: "empresa_id,chave", ignoreDuplicates: false },
      );

    if (error) {
      // Fallback: try update
      const { error: updErr } = await admin
        .from("configuracoes_sistema")
        .update({ valor: JSON.stringify(apiKey) })
        .is("empresa_id", null)
        .eq("chave", "platform.asaas_api_key");
      if (updErr) return fail(`Falha ao salvar chave: ${updErr.message}`, 400, null, req);
    }

    // Refresh in-memory cache
    _asaasApiKeyFromDb = apiKey;
    _asaasDbKeyChecked = true;

    await logAuditEvent(admin, {
      empresaId: null,
      userId: auth.user.id,
      actionType: "OWNER_SET_ASAAS_API_KEY",
      severity: "warn",
      source: "owner-portal-admin",
      details: { masked_key: `${apiKey.slice(0, 12)}...`, environment: ASAAS_API_BASE_URL.includes("sandbox") ? "sandbox" : "production" },
    });

    return ok({
      success: true,
      configured: true,
      environment: ASAAS_API_BASE_URL.includes("sandbox") ? "sandbox" : "production",
    }, 200, req);
  }

  if (body.action === "set_user_inactivity_timeout") {
    if (!body.user_id) return fail("user_id is required", 400, null, req);

    const parsedMinutes = Number(body.inactivity_timeout_minutes ?? 0);
    if (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
      return fail("inactivity_timeout_minutes must be a positive number", 400, null, req);
    }

    const inactivityTimeoutMinutes = Math.max(1, Math.min(1440, Math.trunc(parsedMinutes)));

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id,email,nome,empresa_id")
      .eq("id", body.user_id)
      .maybeSingle();

    if (profileError) return fail(profileError.message, 400, null, req);
    if (!profile?.id) return fail("Usuario nao encontrado para configuracao de timeout", 404, null, req);

    let empresaId = String(profile.empresa_id ?? "").trim() || null;

    if (!empresaId) {
      const { data: roleRows, error: roleRowsError } = await admin
        .from("user_roles")
        .select("empresa_id")
        .eq("user_id", profile.id)
        .not("empresa_id", "is", null)
        .limit(1);

      if (roleRowsError) return fail(roleRowsError.message, 400, null, req);

      const roleEmpresaId = Array.isArray(roleRows) && roleRows.length > 0
        ? String(roleRows[0]?.empresa_id ?? "").trim()
        : "";
      empresaId = roleEmpresaId || null;
    }

    if (!empresaId) {
      return fail("Nao foi possivel resolver a empresa do usuario selecionado", 400, null, req);
    }

    const { data: existingPolicyRow, error: existingPolicyError } = await admin
      .from("configuracoes_sistema")
      .select("valor")
      .eq("empresa_id", empresaId)
      .eq("chave", "owner.security_policy")
      .maybeSingle();

    if (existingPolicyError) return fail(existingPolicyError.message, 400, null, req);

    const previousPolicy =
      existingPolicyRow?.valor && typeof existingPolicyRow.valor === "object" && !Array.isArray(existingPolicyRow.valor)
        ? existingPolicyRow.valor as Record<string, unknown>
        : {};

    const nextPolicy = {
      ...previousPolicy,
      inactivity_timeout_minutes: inactivityTimeoutMinutes,
      updated_by_owner_user_id: auth.user.id,
      updated_by_target_user_id: profile.id,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertPolicyError } = await admin
      .from("configuracoes_sistema")
      .upsert({
        empresa_id: empresaId,
        chave: "owner.security_policy",
        valor: nextPolicy,
      }, { onConflict: "empresa_id,chave" });

    if (upsertPolicyError) return fail(upsertPolicyError.message, 400, null, req);

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId,
      actionType: "OWNER_SET_INACTIVITY_TIMEOUT",
      details: {
        user_id: profile.id,
        user_email: profile.email ?? null,
        inactivity_timeout_minutes: inactivityTimeoutMinutes,
      },
    });

    return ok({
      success: true,
      empresa_id: empresaId,
      user_id: profile.id,
      inactivity_timeout_minutes: inactivityTimeoutMinutes,
    }, 200, req);
  }

  if (body.action === "change_plan") {
    if (!body.empresa_id || !body.plano_codigo) return fail("empresa_id and plano_codigo are required", 400, null, req);

    // Lookup in planos (primary source — subscriptions FK)
    let plano: Record<string, unknown> | null = null;
    const { data: planoPtBr } = await admin
      .from("planos")
      .select("id,codigo,price_month")
      .eq("codigo", body.plano_codigo)
      .maybeSingle();
    if (planoPtBr) {
      plano = planoPtBr;
    } else {
      // Fallback: try plans table (legacy EN)
      const { data: planEn } = await admin
        .from("plans")
        .select("id,code,price_month")
        .eq("code", body.plano_codigo)
        .maybeSingle();
      if (planEn) plano = { ...planEn, codigo: planEn.code };
    }

    if (!plano) return fail("Plan not found", 404, null, req);

    // Resolve plan_id: FK references planos.id (PT-BR). Map through code, auto-create if missing.
    let resolvedChangePlanId = String(plano.id);
    // If it came from plans table, find or create in planos
    if (!planoPtBr) {
      const { data: mappedPlano } = await admin
        .from("planos")
        .select("id")
        .eq("codigo", String(plano.codigo ?? ""))
        .maybeSingle();
      if (mappedPlano?.id) {
        resolvedChangePlanId = mappedPlano.id;
      } else {
        const { data: planEnFull } = await admin
          .from("plans")
          .select("name,description,user_limit,data_limit_mb,price_month,module_flags,active")
          .eq("id", String(plano.id))
          .maybeSingle();
      const { data: newPlano } = await admin
        .from("planos")
        .insert({
          codigo: String(plano.codigo ?? ""),
          nome: planEnFull?.name ?? String(plano.codigo ?? ""),
          descricao: planEnFull?.description ?? null,
          user_limit: planEnFull?.user_limit ?? 10,
          limite_usuarios: planEnFull?.user_limit ?? 10,
          storage_limit_mb: planEnFull?.data_limit_mb ?? 2048,
          limite_storage_mb: planEnFull?.data_limit_mb ?? 2048,
          price_month: Number(plano.price_month ?? 0),
          features: planEnFull?.module_flags ?? {},
          ativo: planEnFull?.active ?? true,
          active: planEnFull?.active ?? true,
        })
        .select("id")
        .single();
      if (newPlano?.id) resolvedChangePlanId = newPlano.id;
      }
    }

    const { data: subscription, error: subscriptionError } = await admin
      .from("subscriptions")
      .upsert({
        empresa_id: body.empresa_id,
        plan_id: resolvedChangePlanId,
        amount: plano.price_month ?? 0,
        period: "monthly",
        starts_at: new Date().toISOString().slice(0, 10),
        status: "ativa",
      }, { onConflict: "empresa_id" })
      .select("*")
      .single();

    if (subscriptionError) return fail(subscriptionError.message, 400, null, req);
    const contract = await createContractFromSubscription(admin, auth.user.id, subscription);
    await logPlatformAudit(admin, { actorId: auth.user.id, actorEmail: auth.user.email, empresaId: body.empresa_id, actionType: "OWNER_CHANGE_PLAN", details: { plano_codigo: body.plano_codigo, plan_id: plano.id, subscription_id: subscription.id } });
    return ok({ success: true, contract_id: contract.id }, 200, req);
  }

  if (body.action === "impersonate_company") {
    if (!body.empresa_id) return fail("empresa_id is required", 400, null, req);

    const { data: company, error: companyError } = await admin
      .from("empresas")
      .select("id,nome")
      .eq("id", body.empresa_id)
      .maybeSingle();

    if (companyError) return fail(companyError.message, 400, null, req);
    if (!company?.id) return fail("Empresa não encontrada", 404, null, req);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (60 * 60 * 1000));
    const operationId = crypto.randomUUID();
    const sessionToken = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().slice(0, 12)}`;
    const sessionTokenHash = await hashToken(sessionToken);

    const { data: createdSession, error: sessionError } = await admin
      .from("owner_impersonation_sessions")
      .insert({
        owner_user_id: auth.user.id,
        empresa_id: company.id,
        session_token: sessionTokenHash,
        expires_at: expiresAt.toISOString(),
        active: true,
      })
      .select("id")
      .single();

    const impersonationSessionId = createdSession?.id ?? null;
    const impersonationSessionToken = sessionError ? null : sessionToken;

    if (sessionError) {
      await writeOperationalLog(admin, {
        scope: "owner-portal-admin",
        action: "owner_impersonation_session_persist_failed",
        errorMessage: sessionError.message,
        userId: auth.user.id,
        empresaId: company.id,
        metadata: { operation_id: operationId },
      });
    }

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: company.id,
      actionType: "OWNER_IMPERSONATION_START",
      details: {
        company_id: company.id,
        company_name: company.nome ?? null,
        company_status: null,
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        operation_id: operationId,
      },
    });

    return okWithOperation(req, {
      success: true,
      impersonation: {
        id: impersonationSessionId,
        empresa_id: company.id,
        empresa_nome: company.nome ?? null,
        company_status: null,
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        session_token: impersonationSessionToken,
      },
    }, operationId);
  }

  if (body.action === "stop_impersonation") {
    let stopQuery = admin
      .from("owner_impersonation_sessions")
      .update({ active: false })
      .eq("owner_user_id", auth.user.id)
      .eq("active", true);

    if (body.empresa_id) {
      stopQuery = stopQuery.eq("empresa_id", body.empresa_id);
    }

    await stopQuery;

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: body.empresa_id ?? null,
      actionType: "OWNER_IMPERSONATION_STOP",
      details: {
        company_id: body.empresa_id ?? null,
        company_name: body.empresa_nome ?? null,
        reason: body.reason ?? "manual",
        stopped_at: new Date().toISOString(),
      },
    });

    return ok({ success: true }, 200, req);
  }

  if (body.action === "validate_impersonation") {
    if (!body.impersonation_session_id || !body.impersonation_session_token || !body.empresa_id) {
      return fail("impersonation_session_id, impersonation_session_token and empresa_id are required", 400, null, req);
    }

    const nowIso = new Date().toISOString();

    const incomingTokenHash = await hashToken(body.impersonation_session_token);

    const { data: sessionRow, error: sessionError } = await admin
      .from("owner_impersonation_sessions")
      .select("id")
      .eq("id", body.impersonation_session_id)
      .eq("session_token", incomingTokenHash)
      .eq("owner_user_id", auth.user.id)
      .eq("empresa_id", body.empresa_id)
      .eq("active", true)
      .gt("expires_at", nowIso)
      .maybeSingle();

    if (sessionError) {
      const message = String(sessionError.message ?? "").toLowerCase();
      if (message.includes("does not exist") || message.includes("schema cache")) {
        // Backward compatibility: when migration is not yet applied, do not block runtime.
        return ok({ success: true, valid: true, degraded_mode: true }, 200, req);
      }
      return fail(sessionError.message, 400, null, req);
    }
    if (!sessionRow?.id) {
      return fail("Sessão de impersonação inválida ou expirada", 403, null, req);
    }

    return ok({ success: true, valid: true }, 200, req);
  }

  if (body.action === "create_system_admin") {
    if (!body.user_id) return fail("user_id is required", 400, null, req);

    const { data: profile } = await admin
      .from("profiles")
      .select("empresa_id")
      .eq("id", body.user_id)
      .maybeSingle();

    if (!profile?.empresa_id) return fail("User profile/empresa not found", 404, null, req);

    // Delete existing role for this user+empresa, then insert the new one
    await admin
      .from("user_roles")
      .delete()
      .eq("user_id", body.user_id)
      .eq("empresa_id", profile.empresa_id);

    const { error } = await admin
      .from("user_roles")
      .insert({
        user_id: body.user_id,
        empresa_id: profile.empresa_id,
        role: "SYSTEM_ADMIN",
      });

    if (error) return fail(error.message, 400, null, req);
    await logPlatformAudit(admin, { actorId: auth.user.id, actorEmail: auth.user.email, empresaId: profile.empresa_id, actionType: "OWNER_CREATE_SYSTEM_ADMIN", details: { target_user_id: body.user_id } });
    return ok({ success: true }, 200, req);
  }

  if (body.action === "list_platform_owners") {
    const { data: roles, error: rolesError } = await admin
      .from("user_roles")
      .select("user_id, empresa_id, role")
      .in("role", ["SYSTEM_OWNER", "SYSTEM_ADMIN"])
      .order("role", { ascending: true })
      .limit(500);

    if (rolesError) return fail(rolesError.message, 400, null, req);

    const userIds = Array.from(new Set((roles ?? []).map((row: any) => row.user_id).filter(Boolean)));

    let profiles: any[] = [];
    if (userIds.length > 0) {
      const { data: profileRows, error: profileError } = await admin
        .from("profiles")
        .select("id,nome,email,empresa_id")
        .in("id", userIds)
        .limit(500);

      if (profileError) return fail(profileError.message, 400, null, req);
      profiles = profileRows ?? [];
    }

    const profileById = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));

    const owners = (roles ?? []).map((row: any) => ({
      user_id: row.user_id,
      empresa_id: row.empresa_id,
      role: row.role,
      profile: profileById.get(row.user_id) ?? null,
    }));

    return ok({ owners }, 200, req);
  }

  if (body.action === "create_platform_owner") {
    if (!body.owner_user?.nome || !body.owner_user?.email) {
      return fail("owner_user nome and email are required", 400, null, req);
    }

    const normalizedEmail = body.owner_user.email.trim().toLowerCase();
    const password = body.owner_user.password?.trim() || generateTemporaryPassword();

    const { data: existingUsersPage, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) return fail(listError.message, 400, null, req);

    const existingUser = (existingUsersPage?.users ?? []).find((user: any) => (user?.email ?? "").toLowerCase() === normalizedEmail);

    let ownerUserId = existingUser?.id ?? null;

    const { data: company } = await admin
      .from("empresas")
      .select("id,slug")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!company?.id) return fail("Nenhuma empresa disponível para vínculo do owner", 400, null, req);

    const ownerRole = body.owner_user.role ?? "SYSTEM_ADMIN";

    if (!ownerUserId) {
      const { data: createdAuth, error: createAuthError } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        app_metadata: {
          empresa_id: company.id,
          empresa_slug: company.slug ?? null,
          role: ownerRole,
          roles: [ownerRole],
        },
        user_metadata: {
          nome: body.owner_user.nome,
          empresa_id: company.id,
          empresa_slug: company.slug ?? null,
          email_verified: true,
        },
      });

      if (createAuthError || !createdAuth?.user?.id) {
        return fail(createAuthError?.message ?? "Failed to create owner user", 400, null, req);
      }

      ownerUserId = createdAuth.user.id;
    }

    const { error: profileError } = await admin
      .from("profiles")
      .upsert({
        id: ownerUserId,
        empresa_id: company.id,
        nome: body.owner_user.nome,
        email: normalizedEmail,
      }, { onConflict: "id" });

    if (profileError) return fail(profileError.message, 400, null, req);

    // Delete existing role for this user+empresa, then insert the new one
    await admin
      .from("user_roles")
      .delete()
      .eq("user_id", ownerUserId)
      .eq("empresa_id", company.id);

    const { error: roleError } = await admin
      .from("user_roles")
      .insert({
        user_id: ownerUserId,
        empresa_id: company.id,
        role: ownerRole,
      });

    if (roleError) return fail(roleError.message, 400, null, req);

    await logOwnerMasterHiddenAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: company.id,
      actionType: "OWNER_MASTER_CREATE_OWNER",
      details: {
        owner_user_id: ownerUserId,
        owner_email: normalizedEmail,
        owner_role: ownerRole,
      },
    });

    return ok({
      success: true,
      owner: {
        user_id: ownerUserId,
        email: normalizedEmail,
        role: ownerRole,
      },
    }, 200, req);
  }

  if (body.action === "list_database_tables") {
    const tables = await listDatabaseTables(admin, body.empresa_id ?? null);
    return ok({ tables }, 200, req);
  }

  if (body.action === "cleanup_company_data") {
    if (!body.empresa_id) return fail("empresa_id is required", 400, null, req);
    const operationId = crypto.randomUUID();

    const passwordOk = await verifyActorPassword({
      email: auth.user.email,
      password: body.auth_password ?? null,
      expectedUserId: auth.user.id,
    });

    if (!passwordOk) {
      return fail("Senha inválida para confirmar a operação.", 401, null, req);
    }

    const { data: cleanupCompanyRef } = await admin
      .from("empresas")
      .select("id,slug")
      .eq("id", body.empresa_id)
      .maybeSingle();

    const keepCompanyCore = Boolean(body.keep_company_core);
    const keepBillingData = Boolean(body.keep_billing_data);
    const includeAuthUsers = Boolean(body.include_auth_users);

    const cleanupResult = await cleanupCompanyTenantRows(admin, body.empresa_id, {
      keepCompanyCore,
      keepBillingData,
    });

    if (cleanupResult.error) {
      return fail(cleanupResult.error, 400, {
        operation_id: operationId,
        table_errors: cleanupResult.tableErrors,
      }, req);
    }

    const deletedByTable = cleanupResult.deletedByTable ?? {};
    const authMetadataUserIds = includeAuthUsers
      ? await collectAuthUsersByCompanyMetadata(admin, {
        empresaId: body.empresa_id,
        empresaSlug: cleanupCompanyRef?.slug ?? null,
      })
      : [];

    const userIds = Array.from(new Set([
      ...(cleanupResult.userIds ?? []),
      ...authMetadataUserIds,
    ]));
    const tableErrors = cleanupResult.tableErrors ?? [];

    let deletedAuthUsers = 0;
    if (includeAuthUsers && userIds.length > 0) {
      const authResult = await deleteAuthUsers(admin, userIds);
      deletedAuthUsers = authResult.removed;
    }

    const totalDeleted = Object.values(deletedByTable).reduce((acc: number, value) => acc + Number(value ?? 0), 0);
    const affectedTables = Object.keys(deletedByTable);

    await logOwnerMasterHiddenAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: body.empresa_id,
      actionType: "OWNER_MASTER_CLEANUP_COMPANY_DATA",
      details: {
        keep_company_core: keepCompanyCore,
        keep_billing_data: keepBillingData,
        include_auth_users: includeAuthUsers,
        deleted_auth_users: deletedAuthUsers,
        deleted_by_table: deletedByTable,
        operation_id: operationId,
        table_errors: tableErrors,
      },
    });

    return okWithOperation(req, {
      success: true,
      summary: {
        empresa_id: body.empresa_id,
        keep_company_core: keepCompanyCore,
        keep_billing_data: keepBillingData,
        include_auth_users: includeAuthUsers,
        deleted_auth_users: deletedAuthUsers,
        deleted_by_table: deletedByTable,
        total_deleted: totalDeleted,
        affected_tables: affectedTables,
        rows_deleted: totalDeleted,
        table_errors: tableErrors,
      },
      affected_tables: affectedTables,
      rows_deleted: totalDeleted,
      table_errors: tableErrors,
    }, operationId);
  }

  if (body.action === "purge_table_data") {
    const tableName = (body.table_name ?? "").trim();
    if (!tableName) return fail("table_name is required", 400, null, req);
    const operationId = crypto.randomUUID();
    if (!PLATFORM_TABLES.includes(tableName)) {
      return fail("Tabela não permitida para purge", 400, null, req);
    }

    if (PROTECTED_PLATFORM_TABLES.has(tableName)) {
      return fail("Tabela protegida. Utilize limpeza por empresa para remover usuários.", 400, null, req);
    }

    const passwordOk = await verifyActorPassword({
      email: auth.user.email,
      password: body.auth_password ?? null,
      expectedUserId: auth.user.id,
    });

    if (!passwordOk) {
      return fail("Senha inválida para confirmar a operação.", 401, null, req);
    }

    let hasEmpresaId = false;
    const empresaIdProbe = await admin
      .from(tableName)
      .select("empresa_id", { count: "exact", head: true })
      .limit(1);
    hasEmpresaId = !empresaIdProbe.error;

    if (!body.empresa_id) {
      return fail("empresa_id é obrigatório para purge_table_data. Purge global não é permitido.", 400, null, req);
    }

    if (!hasEmpresaId) {
      return fail("Tabela não possui coluna empresa_id; purge não é possível com filtro de empresa.", 400, null, req);
    }

    let query = admin.from(tableName).delete({ count: "exact" }).eq("empresa_id", body.empresa_id);

    const { count, error } = await query;
    if (error) return fail(`Falha ao limpar tabela ${tableName}: ${error.message}`, 400, null, req);

    await logOwnerMasterHiddenAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: body.empresa_id ?? null,
      actionType: "OWNER_MASTER_PURGE_TABLE_DATA",
      details: {
        table_name: tableName,
        empresa_id: body.empresa_id ?? null,
        deleted_rows: Number(count ?? 0),
        operation_id: operationId,
      },
    });

    return okWithOperation(req, {
      success: true,
      summary: {
        table_name: tableName,
        empresa_id: body.empresa_id ?? null,
        deleted_rows: Number(count ?? 0),
        affected_tables: [tableName],
        rows_deleted: Number(count ?? 0),
        table_errors: [],
      },
      affected_tables: [tableName],
      rows_deleted: Number(count ?? 0),
      table_errors: [],
    }, operationId);
  }

  // ── Purge device users (QR code connections) ──
  if (body.action === "purge_device_users") {
    const operationId = crypto.randomUUID();

    const passwordOk = await verifyActorPassword({
      email: auth.user.email,
      password: body.auth_password ?? null,
      expectedUserId: auth.user.id,
    });

    if (!passwordOk) {
      return fail("Senha inválida para confirmar a operação.", 401, null, req);
    }

    // Find device profiles (email pattern: device-*@mecanico.pcm.local)
    let deviceQuery = admin
      .from("profiles")
      .select("id,email,nome,empresa_id")
      .like("email", "device-%@mecanico.pcm.local");

    if (body.empresa_id) {
      deviceQuery = deviceQuery.eq("empresa_id", body.empresa_id);
    }

    const { data: deviceProfiles, error: deviceErr } = await deviceQuery;
    if (deviceErr) return fail(`Erro ao buscar dispositivos: ${deviceErr.message}`, 400, null, req);

    const devices = Array.isArray(deviceProfiles) ? deviceProfiles : [];
    if (devices.length === 0) {
      return okWithOperation(req, {
        success: true,
        message: "Nenhum dispositivo encontrado para purge.",
        deleted_count: 0,
      }, operationId);
    }

    const deviceIds = devices.map((d: any) => String(d.id));
    let deletedProfiles = 0;
    let deletedRoles = 0;
    let deletedAuthUsers = 0;
    const errors: string[] = [];

    // 1. Delete user_roles
    for (const uid of deviceIds) {
      const { error: roleErr } = await admin
        .from("user_roles")
        .delete()
        .eq("user_id", uid);
      if (roleErr) {
        errors.push(`user_roles ${uid}: ${roleErr.message}`);
      } else {
        deletedRoles++;
      }
    }

    // 2. Delete profiles
    for (const uid of deviceIds) {
      const { error: profErr } = await admin
        .from("profiles")
        .delete()
        .eq("id", uid);
      if (profErr) {
        errors.push(`profiles ${uid}: ${profErr.message}`);
      } else {
        deletedProfiles++;
      }
    }

    // 3. Delete auth.users
    for (const uid of deviceIds) {
      const { error: authErr } = await admin.auth.admin.deleteUser(uid);
      if (authErr) {
        errors.push(`auth.users ${uid}: ${authErr.message}`);
      } else {
        deletedAuthUsers++;
      }
    }

    await logOwnerMasterHiddenAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: body.empresa_id ?? null,
      actionType: "OWNER_MASTER_PURGE_DEVICE_USERS",
      details: {
        empresa_id: body.empresa_id ?? "all",
        device_count: devices.length,
        deleted_profiles: deletedProfiles,
        deleted_roles: deletedRoles,
        deleted_auth_users: deletedAuthUsers,
        errors: errors.length > 0 ? errors : undefined,
        operation_id: operationId,
      },
    });

    return okWithOperation(req, {
      success: true,
      message: `${deletedAuthUsers} dispositivo(s) removido(s) com sucesso.`,
      deleted_count: deletedAuthUsers,
      deleted_profiles: deletedProfiles,
      deleted_roles: deletedRoles,
      deleted_auth_users: deletedAuthUsers,
      errors: errors.length > 0 ? errors : undefined,
    }, operationId);
  }

  if (body.action === "delete_company") {
    if (!body.empresa_id) return fail("empresa_id is required", 400, null, req);
    const operationId = crypto.randomUUID();

    // ── Confirmação de senha do operador ────────────────────────
    const passwordOk = await verifyActorPassword({
      email: auth.user.email,
      password: body.auth_password ?? null,
      expectedUserId: auth.user.id,
    });
    if (!passwordOk) {
      return fail("Senha inválida para confirmar a operação.", 401, null, req);
    }

    // ── Confirmação de nome da empresa ───────────────────────────
    const { data: company, error: companyError } = await admin
      .from("empresas")
      .select("id,nome,slug,deleted_at")
      .eq("id", body.empresa_id)
      .maybeSingle();

    if (companyError) return fail(companyError.message, 400, null, req);
    if (!company?.id) return fail("Empresa não encontrada", 404, null, req);

    if (company.deleted_at) {
      return fail(
        `Empresa já está marcada para exclusão desde ${company.deleted_at}. Aguarde o período de 30 dias para hard-delete automático ou use a ação restore_empresa para desfazer.`,
        409,
        null,
        req,
      );
    }

    // ── Soft-delete via RPC SECURITY DEFINER ────────────────────
    const { data: softDeleteResult, error: softDeleteError } = await admin
      .rpc("soft_delete_empresa", {
        p_empresa_id: body.empresa_id,
        p_actor_id: auth.user.id,
      });

    if (softDeleteError) {
      return fail(`Falha no soft-delete: ${softDeleteError.message}`, 400, null, req);
    }

    const result = (Array.isArray(softDeleteResult) ? softDeleteResult[0] : softDeleteResult) as Record<string, unknown>;

    await logOwnerMasterHiddenAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: body.empresa_id,
      actionType: "OWNER_MASTER_SOFT_DELETE_COMPANY",
      details: {
        empresa_id: body.empresa_id,
        company_name: company.nome,
        deleted_at: result?.deleted_at,
        purge_after: result?.purge_after,
        operation_id: operationId,
      },
    });

    await logAuditEvent(admin, {
      action: "OWNER_MASTER_DELETE_COMPANY",
      entityType: "company",
      entityId: body.empresa_id,
      empresaId: body.empresa_id,
      userId: auth.user.id,
      payload: {
        company_name: company.nome,
        soft_deleted_at: result?.deleted_at,
        purge_after: result?.purge_after,
        operation_id: operationId,
      },
      severity: "critical",
      source: "owner-portal-admin",
      endpoint: trace.endpoint,
      executionMs: traceDurationMs(trace),
      req,
    });

    await writeOperationalLog(admin, {
      scope: trace.scope,
      action: body.action,
      endpoint: trace.endpoint,
      statusCode: 200,
      durationMs: traceDurationMs(trace),
      empresaId: body.empresa_id,
      userId: auth.user.id,
      metadata: {
        empresa_id: body.empresa_id,
        company_name: company.nome,
        soft_deleted_at: result?.deleted_at,
        purge_after: result?.purge_after,
        operation_id: operationId,
      },
    });

    return okWithOperation(req, {
      success: true,
      summary: {
        empresa_id: body.empresa_id,
        company_name: company.nome,
        action: "soft_deleted",
        deleted_at: result?.deleted_at,
        purge_after: result?.purge_after,
        message: "Empresa marcada para exclusão. Hard-delete automático ocorrerá após 30 dias. Use restore_empresa para desfazer.",
      },
    }, operationId);
  }

  if (body.action === "cleanup_owner_stress_data") {
    const summary: Record<string, unknown> = {
      companies: 0,
      plans: 0,
      users: 0,
      profiles: 0,
      roles: 0,
      subscriptions: 0,
      contracts: 0,
      contract_versions: 0,
      company_settings: 0,
      company_data: 0,
      support_tickets: 0,
      enterprise_audit_logs: 0,
    };

    const { data: stressCompanies, error: stressCompaniesError } = await admin
      .from("empresas")
      .select("id,slug,nome")
      .or("slug.ilike.stress-company-%,nome.ilike.Stress Company %")
      .limit(2000);

    if (stressCompaniesError) return fail(stressCompaniesError.message, 400, null, req);

    const companyIds = (stressCompanies ?? []).map((company: any) => company.id).filter(Boolean);
    summary.companies = companyIds.length;

    const { data: stressPlans, error: stressPlansError } = await admin
      .from("plans")
      .select("id,code")
      .ilike("code", "stress-plan-%")
      .limit(2000);

    if (stressPlansError) return fail(stressPlansError.message, 400, null, req);

    const planIds = (stressPlans ?? []).map((plan: any) => plan.id).filter(Boolean);
    summary.plans = planIds.length;

    const { data: stressProfiles, error: stressProfilesError } = await admin
      .from("profiles")
      .select("id,email")
      .or("email.ilike.master-%@gppis.com.br,email.ilike.user-%@gppis.com.br")
      .limit(4000);

    if (stressProfilesError) return fail(stressProfilesError.message, 400, null, req);

    const stressUserIds = Array.from(new Set((stressProfiles ?? []).map((profile: any) => profile.id).filter(Boolean)));
    summary.users = stressUserIds.length;

    if (companyIds.length > 0) {
      const { data: contractsRows, error: contractsRowsError } = await admin
        .from("contracts")
        .select("id")
        .in("empresa_id", companyIds)
        .limit(4000);

      if (contractsRowsError) return fail(contractsRowsError.message, 400, null, req);

      const contractIds = (contractsRows ?? []).map((row: any) => row.id).filter(Boolean);
      summary.contracts = contractIds.length;

      if (contractIds.length > 0) {
        const { error: contractVersionsError } = await admin
          .from("contract_versions")
          .delete()
          .in("contract_id", contractIds);

        if (contractVersionsError) return fail(contractVersionsError.message, 400, null, req);
        summary.contract_versions = contractIds.length;

        const { error: contractsDeleteError } = await admin
          .from("contracts")
          .delete()
          .in("id", contractIds);

        if (contractsDeleteError) return fail(contractsDeleteError.message, 400, null, req);
      }

      const { error: subscriptionsByCompanyError } = await admin
        .from("subscriptions")
        .delete()
        .in("empresa_id", companyIds);
      if (subscriptionsByCompanyError) return fail(subscriptionsByCompanyError.message, 400, null, req);

      const { error: companySettingsError } = await admin
        .from("configuracoes_sistema")
        .delete()
        .in("empresa_id", companyIds);
      if (companySettingsError) return fail(companySettingsError.message, 400, null, req);
      summary.company_settings = companyIds.length;

      const { error: companyDataError } = await admin
        .from("dados_empresa")
        .delete()
        .in("empresa_id", companyIds);
      if (companyDataError) return fail(companyDataError.message, 400, null, req);
      summary.company_data = companyIds.length;

      const { error: supportTicketsError } = await admin
        .from("support_tickets")
        .delete()
        .in("empresa_id", companyIds);
      if (supportTicketsError) return fail(supportTicketsError.message, 400, null, req);
      summary.support_tickets = companyIds.length;

      const { error: roleByCompanyError } = await admin
        .from("user_roles")
        .delete()
        .in("empresa_id", companyIds);
      if (roleByCompanyError) return fail(roleByCompanyError.message, 400, null, req);

      const { error: profilesByCompanyError } = await admin
        .from("profiles")
        .delete()
        .in("empresa_id", companyIds)
        .or("email.ilike.master-%@gppis.com.br,email.ilike.user-%@gppis.com.br");
      if (profilesByCompanyError) return fail(profilesByCompanyError.message, 400, null, req);

      const { error: companiesDeleteError } = await admin
        .from("empresas")
        .delete()
        .in("id", companyIds);
      if (companiesDeleteError) return fail(companiesDeleteError.message, 400, null, req);
    }

    if (planIds.length > 0) {
      const { error: subscriptionsByPlanError } = await admin
        .from("subscriptions")
        .delete()
        .in("plan_id", planIds);
      if (subscriptionsByPlanError) return fail(subscriptionsByPlanError.message, 400, null, req);

      const { error: plansDeleteError } = await admin
        .from("plans")
        .delete()
        .in("id", planIds);
      if (plansDeleteError) return fail(plansDeleteError.message, 400, null, req);
    }

    if (stressUserIds.length > 0) {
      const { error: roleByUserError } = await admin
        .from("user_roles")
        .delete()
        .in("user_id", stressUserIds);
      if (roleByUserError) return fail(roleByUserError.message, 400, null, req);
      summary.roles = stressUserIds.length;

      const { error: profilesDeleteError } = await admin
        .from("profiles")
        .delete()
        .in("id", stressUserIds);
      if (profilesDeleteError) return fail(profilesDeleteError.message, 400, null, req);
      summary.profiles = stressUserIds.length;

      const deleteErrors: string[] = [];
      for (const userId of stressUserIds) {
        try {
          await admin.auth.admin.deleteUser(userId);
        } catch (e: any) {
          deleteErrors.push(`${userId}: ${e?.message ?? "unknown"}`);
        }
      }
      if (deleteErrors.length > 0) {
        summary.auth_delete_errors = deleteErrors;
      }
    }

    const { error: auditCleanupError } = await admin
      .from("enterprise_audit_logs")
      .delete()
      .or("dados_depois->>action.ilike.%stress%,dados_depois::text.ilike.%stress-company-%,dados_depois::text.ilike.%stress-plan-%,acao.ilike.%stress%");

    if (!auditCleanupError) {
      summary.enterprise_audit_logs = 1;
    }

    await logOwnerMasterHiddenAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: null,
      actionType: "OWNER_MASTER_CLEANUP_STRESS_DATA",
      details: summary,
    });

    return ok({ success: true, summary }, 200, req);
  }

  return fail("Unsupported action", 400, null, req);
  } catch (error: any) {
    const message = error?.message ? String(error.message) : "Unhandled owner-portal-admin error";
    const traceId = req.headers.get("x-request-id") ?? req.headers.get("x-correlation-id") ?? crypto.randomUUID();
    console.error(JSON.stringify({
      level: "error",
      source: "owner-portal-admin",
      event: "unhandled_error",
      trace_id: traceId,
      endpoint: new URL(req.url).pathname,
      message,
      timestamp: new Date().toISOString(),
    }));
    try {
      const admin = adminClient();
      await writeOperationalLog(admin, {
        scope: "edge.owner-portal-admin",
        action: "unhandled_error",
        endpoint: new URL(req.url).pathname,
        statusCode: 500,
        durationMs: null,
        empresaId: null,
        userId: null,
        metadata: { trace_id: traceId },
        errorMessage: message,
        requestId: traceId,
      });
    } catch {
      // noop
    }
    return internalServerErrorResponse(req);
  }
});