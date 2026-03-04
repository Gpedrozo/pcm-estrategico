import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, requireEmpresaScope, requireUser } from "../_shared/auth.ts";
import { fail, ok, preflight, rejectIfOriginNotAllowed } from "../_shared/response.ts";

interface PlanoPreventivo {
  id: string;
  empresa_id: string | null;
  codigo: string;
  nome: string;
  tag: string | null;
  frequencia_dias: number | null;
  proxima_execucao: string | null;
  equipamento_id: string | null;
  tempo_estimado_min: number | null;
  ativo: boolean | null;
}

interface Equipamento {
  id: string;
  tag: string;
  nome: string;
}

async function logOperationalEvent(
  supabase: ReturnType<typeof adminClient>,
  params: {
    empresaId: string | null;
    actionType: string;
    severity: "info" | "warning" | "error" | "critical";
    details: Record<string, unknown>;
  },
) {
  await supabase.from("enterprise_audit_logs").insert({
    empresa_id: params.empresaId,
    action_type: params.actionType,
    severity: params.severity,
    source: "generate_preventive_os",
    details: params.details,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return preflight(req, "POST, OPTIONS");
  }

  const originDenied = rejectIfOriginNotAllowed(req);
  if (originDenied) return originDenied;

  if (req.method !== "POST") return fail("Method not allowed", 405, null, req);

  try {
    const auth = await requireUser(req);
    if ("error" in auth) return fail(auth.error ?? "Unauthorized", auth.status ?? 401, null, req);

    const body = await req.json().catch(() => null) as { empresa_id?: string } | null;
    const empresaId = body?.empresa_id ?? null;

    const supabase = adminClient();

    const scope = await requireEmpresaScope(supabase, auth.user.id, empresaId);
    if ("error" in scope) return fail(scope.error, scope.status, null, req);

    const today = new Date().toISOString().split("T")[0];

    const { data: planosVencidos, error: planosError } = await supabase
      .from("planos_preventivos")
      .select(`
        id,
        empresa_id,
        codigo,
        nome,
        tag,
        frequencia_dias,
        proxima_execucao,
        equipamento_id,
        tempo_estimado_min,
        ativo
      `)
      .eq("empresa_id", scope.empresaId)
      .eq("ativo", true)
      .lte("proxima_execucao", today);

    if (planosError) {
      throw planosError;
    }

    if (!planosVencidos || planosVencidos.length === 0) {
      return ok({
          message: "Nenhum plano preventivo vencido encontrado", 
          os_geradas: 0 
        }, 200, req);
    }

    const osGeradas: string[] = [];
    const erros: string[] = [];

    for (const plano of planosVencidos as PlanoPreventivo[]) {
      try {
        let equipamentoNome = "Equipamento não identificado";
        let tag = plano.tag || "SEM-TAG";

        if (plano.equipamento_id) {
          const { data: equipamento } = await supabase
            .from("equipamentos")
            .select("tag, nome")
            .eq("empresa_id", scope.empresaId)
            .eq("id", plano.equipamento_id)
            .single();

          if (equipamento) {
            tag = (equipamento as Equipamento).tag;
            equipamentoNome = (equipamento as Equipamento).nome;
          }
        }

        const { data: novaOS, error: osError } = await supabase
          .from("ordens_servico")
          .insert({
            empresa_id: plano.empresa_id,
            tipo: "PREVENTIVA",
            prioridade: "MEDIA",
            tag: tag,
            equipamento: equipamentoNome,
            solicitante: "Sistema Automático",
            problema: `Execução do plano preventivo: ${plano.codigo} - ${plano.nome}`,
            status: "ABERTA",
            tempo_estimado: plano.tempo_estimado_min || 60,
          })
          .select("numero_os")
          .single();

        if (osError) {
          erros.push(`Erro ao criar OS para plano ${plano.codigo}: ${osError.message}`);
          continue;
        }

        if (plano.frequencia_dias) {
          const proximaExecucao = new Date();
          proximaExecucao.setDate(proximaExecucao.getDate() + plano.frequencia_dias);

          await supabase
            .from("planos_preventivos")
            .update({
              ultima_execucao: today,
              proxima_execucao: proximaExecucao.toISOString().split("T")[0],
            })
            .eq("empresa_id", scope.empresaId)
            .eq("id", plano.id);
        }

        osGeradas.push(`OS #${novaOS?.numero_os} gerada para plano ${plano.codigo}`);

        await logOperationalEvent(supabase, {
          empresaId: plano.empresa_id,
          actionType: "GENERATE_PREVENTIVE_OS",
          severity: "info",
          details: {
            plano_id: plano.id,
            plano_codigo: plano.codigo,
            os_numero: novaOS?.numero_os ?? null,
            tag,
          },
        });

      } catch (err: any) {
        erros.push(`Erro processando plano ${plano.codigo}: ${err.message}`);
      }
    }

    return ok({
        message: "Processamento de planos preventivos concluído",
        os_geradas: osGeradas.length,
        detalhes: osGeradas,
        erros: erros.length > 0 ? erros : undefined,
      }, 200, req);

  } catch (error: any) {
    console.error("Erro na função generate-preventive-os:", error);
    return fail(error.message, 500, null, req);
  }
});
