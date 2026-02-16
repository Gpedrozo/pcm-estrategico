import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tag } = await req.json();
    if (!tag) {
      return new Response(JSON.stringify({ error: "TAG é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all work orders for this TAG
    const { data: ordensServico, error: osError } = await supabase
      .from("ordens_servico")
      .select("*")
      .eq("tag", tag)
      .order("data_solicitacao", { ascending: false });

    if (osError) throw osError;

    if (!ordensServico || ordensServico.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma O.S. encontrada para esta TAG" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch equipment info
    const { data: equipamento } = await supabase
      .from("equipamentos")
      .select("*")
      .eq("tag", tag)
      .single();

    // Aggregate data
    const totalOS = ordensServico.length;
    const tipoContagem: Record<string, number> = {};
    const statusContagem: Record<string, number> = {};
    const problemas: string[] = [];

    for (const os of ordensServico) {
      tipoContagem[os.tipo] = (tipoContagem[os.tipo] || 0) + 1;
      statusContagem[os.status] = (statusContagem[os.status] || 0) + 1;
      if (os.problema) problemas.push(os.problema);
    }

    // Calculate MTBF approximation
    const datas = ordensServico
      .map((os: any) => new Date(os.data_solicitacao).getTime())
      .sort((a: number, b: number) => a - b);
    let intervaloMedio = 0;
    if (datas.length > 1) {
      const intervalos: number[] = [];
      for (let i = 1; i < datas.length; i++) {
        intervalos.push((datas[i] - datas[i - 1]) / (1000 * 60 * 60 * 24));
      }
      intervaloMedio = intervalos.reduce((a, b) => a + b, 0) / intervalos.length;
    }

    // Build prompt
    const prompt = `Você é um engenheiro especialista em confiabilidade industrial e manutenção preditiva.

Analise o histórico de manutenção do equipamento:

TAG: ${tag}
Nome: ${equipamento?.nome || "N/A"}
Fabricante: ${equipamento?.fabricante || "N/A"}
Criticidade: ${equipamento?.criticidade || "N/A"}

Dados consolidados:
- Total de ocorrências: ${totalOS}
- Tipos predominantes: ${JSON.stringify(tipoContagem)}
- Status das OS: ${JSON.stringify(statusContagem)}
- Intervalo médio entre falhas: ${intervaloMedio.toFixed(1)} dias
- Descrições dos problemas (últimas ${Math.min(problemas.length, 20)}):
${problemas.slice(0, 20).map((p, i) => `  ${i + 1}. ${p}`).join("\n")}

Identifique:
1. Padrões recorrentes de falha
2. Correlação entre falhas mecânicas e elétricas
3. Possíveis causas técnicas fundamentais
4. Causa raiz mais provável
5. Ações preventivas recomendadas
6. Nível de criticidade (Baixo, Médio, Alto, Crítico)
7. Score de confiança (0-100)`;

    // Call Lovable AI Gateway
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "Você é um engenheiro especialista em confiabilidade industrial. Sempre responda em português brasileiro.",
            },
            { role: "user", content: prompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "root_cause_analysis",
                description:
                  "Retorna análise estruturada de causa raiz do equipamento",
                parameters: {
                  type: "object",
                  properties: {
                    summary: {
                      type: "string",
                      description: "Resumo executivo da análise",
                    },
                    possible_causes: {
                      type: "array",
                      items: { type: "string" },
                      description: "Lista de possíveis causas identificadas",
                    },
                    main_hypothesis: {
                      type: "string",
                      description: "Hipótese principal de causa raiz",
                    },
                    preventive_actions: {
                      type: "array",
                      items: { type: "string" },
                      description: "Ações preventivas recomendadas",
                    },
                    criticality: {
                      type: "string",
                      enum: ["Baixo", "Médio", "Alto", "Crítico"],
                      description: "Nível de criticidade",
                    },
                    confidence_score: {
                      type: "number",
                      description: "Score de confiança de 0 a 100",
                    },
                  },
                  required: [
                    "summary",
                    "possible_causes",
                    "main_hypothesis",
                    "preventive_actions",
                    "criticality",
                    "confidence_score",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "root_cause_analysis" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let analysis: any;
    if (toolCall?.function?.arguments) {
      analysis =
        typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
    } else {
      // Fallback: try to parse from content
      const content = aiData.choices?.[0]?.message?.content || "";
      try {
        analysis = JSON.parse(content);
      } catch {
        analysis = {
          summary: content,
          possible_causes: [],
          main_hypothesis: "Não foi possível extrair hipótese estruturada",
          preventive_actions: [],
          criticality: "Médio",
          confidence_score: 50,
        };
      }
    }

    // Save to database
    const { data: saved, error: saveError } = await supabase
      .from("ai_root_cause_analysis")
      .insert({
        tag,
        equipamento_id: equipamento?.id || null,
        summary: analysis.summary,
        possible_causes: analysis.possible_causes,
        main_hypothesis: analysis.main_hypothesis,
        preventive_actions: analysis.preventive_actions,
        criticality: analysis.criticality,
        confidence_score: analysis.confidence_score,
        raw_response: aiData,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
    }

    return new Response(
      JSON.stringify({
        analysis: { ...analysis, id: saved?.id, generated_at: saved?.generated_at },
        os_count: totalOS,
        mtbf_days: intervaloMedio,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
