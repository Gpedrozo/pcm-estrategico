import { preflight, rejectIfOriginNotAllowed, resolveCorsHeaders } from "./response.ts";
import { requireUser, unauthorizedResponse } from "./auth.ts";
import { enforceRateLimit } from "./rateLimit.ts";
import { z } from "./validation.ts";

const OwnerProxySchema = z.object({
  action: z.string().min(1).max(100),
}).passthrough();

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

  // Rate limit: 30 requests per 60s per user across all owner proxy actions
  const { adminClient: getAdmin } = await import("./auth.ts");
  const rlAdmin = getAdmin();
  const rl = await enforceRateLimit(rlAdmin, {
    scope: `owner_proxy.${config.serviceName}`,
    identifier: auth.user.id,
    maxRequests: 30,
    windowSeconds: 60,
  });
  if (!rl.allowed) {
    return jsonResponse(req, { success: false, error: "Rate limit exceeded" }, 429);
  }

  const raw = await req.json().catch(() => null) as Record<string, unknown> | null;
  const parsed = OwnerProxySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(req, { success: false, error: "Missing action" }, 400);
  }
  const payload = parsed.data;
  const action = payload.action;
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
      body: JSON.stringify({ ...payload, action }),
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
