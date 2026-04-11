import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, isOwnerOperator, requireUser } from "../_shared/auth.ts";
import { fail, ok, preflight, rejectIfOriginNotAllowed } from "../_shared/response.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight(req, "POST, OPTIONS");

  const originDenied = rejectIfOriginNotAllowed(req);
  if (originDenied) return originDenied;

  if (req.method !== "POST") return fail("Method not allowed", 405, null, req);

  const auth = await requireUser(req);
  if ("error" in auth) return fail(auth.error ?? "Unauthorized", auth.status ?? 401, null, req);

  const admin = adminClient();
  const allowed = await isOwnerOperator(admin, auth.user.id);
  if (!allowed) return fail("Forbidden", 403, null, req);

  const rl = await enforceRateLimit(admin, { scope: "platform_metrics_rollup", identifier: auth.user.id, maxRequests: 10, windowSeconds: 60 });
  if (!rl.allowed) return fail(rl.reason ?? "Rate limit exceeded", 429, null, req);

  const today = new Date().toISOString().slice(0, 10);

  const [empresas, usuarios, osAbertas, osFechadas] = await Promise.all([
    admin.from("empresas").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "ativo"),
    admin.from("ordens_servico").select("id", { count: "exact", head: true }).in("status", ["ABERTA", "EM_ANDAMENTO"]),
    admin.from("ordens_servico").select("id", { count: "exact", head: true }).eq("status", "FECHADA"),
  ]);

  const payload = {
    metric_date: today,
    empresas_ativas: empresas.count ?? 0,
    usuarios_ativos: usuarios.count ?? 0,
    os_abertas: osAbertas.count ?? 0,
    os_fechadas: osFechadas.count ?? 0,
    backlog_horas: Number((osAbertas.count ?? 0) * 1.5),       // TODO: calcular de dados reais (horas estimadas por OS)
    disponibilidade_pct: 99.5,                                   // TODO: calcular de uptime real
    mtbf_horas: 120,                                             // TODO: calcular MTBF de ordens_servico
    mttr_horas: 6,                                               // TODO: calcular MTTR de execucoes_os
    cumprimento_plano_pct: 93.5,                                 // TODO: calcular de plano preventivo vs executado
  };

  const { error } = await admin
    .from("platform_metrics")
    .upsert(payload, { onConflict: "metric_date" });

  if (error) return fail(error.message, 400, null, req);

  return ok({ success: true, metrics: payload }, 200, req);
});
