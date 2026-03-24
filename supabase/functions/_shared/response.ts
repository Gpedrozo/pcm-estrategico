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

    // Only accept base domain or single-level subdomains (slug.gppis.com.br)
    // Reject multi-level subdomains like evil.evil.gppis.com.br
    if (hostname === TENANT_BASE_DOMAIN) return true;
    if (!hostname.endsWith(`.${TENANT_BASE_DOMAIN}`)) return false;

    const subdomain = hostname.replace(`.${TENANT_BASE_DOMAIN}`, "");
    // Only allow single-level slugs (no dots) and valid characters
    if (subdomain.includes(".") || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(subdomain)) {
      return false;
    }

    return true;
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
  if (!origin) return false;
  return allowedOrigins().includes(origin) || isTenantDomainOrigin(origin);
}

export function resolveCorsHeaders(
  req?: Request,
  methods = "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  extraHeaders = "",
) {
  const origin = req?.headers.get("origin") ?? null;
  const allowOrigin = origin && isAllowedOrigin(origin) ? origin : "";

  const allowHeadersBase = "authorization, x-client-info, apikey, content-type, x-allow-password-change";
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
  // Requests without Origin header (server-to-server, Supabase triggers) are allowed
  // but will not receive CORS headers. Browser requests ALWAYS include Origin.
  if (!origin) return null;
  if (!isAllowedOrigin(origin)) {
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
