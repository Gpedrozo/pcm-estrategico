import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, ensureEmpresaAccess, isSystemOperator, requireUser } from "../_shared/auth.ts";
import { logAuditEvent, failRateLimited } from "../_shared/audit.ts";
import { createRequestTrace, traceDurationMs, writeOperationalLog } from "../_shared/observability.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { fail, ok, preflight, rejectIfOriginNotAllowed } from "../_shared/response.ts";

type Payload = {
  action: "list_members" | "upsert_member" | "disable_member";
  empresa_id: string;
  user_id?: string;
  role?: string;
};

async function canManageMembers(admin: ReturnType<typeof adminClient>, userId: string, empresaId: string) {
  const system = await isSystemOperator(admin, userId);
  if (system) return true;

  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("empresa_id", empresaId)
    .eq("role", "ADMIN")
    .limit(1);

  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

Deno.serve(async (req) => {
  const trace = createRequestTrace("company-membership", req);

  if (req.method === "OPTIONS") return preflight(req, "POST, OPTIONS");

  const originDenied = rejectIfOriginNotAllowed(req);
  if (originDenied) return originDenied;

  if (req.method !== "POST") return fail("Method not allowed", 405, null, req);

  const auth = await requireUser(req);
  if ("error" in auth) return fail(auth.error ?? "Unauthorized", auth.status ?? 401, null, req);

  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body?.action || !body.empresa_id) return fail("action and empresa_id are required", 400, null, req);

  const admin = adminClient();

  const rateLimit = await enforceRateLimit(admin, {
    scope: "edge.company-membership",
    identifier: `${auth.user.id}:${body.action}`,
    maxRequests: 60,
    windowSeconds: 60,
    blockSeconds: 900,
  });
  if (!rateLimit.allowed) return failRateLimited(req, "Rate limit exceeded for membership service");

  const allowed = await ensureEmpresaAccess(admin, auth.user.id, body.empresa_id);
  if (!allowed) return fail("Forbidden for empresa", 403, null, req);

  const canManage = await canManageMembers(admin, auth.user.id, body.empresa_id);
  if (!canManage) return fail("Insufficient permissions", 403, null, req);

  if (body.action === "list_members") {
    const { data, error } = await admin
      .from("user_roles")
      .select("user_id,empresa_id,role,created_at")
      .eq("empresa_id", body.empresa_id)
      .order("created_at", { ascending: false });
    if (error) return fail(error.message, 400, null, req);
    await writeOperationalLog(admin, {
      scope: trace.scope,
      action: body.action,
      endpoint: trace.endpoint,
      statusCode: 200,
      durationMs: traceDurationMs(trace),
      empresaId: body.empresa_id,
      userId: auth.user.id,
      metadata: { count: Array.isArray(data) ? data.length : 0 },
    });
    return ok({ members: data ?? [] }, 200, req);
  }

  if (body.action === "upsert_member") {
    if (!body.user_id || !body.role) return fail("user_id and role are required", 400, null, req);

    const { error: limitError } = await admin.rpc("check_company_plan_limit", {
      p_empresa_id: body.empresa_id,
      p_limit_type: "users",
      p_increment: 1,
    });
    if (limitError) return fail(limitError.message, 429, { code: "PLAN_LIMIT_EXCEEDED" }, req);

    const { error: roleError } = await admin
      .from("user_roles")
      .upsert(
        {
          user_id: body.user_id,
          empresa_id: body.empresa_id,
          role: body.role,
        },
        { onConflict: "user_id,empresa_id,role" },
      );

    if (roleError) return fail(roleError.message, 400, null, req);

    const durationMs = traceDurationMs(trace);
    await logAuditEvent(admin, {
      action: "UPSERT_MEMBER",
      entityType: "user_roles",
      entityId: body.user_id,
      empresaId: body.empresa_id,
      userId: auth.user.id,
      req,
      endpoint: trace.endpoint,
      executionMs: durationMs,
      payload: { role: body.role },
    });
    await writeOperationalLog(admin, {
      scope: trace.scope,
      action: body.action,
      endpoint: trace.endpoint,
      statusCode: 200,
      durationMs,
      empresaId: body.empresa_id,
      userId: auth.user.id,
      metadata: { managed_user_id: body.user_id, role: body.role },
    });
    return ok({ success: true }, 200, req);
  }

  if (body.action === "disable_member") {
    if (!body.user_id) return fail("user_id is required", 400, null, req);

    const { error } = await admin
      .from("user_roles")
      .delete()
      .eq("empresa_id", body.empresa_id)
      .eq("user_id", body.user_id);

    if (error) return fail(error.message, 400, null, req);

    const durationMs = traceDurationMs(trace);
    await logAuditEvent(admin, {
      action: "DISABLE_MEMBER",
      entityType: "user_roles",
      entityId: body.user_id,
      empresaId: body.empresa_id,
      userId: auth.user.id,
      req,
      endpoint: trace.endpoint,
      executionMs: durationMs,
      payload: { managed_user_id: body.user_id },
    });
    await writeOperationalLog(admin, {
      scope: trace.scope,
      action: body.action,
      endpoint: trace.endpoint,
      statusCode: 200,
      durationMs,
      empresaId: body.empresa_id,
      userId: auth.user.id,
      metadata: { managed_user_id: body.user_id },
    });
    return ok({ success: true }, 200, req);
  }

  return fail("Unsupported action", 400, null, req);
});
