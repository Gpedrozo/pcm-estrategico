// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, requireUser } from "../_shared/auth.ts";
import { fail, ok, preflight, rejectIfOriginNotAllowed } from "../_shared/response.ts";
import { createRequestTrace, traceDurationMs, writeOperationalLog } from "../_shared/observability.ts";
import { logAuditEvent } from "../_shared/audit.ts";
import { captureSystemError } from "../_shared/monitoring.ts";

type Payload = {
  new_password?: string;
};

Deno.serve(async (req) => {
  const trace = createRequestTrace("auth-change-password", req, "change_password");

  try {
    if (req.method === "OPTIONS") return preflight(req, "POST, OPTIONS");

    const originDenied = rejectIfOriginNotAllowed(req);
    if (originDenied) return originDenied;

    if (req.method !== "POST") return fail("Method not allowed", 405, null, req);

    const auth = await requireUser(req, { allowPasswordChangeFlow: true });

    if ("error" in auth) return fail(auth.error ?? "Unauthorized", auth.status ?? 401, null, req);

    const body = (await req.json().catch(() => null)) as Payload | null;
    const newPassword = body?.new_password?.trim() ?? "";

    if (newPassword.length < 8) {
      return fail("new_password must have at least 8 characters", 400, null, req);
    }

    const admin = adminClient();

    const currentAppMetadata = (auth.user.app_metadata ?? {}) as Record<string, unknown>;
    const currentUserMetadata = (auth.user.user_metadata ?? {}) as Record<string, unknown>;

    const { error: updateAuthError } = await admin.auth.admin.updateUserById(auth.user.id, {
      password: newPassword,
      app_metadata: {
        ...currentAppMetadata,
        force_password_change: false,
      },
      user_metadata: {
        ...currentUserMetadata,
        force_password_change: false,
      },
    });

    if (updateAuthError) {
      return fail(updateAuthError.message, 400, null, req);
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({ force_password_change: false })
      .eq("id", auth.user.id);

    if (profileError) {
      return fail(profileError.message, 400, null, req);
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
    });

    await writeOperationalLog(admin, {
      scope: trace.scope,
      action: "change_password",
      endpoint: trace.endpoint,
      statusCode: 200,
      durationMs,
      userId: auth.user.id,
      requestId: trace.requestId,
      metadata: {},
    });

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
