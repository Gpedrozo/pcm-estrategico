import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, requireUser } from "../_shared/auth.ts";
import { fail, ok, preflight, rejectIfOriginNotAllowed } from "../_shared/response.ts";
import { createRequestTrace, traceDurationMs, writeOperationalLog } from "../_shared/observability.ts";
import { logAuditEvent } from "../_shared/audit.ts";
import { captureSystemError } from "../_shared/monitoring.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { validateBody, z } from "../_shared/validation.ts";

const PayloadSchema = z.object({
  new_password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(128),
});

Deno.serve(async (req) => {
  const trace = createRequestTrace("auth-change-password", req, "change_password");

  try {
    if (req.method === "OPTIONS") return preflight(req, "POST, OPTIONS");

    const originDenied = rejectIfOriginNotAllowed(req);
    if (originDenied) return originDenied;

    if (req.method !== "POST") return fail("Method not allowed", 405, null, req);

    const auth = await requireUser(req, { allowPasswordChangeFlow: true });

    if ("error" in auth) return fail(auth.error ?? "Unauthorized", auth.status ?? 401, null, req);

    const admin = adminClient();

    const rl = await enforceRateLimit(admin, {
      scope: "auth-change-password",
      identifier: auth.user.id,
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (!rl.allowed) return fail("Rate limit exceeded", 429, null, req);

    const validated = await validateBody(req, PayloadSchema);
    if (validated.error) return validated.error;

    const newPassword = validated.data.new_password.trim();
    const currentPassword = validated.data.current_password;

    // EF-07: Verify current password before allowing change (prevent stolen JWT abuse)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("EDGE_PUBLIC_ANON_KEY") ?? "";
    const verifyResp = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: auth.user.email, password: currentPassword }),
    });
    if (!verifyResp.ok) {
      return fail("Senha atual incorreta", 401, { source: "current_password_verify" }, req);
    }

    const currentAppMetadata = (auth.user.app_metadata ?? {}) as Record<string, unknown>;
    const currentUserMetadata = (auth.user.user_metadata ?? {}) as Record<string, unknown>;

    const { error: updateAuthError } = await admin.auth.admin.updateUserById(auth.user.id, {
      password: newPassword,
      app_metadata: {
        ...currentAppMetadata,
        force_password_change: false,
        must_change_password: false,
      },
      user_metadata: {
        ...currentUserMetadata,
        force_password_change: false,
        must_change_password: false,
      },
    });

    if (updateAuthError) {
      return fail(`Falha ao atualizar senha no Auth: ${updateAuthError.message}`, 400, {
        source: "admin_update_user",
      }, req);
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({ force_password_change: false })
      .eq("id", auth.user.id);

    if (profileError) {
      return fail(`Falha ao atualizar perfil de senha: ${profileError.message}`, 400, {
        source: "profiles_update",
      }, req);
    }

    const durationMs = traceDurationMs(trace);

    await logAuditEvent(admin, {
      action: "AUTH_PASSWORD_CHANGED",
      entityType: "profiles",
      entityId: auth.user.id,
      userId: auth.user.id,
      req,
      endpoint: trace.endpoint,
      executionMs: durationMs,
      requestId: trace.requestId,
      source: "auth-change-password",
      payload: {
        force_password_change: false,
        app_metadata_force_password_change: false,
        user_metadata_force_password_change: false,
      },
    }).catch(() => null);

    await writeOperationalLog(admin, {
      scope: trace.scope,
      action: "change_password",
      endpoint: trace.endpoint,
      statusCode: 200,
      durationMs,
      userId: auth.user.id,
      requestId: trace.requestId,
      metadata: {},
    }).catch(() => null);

    return ok({ success: true, request_id: trace.requestId }, 200, req);
  } catch (error) {
    const admin = adminClient();
    await captureSystemError(admin, {
      error,
      requestId: trace.requestId,
      endpoint: trace.endpoint,
      source: "auth-change-password",
      severity: "critical",
      metadata: {
        phase: "handler_catch",
      },
    });

    return fail("Falha inesperada ao trocar senha", 500, { request_id: trace.requestId }, req);
  }
});
