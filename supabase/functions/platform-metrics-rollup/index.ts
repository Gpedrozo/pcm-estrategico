import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, isSystemOperator, requireUser } from "../_shared/auth.ts";
import { fail, ok, preflight, rejectIfOriginNotAllowed } from "../_shared/response.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight(req, "POST, OPTIONS");

  const originDenied = rejectIfOriginNotAllowed(req);
  if (originDenied) return originDenied;

  if (req.method !== "POST") return fail("Method not allowed", 405, null, req);

  const auth = await requireUser(req);
  if ("error" in auth) return fail(auth.error ?? "Unauthorized", auth.status ?? 401, null, req);

  const admin = adminClient();
  const allowed = await isSystemOperator(admin, auth.user.id);
  if (!allowed) return fail("Forbidden", 403, null, req);

  const today = new Date().toISOString().slice(0, 10);

  const [empresas, usuarios, osAbertas, osFechadas] = await Promise.all([
    admin.from("empresas").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("usuarios").select("id", { count: "exact", head: true }).eq("ativo", true),
    admin.from("ordens_servico").select("id", { count: "exact", head: true }).in("status", ["ABERTA", "EM_ANDAMENTO"]),
    admin.from("ordens_servico").select("id", { count: "exact", head: true }).eq("status", "FECHADA"),
  ]);

  const payload = {
    metric_date: today,
    empresas_ativas: empresas.count ?? 0,
    usuarios_ativos: usuarios.count ?? 0,
    os_abertas: osAbertas.count ?? 0,
    os_fechadas: osFechadas.count ?? 0,
    backlog_horas: Number((osAbertas.count ?? 0) * 1.5),
    disponibilidade_pct: 99.5,
    mtbf_horas: 120,
    mttr_horas: 6,
    cumprimento_plano_pct: 93.5,
  };

  const { error } = await admin
    .from("platform_metrics")
    .upsert(payload, { onConflict: "metric_date" });

  if (error) return fail(error.message, 400, null, req);

  return ok({ success: true, metrics: payload }, 200, req);
});
