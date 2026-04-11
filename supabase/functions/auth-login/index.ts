import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { adminClient } from "../_shared/auth.ts";
import { fail, ok, preflight, rejectIfOriginNotAllowed } from "../_shared/response.ts";

type Payload = {
  email?: string;
  password?: string;
};

type ProfilePayload = {
  id: string;
  nome: string;
  email: string;
  tenant_id: string | null;
  force_password_change: boolean;
  roles: string[];
};

type TenantPayload = {
  id: string;
  slug: string | null;
  name: string | null;
};

const WINDOW_MS = 5 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function envOptional(name: string) {
  const value = Deno.env.get(name);
  return value && value.trim() ? value : null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function resolveClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for") ?? "";
  const firstForwardedIp = forwardedFor.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  return firstForwardedIp || realIp || cfIp || "unknown";
}

function isRateLimitStorageError(message?: string | null) {
  const text = String(message ?? "").toLowerCase();
  return text.includes("login_attempts") || text.includes("relation") || text.includes("does not exist");
}

function isMissingRelationError(message?: string | null, relationName?: string) {
  const text = String(message ?? "").toLowerCase();
  if (!text) return false;
  if (relationName && !text.includes(relationName.toLowerCase())) return false;
  return text.includes("does not exist") || text.includes("relation") || text.includes("schema cache");
}

function toRoles(values: unknown[]): string[] {
  return Array.from(new Set(
    values
      .map((value) => String(value ?? "").trim())
      .filter(Boolean),
  ));
}

function authPayloadMessage(payload: any) {
  return String(
    payload?.msg
    ?? payload?.message
    ?? payload?.error_description
    ?? payload?.error
    ?? "",
  ).trim();
}

function authPayloadErrorId(payload: any) {
  return String(payload?.error_id ?? payload?.errorId ?? '').trim() || null;
}

function isCredentialFailure(status: number, payload: any) {
  const message = authPayloadMessage(payload).toLowerCase();
  if (message.includes("invalid login credentials")) return true;
  if (message.includes("invalid credentials")) return true;
  if (message.includes("email not confirmed")) return true;
  if (message.includes("email or password")) return true;
  if (status === 400 && !message) return true;
  return false;
}

async function resolveProfileAndTenant(admin: ReturnType<typeof createClient>, user: any) {
  const userId = String(user?.id ?? "");
  const userEmail = String(user?.email ?? "").trim().toLowerCase();

  let tenantId: string | null = null;
  let tenantSlug: string | null = null;
  let tenantName: string | null = null;

  let profileNome = "Usuário";
  let profileForcePasswordChange = false;
  const roleCandidates: unknown[] = [];

  const profileQuery = await admin
    .from("profiles")
    .select("nome,email,empresa_id,tenant_id,force_password_change")
    .eq("id", userId)
    .maybeSingle();

  if (!profileQuery.error && profileQuery.data) {
    profileNome = String(profileQuery.data.nome ?? profileNome);
    profileForcePasswordChange = Boolean(profileQuery.data.force_password_change);
    tenantId = String(profileQuery.data.tenant_id ?? profileQuery.data.empresa_id ?? "").trim() || null;
  }

  const tenantUserQuery = await admin
    .from("tenant_users")
    .select("tenant_id,role")
    .eq("user_id", userId)
    .limit(1);

  if (!tenantUserQuery.error && Array.isArray(tenantUserQuery.data) && tenantUserQuery.data.length > 0) {
    const first = tenantUserQuery.data[0] as { tenant_id?: string | null; role?: string | null };
    tenantId = String(first.tenant_id ?? "").trim() || tenantId;
    roleCandidates.push(first.role);
  }

  const userRolesQuery = await admin
    .from("user_roles")
    .select("empresa_id,role")
    .eq("user_id", userId)
    .limit(10);

  if (!userRolesQuery.error && Array.isArray(userRolesQuery.data) && userRolesQuery.data.length > 0) {
    const firstRole = userRolesQuery.data[0] as { empresa_id?: string | null; role?: string | null };
    tenantId = String(firstRole.empresa_id ?? "").trim() || tenantId;
    for (const item of userRolesQuery.data) {
      roleCandidates.push((item as { role?: string | null }).role);
    }
  }

  if (tenantId) {
    const tenantQuery = await admin
      .from("tenants")
      .select("id,slug,name")
      .eq("id", tenantId)
      .maybeSingle();

    if (!tenantQuery.error && tenantQuery.data) {
      tenantSlug = String(tenantQuery.data.slug ?? "").trim() || null;
      tenantName = String(tenantQuery.data.name ?? "").trim() || null;
    }

    if (tenantQuery.error && !isMissingRelationError(tenantQuery.error.message, "tenants")) {
      throw new Error(`tenant_lookup_failed: ${tenantQuery.error.message}`);
    }
  }

  if (tenantId && (!tenantSlug || !tenantName)) {
    const companyQuery = await admin
      .from("empresas")
      .select("id,slug,nome")
      .eq("id", tenantId)
      .maybeSingle();

    if (!companyQuery.error && companyQuery.data) {
      tenantSlug = String(companyQuery.data.slug ?? "").trim() || tenantSlug;
      tenantName = String(companyQuery.data.nome ?? "").trim() || tenantName;
    }
  }

  const roles = toRoles(roleCandidates);

  const tenant: TenantPayload | null = tenantId
    ? {
        id: tenantId,
        slug: tenantSlug,
        name: tenantName,
      }
    : null;

  const profile: ProfilePayload = {
    id: userId,
    nome: profileNome,
    email: userEmail,
    tenant_id: tenantId,
    force_password_change: profileForcePasswordChange,
    roles,
  };

  return { profile, tenant };
}

async function signInWithPassword(email: string, password: string, req: Request) {
  const supabaseUrl = env("SUPABASE_URL");
  const anonKeyFromEnv = envOptional("EDGE_PUBLIC_ANON_KEY")
    ?? envOptional("ANON_KEY")
    ?? envOptional("SUPABASE_ANON_KEY")
    ?? envOptional("SUPABASE_PUBLISHABLE_KEY");
  const apikeyFromRequest = req.headers.get("apikey")?.trim() ?? null;
  const anonKey = anonKeyFromEnv || apikeyFromRequest;

  if (!anonKey) {
    console.error("[auth-login] missing anon key in edge runtime and request headers");
    return {
      ok: false,
      status: 401,
      payload: {
        error: "Invalid credentials",
      },
    };
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight(req, "POST, OPTIONS");

  const originDenied = rejectIfOriginNotAllowed(req);
  if (originDenied) return originDenied;

  if (req.method !== "POST") return fail("Method not allowed", 405, null, req);

  try {
    const body = (await req.json().catch(() => null)) as Payload | null;
    const email = normalizeEmail(body?.email ?? "");
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return fail("Email and password required", 400, null, req);
    }

    const ipAddress = resolveClientIp(req);
    let admin: ReturnType<typeof createClient> | null = null;
    try {
      admin = adminClient();
    } catch (error: any) {
      console.error("[auth-login] admin client unavailable, continuing without throttle", {
        reason: error?.message ?? String(error),
      });
    }
    const now = Date.now();

    let currentAttemptRaw: {
      attempt_count: number;
      window_start: string | null;
      blocked_until: string | null;
    } | null = null;
    let fetchError: { message?: string } | null = null;

    if (admin) {
      const query = await admin
        .from("login_attempts")
        .select("attempt_count,window_start,blocked_until")
        .eq("email", email)
        .eq("ip_address", ipAddress)
        .maybeSingle();

      currentAttemptRaw = query.data as typeof currentAttemptRaw;
      fetchError = query.error as typeof fetchError;
    }

    if (fetchError) {
      console.error("[auth-login] rate-limit storage unavailable, continuing without throttle", {
        reason: fetchError.message,
      });
    }

    const currentAttempt = fetchError ? null : currentAttemptRaw;

    const blockedUntilMs = currentAttempt?.blocked_until ? new Date(currentAttempt.blocked_until).getTime() : 0;
    if (blockedUntilMs > now) {
      const retryAfterSeconds = Math.max(1, Math.ceil((blockedUntilMs - now) / 1000));
      return fail("Muitas tentativas de login. Tente novamente mais tarde.", 429, {
        retry_after_seconds: retryAfterSeconds,
      }, req);
    }

    const windowStartMs = currentAttempt?.window_start ? new Date(currentAttempt.window_start).getTime() : now;
    const isWindowExpired = now - windowStartMs > WINDOW_MS;

    const signIn = await signInWithPassword(email, password, req);

    if (!signIn.ok) {
      const nextAttemptCount = isWindowExpired
        ? 1
        : Number(currentAttempt?.attempt_count ?? 0) + 1;

      const shouldBlock = nextAttemptCount >= MAX_ATTEMPTS;
      const nextBlockedUntil = shouldBlock ? new Date(now + BLOCK_MS).toISOString() : null;

      if (admin) {
        const { error: upsertError } = await admin.from("login_attempts").upsert({
          email,
          ip_address: ipAddress,
          attempt_count: nextAttemptCount,
          window_start: new Date(isWindowExpired ? now : windowStartMs).toISOString(),
          blocked_until: nextBlockedUntil,
        }, {
          onConflict: "email,ip_address",
        });

        if (upsertError) {
          console.error("[auth-login] failed to persist login attempt, returning auth result", {
            reason: upsertError.message,
          });
        }
      }

      if (shouldBlock) {
        return fail("Muitas tentativas de login. Tente novamente mais tarde.", 429, {
          retry_after_seconds: Math.ceil(BLOCK_MS / 1000),
        }, req);
      }

      if (!isCredentialFailure(signIn.status, signIn.payload)) {
        const authMessage = authPayloadMessage(signIn.payload);
        const authErrorId = authPayloadErrorId(signIn.payload);
        const isSchemaQueryFailure = authMessage.toLowerCase().includes("database error querying schema");
        console.error("[auth-login] auth provider rejected request", {
          status: signIn.status,
          message: authMessage,
          error_id: authErrorId,
        });

        if (isSchemaQueryFailure) {
          return fail("Auth schema misconfigured", 503, {
            auth_status: signIn.status,
            auth_message: authMessage || null,
            auth_error_id: authErrorId,
            remediation: "run_auth_hook_hardening",
          }, req);
        }

        return fail("Auth provider request failed", 502, {
          auth_status: signIn.status,
          auth_message: authMessage || null,
          auth_error_id: authErrorId,
        }, req);
      }

      return fail("Invalid credentials", 401, null, req);
    }

    const loginUser = signIn.payload?.user;
    const accessToken = String(signIn.payload?.access_token ?? "").trim();
    const refreshToken = String(signIn.payload?.refresh_token ?? "").trim();

    if (!loginUser?.id || !accessToken || !refreshToken) {
      console.error("[auth-login] signIn payload missing tokens/user", {
        hasUser: Boolean(loginUser?.id),
        hasAccessToken: Boolean(accessToken),
        hasRefreshToken: Boolean(refreshToken),
      });
      return fail("Invalid credentials", 401, null, req);
    }

    let profile: ProfilePayload = {
      id: String(loginUser.id),
      nome: "Usuário",
      email: String(loginUser.email ?? email),
      tenant_id: null,
      force_password_change: false,
      roles: [],
    };
    let tenant: TenantPayload | null = null;

    if (admin) {
      try {
        const resolved = await resolveProfileAndTenant(admin, loginUser);
        profile = resolved.profile;
        tenant = resolved.tenant;
      } catch (error: any) {
        console.error("[auth-login] profile/tenant resolution degraded", {
          reason: error?.message ?? String(error),
        });
      }
    }

    // ── Check empresa status — block if company is blocked ─────────────
    if (admin && tenant?.id) {
      try {
        const { data: empresa } = await admin
          .from("empresas")
          .select("status")
          .eq("id", tenant.id)
          .maybeSingle();

        const empresaStatus = String(empresa?.status ?? "active").toLowerCase();

        if (empresaStatus === "blocked") {
          // Fetch platform contact config for the error response
          let contactEmail = "";
          let contactWhatsapp = "";
          let contactName = "";
          let customMessage = "";

          const { data: configRows } = await admin
            .from("configuracoes_sistema")
            .select("chave,valor")
            .is("empresa_id", null)
            .in("chave", [
              "platform.contact_email",
              "platform.contact_whatsapp",
              "platform.contact_name",
              "platform.expiry_custom_message",
            ]);

          for (const row of (configRows ?? [])) {
            const r = row as Record<string, unknown>;
            const chave = String(r.chave ?? "");
            let val = r.valor;
            if (typeof val === "string") {
              try { val = JSON.parse(val); } catch { /* keep */ }
            }
            const sVal = String(val ?? "").trim();
            if (chave === "platform.contact_email") contactEmail = sVal;
            if (chave === "platform.contact_whatsapp") contactWhatsapp = sVal;
            if (chave === "platform.contact_name") contactName = sVal;
            if (chave === "platform.expiry_custom_message") customMessage = sVal;
          }

          console.warn("[auth-login] empresa blocked, denying login", {
            empresa_id: tenant.id,
            empresa_status: empresaStatus,
            user_email: email,
          });

          return fail("subscription_expired", 403, {
            code: "subscription_expired",
            contact_email: contactEmail || null,
            contact_whatsapp: contactWhatsapp || null,
            contact_name: contactName || null,
            custom_message: customMessage || null,
          }, req);
        }
      } catch (checkErr: any) {
        console.error("[auth-login] empresa status check degraded (allowing login)", {
          reason: checkErr?.message ?? String(checkErr),
        });
      }
    }

    if (admin) {
      const { error: clearAttemptsError } = await admin
        .from("login_attempts")
        .upsert({
          email,
          ip_address: ipAddress,
          attempt_count: 0,
          window_start: new Date(now).toISOString(),
          blocked_until: null,
        }, {
          onConflict: "email,ip_address",
        });

      if (clearAttemptsError) {
        console.error("[auth-login] failed to clear login attempts after success", {
          reason: clearAttemptsError.message,
        });
      }
    }

    return ok({
      user: signIn.payload.user ?? null,
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: signIn.payload.token_type ?? null,
        expires_in: signIn.payload.expires_in ?? null,
        expires_at: signIn.payload.expires_at ?? null,
      },
      tenant,
      profile,
      access_token: accessToken,
      refresh_token: refreshToken,
    }, 200, req);
  } catch (error: any) {
    console.error("[auth-login] unexpected error", {
      reason: error?.message ?? String(error),
    });
    return fail("Invalid credentials", 401, null, req);
  }
});
