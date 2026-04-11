import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient } from "../_shared/auth.ts";
import { fail, ok, preflight, rejectIfOriginNotAllowed } from "../_shared/response.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

type Payload = {
  action: "create" | "consume";
  access_token?: string;
  refresh_token?: string;
  target_host?: string;
  ttl_seconds?: number;
  code?: string;
};

function normalizeHost(input?: string | null) {
  const value = String(input ?? "").trim().toLowerCase();
  if (!value) return null;
  return value;
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateTransferCode() {
  return `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().slice(0, 8)}`;
}

function bytesToBase64Url(bytes: Uint8Array) {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function statelessSigningSecret() {
  const configured = (Deno.env.get("SESSION_TRANSFER_SIGNING_SECRET") ?? "").trim();
  if (configured) return configured;
  throw new Error("SESSION_TRANSFER_SIGNING_SECRET must be set. Do not use SERVICE_ROLE_KEY as a signing secret.");
}

async function signHmacSha256(input: string) {
  const secretBytes = new TextEncoder().encode(statelessSigningSecret());
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function createStatelessTransferCode(payload: {
  access_token: string;
  refresh_token: string;
  target_host: string | null;
  created_by: string;
  expires_at: string;
}) {
  const body = {
    v: 1,
    a: payload.access_token,
    r: payload.refresh_token,
    h: payload.target_host,
    u: payload.created_by,
    e: payload.expires_at,
  };

  const bodyJson = JSON.stringify(body);
  const bodyEncoded = bytesToBase64Url(new TextEncoder().encode(bodyJson));
  const signature = await signHmacSha256(bodyEncoded);
  return `stf1.${bodyEncoded}.${signature}`;
}

async function parseStatelessTransferCode(code: string) {
  const parts = code.split(".");
  if (parts.length !== 3 || parts[0] !== "stf1") {
    return null;
  }

  const bodyEncoded = parts[1];
  const providedSignature = parts[2];
  const expectedSignature = await signHmacSha256(bodyEncoded);
  if (providedSignature !== expectedSignature) {
    return { error: "invalid stateless signature" };
  }

  try {
    const bytes = base64UrlToBytes(bodyEncoded);
    const decoded = new TextDecoder().decode(bytes);
    const payload = JSON.parse(decoded) as {
      v?: number;
      a?: string;
      r?: string;
      h?: string | null;
      u?: string;
      e?: string;
    };

    return {
      access_token: String(payload.a ?? "").trim(),
      refresh_token: String(payload.r ?? "").trim(),
      target_host: normalizeHost(payload.h),
      expires_at: String(payload.e ?? "").trim(),
      created_by: String(payload.u ?? "").trim(),
    };
  } catch {
    return { error: "invalid stateless payload" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight(req);

  const originError = rejectIfOriginNotAllowed(req);
  if (originError) return originError;

  if (req.method !== "POST") {
    return fail("Method not allowed", 405, null, req);
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body", 400, null, req);
  }

  if (body.action === "create") {
    const accessToken = String(body.access_token ?? "").trim();
    const refreshToken = String(body.refresh_token ?? "").trim();
    if (!accessToken || !refreshToken) {
      return fail("access_token and refresh_token are required", 400, null, req);
    }

    const admin = adminClient();
    const { data: tokenUser, error: tokenUserError } = await admin.auth.getUser(accessToken);
    if (tokenUserError || !tokenUser?.user?.id) {
      return fail("unauthorized", 401, null, req);
    }

    const ttl = Number(body.ttl_seconds ?? 45);
    const ttlSeconds = Number.isFinite(ttl) ? Math.max(15, Math.min(120, Math.trunc(ttl))) : 45;
    const expiresAt = new Date(Date.now() + (ttlSeconds * 1000)).toISOString();

    const code = generateTransferCode();
    const codeHash = await sha256Hex(code);
    const targetHost = normalizeHost(body.target_host);

    const { error } = await admin
      .from("auth_session_transfer_tokens")
      .insert({
        code_hash: codeHash,
        access_token: accessToken,
        refresh_token: refreshToken,
        target_host: targetHost,
        created_by: tokenUser.user.id,
        expires_at: expiresAt,
      });

    if (error) {
      const fallbackCode = await createStatelessTransferCode({
        access_token: accessToken,
        refresh_token: refreshToken,
        target_host: targetHost,
        created_by: tokenUser.user.id,
        expires_at: expiresAt,
      });

      return ok({
        success: true,
        code: fallbackCode,
        expires_at: expiresAt,
        mode: "stateless_fallback",
      }, 200, req);
    }

    return ok({ success: true, code, expires_at: expiresAt }, 200, req);
  }

  if (body.action === "consume") {
    const consumeIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
    const rl = await enforceRateLimit(adminClient(), { scope: "session_transfer_consume", identifier: consumeIp, maxRequests: 10, windowSeconds: 60 });
    if (!rl.allowed) return fail("Too many requests", 429, null, req);

    const code = String(body.code ?? "").trim();
    if (!code) {
      return fail("code is required", 400, null, req);
    }

    const requestedTargetHost = normalizeHost(body.target_host);

    if (code.startsWith("stf1.")) {
      const parsed = await parseStatelessTransferCode(code);
      if (!parsed) {
        return fail("invalid stateless transfer code", 400, null, req);
      }

      if ((parsed as { error?: string }).error) {
        return fail((parsed as { error?: string }).error ?? "invalid stateless transfer code", 400, null, req);
      }

      const payload = parsed as {
        access_token: string;
        refresh_token: string;
        target_host: string | null;
        expires_at: string;
      };

      if (!payload.access_token || !payload.refresh_token || !payload.expires_at) {
        return fail("invalid stateless transfer payload", 400, null, req);
      }

      if (new Date(payload.expires_at).getTime() <= Date.now()) {
        return fail("transfer code expired", 410, null, req);
      }

      if (payload.target_host && requestedTargetHost && payload.target_host !== requestedTargetHost) {
        return fail("transfer target mismatch", 403, null, req);
      }

      return ok({
        success: true,
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        issued_at: Date.now(),
      }, 200, req);
    }

    const codeHash = await sha256Hex(code);
    const admin = adminClient();

    const { data: row, error: lookupError } = await admin
      .from("auth_session_transfer_tokens")
      .select("id,access_token,refresh_token,target_host,expires_at")
      .eq("code_hash", codeHash)
      .maybeSingle();

    if (lookupError) {
      return fail(lookupError.message, 400, null, req);
    }

    if (!row?.id) {
      return fail("transfer code not found", 404, null, req);
    }

    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await admin.from("auth_session_transfer_tokens").delete().eq("id", row.id);
      return fail("transfer code expired", 410, null, req);
    }

    const storedTargetHost = normalizeHost(row.target_host);
    if (storedTargetHost && requestedTargetHost && storedTargetHost !== requestedTargetHost) {
      return fail("transfer target mismatch", 403, null, req);
    }

    const { error: deleteError } = await admin
      .from("auth_session_transfer_tokens")
      .delete()
      .eq("id", row.id);

    if (deleteError) {
      return fail(deleteError.message, 400, null, req);
    }

    return ok({
      success: true,
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      issued_at: Date.now(),
    }, 200, req);
  }

  return fail("Unsupported action", 400, null, req);
});
