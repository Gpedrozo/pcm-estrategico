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

  // ── Queries paralelas ─────────────────────────────────────────────────────
  const [
    empresas,
    usuarios,
    osAbertas,
    osFechadas,
    backlogOS,
    paradas,
    execucoesCorretivas,
    prevalencias,
    cumprimento,
  ] = await Promise.all([
    // Contagens de domínio
    admin.from("empresas").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "ativo"),
    admin.from("ordens_servico").select("id", { count: "exact", head: true }).in("status", ["ABERTA", "EM_ANDAMENTO"]),
    admin.from("ordens_servico").select("id", { count: "exact", head: true }).eq("status", "FECHADA"),

    // Backlog em horas: soma das horas_estimadas das OS abertas (com fallback de 1.5h por OS)
    admin.from("ordens_servico")
      .select("horas_estimadas")
      .in("status", ["ABERTA", "EM_ANDAMENTO"]),

    // Disponibilidade: paradas do último mês (tempo real de indisponibilidade)
    admin.from("paradas_equipamento")
      .select("duracao_horas")
      .gte("data_inicio", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()),

    // MTBF / MTTR: execuções corretivas do último mês
    admin.from("execucoes_os")
      .select("horas_execucao, data_execucao")
      .eq("tipo_manutencao", "corretiva")
      .gte("data_execucao", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()),

    // Total de equipamentos ativos (para base de cálculo de disponibilidade)
    admin.from("equipamentos")
      .select("id", { count: "exact", head: true })
      .eq("ativo", true),

    // Cumprimento de plano preventivo: programação do mês atual
    admin.from("execucoes_preventivas")
      .select("executado")
      .gte("data_execucao", `${today.slice(0, 7)}-01`),
  ]);

  // ── Cálculo de backlog_horas ─────────────────────────────────────────────
  let backlogHoras = 0;
  if (!backlogOS.error && Array.isArray(backlogOS.data) && backlogOS.data.length > 0) {
    backlogHoras = backlogOS.data.reduce((sum, row) => {
      const h = typeof row.horas_estimadas === "number" ? row.horas_estimadas : 1.5;
      return sum + h;
    }, 0);
  } else {
    // Fallback: 1.5h estimado por OS em aberto
    backlogHoras = Number((osAbertas.count ?? 0) * 1.5);
  }

  // ── Cálculo de disponibilidade_pct ──────────────────────────────────────
  // disponibilidade = (horas_período - horas_parada) / horas_período * 100
  const totalEquipamentos = prevalencias.count ?? 1;
  const horasPeriodo = 30 * 24; // horas no período de 30 dias
  let horasParada = 0;
  if (!paradas.error && Array.isArray(paradas.data)) {
    horasParada = paradas.data.reduce((sum, row) => {
      const h = typeof row.duracao_horas === "number" ? row.duracao_horas : 0;
      return sum + h;
    }, 0);
  }
  const horasDisponiveisTotais = horasPeriodo * totalEquipamentos;
  const disponibilidadePct = horasDisponiveisTotais > 0
    ? Math.min(100, ((horasDisponiveisTotais - horasParada) / horasDisponiveisTotais) * 100)
    : 99.5;

  // ── Cálculo de MTBF e MTTR ───────────────────────────────────────────────
  // MTTR = média de horas por execução corretiva
  // MTBF = (total horas período - total horas reparo) / número de falhas
  let mttrHoras = 0;
  let mtbfHoras = 0;
  if (!execucoesCorretivas.error && Array.isArray(execucoesCorretivas.data) && execucoesCorretivas.data.length > 0) {
    const totalRepairHours = execucoesCorretivas.data.reduce((sum, row) => {
      const h = typeof row.horas_execucao === "number" ? row.horas_execucao : 0;
      return sum + h;
    }, 0);
    const numFalhas = execucoesCorretivas.data.length;
    mttrHoras = Math.round((totalRepairHours / numFalhas) * 10) / 10;
    const horasOperacao = horasPeriodo * totalEquipamentos - totalRepairHours;
    mtbfHoras = numFalhas > 0 ? Math.round((horasOperacao / numFalhas) * 10) / 10 : 0;
  }

  // ── Cálculo de cumprimento_plano_pct ────────────────────────────────────
  let cumprimentoPlanoPct = 0;
  if (!cumprimento.error && Array.isArray(cumprimento.data) && cumprimento.data.length > 0) {
    const total = cumprimento.data.length;
    const executados = cumprimento.data.filter((r) => r.executado === true).length;
    cumprimentoPlanoPct = Math.round((executados / total) * 1000) / 10;
  }

  const payload = {
    metric_date: today,
    empresas_ativas: empresas.count ?? 0,
    usuarios_ativos: usuarios.count ?? 0,
    os_abertas: osAbertas.count ?? 0,
    os_fechadas: osFechadas.count ?? 0,
    backlog_horas: Math.round(backlogHoras * 10) / 10,
    disponibilidade_pct: Math.round(disponibilidadePct * 10) / 10,
    mtbf_horas: mtbfHoras,
    mttr_horas: mttrHoras,
    cumprimento_plano_pct: cumprimentoPlanoPct,
  };

  const { error } = await admin
    .from("platform_metrics")
    .upsert(payload, { onConflict: "metric_date" });

  if (error) return fail(error.message, 400, null, req);

  return ok({ success: true, metrics: payload }, 200, req);
});
