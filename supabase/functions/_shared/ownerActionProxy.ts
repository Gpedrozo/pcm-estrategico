import { preflight, rejectIfOriginNotAllowed, resolveCorsHeaders } from "./response.ts";
import { requireUser, unauthorizedResponse } from "./auth.ts";

declare const Deno: any;

type ProxyConfig = {
  serviceName: string;
  allowedActions: string[];
};

function jsonResponse(req: Request, body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...resolveCorsHeaders(req), "Content-Type": "application/json" },
  });
}

export async function proxyOwnerAction(req: Request, config: ProxyConfig) {
  if (req.method === "OPTIONS") return preflight(req, "POST, OPTIONS");

  const originDenied = rejectIfOriginNotAllowed(req);
  if (originDenied) return originDenied;

  if (req.method !== "POST") {
    return jsonResponse(req, { success: false, error: "Method not allowed" }, 405);
  }

  const authorization = req.headers.get("authorization");
  if (!authorization) {
    return unauthorizedResponse(req);
  }

  const auth = await requireUser(req);
  if ("error" in auth) {
    return unauthorizedResponse(req);
  }

  const payload = await req.json().catch(() => null) as Record<string, unknown> | null;
  const action = typeof payload?.action === "string" ? payload.action : "";
  if (!action) {
    return jsonResponse(req, { success: false, error: "Missing action" }, 400);
  }

  if (!config.allowedActions.includes(action)) {
    return jsonResponse(req, { success: false, error: "Unsupported action" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  if (!supabaseUrl || !anonKey) {
    return jsonResponse(req, { success: false, error: "Internal server error" }, 500);
  }

  try {
    const upstream = await fetch(`${supabaseUrl}/functions/v1/owner-portal-admin`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        apikey: anonKey,
        "Content-Type": "application/json",
        "x-owner-module": config.serviceName,
      },
      body: JSON.stringify(payload),
    });

    const textBody = await upstream.text();
    return new Response(textBody, {
      status: upstream.status,
      headers: {
        ...resolveCorsHeaders(req),
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      source: config.serviceName,
      event: "owner_proxy_failed",
      message: String((error as Error)?.message ?? "unknown_error"),
      timestamp: new Date().toISOString(),
    }));

    return jsonResponse(req, { success: false, error: "Internal server error" }, 500);
  }
}
