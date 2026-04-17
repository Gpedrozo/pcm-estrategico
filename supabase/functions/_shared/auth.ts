// @ts-expect-error Deno JSR import is resolved at Supabase edge runtime.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveCorsHeaders } from "./response.ts";

declare const Deno: any;

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function adminClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
}

export function userClient(token?: string | null) {
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!anonKey) return null;

  return createClient(env("SUPABASE_URL"), anonKey, {
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  });
}

export function tokenFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim();
}

export function unauthorizedPayload() {
  return {
    success: false,
    error: "unauthorized",
  };
}

export function unauthorizedResponse(req: Request) {
  return new Response(JSON.stringify(unauthorizedPayload()), {
    status: 401,
    headers: { ...resolveCorsHeaders(req), "Content-Type": "application/json" },
  });
}

export async function requireUser(req: Request, options?: { allowPasswordChangeFlow?: boolean }) {
  const token = tokenFromRequest(req);
  if (!token) {
    return { error: "unauthorized", status: 401 } as const;
  }

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    return { error: "unauthorized", status: 401 } as const;
  }

  const profileCheck = await admin
    .from("profiles")
    .select("force_password_change")
    .eq("id", data.user.id)
    .maybeSingle();

  const requiresPasswordChange = Boolean((profileCheck.data as any)?.force_password_change);
  const requestPath = new URL(req.url).pathname;
  const allowPasswordChangeFlow =
    Boolean(options?.allowPasswordChangeFlow)
    ||
    requestPath.includes("/auth-change-password")
    || req.headers.get("x-allow-password-change") === "1";

  if (requiresPasswordChange && !allowPasswordChangeFlow) {
    return {
      error: "Password change required before accessing protected APIs",
      status: 428,
    } as const;
  }

  return { user: data.user, token, admin } as const;
}

/**
 * Verifica se o usuário tem role de Owner (SYSTEM_OWNER ou SYSTEM_ADMIN).
 * Usado para proteger o módulo Owner/Owner2. MASTER_TI NÃO tem acesso.
 */
export async function isOwnerOperator(admin: ReturnType<typeof adminClient>, userId: string) {
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["SYSTEM_OWNER", "SYSTEM_ADMIN"])
    .limit(1);

  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

/**
 * Verifica se o usuário tem role de operador global (acesso cross-empresa).
 * Inclui MASTER_TI para bypass de empresa, mas NÃO dá acesso ao Owner.
 */
export async function isSystemOperator(admin: ReturnType<typeof adminClient>, userId: string) {
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["SYSTEM_OWNER", "SYSTEM_ADMIN", "MASTER_TI"])
    .limit(1);

  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

export async function ensureEmpresaAccess(
  admin: ReturnType<typeof adminClient>,
  userId: string,
  empresaId: string,
) {
  const system = await isSystemOperator(admin, userId);
  if (system) return true;

  const { data, error } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("empresa_id", empresaId)
    .eq("user_id", userId)
    .limit(1);

  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

export async function requireEmpresaScope(
  admin: ReturnType<typeof adminClient>,
  userId: string,
  empresaId?: string | null,
) {
  if (!empresaId) {
    return { error: "empresa_id is required", status: 400 } as const;
  }

  const allowed = await ensureEmpresaAccess(admin, userId, empresaId);
  if (!allowed) {
    return { error: "Forbidden for empresa", status: 403 } as const;
  }

  return { empresaId } as const;
}

function normalizeHost(input?: string | null) {
  const value = String(input ?? "").trim().toLowerCase();
  if (!value) return null;
  return value.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

function resolveRequestTenantHost(req: Request) {
  const explicitHost = normalizeHost(req.headers.get("x-tenant-host") ?? req.headers.get("x-forwarded-host"));
  if (explicitHost) return explicitHost;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return normalizeHost(new URL(origin).hostname);
    } catch {
      // noop
    }
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return normalizeHost(new URL(referer).hostname);
    } catch {
      // noop
    }
  }

  return null;
}

export async function resolveEmpresaIdFromRequest(
  admin: ReturnType<typeof adminClient>,
  req: Request,
  explicitEmpresaId?: string | null,
) {
  const directHeaderEmpresaId = String(
    req.headers.get("x-empresa-id") ?? req.headers.get("x-tenant-id") ?? "",
  ).trim();

  const directEmpresaId = String(explicitEmpresaId ?? directHeaderEmpresaId).trim();
  if (directEmpresaId) {
    return { empresaId: directEmpresaId, source: "explicit" as const };
  }

  const tenantBaseDomain = normalizeHost(
    Deno.env.get("TENANT_BASE_DOMAIN")
      ?? Deno.env.get("VITE_TENANT_BASE_DOMAIN")
      ?? "gppis.com.br",
  ) ?? "gppis.com.br";

  const host = resolveRequestTenantHost(req);
  if (!host) return { empresaId: null, source: "none" as const };

  const isBaseHost = host === tenantBaseDomain || host === `www.${tenantBaseDomain}`;
  if (isBaseHost) return { empresaId: null, source: "base-domain" as const };
  if (!host.endsWith(`.${tenantBaseDomain}`)) return { empresaId: null, source: "outside-tenant-domain" as const };

  const slug = host.replace(`.${tenantBaseDomain}`, "").split(".")[0]?.trim().toLowerCase() || "";
  if (!slug || slug === "www") return { empresaId: null, source: "invalid-slug" as const };

  const { data: domainConfig, error: domainError } = await admin
    .from("empresa_config")
    .select("empresa_id")
    .eq("dominio_custom", host)
    .maybeSingle();

  if (domainError) {
    return { empresaId: null, source: "domain-error" as const };
  }

  const { data: companyBySlug, error: slugError } = await admin
    .from("empresas")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (slugError) {
    return { empresaId: null, source: "slug-error" as const };
  }

  const domainEmpresaId = String(domainConfig?.empresa_id ?? "").trim() || null;
  const slugEmpresaId = String(companyBySlug?.id ?? "").trim() || null;

  if (domainEmpresaId && slugEmpresaId && domainEmpresaId !== slugEmpresaId) {
    return { empresaId: null, source: "host-slug-mismatch" as const };
  }

  const empresaId = domainEmpresaId || slugEmpresaId;
  return {
    empresaId,
    source: empresaId ? "host" as const : "not-found",
  };
}

export async function requireTenantContext(
  admin: ReturnType<typeof adminClient>,
  req: Request,
  userId: string,
  explicitEmpresaId?: string | null,
) {
  const resolved = await resolveEmpresaIdFromRequest(admin, req, explicitEmpresaId);
  if (!resolved.empresaId) {
    return {
      error: "Tenant context is required",
      status: 400,
      reason: resolved.source,
    } as const;
  }

  if (explicitEmpresaId && String(explicitEmpresaId).trim() && String(explicitEmpresaId).trim() !== resolved.empresaId) {
    return {
      error: "Tenant mismatch between request and payload",
      status: 403,
      reason: "payload-host-mismatch",
    } as const;
  }

  const allowed = await ensureEmpresaAccess(admin, userId, resolved.empresaId);
  if (!allowed) {
    return {
      error: "Forbidden for tenant",
      status: 403,
      reason: "access-denied",
    } as const;
  }


  // ── Empresa status check — block API access if empresa is blocked ──
  // System operators (SYSTEM_OWNER, SYSTEM_ADMIN, MASTER_TI) bypass this check
  const sysOp = await isSystemOperator(admin, userId);
  if (!sysOp) {
    const { data: empresa } = await admin
      .from("empresas")
      .select("status")
      .eq("id", resolved.empresaId)
      .maybeSingle();

    const empresaStatus = String(empresa?.status ?? "active").toLowerCase();
    if (empresaStatus === "blocked" || empresaStatus === "deleted") {
      return {
        error: "Empresa bloqueada ou inativa. Acesso negado.",
        status: 403,
        reason: "empresa-blocked",
      } as const;
    }
  }

  return {
    empresaId: resolved.empresaId,
    source: resolved.source,
  } as const;
}
