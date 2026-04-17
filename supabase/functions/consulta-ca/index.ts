import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { preflight, ok, fail, resolveCorsHeaders } from "../_shared/response.ts";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

// Simple in-memory rate limiter: max 30 lookups / minute per IP
const rateBucket = new Map<string, { count: number; windowStart: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;

function isRateLimited(req: Request): boolean {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const now = Date.now();
  const bucket = rateBucket.get(ip);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBucket.set(ip, { count: 1, windowStart: now });
    return false;
  }
  bucket.count++;
  return bucket.count > RATE_LIMIT;
}

// Sanitize: only digits allowed for CA number
function sanitizeCA(raw: string): string | null {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  return digits.length > 0 ? digits : null;
}

interface ConsultaCAResult {
  numero_ca: string;
  nome: string;
  situacao: string;
  validade: string | null;
  fabricante: string | null;
  descricao: string | null;
  aprovado_para: string | null;
  natureza: string | null;
  normas: string[];
}

// Parse the HTML from consultaca.com to extract structured data
function parseConsultaCAHtml(html: string, ca: string): ConsultaCAResult | null {
  const result: ConsultaCAResult = {
    numero_ca: ca,
    nome: "",
    situacao: "",
    validade: null,
    fabricante: null,
    descricao: null,
    aprovado_para: null,
    natureza: null,
    normas: [],
  };

  // Title / EPI Name – extract from <title> tag or <h1>
  const titleMatch = html.match(/<title[^>]*>\s*CA\s*\d+\s*[-–—]\s*(.+?)\s*[-–—|<]/i);
  if (titleMatch) {
    result.nome = titleMatch[1].trim();
  } else {
    // Fallback: first h1
    const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1) result.nome = h1[1].trim();
  }

  // Situação (VÁLIDO / VENCIDO)
  const situacaoMatch = html.match(/Situa[çc][ãa]o:\s*<\/span>\s*<span[^>]*>([^<]+)/i)
    ?? html.match(/Situa[çc][ãa]o:\s*([A-ZÁÉÍÓÚÂÊÔÃÕ]+)/i);
  if (situacaoMatch) {
    result.situacao = situacaoMatch[1].trim();
  }

  // Validade (date in dd/mm/yyyy)
  const validadeMatch = html.match(/Validade:\s*<\/span>\s*<span[^>]*>\s*(\d{2}\/\d{2}\/\d{4})/i)
    ?? html.match(/Validade:\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (validadeMatch) {
    // Convert dd/mm/yyyy to yyyy-mm-dd
    const parts = validadeMatch[1].split("/");
    if (parts.length === 3) {
      result.validade = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  // Fabricante – Razão Social
  const fabricanteMatch = html.match(
    /Raz[ãa]o\s*Social:\s*(?:<[^>]*>)*\s*([^<]+)/i,
  );
  if (fabricanteMatch) {
    result.fabricante = fabricanteMatch[1].trim();
  }

  // Descrição Completa
  const descMatch = html.match(
    /Descri[çc][ãa]o\s*Completa[\s\S]*?<\/h\d>\s*(?:<[^>]*>\s*)*([^<]{10,})/i,
  );
  if (descMatch) {
    result.descricao = descMatch[1].trim().replace(/\s+/g, " ");
  }

  // Aprovado Para
  const aprovadoMatch = html.match(
    /Aprovado\s*Para:\s*(?:<[^>]*>)*\s*([^<]+)/i,
  );
  if (aprovadoMatch) {
    result.aprovado_para = aprovadoMatch[1].trim();
  }

  // Natureza
  const naturezaMatch = html.match(
    /Natureza:\s*(?:<[^>]*>)*\s*([^<]+)/i,
  );
  if (naturezaMatch) {
    result.natureza = naturezaMatch[1].trim();
  }

  // Normas (e.g. ABNT NBR 8221:2019)
  const normasBlock = html.match(/Normas[\s\S]*?((?:ABNT[^<]+(?:<[^>]*>)*\s*)+)/i);
  if (normasBlock) {
    const normaMatches = normasBlock[1].matchAll(/(ABNT\s*NBR\s*[\d:]+(?:\s*\d{4})?)/gi);
    for (const m of normaMatches) {
      result.normas.push(m[1].trim());
    }
  }

  // If we didn't get even a name, the CA probably doesn't exist
  if (!result.nome && !result.situacao) return null;

  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return preflight(req, "POST, OPTIONS");
  }

  if (req.method !== "POST") {
    return fail("Method not allowed", 405, undefined, req);
  }

  if (isRateLimited(req)) {
    return fail("Too many requests", 429, undefined, req);
  }

  let rawCA = "";
  try {
    const body = await req.json();
    rawCA = String(body?.ca ?? "");
  } catch {
    return fail("Body inválido. Envie JSON com { ca: '12345' }", 400, undefined, req);
  }
  const ca = sanitizeCA(rawCA);

  if (!ca) {
    return fail("Parâmetro 'ca' é obrigatório e deve conter apenas dígitos.", 400, undefined, req);
  }

  try {
    const response = await fetch(`https://consultaca.com/${ca}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PCM-Estrategico/1.0)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return fail(
        `Não foi possível consultar o C.A. ${ca}. Status: ${response.status}`,
        502,
        undefined,
        req,
      );
    }

    const html = await response.text();

    // Check if the page indicates CA not found
    if (
      html.includes("não foi encontrado") ||
      html.includes("CA não encontrado") ||
      html.includes("não existe")
    ) {
      return fail(`C.A. ${ca} não encontrado.`, 404, undefined, req);
    }

    const data = parseConsultaCAHtml(html, ca);

    if (!data) {
      return fail(
        `Não foi possível extrair dados do C.A. ${ca}. Verifique se o número está correto.`,
        404,
        undefined,
        req,
      );
    }

    return ok(data, 200, req);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    if (message.includes("timeout") || message.includes("aborted")) {
      return fail("Timeout ao consultar o C.A. Tente novamente.", 504, undefined, req);
    }
    return fail(`Erro na consulta: ${message}`, 500, undefined, req);
  }
});