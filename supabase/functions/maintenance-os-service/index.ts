// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, ensureEmpresaAccess, requireUser } from "../_shared/auth.ts";
import { logAuditEvent, failRateLimited } from "../_shared/audit.ts";
import { createRequestTrace, traceDurationMs, writeOperationalLog } from "../_shared/observability.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { captureSystemError } from "../_shared/monitoring.ts";
import { fail, ok, preflight, rejectIfOriginNotAllowed } from "../_shared/response.ts";

type Payload = {
  action: "open_os" | "start_execution" | "close_os";
  empresa_id: string;
  os_id?: string;
  tipo?: string;
  prioridade?: string;
  ativo_tag?: string;
  equipamento?: string;
  problema?: string;
  servico_executado?: string;
  mecanico_nome?: string;
  tempo_execucao_min?: number;
  custo_total?: number;
};

Deno.serve(async (req) => {
  const trace = createRequestTrace("maintenance-os-service", req);
  try {

  if (req.method === "OPTIONS") return preflight(req, "POST, OPTIONS");

  const originDenied = rejectIfOriginNotAllowed(req);
  if (originDenied) return originDenied;

  if (req.method !== "POST") return fail("Method not allowed", 405, null, req);

  const auth = await requireUser(req);
  if ("error" in auth) return fail(auth.error ?? "Unauthorized", auth.status ?? 401, null, req);

  const payload = (await req.json().catch(() => null)) as Payload | null;
  if (!payload?.action || !payload.empresa_id) return fail("action and empresa_id are required", 400, null, req);

  const admin = adminClient();

  const rateLimit = await enforceRateLimit(admin, {
    scope: "edge.maintenance-os-service",
    identifier: `${auth.user.id}:${payload.action}`,
    maxRequests: 60,
    windowSeconds: 60,
    blockSeconds: 900,
  });
  if (!rateLimit.allowed) return failRateLimited(req, "Rate limit exceeded for maintenance service");

  const allowed = await ensureEmpresaAccess(admin, auth.user.id, payload.empresa_id);
  if (!allowed) return fail("Forbidden for empresa", 403, null, req);

  if (payload.action === "open_os") {
    const { error: limitError } = await admin.rpc("check_company_plan_limit", {
      p_empresa_id: payload.empresa_id,
      p_limit_type: "orders",
      p_increment: 1,
    });
    if (limitError) return fail(limitError.message, 429, { code: "PLAN_LIMIT_EXCEEDED" }, req);

    const { data, error } = await admin
      .from("ordens_servico")
      .insert({
        empresa_id: payload.empresa_id,
        tipo: payload.tipo ?? "CORRETIVA",
        prioridade: payload.prioridade ?? "MEDIA",
        status: "ABERTA",
        tag: payload.ativo_tag ?? null,
        equipamento: payload.equipamento ?? null,
        problema: payload.problema ?? "Abertura rápida via Edge Function",
        solicitante: auth.user.email ?? "sistema",
        usuario_abertura: auth.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id,numero_os,status")
      .single();

    if (error) return fail(error.message, 400, null, req);

    const durationMs = traceDurationMs(trace);
    await logAuditEvent(admin, {
      action: "OPEN_OS",
      entityType: "ordens_servico",
      entityId: data?.id ?? null,
      empresaId: payload.empresa_id,
      userId: auth.user.id,
      req,
      endpoint: trace.endpoint,
      executionMs: durationMs,
      requestId: trace.requestId,
      payload: {
        action: payload.action,
        tipo: payload.tipo ?? "CORRETIVA",
        prioridade: payload.prioridade ?? "MEDIA",
      },
    });
    await writeOperationalLog(admin, {
      scope: trace.scope,
      action: payload.action,
      endpoint: trace.endpoint,
      statusCode: 200,
      durationMs,
      empresaId: payload.empresa_id,
      userId: auth.user.id,
      requestId: trace.requestId,
      metadata: { os_id: data?.id ?? null },
    });
    return ok({ os: data }, 200, req);
  }

  if (!payload.os_id) return fail("os_id is required", 400, null, req);

  if (payload.action === "start_execution") {
    const { data, error } = await admin
      .from("execucoes_os")
      .insert({
        empresa_id: payload.empresa_id,
        os_id: payload.os_id,
        mecanico_nome: payload.mecanico_nome ?? auth.user.email ?? "executor",
        hora_inicio: new Date().toISOString().slice(11, 19),
        data_execucao: new Date().toISOString().slice(0, 10),
        servico_executado: payload.servico_executado ?? null,
        tempo_execucao: payload.tempo_execucao_min ?? 0,
        custo_total: payload.custo_total ?? 0,
      })
      .select("id,os_id")
      .single();

    if (error) return fail(error.message, 400, null, req);

    await admin
      .from("ordens_servico")
      .update({ status: "EM_ANDAMENTO", updated_at: new Date().toISOString() })
      .eq("id", payload.os_id)
      .eq("empresa_id", payload.empresa_id);

    const durationMs = traceDurationMs(trace);
    await logAuditEvent(admin, {
      action: "START_OS_EXECUTION",
      entityType: "execucoes_os",
      entityId: data?.id ?? null,
      empresaId: payload.empresa_id,
      userId: auth.user.id,
      req,
      endpoint: trace.endpoint,
      executionMs: durationMs,
      requestId: trace.requestId,
      payload: { os_id: payload.os_id },
    });
    await writeOperationalLog(admin, {
      scope: trace.scope,
      action: payload.action,
      endpoint: trace.endpoint,
      statusCode: 200,
      durationMs,
      empresaId: payload.empresa_id,
      userId: auth.user.id,
      requestId: trace.requestId,
      metadata: { os_id: payload.os_id, execucao_id: data?.id ?? null },
    });

    return ok({ execution: data }, 200, req);
  }

  if (payload.action === "close_os") {
    const nowIso = new Date().toISOString();

    const { error: osError } = await admin
      .from("ordens_servico")
      .update({ status: "FECHADA", data_fechamento: nowIso, updated_at: nowIso })
      .eq("id", payload.os_id)
      .eq("empresa_id", payload.empresa_id);

    if (osError) return fail(osError.message, 400, null, req);

    await admin.from("historico_manutencao").insert({
      empresa_id: payload.empresa_id,
      os_id: payload.os_id,
      tipo: "OS_FECHADA",
      descricao: payload.servico_executado ?? "Fechamento de O.S",
      data_evento: nowIso,
      custo_total: payload.custo_total ?? 0,
    });

    const durationMs = traceDurationMs(trace);
    await logAuditEvent(admin, {
      action: "CLOSE_OS",
      entityType: "ordens_servico",
      entityId: payload.os_id,
      empresaId: payload.empresa_id,
      userId: auth.user.id,
      req,
      endpoint: trace.endpoint,
      executionMs: durationMs,
      requestId: trace.requestId,
      payload: { os_id: payload.os_id, custo_total: payload.custo_total ?? 0 },
    });
    await writeOperationalLog(admin, {
      scope: trace.scope,
      action: payload.action,
      endpoint: trace.endpoint,
      statusCode: 200,
      durationMs,
      empresaId: payload.empresa_id,
      userId: auth.user.id,
      requestId: trace.requestId,
      metadata: { os_id: payload.os_id },
    });

    return ok({ success: true }, 200, req);
  }

  return fail("Unsupported action", 400, null, req);
  } catch (error: any) {
    const admin = adminClient();
    await captureSystemError(admin, {
      error,
      requestId: trace.requestId,
      endpoint: trace.endpoint,
      source: "maintenance-os-service",
      severity: "critical",
      metadata: {
        phase: "handler_catch",
      },
    });

    await writeOperationalLog(admin, {
      scope: trace.scope,
      action: "unhandled_error",
      endpoint: trace.endpoint,
      statusCode: 500,
      durationMs: traceDurationMs(trace),
      empresaId: null,
      userId: null,
      requestId: trace.requestId,
      metadata: {},
      errorMessage: error?.message ?? "Unhandled maintenance-os-service error",
    });

    return fail("Falha inesperada no maintenance-os-service", 500, {
      request_id: trace.requestId,
    }, req);
  }
});
