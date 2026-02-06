import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Material {
  id: string;
  codigo: string;
  nome: string;
  estoque_atual: number;
  estoque_minimo: number;
}

interface PlanoVencido {
  id: string;
  codigo: string;
  nome: string;
  proxima_execucao: string | null;
}

interface MedicaoCritica {
  id: string;
  tag: string;
  tipo_medicao: string;
  valor: number;
  limite_critico: number | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];
    const alerts: any[] = [];

    // 1. Check for low stock materials
    const { data: materiais } = await supabase
      .from("materiais")
      .select("id, codigo, nome, estoque_atual, estoque_minimo")
      .eq("ativo", true);

    if (materiais) {
      const lowStock = (materiais as Material[]).filter(
        (m) => m.estoque_atual < m.estoque_minimo
      );
      
      if (lowStock.length > 0) {
        alerts.push({
          type: "LOW_STOCK",
          severity: "warning",
          title: "Materiais com Estoque Baixo",
          count: lowStock.length,
          items: lowStock.map((m) => ({
            id: m.id,
            codigo: m.codigo,
            nome: m.nome,
            atual: m.estoque_atual,
            minimo: m.estoque_minimo,
          })),
        });
      }
    }

    // 2. Check for overdue preventive plans
    const { data: planosVencidos } = await supabase
      .from("planos_preventivos")
      .select("id, codigo, nome, proxima_execucao")
      .eq("ativo", true)
      .lt("proxima_execucao", today);

    if (planosVencidos && planosVencidos.length > 0) {
      alerts.push({
        type: "OVERDUE_PREVENTIVE",
        severity: "warning",
        title: "Planos Preventivos Vencidos",
        count: planosVencidos.length,
        items: (planosVencidos as PlanoVencido[]).map((p) => ({
          id: p.id,
          codigo: p.codigo,
          nome: p.nome,
          vencimento: p.proxima_execucao,
        })),
      });
    }

    // 3. Check for critical predictive measurements
    const { data: medicoesCriticas } = await supabase
      .from("medicoes_preditivas")
      .select("id, tag, tipo_medicao, valor, limite_critico")
      .eq("status", "CRITICO");

    if (medicoesCriticas && medicoesCriticas.length > 0) {
      alerts.push({
        type: "CRITICAL_MEASUREMENT",
        severity: "error",
        title: "Medições Preditivas Críticas",
        count: medicoesCriticas.length,
        items: (medicoesCriticas as MedicaoCritica[]).map((m) => ({
          id: m.id,
          tag: m.tag,
          tipo: m.tipo_medicao,
          valor: m.valor,
          limite: m.limite_critico,
        })),
      });
    }

    // 4. Check for urgent pending OS
    const { data: osUrgentes } = await supabase
      .from("ordens_servico")
      .select("id, numero_os, equipamento, data_solicitacao")
      .eq("prioridade", "URGENTE")
      .in("status", ["ABERTA", "EM_ANDAMENTO"]);

    if (osUrgentes && osUrgentes.length > 0) {
      alerts.push({
        type: "URGENT_OS",
        severity: "error",
        title: "Ordens de Serviço Urgentes",
        count: osUrgentes.length,
        items: osUrgentes,
      });
    }

    // 5. Check for high backlog
    const { count: backlogCount } = await supabase
      .from("ordens_servico")
      .select("id", { count: "exact", head: true })
      .in("status", ["ABERTA", "EM_ANDAMENTO", "AGUARDANDO_MATERIAL"]);

    if (backlogCount && backlogCount > 20) {
      alerts.push({
        type: "HIGH_BACKLOG",
        severity: "warning",
        title: "Backlog Elevado",
        count: backlogCount,
        message: `Existem ${backlogCount} ordens de serviço pendentes no sistema`,
      });
    }

    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        total_alerts: alerts.length,
        alerts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erro na função system-health-check:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
