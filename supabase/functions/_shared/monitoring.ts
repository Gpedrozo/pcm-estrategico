export type CaptureSystemErrorInput = {
  error: unknown;
  empresaId?: string | null;
  userId?: string | null;
  requestId?: string | null;
  endpoint?: string | null;
  source?: string;
  severity?: "warning" | "error" | "critical";
  metadata?: Record<string, unknown>;
};

function parseError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  return {
    name: "UnknownError",
    message: String(error ?? "unknown_error"),
    stack: null,
  };
}

export async function captureSystemError(admin: any, input: CaptureSystemErrorInput) {
  const parsed = parseError(input.error);

  const params = {
    p_empresa_id: input.empresaId ?? null,
    p_user_id: input.userId ?? null,
    p_request_id: input.requestId ?? null,
    p_endpoint: input.endpoint ?? null,
    p_source: input.source ?? "edge",
    p_error_name: parsed.name,
    p_error_message: parsed.message,
    p_stack_trace: parsed.stack,
    p_severity: input.severity ?? "error",
    p_metadata: input.metadata ?? {},
  };

  const { error } = await admin.rpc("app_capture_system_error", params);

  if (error) {
    console.error(JSON.stringify({
      level: "error",
      source: "edge_monitoring",
      message: "capture_system_error_failed",
      rpc_error: error.message,
      payload: params,
      timestamp: new Date().toISOString(),
    }));
  }
}
