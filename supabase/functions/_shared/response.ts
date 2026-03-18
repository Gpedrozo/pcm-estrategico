declare const Deno: any;

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://gppis.com.br",
  "https://www.gppis.com.br",
  "https://owner.gppis.com.br",
];

const TENANT_BASE_DOMAIN = (Deno.env.get("TENANT_BASE_DOMAIN")
  ?? Deno.env.get("VITE_TENANT_BASE_DOMAIN")
  ?? "gppis.com.br")
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "");

function isTenantDomainOrigin(origin: string) {
  if (!origin || !TENANT_BASE_DOMAIN) return false;

  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();
    const protocol = parsed.protocol.toLowerCase();

    if (protocol !== "https:" && protocol !== "http:") {
      return false;
    }

    return hostname === TENANT_BASE_DOMAIN || hostname.endsWith(`.${TENANT_BASE_DOMAIN}`);
  } catch {
    return false;
  }
}

function allowedOrigins() {
  const configured = (Deno.env.get("CORS_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin: string) => origin.trim())
    .filter(Boolean);

  return configured.length > 0 ? configured : defaultAllowedOrigins;
}

export function isAllowedOrigin(origin: string | null) {
  if (!origin) return true;
  return allowedOrigins().includes(origin) || isTenantDomainOrigin(origin);
}

export function resolveCorsHeaders(
  req?: Request,
  methods = "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  extraHeaders = "",
) {
  const origin = req?.headers.get("origin") ?? null;
  const allowOrigin = origin && isAllowedOrigin(origin) ? origin : "";

  const allowHeadersBase = "authorization, x-client-info, apikey, content-type";
  const allowHeaders = extraHeaders
    ? `${allowHeadersBase}, ${extraHeaders}`
    : allowHeadersBase;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Allow-Methods": methods,
    Vary: "Origin",
  };
}

export function rejectIfOriginNotAllowed(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && !isAllowedOrigin(origin)) {
    return fail("Origin not allowed", 403, { origin }, req);
  }

  return null;
}

export function preflight(
  req: Request,
  methods = "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  extraHeaders = "",
) {
  const denied = rejectIfOriginNotAllowed(req);
  if (denied) return denied;

  return new Response(null, {
    headers: resolveCorsHeaders(req, methods, extraHeaders),
  });
}

export function ok(data: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...resolveCorsHeaders(req), "Content-Type": "application/json" },
  });
}

export function fail(message: string, status = 400, details?: unknown, req?: Request) {
  return new Response(
    JSON.stringify({ error: message, details: details ?? null }),
    {
      status,
      headers: { ...resolveCorsHeaders(req), "Content-Type": "application/json" },
    },
  );
}
