import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrdemServico {
  id: string;
  numero_os: number;
  tipo: string;
  status: string;
  data_solicitacao: string;
  data_fechamento: string | null;
  tag: string;
  equipamento: string;
}

interface ExecucaoOS {
  os_id: string;
  tempo_execucao: number;
  custo_mao_obra: number | null;
  custo_materiais: number | null;
  custo_terceiros: number | null;
  custo_total: number | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "month"; // month, quarter, year
    const tag = url.searchParams.get("tag"); // optional filter by tag

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case "quarter":
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default: // month
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    // Fetch all OS in the period
    let osQuery = supabase
      .from("ordens_servico")
      .select("*")
      .gte("data_solicitacao", startDateStr)
      .lte("data_solicitacao", endDateStr);

    if (tag) {
      osQuery = osQuery.eq("tag", tag);
    }

    const { data: ordensServico, error: osError } = await osQuery;

    if (osError) throw osError;

    const os = (ordensServico || []) as OrdemServico[];

    // Fetch executions for cost analysis
    const osIds = os.map((o) => o.id);
    const { data: execucoes } = await supabase
      .from("execucoes_os")
      .select("os_id, tempo_execucao, custo_mao_obra, custo_materiais, custo_terceiros, custo_total")
      .in("os_id", osIds);

    const exec = (execucoes || []) as ExecucaoOS[];

    // Calculate KPIs
    const totalOS = os.length;
    const osFechadas = os.filter((o) => o.status === "FECHADA");
    const osAbertas = os.filter((o) => o.status !== "FECHADA" && o.status !== "CANCELADA");
    
    // OS by type
    const osByType = {
      CORRETIVA: os.filter((o) => o.tipo === "CORRETIVA").length,
      PREVENTIVA: os.filter((o) => o.tipo === "PREVENTIVA").length,
      PREDITIVA: os.filter((o) => o.tipo === "PREDITIVA").length,
      INSPECAO: os.filter((o) => o.tipo === "INSPECAO").length,
      MELHORIA: os.filter((o) => o.tipo === "MELHORIA").length,
    };

    // Calculate MTTR (Mean Time To Repair) in hours
    const temposReparo: number[] = [];
    osFechadas.forEach((o) => {
      if (o.data_fechamento) {
        const inicio = new Date(o.data_solicitacao).getTime();
        const fim = new Date(o.data_fechamento).getTime();
        const horasReparo = (fim - inicio) / (1000 * 60 * 60);
        if (horasReparo > 0 && horasReparo < 720) { // Max 30 days
          temposReparo.push(horasReparo);
        }
      }
    });
    
    const mttr = temposReparo.length > 0
      ? temposReparo.reduce((a, b) => a + b, 0) / temposReparo.length
      : 0;

    // Calculate costs
    const custoMaoObra = exec.reduce((sum, e) => sum + (e.custo_mao_obra || 0), 0);
    const custoMateriais = exec.reduce((sum, e) => sum + (e.custo_materiais || 0), 0);
    const custoTerceiros = exec.reduce((sum, e) => sum + (e.custo_terceiros || 0), 0);
    const custoTotal = exec.reduce((sum, e) => sum + (e.custo_total || 0), 0);

    // Preventive vs Corrective ratio
    const preventivaRatio = totalOS > 0
      ? ((osByType.PREVENTIVA + osByType.PREDITIVA) / totalOS) * 100
      : 0;

    // Backlog analysis
    const backlogHoras = exec
      .filter((e) => {
        const osItem = os.find((o) => o.id === e.os_id);
        return osItem && osItem.status !== "FECHADA" && osItem.status !== "CANCELADA";
      })
      .reduce((sum, e) => sum + (e.tempo_execucao / 60), 0);

    // Top equipment by OS count
    const equipmentCounts: Record<string, number> = {};
    os.forEach((o) => {
      equipmentCounts[o.tag] = (equipmentCounts[o.tag] || 0) + 1;
    });
    
    const topEquipments = Object.entries(equipmentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // Response
    const report = {
      periodo: {
        inicio: startDateStr,
        fim: endDateStr,
        tipo: period,
      },
      resumo: {
        total_os: totalOS,
        os_abertas: osAbertas.length,
        os_fechadas: osFechadas.length,
        taxa_fechamento: totalOS > 0 ? ((osFechadas.length / totalOS) * 100).toFixed(1) : 0,
      },
      os_por_tipo: osByType,
      indicadores: {
        mttr_horas: parseFloat(mttr.toFixed(2)),
        razao_preventiva_pct: parseFloat(preventivaRatio.toFixed(1)),
        backlog_horas: parseFloat(backlogHoras.toFixed(1)),
      },
      custos: {
        mao_obra: custoMaoObra,
        materiais: custoMateriais,
        terceiros: custoTerceiros,
        total: custoTotal,
      },
      top_equipamentos: topEquipments,
      gerado_em: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(report),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erro na função kpi-report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
