// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, isSystemOperator, requireUser, unauthorizedResponse } from "../_shared/auth.ts";
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
    | "list_audit_logs"
    | "get_company_settings"
    | "update_company_settings"
    | "block_company"
    | "change_plan"
    | "platform_stats"
    | "create_system_admin"
    | "impersonate_company"
    | "stop_impersonation"
    | "update_subscription_billing"
    | "list_platform_owners"
    | "create_platform_owner"
    | "cleanup_owner_stress_data"
    | "list_database_tables"
    | "cleanup_company_data"
    | "delete_company"
    | "purge_table_data";
  empresa_id?: string;
  company?: {
    nome: string;
    slug?: string;
    razao_social?: string;
    nome_fantasia?: string;
    cnpj?: string;
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
  empresa_nome?: string;
  confirmation_name?: string;
  confirmation_phrase?: string;
  auth_password?: string;
  table_name?: string;
  keep_company_core?: boolean;
  keep_billing_data?: boolean;
  include_auth_users?: boolean;
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
  "list_audit_logs",
  "get_company_settings",
  "update_company_settings",
  "block_company",
  "change_plan",
  "platform_stats",
  "create_system_admin",
  "impersonate_company",
  "stop_impersonation",
  "update_subscription_billing",
  "list_platform_owners",
  "create_platform_owner",
  "cleanup_owner_stress_data",
  "list_database_tables",
  "cleanup_company_data",
  "delete_company",
  "purge_table_data",
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
  ]);

  const criticalWriteActions = new Set<Payload["action"]>([
    "cleanup_company_data",
    "purge_table_data",
    "delete_company",
    "create_platform_owner",
    "create_system_admin",
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
    "block_company",
    "change_plan",
    "create_system_admin",
    "impersonate_company",
    "stop_impersonation",
    "create_platform_owner",
    "cleanup_owner_stress_data",
    "cleanup_company_data",
    "delete_company",
    "purge_table_data",
  ]);

  return writeOrSensitiveActions.has(action);
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

  const modulos = input.modulos ? JSON.stringify(input.modulos, null, 2) : "{}";

  return `CONTRATO DE LICENÇA DE USO DE SOFTWARE\n\nCONTRATANTE\nEmpresa: ${input.empresaNome}\nCNPJ: ${input.cnpj ?? "N/A"}\nResponsável: ${input.responsavel ?? "N/A"}\n\nCONTRATADA\nPCM Estratégio Sistemas\n\nOBJETO\nLicença de uso do sistema PCM Estratégico.\n\nPLANO CONTRATADO\nPlano: ${input.planoNome}\n\nVALOR\n${currency}\n\nFORMA DE PAGAMENTO\n${input.formaPagamento ?? "A definir"}\n\nVIGÊNCIA\nInício: ${input.inicio ?? "N/A"}\nTérmino: ${input.fim ?? "Indeterminado"}\n\nUSUÁRIOS PERMITIDOS\n${input.limiteUsuarios ?? "N/A"}\n\nMÓDULOS INCLUSOS\n${modulos}\n`;
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

  const { data: plan } = await admin
    .from("plans")
    .select("id,name,user_limit,module_flags")
    .eq("id", subscription.plan_id)
    .single();

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
      plan_id: subscription.plan_id,
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
  },
) {
  await admin.from("enterprise_audit_logs").insert({
    actor_id: payload.actorId,
    actor_email: payload.actorEmail ?? null,
    empresa_id: payload.empresaId ?? null,
    action_type: payload.actionType,
    details: payload.details ?? {},
    severity: "info",
    source: "owner-portal-admin",
  });
}

function getOwnerMasterEmail() {
  const configured = (Deno.env.get("OWNER_MASTER_EMAIL") ?? "").trim().toLowerCase();
  if (!configured) {
    throw new Error("OWNER_MASTER_EMAIL not configured");
  }
  return configured;
}

function isOwnerMasterEmail(email?: string | null, ownerMasterEmail?: string) {
  return (email ?? "").toLowerCase() === (ownerMasterEmail ?? "").toLowerCase();
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
    actor_id: payload.actorId,
    actor_email: payload.actorEmail ?? null,
    empresa_id: payload.empresaId ?? null,
    action_type: payload.actionType,
    details: payload.details ?? {},
    severity: "info",
    source: "owner-master-shadow",
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
  "contracts",
  "contract_versions",
]);

const PROTECTED_PLATFORM_TABLES = new Set([
  "user_roles",
  "profiles",
]);

function extractReferencedTableFromFkError(message?: string | null) {
  const text = message ?? "";
  const onTable = text.match(/on table\s+"([a-zA-Z0-9_]+)"/i);
  if (onTable?.[1]) return onTable[1];

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

  const userIds = await collectCompanyUserIds(admin, empresaId);

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

  for (const userId of userIds) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (!error) removed += 1;
  }

  return removed;
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
  const isSystem = await isSystemOperator(admin, auth.user.id);
  if (!isSystem) return forbiddenResponse(req);

  const rawBody = await req.json().catch(() => null);
  if (!isOwnerActionPayload(rawBody)) return badRequestResponse(req, "Missing action", 400);
  const body = rawBody;

  if (body.action === "health_check") {
    return ok({
      service: "owner-portal-admin",
      status: "ok",
      version: "2026-03-11-owner-health-v1",
      supported_actions: SUPPORTED_OWNER_ACTIONS,
      timestamp: new Date().toISOString(),
    }, 200, req);
  }

  const trace = createRequestTrace("edge.owner-portal-admin", req, body.action);
  if (shouldEnforceRateLimit(body.action)) {
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

  let ownerMasterEmail = "";
  try {
    ownerMasterEmail = getOwnerMasterEmail();
  } catch (error) {
    const message = error instanceof Error ? error.message : "OWNER_MASTER_EMAIL not configured";
    return badRequestResponse(req, message, 500);
  }

  const isOwnerMaster = isOwnerMasterEmail(auth.user.email ?? null, ownerMasterEmail);
  const ownerMasterOnlyActions = new Set<Payload["action"]>([
    "list_platform_owners",
    "create_platform_owner",
    "cleanup_owner_stress_data",
    "list_database_tables",
    "cleanup_company_data",
    "delete_company",
    "purge_table_data",
  ]);

  if (ownerMasterOnlyActions.has(body.action) && !isOwnerMaster) {
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

  if (!isOwnerMaster && body.action !== "list_audit_logs") {
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

    const [{ count: totalCompanies }, { count: blockedCompanies }, { count: totalUsers }, { count: activeSubscriptions }, { count: overdueSubscriptions }, { count: newCompaniesMonth }, { count: openTickets }, { data: revenue }, { data: plans }, { data: canceledSubscriptions }] = await Promise.all([
      admin.from("empresas").select("id", { count: "exact", head: true }),
      admin.from("empresas").select("id", { count: "exact", head: true }).eq("status", "blocked"),
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "ativa"),
      admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "atrasada"),
      admin.from("empresas").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
      admin.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["aberto", "em_andamento"]),
      admin.from("subscriptions").select("amount").eq("status", "ativa"),
      admin.from("subscriptions").select("plan_id, plans(name)").eq("status", "ativa"),
      admin
        .from("subscriptions")
        .select("id")
        .eq("status", "cancelada")
        .gte("updated_at", thirtyDaysAgo),
    ]);

    const mrr = (revenue ?? []).reduce((acc, item: any) => acc + Number(item.amount ?? 0), 0);
    const arr = mrr * 12;
    const usageByPlan = (plans ?? []).reduce((acc: Record<string, number>, item: any) => {
      const planName = item?.plans?.name ?? "Sem plano";
      acc[planName] = (acc[planName] ?? 0) + 1;
      return acc;
    }, {});
    const canceledIn30Days = (canceledSubscriptions ?? []).length;
    const churnRate = Number(activeSubscriptions ?? 0) + canceledIn30Days > 0
      ? (canceledIn30Days / (Number(activeSubscriptions ?? 0) + canceledIn30Days)) * 100
      : 0;

    const { data: alerts } = await admin
      .from("enterprise_audit_logs")
      .select("id,action_type,severity,created_at")
      .in("severity", ["warning", "error", "critical"])
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
    const { data, error } = await admin
      .from("empresas")
      .select("id,nome,slug,status,plano,created_at,updated_at,dados_empresa(razao_social,nome_fantasia,cnpj),configuracoes_sistema(chave,valor)")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) return fail(error.message, 400, null, req);
    return ok({ companies: data ?? [] }, 200, req);
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
        cnpj: body.company.cnpj ?? null,
        status: body.company.status ?? "active",
        plano: null,
      })
      .select("id,nome,slug,status,created_at")
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

      await admin.from("contract_versions").delete().eq("empresa_id", companyId).catch(() => null);
      await admin.from("contracts").delete().eq("empresa_id", companyId).catch(() => null);
      await admin.from("subscriptions").delete().eq("empresa_id", companyId).catch(() => null);
      await admin.from("user_roles").delete().eq("empresa_id", companyId).catch(() => null);
      await admin.from("profiles").delete().eq("empresa_id", companyId).catch(() => null);
      await admin.from("empresa_config").delete().eq("empresa_id", companyId).catch(() => null);
      await admin.from("configuracoes_sistema").delete().eq("empresa_id", companyId).catch(() => null);
      await admin.from("dados_empresa").delete().eq("empresa_id", companyId).catch(() => null);
      await admin.from("empresas").delete().eq("id", companyId).catch(() => null);

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
        .select("id,nome,slug,status,created_at")
        .single();

      if (slugRepairError || !updatedCompany?.slug) {
        const reason = await rollbackCreateCompany(slugRepairError?.message ?? "missing slug");
        return fail("Falha ao garantir slug da empresa recém-criada.", 400, { reason }, req);
      }

      company = updatedCompany;
      ensuredSlug = (updatedCompany.slug ?? "").trim().toLowerCase();
      slug = ensuredSlug;
    }

    const { error: companyDataError } = await admin.from("dados_empresa").upsert({
      empresa_id: company.id,
      razao_social: body.company.razao_social ?? companyName,
      nome_fantasia: body.company.nome_fantasia ?? companyName,
      cnpj: body.company.cnpj ?? null,
    }, { onConflict: "empresa_id" });

    if (companyDataError) {
      const reason = await rollbackCreateCompany(companyDataError.message);
      return fail("Falha ao salvar dados da empresa.", 400, { reason }, req);
    }

    const { error: configError } = await admin.from("configuracoes_sistema").upsert({
      empresa_id: company.id,
      chave: "owner.company_profile",
      valor: {
        endereco: body.company.endereco ?? null,
        telefone: body.company.telefone ?? null,
        email: body.company.email ?? null,
        responsavel: body.company.responsavel ?? null,
        segmento: body.company.segmento ?? null,
      },
    }, { onConflict: "empresa_id,chave" });

    const inactivityMinutes =
      typeof body.company.inactivity_timeout_minutes === "number" && Number.isFinite(body.company.inactivity_timeout_minutes)
        ? Math.max(0, Math.trunc(body.company.inactivity_timeout_minutes))
        : null;

    const { error: securityPolicyError } = await admin.from("configuracoes_sistema").upsert({
      empresa_id: company.id,
      chave: "owner.security_policy",
      valor: {
        inactivity_timeout_minutes: inactivityMinutes,
      },
    }, { onConflict: "empresa_id,chave" });

    if (configError || securityPolicyError) {
      const reason = await rollbackCreateCompany(configError?.message ?? securityPolicyError?.message ?? "unknown");
      return fail(
        "Falha ao salvar configurações iniciais da empresa.",
        400,
        { reason },
        req,
      );
    }

    const managedDomain = buildManagedTenantDomain(slug);
    if (managedDomain) {
      const { error: domainError } = await admin.from("empresa_config").upsert({
        empresa_id: company.id,
        dominio_custom: managedDomain,
        nome_exibicao: body.company.nome_fantasia ?? companyName,
      }, { onConflict: "empresa_id" });

      if (domainError) {
        const reason = await rollbackCreateCompany(domainError.message);
        return fail("Falha ao configurar domínio automático da empresa.", 400, { reason }, req);
      }
    }

    const masterRole = body.user.role ?? "ADMIN";
    const password = body.user.password?.trim() || generateTemporaryPassword();

    const { data: createdAuth, error: authError } = await admin.auth.admin.createUser({
      email: body.user.email.trim().toLowerCase(),
      password,
      email_confirm: true,
      app_metadata: {
        empresa_id: company.id,
        empresa_slug: slug,
        role: masterRole,
        roles: [masterRole],
        force_password_change: true,
      },
      user_metadata: {
        nome: body.user.nome,
        empresa_id: company.id,
        empresa_slug: slug,
        force_password_change: true,
      },
    });

    if (authError || !createdAuth?.user?.id) {
      const authMessage = authError?.message ?? "Failed to create company master user";
      if (authMessage.toLowerCase().includes("already") || authMessage.toLowerCase().includes("registered")) {
        const reason = await rollbackCreateCompany(authMessage);
        return fail("O email do usuário MASTER já está cadastrado. Use outro email.", 409, { reason }, req);
      }
      const reason = await rollbackCreateCompany(authMessage);
      return fail(authMessage, 400, { reason }, req);
    }

    createdAuthUserId = createdAuth.user.id;

    const { error: profileUpsertError } = await admin.from("profiles").upsert({
      id: createdAuth.user.id,
      empresa_id: company.id,
      nome: body.user.nome,
      email: body.user.email.trim().toLowerCase(),
      force_password_change: true,
    }, { onConflict: "id" });

    if (profileUpsertError) {
      const reason = await rollbackCreateCompany(profileUpsertError.message);
      return fail("Falha ao vincular usuário master na empresa (profiles).", 400, { reason }, req);
    }

    const { error: roleUpsertError } = await admin.from("user_roles").upsert({
      user_id: createdAuth.user.id,
      empresa_id: company.id,
      role: masterRole,
    }, { onConflict: "user_id,empresa_id,role" });

    if (roleUpsertError) {
      const reason = await rollbackCreateCompany(roleUpsertError.message);
      return fail("Falha ao vincular papel do usuário master na empresa (user_roles).", 400, { reason }, req);
    }

    if (!body.subscription?.plan_id) {
      const reason = await rollbackCreateCompany("subscription_plan_required");
      return fail(
        "Assinatura inicial obrigatória: informe subscription.plan_id para concluir o onboarding transacional.",
        400,
        { reason },
        req,
      );
    }

    const startsAt = body.subscription.starts_at ?? new Date().toISOString().slice(0, 10);
    const { data: subscription, error: subscriptionError } = await admin
      .from("subscriptions")
      .upsert({
        empresa_id: company.id,
        plan_id: body.subscription.plan_id,
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

    if (subscriptionError || !subscription?.id) {
      const reason = await rollbackCreateCompany(subscriptionError?.message ?? "subscription_create_failed");
      return fail("Falha ao criar assinatura inicial da empresa.", 400, { reason }, req);
    }

    let contract: any = null;
    try {
      contract = await createContractFromSubscription(admin, auth.user.id, subscription);
      if (!contract?.id) {
        throw new Error("contract_create_failed");
      }
    } catch (error: any) {
      const reason = await rollbackCreateCompany(error?.message ?? "contract_create_failed");
      return fail("Falha ao gerar contrato inicial da empresa.", 400, { reason }, req);
    }

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: company.id,
      actionType: "OWNER_CREATE_COMPANY",
      details: { company_id: company.id, master_email: body.user.email },
    });

    await logAuditEvent(admin, {
      action: "OWNER_CREATE_COMPANY",
      entityType: "company",
      entityId: company.id,
      empresaId: company.id,
      userId: auth.user.id,
      payload: {
        company_slug: company.slug,
        master_email: body.user.email,
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
      empresaId: company.id,
      userId: auth.user.id,
      metadata: {
        company_id: company.id,
      },
    });

    return ok({
      company,
      master_user: {
        id: createdAuth.user.id,
        email: body.user.email,
        initial_password: password,
      },
      subscription: {
        id: subscription.id,
        plan_id: subscription.plan_id,
        status: subscription.status,
      },
      contract: {
        id: contract.id,
        status: contract.status,
        version: contract.version,
      },
    }, 200, req);
  }

  if (body.action === "update_company") {
    if (!body.empresa_id || !body.company) return fail("empresa_id and company are required", 400, null, req);

    const updatePayload: Record<string, unknown> = {};
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
    if (body.company.status) updatePayload.status = body.company.status;
    if (body.company.cnpj !== undefined) updatePayload.cnpj = body.company.cnpj;

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
      cnpj: body.company.cnpj ?? null,
    }, { onConflict: "empresa_id" });

    await admin.from("configuracoes_sistema").upsert({
      empresa_id: body.empresa_id,
      chave: "owner.company_profile",
      valor: {
        endereco: body.company.endereco ?? null,
        telefone: body.company.telefone ?? null,
        email: body.company.email ?? null,
        responsavel: body.company.responsavel ?? null,
        segmento: body.company.segmento ?? null,
      },
    }, { onConflict: "empresa_id,chave" });

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

    return ok({ success: true }, 200, req);
  }

  if (body.action === "set_company_status" || body.action === "block_company") {
    if (!body.empresa_id) return fail("empresa_id is required", 400, null, req);
    const status = body.action === "block_company" ? "blocked" : (body.status ?? "active");
    const { error } = await admin
      .from("empresas")
      .update({ status })
      .eq("id", body.empresa_id);

    if (error) return fail(error.message, 400, null, req);

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
      .select("id,nome,email,empresa_id,created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (body.empresa_id) query = query.eq("empresa_id", body.empresa_id);

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

    const authStatusByUser = await getAuthStatusByUserId(admin, userIds);

    const merged = users.map((user: any) => ({
      ...user,
      status: authStatusByUser.get(user.id) ?? "ativo",
      user_roles: rolesByUser.get(user.id) ?? [],
    }));

    return ok({ users: merged }, 200, req);
  }

  if (body.action === "create_user") {
    if (!body.user?.nome || !body.user.email || !body.user.empresa_id || !body.user.role) {
      return fail("user payload is required", 400, null, req);
    }

    const { error: planLimitError } = await admin.rpc("check_company_plan_limit", {
      p_empresa_id: body.user.empresa_id,
      p_limit_type: "users",
      p_increment: 1,
    });

    if (planLimitError) {
      return fail("Limite de usuários do plano atingido ou assinatura inválida.", 403, {
        reason: planLimitError.message,
      }, req);
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

    const { data: createdAuth, error: createError } = await admin.auth.admin.createUser({
      email: normalizedUserEmail,
      password,
      email_confirm: true,
      app_metadata: {
        empresa_id: body.user.empresa_id,
        empresa_slug: targetCompany.slug ?? null,
        role: normalizedRole,
        roles: [normalizedRole],
        force_password_change: true,
      },
      user_metadata: {
        nome: body.user.nome,
        empresa_id: body.user.empresa_id,
        empresa_slug: targetCompany.slug ?? null,
        force_password_change: true,
      },
    });

    if (createError || !createdAuth?.user?.id) return fail(createError?.message ?? "Failed to create user", 400, null, req);

    const { error: profileError } = await admin.from("profiles").upsert({
      id: createdAuth.user.id,
      empresa_id: body.user.empresa_id,
      nome: body.user.nome,
      email: normalizedUserEmail,
      force_password_change: true,
    }, { onConflict: "id" });

    if (profileError) {
      await admin.auth.admin.deleteUser(createdAuth.user.id).catch(() => null);
      return fail("Falha ao vincular usuário à empresa (profiles).", 400, { reason: profileError.message }, req);
    }

    const { error: roleError } = await admin.from("user_roles").upsert({
      user_id: createdAuth.user.id,
      empresa_id: body.user.empresa_id,
      role: normalizedRole,
    }, { onConflict: "user_id,empresa_id,role" });

    if (roleError) {
      await admin.from("profiles").delete().eq("id", createdAuth.user.id).catch(() => null);
      await admin.auth.admin.deleteUser(createdAuth.user.id).catch(() => null);
      return fail("Falha ao vincular papel do usuário na empresa (user_roles).", 400, { reason: roleError.message }, req);
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

    return ok({ success: true, user_id: createdAuth.user.id, initial_password: password }, 200, req);
  }

  if (body.action === "set_user_status") {
    if (!body.user_id || !body.status) return fail("user_id and status are required", 400, null, req);
    const enabled = body.status === "ativo";
    const { error } = await admin.auth.admin.updateUserById(body.user_id, {
      ban_duration: enabled ? "none" : "876000h",
    });

    if (error) return fail(error.message, 400, null, req);

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

  if (body.action === "list_plans") {
    const { data, error } = await admin
      .from("plans")
      .select("*")
      .order("price_month", { ascending: true });
    if (error) return fail(error.message, 400, null, req);
    return ok({ plans: data ?? [] }, 200, req);
  }

  if (body.action === "create_plan") {
    if (!body.plan?.code || !body.plan?.name) return fail("plan code and name are required", 400, null, req);
    const { data, error } = await admin
      .from("plans")
      .insert({
        code: body.plan.code,
        name: body.plan.name,
        description: body.plan.description ?? null,
        user_limit: body.plan.user_limit ?? 10,
        module_flags: body.plan.module_flags ?? {},
        data_limit_mb: body.plan.data_limit_mb ?? 2048,
        premium_features: body.plan.premium_features ?? [],
        company_limit: body.plan.company_limit ?? null,
        price_month: body.plan.price_month ?? 0,
        active: body.plan.active ?? true,
      })
      .select("*")
      .single();
    if (error) return fail(error.message, 400, null, req);
    return ok({ plan: data }, 200, req);
  }

  if (body.action === "update_plan") {
    const planId = body.plan?.id?.trim();
    const planCode = body.plan?.code?.trim();
    if (!planId && !planCode) return fail("plan id or code is required", 400, null, req);

    const updatePayload = {
      name: body.plan?.name,
      description: body.plan?.description,
      user_limit: body.plan?.user_limit,
      module_flags: body.plan?.module_flags,
      data_limit_mb: body.plan?.data_limit_mb,
      premium_features: body.plan?.premium_features,
      company_limit: body.plan?.company_limit,
      price_month: body.plan?.price_month,
      active: body.plan?.active,
    };

    let query = admin
      .from("plans")
      .update(updatePayload);

    query = planId ? query.eq("id", planId) : query.eq("code", planCode);

    const { error } = await query;
    if (error) return fail(error.message, 400, null, req);
    return ok({ success: true }, 200, req);
  }

  if (body.action === "list_subscriptions") {
    const requestLimit = Number(body.limit ?? 1000);
    const safeLimit = Number.isFinite(requestLimit)
      ? Math.max(1, Math.min(2000, Math.trunc(requestLimit)))
      : 1000;

    const { data, error } = await admin
      .from("subscriptions")
      .select("*, plans(id,code,name,user_limit,module_flags), empresas(id,nome)")
      .order("updated_at", { ascending: false })
      .limit(safeLimit);
    if (error) return fail(error.message, 400, null, req);
    return ok({ subscriptions: data ?? [] }, 200, req);
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

  if (body.action === "create_subscription") {
    if (!body.subscription?.empresa_id || !body.subscription?.plan_id) {
      return fail("subscription payload is required", 400, null, req);
    }

    const startsAt = body.subscription.starts_at ?? new Date().toISOString().slice(0, 10);

    const { data, error } = await admin
      .from("subscriptions")
      .upsert({
        empresa_id: body.subscription.empresa_id,
        plan_id: body.subscription.plan_id,
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

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: data.empresa_id,
      actionType: "OWNER_CREATE_SUBSCRIPTION",
      details: { subscription_id: data.id, contract_id: contract.id },
    });

    return ok({ subscription: data, contract }, 200, req);
  }

  if (body.action === "set_subscription_status") {
    if (!body.empresa_id || !body.status) return fail("empresa_id and status are required", 400, null, req);
    const { error } = await admin
      .from("subscriptions")
      .update({ status: body.status })
      .eq("empresa_id", body.empresa_id);
    if (error) return fail(error.message, 400, null, req);
    return ok({ success: true }, 200, req);
  }

  if (body.action === "list_contracts") {
    const { data, error } = await admin
      .from("contracts")
      .select("*, empresas(id,nome), plans(id,name,code), subscriptions(id,status)")
      .order("generated_at", { ascending: false })
      .limit(1000);
    if (error) return fail(error.message, 400, null, req);
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
    return ok({ contract: regenerated }, 200, req);
  }

  if (body.action === "delete_contract") {
    if (!body.contract_id) return fail("contract_id is required", 400, null, req);
    const { error } = await admin.from("contracts").delete().eq("id", body.contract_id);
    if (error) return fail(error.message, 400, null, req);
    return ok({ success: true }, 200, req);
  }

  if (body.action === "list_support_tickets") {
    const { data, error } = await admin
      .from("support_tickets")
      .select("*")
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
    const { error } = await admin
      .from("support_tickets")
      .update({
        owner_response: body.response,
        owner_responder_id: auth.user.id,
        responded_at: new Date().toISOString(),
        status: body.status ?? "resolvido",
      })
      .eq("id", body.ticket_id);
    if (error) return fail(error.message, 400, null, req);
    return ok({ success: true }, 200, req);
  }

  if (body.action === "list_audit_logs") {
    const filters = body.filters ?? {};
    let query = admin
      .from("enterprise_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (!isOwnerMaster) query = query.neq("source", "owner-master-shadow");

    if (filters.empresa_id) query = query.eq("empresa_id", filters.empresa_id);
    if (filters.user_id) query = query.eq("actor_id", filters.user_id);
    if (filters.module) query = query.ilike("source", `%${filters.module}%`);
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
      .in("chave", ["owner.features", "owner.limits", "owner.modules"]);
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

  if (body.action === "change_plan") {
    if (!body.empresa_id || !body.plano_codigo) return fail("empresa_id and plano_codigo are required", 400, null, req);

    const { data: plano, error: planoError } = await admin
      .from("plans")
      .select("id,code,price_month")
      .eq("code", body.plano_codigo)
      .single();

    if (planoError || !plano) return fail("Plan not found", 404, null, req);

    const { data: subscription, error: subscriptionError } = await admin
      .from("subscriptions")
      .upsert({
        empresa_id: body.empresa_id,
        plan_id: plano.id,
        amount: plano.price_month ?? 0,
        period: "monthly",
        starts_at: new Date().toISOString().slice(0, 10),
        status: "ativa",
      }, { onConflict: "empresa_id" })
      .select("*")
      .single();

    if (subscriptionError) return fail(subscriptionError.message, 400, null, req);
    const contract = await createContractFromSubscription(admin, auth.user.id, subscription);
    return ok({ success: true, contract_id: contract.id }, 200, req);
  }

  if (body.action === "impersonate_company") {
    if (!body.empresa_id) return fail("empresa_id is required", 400, null, req);

    const { data: company, error: companyError } = await admin
      .from("empresas")
      .select("id,nome,status")
      .eq("id", body.empresa_id)
      .maybeSingle();

    if (companyError) return fail(companyError.message, 400, null, req);
    if (!company?.id) return fail("Empresa não encontrada", 404, null, req);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (60 * 60 * 1000));
    const operationId = crypto.randomUUID();

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: company.id,
      actionType: "OWNER_IMPERSONATION_START",
      details: {
        company_id: company.id,
        company_name: company.nome ?? null,
        company_status: company.status ?? null,
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        operation_id: operationId,
      },
    });

    return okWithOperation(req, {
      success: true,
      impersonation: {
        empresa_id: company.id,
        empresa_nome: company.nome ?? null,
        company_status: company.status ?? null,
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
    }, operationId);
  }

  if (body.action === "stop_impersonation") {
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

  if (body.action === "create_system_admin") {
    if (!body.user_id) return fail("user_id is required", 400, null, req);

    const { data: profile } = await admin
      .from("profiles")
      .select("empresa_id")
      .eq("id", body.user_id)
      .maybeSingle();

    if (!profile?.empresa_id) return fail("User profile/empresa not found", 404, null, req);

    const { error } = await admin
      .from("user_roles")
      .upsert({
        user_id: body.user_id,
        empresa_id: profile.empresa_id,
        role: "SYSTEM_ADMIN",
      }, { onConflict: "user_id,empresa_id,role" });

    if (error) return fail(error.message, 400, null, req);
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
    const password = body.owner_user.password?.trim() || `Tmp#${Math.random().toString(36).slice(2, 10)}!`;

    const { data: existingUsersPage, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) return fail(listError.message, 400, null, req);

    const existingUser = (existingUsersPage?.users ?? []).find((user: any) => (user?.email ?? "").toLowerCase() === normalizedEmail);

    let ownerUserId = existingUser?.id ?? null;

    if (!ownerUserId) {
      const { data: createdAuth, error: createAuthError } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          nome: body.owner_user.nome,
        },
      });

      if (createAuthError || !createdAuth?.user?.id) {
        return fail(createAuthError?.message ?? "Failed to create owner user", 400, null, req);
      }

      ownerUserId = createdAuth.user.id;
    }

    const { data: company } = await admin
      .from("empresas")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!company?.id) return fail("Nenhuma empresa disponível para vínculo do owner", 400, null, req);

    const ownerRole = body.owner_user.role ?? "SYSTEM_ADMIN";

    const { error: profileError } = await admin
      .from("profiles")
      .upsert({
        id: ownerUserId,
        empresa_id: company.id,
        nome: body.owner_user.nome,
        email: normalizedEmail,
      }, { onConflict: "id" });

    if (profileError) return fail(profileError.message, 400, null, req);

    const { error: roleError } = await admin
      .from("user_roles")
      .upsert({
        user_id: ownerUserId,
        empresa_id: company.id,
        role: ownerRole,
      }, { onConflict: "user_id,empresa_id,role" });

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
        temporary_password: existingUser ? null : password,
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
    const userIds = cleanupResult.userIds ?? [];
    const tableErrors = cleanupResult.tableErrors ?? [];

    let deletedAuthUsers = 0;
    if (includeAuthUsers && userIds.length > 0) {
      deletedAuthUsers = await deleteAuthUsers(admin, userIds);
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

    let query = admin.from(tableName).delete({ count: "exact" });

    if (body.empresa_id) {
      if (!hasEmpresaId) {
        return fail("Tabela sem empresa_id; remova o filtro de empresa para purge global.", 400, null, req);
      }
      query = query.eq("empresa_id", body.empresa_id);
    }

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

  if (body.action === "delete_company") {
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

    const { data: company, error: companyError } = await admin
      .from("empresas")
      .select("id,nome,slug")
      .eq("id", body.empresa_id)
      .maybeSingle();

    if (companyError) return fail(companyError.message, 400, null, req);
    if (!company?.id) return fail("Empresa não encontrada", 404, null, req);

    const expectedName = company.nome ?? company.slug ?? "";

    const includeAuthUsers = Boolean(body.include_auth_users);

    const cleanupResult = await cleanupCompanyTenantRows(admin, body.empresa_id, {
      keepCompanyCore: false,
      keepBillingData: false,
    });

    if (cleanupResult.error) {
      return fail(cleanupResult.error, 400, {
        operation_id: operationId,
        table_errors: cleanupResult.tableErrors,
      }, req);
    }

    const userIds = cleanupResult.userIds ?? [];
    const tableErrors = cleanupResult.tableErrors ?? [];
    const cleanupDeletedByTable = cleanupResult.deletedByTable ?? {};
    let deletedAuthUsers = 0;
    if (includeAuthUsers && userIds.length > 0) {
      deletedAuthUsers = await deleteAuthUsers(admin, userIds);
    }

    await admin.from("configuracoes_sistema").delete().eq("empresa_id", body.empresa_id);
    await admin.from("dados_empresa").delete().eq("empresa_id", body.empresa_id);
    await admin.from("contracts").delete().eq("empresa_id", body.empresa_id);
    await admin.from("subscriptions").delete().eq("empresa_id", body.empresa_id);

    let lastDeleteCompanyError: { message?: string; code?: string } | null = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { error: deleteCompanyError } = await admin
        .from("empresas")
        .delete()
        .eq("id", body.empresa_id);

      if (!deleteCompanyError) {
        lastDeleteCompanyError = null;
        break;
      }

      lastDeleteCompanyError = deleteCompanyError;
      const isFkError = isForeignKeyError(deleteCompanyError);

      if (!isFkError) {
        break;
      }

      const referencedTable = extractReferencedTableFromFkError(deleteCompanyError.message);
      if (!referencedTable) {
        break;
      }

      const fallbackDelete = await admin
        .from(referencedTable)
        .delete({ count: "exact" })
        .eq("empresa_id", body.empresa_id);

      if (fallbackDelete.error) {
        break;
      }
    }

    if (lastDeleteCompanyError) {
      const referencedTable = extractReferencedTableFromFkError(lastDeleteCompanyError.message);
      return fail(
        `Falha ao excluir empresa por dependências de FK (${referencedTable ?? "empresa_id"}). Execute cleanup_company_data/delete_company no backend atualizado para remover dependências tenant antes da exclusão física. Detalhe: ${lastDeleteCompanyError.message}`,
        400,
        {
          fk_table: referencedTable,
          reason: lastDeleteCompanyError.message,
        },
        req,
      );
    }

    await logOwnerMasterHiddenAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: body.empresa_id,
      actionType: "OWNER_MASTER_DELETE_COMPANY",
      details: {
        empresa_id: body.empresa_id,
        company_name: expectedName,
        include_auth_users: includeAuthUsers,
        deleted_auth_users: deletedAuthUsers,
        operation_id: operationId,
        table_errors: tableErrors,
      },
    });

    await logAuditEvent(admin, {
      action: "OWNER_MASTER_DELETE_COMPANY",
      entityType: "company",
      entityId: body.empresa_id,
      empresaId: body.empresa_id,
      userId: auth.user.id,
      payload: {
        company_name: expectedName,
        include_auth_users: includeAuthUsers,
        deleted_auth_users: deletedAuthUsers,
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
        company_name: expectedName,
        deleted_auth_users: deletedAuthUsers,
      },
    });

    const affectedTables = Object.keys(cleanupDeletedByTable);
    const rowsDeleted = Object.values(cleanupDeletedByTable).reduce((acc: number, value) => acc + Number(value ?? 0), 0);

    return okWithOperation(req, {
      success: true,
      summary: {
        empresa_id: body.empresa_id,
        company_name: expectedName,
        deleted_auth_users: deletedAuthUsers,
        affected_tables: affectedTables,
        rows_deleted: rowsDeleted,
        table_errors: tableErrors,
      },
      affected_tables: affectedTables,
      rows_deleted: rowsDeleted,
      table_errors: tableErrors,
    }, operationId);
  }

  if (body.action === "cleanup_owner_stress_data") {
    const summary = {
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

      for (const userId of stressUserIds) {
        await admin.auth.admin.deleteUser(userId);
      }
    }

    const { error: auditCleanupError } = await admin
      .from("enterprise_audit_logs")
      .delete()
      .or("details->>action.ilike.%stress%,details::text.ilike.%stress-company-%,details::text.ilike.%stress-plan-%");

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
