// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, ensureEmpresaAccess, requireUser } from "../_shared/auth.ts";
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
  if (req.method === "OPTIONS") return preflight(req, "POST, OPTIONS");

  const originDenied = rejectIfOriginNotAllowed(req);
  if (originDenied) return originDenied;

  if (req.method !== "POST") return fail("Method not allowed", 405, null, req);

  const auth = await requireUser(req);
  if ("error" in auth) return fail(auth.error ?? "Unauthorized", auth.status ?? 401, null, req);

  const payload = (await req.json().catch(() => null)) as Payload | null;
  if (!payload?.action || !payload.empresa_id) return fail("action and empresa_id are required", 400, null, req);

  const admin = adminClient();
  const allowed = await ensureEmpresaAccess(admin, auth.user.id, payload.empresa_id);
  if (!allowed) return fail("Forbidden for empresa", 403, null, req);

  if (payload.action === "open_os") {
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

    return ok({ success: true }, 200, req);
  }

  return fail("Unsupported action", 400, null, req);
});
