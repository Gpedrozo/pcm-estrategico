import { createClient } from "jsr:@supabase/supabase-js@2";

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function adminClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
}

export function tokenFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim();
}

export async function requireUser(req: Request) {
  const token = tokenFromRequest(req);
  if (!token) {
    return { error: "Missing bearer token", status: 401 } as const;
  }

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    return { error: "Invalid token", status: 401 } as const;
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
    .from("membros_empresa")
    .select("id,status")
    .eq("empresa_id", empresaId)
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);

  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}
