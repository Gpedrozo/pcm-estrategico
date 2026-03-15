// @ts-nocheck
import { fail } from "./response.ts";

function requestIp(req?: Request | null) {
  if (!req) return null;
  const raw = req.headers.get("x-forwarded-for")
    ?? req.headers.get("x-real-ip")
    ?? req.headers.get("cf-connecting-ip")
    ?? null;
  if (!raw) return null;
  return raw.split(",")[0]?.trim() ?? null;
}

export type AuditEventInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  empresaId?: string | null;
  userId?: string | null;
  payload?: Record<string, unknown>;
  severity?: "info" | "warning" | "error" | "critical";
  source?: string;
  endpoint?: string | null;
  executionMs?: number | null;
  requestId?: string | null;
  req?: Request;
};

export async function logAuditEvent(admin: any, input: AuditEventInput) {
  const ipAddress = requestIp(input.req);
  const userAgent = input.req?.headers.get("user-agent") ?? null;

  const params = {
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId ?? null,
    p_empresa_id: input.empresaId ?? null,
    p_user_id: input.userId ?? null,
    p_payload_json: input.payload ?? {},
    p_ip_address: ipAddress,
    p_user_agent: userAgent,
    p_source: input.source ?? "edge",
    p_severity: input.severity ?? "info",
    p_endpoint: input.endpoint ?? null,
    p_execution_ms: input.executionMs ?? null,
    p_request_id: input.requestId ?? null,
  };

  const { error } = await admin.rpc("log_audit_event", params);
  if (!error) return;

  // Fallback keeps auditing alive even if RPC signature drifts.
  await admin.from("audit_logs").insert({
    empresa_id: input.empresaId ?? null,
    user_id: input.userId ?? null,
    action: input.action,
    table_name: input.entityType,
    record_id: input.entityId ?? null,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    payload_json: input.payload ?? {},
    ip_address: ipAddress,
    user_agent: userAgent,
    source: input.source ?? "edge",
    severity: input.severity ?? "info",
    endpoint: input.endpoint ?? null,
    execution_ms: input.executionMs ?? null,
    request_id: input.requestId ?? null,
    metadata: input.payload ?? {},
  });
}

export function failRateLimited(req: Request, message = "Too many requests") {
  return fail(message, 429, { code: "RATE_LIMITED" }, req);
}
