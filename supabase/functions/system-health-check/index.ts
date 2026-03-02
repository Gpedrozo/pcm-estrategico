import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("CORS_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const healthCheckApiKey = Deno.env.get("SYSTEM_HEALTH_API_KEY") ?? "";

function resolveCorsHeaders(origin: string | null) {
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-system-health-key",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    Vary: "Origin",
  };
}

const rateWindowMs = 60_000;
const rateLimit = 60;
const ipBucket = new Map<string, { count: number; windowStart: number }>();

function resolveClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for") ?? "";
  return forwardedFor.split(",")[0]?.trim() || "unknown";
}

function isRateLimited(req: Request): boolean {
  const key = resolveClientIp(req);
  const now = Date.now();
  const item = ipBucket.get(key);

  if (!item || now - item.windowStart > rateWindowMs) {
    ipBucket.set(key, { count: 1, windowStart: now });
    return false;
  }

  item.count += 1;
  ipBucket.set(key, item);
  return item.count > rateLimit;
}

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
  const origin = req.headers.get("origin");
  const corsHeaders = resolveCorsHeaders(origin);

  if (origin && !allowedOrigins.includes(origin)) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!healthCheckApiKey) {
    return new Response(JSON.stringify({ error: "Health check key not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const providedKey = req.headers.get("x-system-health-key");
  if (!providedKey || providedKey !== healthCheckApiKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (isRateLimited(req)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
