import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient } from "../_shared/auth.ts";

const supabase = adminClient();

interface MontarPlanoPreventivoDaTemplateRequest {
  plano_id: string;
  tipo_componente: string;
  empresa_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { plano_id, tipo_componente, empresa_id } = body as MontarPlanoPreventivoDaTemplateRequest;

    if (!plano_id || !tipo_componente || !empresa_id) {
      return new Response(
        JSON.stringify({ error: "Parâmetros obrigatórios ausentes: plano_id, tipo_componente, empresa_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[Auto-populate] Iniciando população do plano ${plano_id} com template ${tipo_componente}`);

    // 1. Buscar template ativo para o tipo de componente
    const { data: template, error: templateError } = await supabase
      .from("template_atividades_preventivas")
      .select("id")
      .eq("empresa_id", empresa_id)
      .eq("tipo_componente", tipo_componente)
      .eq("ativo", true)
      .single();

    if (templateError || !template) {
      console.warn(`[Auto-populate] Template não encontrado para ${tipo_componente}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Nenhum template ativo encontrado para tipo_componente: ${tipo_componente}. Plano criado vazio.` 
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Buscar atividades do template
    const { data: templateAtividades, error: ativError } = await supabase
      .from("template_atividades_preventivas_atividades")
      .select("id, nome, descricao, ordem, tempo_estimado_min, requer_parada")
      .eq("template_id", template.id)
      .eq("empresa_id", empresa_id)
      .order("ordem");

    if (ativError || !templateAtividades || templateAtividades.length === 0) {
      console.warn(`[Auto-populate] Nenhuma atividade encontrada no template`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Template encontrado mas sem atividades. Plano criado vazio.",
          atividadesInseridas: 0
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    let totalAtividades = 0;
    let totalServicos = 0;

    // 3. Para cada atividade do template, criar atividade no plano + serviços
    for (const templateAtiv of templateAtividades) {
      // Inserir atividade
      const { data: novaAtividade, error: insertAtivError } = await supabase
        .from("atividades_preventivas")
        .insert({
          plano_id,
          empresa_id,
          nome: templateAtiv.nome,
          responsavel: null,
          ordem: templateAtiv.ordem,
          observacoes: templateAtiv.descricao,
          tempo_total_min: 0, // será recalculado com serviços
        })
        .select("id")
        .single();

      if (insertAtivError || !novaAtividade) {
        console.error(`[Auto-populate] Erro inserindo atividade: ${insertAtivError?.message}`);
        continue;
      }

      totalAtividades++;
      console.log(`[Auto-populate] Atividade criada: ${novaAtividade.id} (${templateAtiv.nome})`);

      // 4. Buscar serviços do template para esta atividade
      const { data: templateServicos, error: servError } = await supabase
        .from("template_atividades_preventivas_servicos")
        .select("descricao, tempo_estimado_min, ordem, criterio_aceite, evidencia_obrigatoria, especialidade, observacoes")
        .eq("atividade_template_id", templateAtiv.id)
        .eq("empresa_id", empresa_id)
        .order("ordem");

      if (servError) {
        console.error(`[Auto-populate] Erro buscando serviços: ${servError.message}`);
        continue;
      }

      // 5. Inserir serviços para a atividade
      if (templateServicos && templateServicos.length > 0) {
        const servicosPayload = templateServicos.map((s) => ({
          atividade_id: novaAtividade.id,
          empresa_id,
          descricao: s.descricao,
          tempo_estimado_min: s.tempo_estimado_min,
          ordem: s.ordem,
          criterio_aceite: s.criterio_aceite,
          evidencia_obrigatoria: s.evidencia_obrigatoria,
          especialidade: s.especialidade,
          observacoes: s.observacoes,
          concluido: false,
        }));

        const { error: insertServError, data: insertedServicos } = await supabase
          .from("servicos_preventivos")
          .insert(servicosPayload);

        if (insertServError) {
          console.error(`[Auto-populate] Erro inserindo serviços: ${insertServError.message}`);
        } else {
          totalServicos += insertedServicos?.length || 0;
          console.log(`[Auto-populate] ${insertedServicos?.length || 0} serviços inseridos`);
        }

        // Recalcular tempo total da atividade
        const tempoTotal = templateServicos.reduce((sum, s) => sum + (s.tempo_estimado_min || 0), 0);
        await supabase
          .from("atividades_preventivas")
          .update({ tempo_total_min: tempoTotal })
          .eq("id", novaAtividade.id);
      }
    }

    // 6. Recalcular tempo total do plano
    const { data: todasAtividades } = await supabase
      .from("atividades_preventivas")
      .select("tempo_total_min")
      .eq("plano_id", plano_id)
      .eq("empresa_id", empresa_id);

    const tempoTotalPlano = (todasAtividades || []).reduce((sum, a) => sum + (a.tempo_total_min || 0), 0);
    await supabase
      .from("planos_preventivos")
      .update({ tempo_estimado_min: tempoTotalPlano })
      .eq("id", plano_id);

    console.log(`[Auto-populate] ✅ Plano ${plano_id} população concluída: ${totalAtividades} atividades, ${totalServicos} serviços`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Plano preventivo montado com sucesso a partir do template",
        stats: {
          atividadesInseridas: totalAtividades,
          servicosInseridos: totalServicos,
          tempoTotalEstimadoMin: tempoTotalPlano,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Auto-populate] Erro não tratado:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
