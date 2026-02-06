import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlanoPreventivo {
  id: string;
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];

    // Get all active preventive plans that are due today or overdue
    const { data: planosVencidos, error: planosError } = await supabase
      .from("planos_preventivos")
      .select(`
        id,
        codigo,
        nome,
        tag,
        frequencia_dias,
        proxima_execucao,
        equipamento_id,
        tempo_estimado_min,
        ativo
      `)
      .eq("ativo", true)
      .lte("proxima_execucao", today);

    if (planosError) {
      throw planosError;
    }

    if (!planosVencidos || planosVencidos.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "Nenhum plano preventivo vencido encontrado", 
          os_geradas: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const osGeradas: string[] = [];
    const erros: string[] = [];

    for (const plano of planosVencidos as PlanoPreventivo[]) {
      try {
        // Get equipment details
        let equipamentoNome = "Equipamento não identificado";
        let tag = plano.tag || "SEM-TAG";

        if (plano.equipamento_id) {
          const { data: equipamento } = await supabase
            .from("equipamentos")
            .select("tag, nome")
            .eq("id", plano.equipamento_id)
            .single();

          if (equipamento) {
            tag = (equipamento as Equipamento).tag;
            equipamentoNome = (equipamento as Equipamento).nome;
          }
        }

        // Create the preventive OS
        const { data: novaOS, error: osError } = await supabase
          .from("ordens_servico")
          .insert({
            tipo: "PREVENTIVA",
            prioridade: "MEDIA",
            tag: tag,
            equipamento: equipamentoNome,
            solicitante: "Sistema Automático",
            problema: `Execução do plano preventivo: ${plano.codigo} - ${plano.nome}`,
            status: "ABERTA",
            tempo_estimado: plano.tempo_estimado_min || 60,
            usuario_abertura: "SISTEMA",
          })
          .select("numero_os")
          .single();

        if (osError) {
          erros.push(`Erro ao criar OS para plano ${plano.codigo}: ${osError.message}`);
          continue;
        }

        // Update the preventive plan with the next execution date
        if (plano.frequencia_dias) {
          const proximaExecucao = new Date();
          proximaExecucao.setDate(proximaExecucao.getDate() + plano.frequencia_dias);

          await supabase
            .from("planos_preventivos")
            .update({
              ultima_execucao: today,
              proxima_execucao: proximaExecucao.toISOString().split("T")[0],
            })
            .eq("id", plano.id);
        }

        osGeradas.push(`OS #${novaOS?.numero_os} gerada para plano ${plano.codigo}`);

        // Log the action in the audit table
        await supabase.from("auditoria").insert({
          usuario_nome: "SISTEMA",
          acao: "GERAR_OS_PREVENTIVA",
          descricao: `OS preventiva gerada automaticamente do plano ${plano.codigo}`,
          tag: tag,
        });

      } catch (err: any) {
        erros.push(`Erro processando plano ${plano.codigo}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Processamento de planos preventivos concluído",
        os_geradas: osGeradas.length,
        detalhes: osGeradas,
        erros: erros.length > 0 ? erros : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erro na função generate-preventive-os:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
