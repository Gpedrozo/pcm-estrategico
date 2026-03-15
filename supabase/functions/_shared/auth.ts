// @ts-nocheck
// @ts-ignore: Deno JSR import is resolved at Supabase edge runtime
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

function maskToken(token: string) {
  if (!token) return "";
  if (token.length <= 16) return "***";
  return `${token.slice(0, 8)}...${token.slice(-8)}`;
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
    console.log("JWT RECEIVED:", "missing");
    return { error: "unauthorized", status: 401 } as const;
  }

  console.log("JWT RECEIVED:", maskToken(token));

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    console.log("USER AUTH:", "null");
    return { error: "unauthorized", status: 401 } as const;
  }

  console.log("USER AUTH:", data.user.email ?? null);

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
