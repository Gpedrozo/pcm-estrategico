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

// Helper: strip HTML tags
function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "").trim();
}

// Helper: decode common HTML entities
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
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

  // EPI Name - from <h1>
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    result.nome = stripTags(h1[1]).replace(/\s+/g, " ").trim();
  }
  // Fallback: <title> tag
  if (!result.nome) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      const cleaned = titleMatch[1].replace(/^\s*CA\s*\d+\s*[-\u2013\u2014]\s*/i, "").trim();
      if (cleaned.length > 3) result.nome = cleaned;
    }
  }

  // Situacao - "Situacao:VALIDO" (with or without tags/spaces)
  const sitMatch = html.match(/Situa[\xE7c][\xE3a]o[:\s]*(?:<[^>]*>)*\s*([A-Z\xC0-\xDA\xC4-\xDC]+)/i);
  if (sitMatch) {
    result.situacao = sitMatch[1].trim();
  }

  // Validade - "Validade:  09/11/2026"
  const valMatch = html.match(/Validade[:\s]*(?:<[^>]*>)*\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (valMatch) {
    const parts = valMatch[1].split("/");
    if (parts.length === 3) {
      result.validade = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  // Fabricante - "Razao Social" or "Razao Social Importador:"
  const fabMatch = html.match(/Raz[\xE3a]o\s*Social[^:]*:\s*(?:<[^>]*>)*\s*([^<]+)/i);
  if (fabMatch) {
    let fab = fabMatch[1].trim();
    fab = fab.replace(/\s*CNPJ.*$/i, "").trim();
    if (fab.length > 2) result.fabricante = decodeEntities(fab);
  }
  // Fallback: Nome Fantasia
  if (!result.fabricante) {
    const nfMatch = html.match(/Nome\s*Fantasia[:\s]*(?:<[^>]*>)*\s*([^<]+)/i);
    if (nfMatch && nfMatch[1].trim().length > 2) {
      result.fabricante = decodeEntities(nfMatch[1].trim());
    }
  }

  // Descricao Completa
  const descBlock = html.match(/Descri[\xE7c][\xE3a]o\s*Completa[\s\S]{0,500}/i);
  if (descBlock) {
    const afterHeading = descBlock[0].replace(/^[\s\S]*?Descri[\xE7c][\xE3a]o\s*Completa\s*/i, "");
    const text = stripTags(afterHeading).replace(/\s+/g, " ").trim();
    if (text.length >= 10) result.descricao = decodeEntities(text);
  }

  // Aprovado Para
  const aprovMatch = html.match(/Aprovado\s*Para[:\s]*(?:<[^>]*>)*\s*([^<]+)/i);
  if (aprovMatch) {
    const val = aprovMatch[1].trim();
    if (val.length > 3) result.aprovado_para = decodeEntities(val);
  }

  // Natureza (Nacional / Importado)
  const natMatch = html.match(/Natureza[:\s]*(?:<[^>]*>)*\s*([A-Za-z\xC0-\xFF]+)/i);
  if (natMatch) {
    result.natureza = natMatch[1].trim();
  }

  // Normas - e.g. "BS EN 388:2016", "ABNT NBR 8221:2019"
  const normasSection = html.match(/Normas[\s\S]{0,2000}?(?=###|<h[2-4]|Hist[\xF3o]rico|$)/i);
  if (normasSection) {
    const normaMatches = normasSection[0].matchAll(
      /((?:ABNT\s*)?(?:NBR|BS|EN|ISO)\s*(?:EN\s*(?:ISO\s*)?)?[\d]+(?:[:\/]\d+)?(?:\s*\+\s*A\d[:\d]*)?)/gi,
    );
    for (const m of normaMatches) {
      const n = m[1].replace(/\s+/g, " ").trim();
      if (!result.normas.includes(n)) result.normas.push(n);
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
