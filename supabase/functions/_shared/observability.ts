// @ts-nocheck

export function createRequestTrace(scope: string, req: Request, action?: string | null) {
  return {
    scope,
    action: action ?? null,
    endpoint: new URL(req.url).pathname,
    startedAt: Date.now(),
  };
}

export function traceDurationMs(trace: { startedAt: number }) {
  return Math.max(Date.now() - trace.startedAt, 0);
}

export async function writeOperationalLog(admin: any, input: {
  scope: string;
  action?: string | null;
  endpoint?: string | null;
  statusCode?: number | null;
  durationMs?: number | null;
  empresaId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  errorMessage?: string | null;
}) {
  const payload = {
    p_scope: input.scope,
    p_action: input.action ?? null,
    p_endpoint: input.endpoint ?? null,
    p_status_code: input.statusCode ?? null,
    p_duration_ms: input.durationMs ?? null,
    p_empresa_id: input.empresaId ?? null,
    p_user_id: input.userId ?? null,
    p_metadata: input.metadata ?? {},
    p_error_message: input.errorMessage ?? null,
  };

  const { error } = await admin.rpc("app_write_operational_log", payload);
  if (error) {
    console.error(JSON.stringify({
      level: "error",
      source: "edge_observability",
      message: "operational_log_failed",
      error: error.message,
      payload,
      timestamp: new Date().toISOString(),
    }));
  }
}
