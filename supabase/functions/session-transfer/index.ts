// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, requireUser } from "../_shared/auth.ts";
import { fail, ok, preflight, rejectIfOriginNotAllowed } from "../_shared/response.ts";

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
    const auth = await requireUser(req, { allowPasswordChangeFlow: true });
    if ("error" in auth) {
      return fail(auth.error, auth.status, null, req);
    }

    const accessToken = String(body.access_token ?? "").trim();
    const refreshToken = String(body.refresh_token ?? "").trim();
    if (!accessToken || !refreshToken) {
      return fail("access_token and refresh_token are required", 400, null, req);
    }

    const ttl = Number(body.ttl_seconds ?? 45);
    const ttlSeconds = Number.isFinite(ttl) ? Math.max(15, Math.min(120, Math.trunc(ttl))) : 45;
    const expiresAt = new Date(Date.now() + (ttlSeconds * 1000)).toISOString();

    const code = generateTransferCode();
    const codeHash = await sha256Hex(code);
    const targetHost = normalizeHost(body.target_host);

    const { error } = await auth.admin
      .from("auth_session_transfer_tokens")
      .insert({
        code_hash: codeHash,
        access_token: accessToken,
        refresh_token: refreshToken,
        target_host: targetHost,
        created_by: auth.user.id,
        expires_at: expiresAt,
      });

    if (error) {
      return fail(error.message, 400, null, req);
    }

    return ok({ success: true, code, expires_at: expiresAt }, 200, req);
  }

  if (body.action === "consume") {
    const code = String(body.code ?? "").trim();
    if (!code) {
      return fail("code is required", 400, null, req);
    }

    const requestedTargetHost = normalizeHost(body.target_host);
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
