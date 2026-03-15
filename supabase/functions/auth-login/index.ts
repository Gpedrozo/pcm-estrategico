// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { fail, ok, preflight, rejectIfOriginNotAllowed } from "../_shared/response.ts";

type Payload = {
  email?: string;
  password?: string;
};

const WINDOW_MS = 5 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function adminClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function resolveClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for") ?? "";
  const firstForwardedIp = forwardedFor.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  return firstForwardedIp || realIp || cfIp || "unknown";
}

function isRateLimitStorageError(message?: string | null) {
  const text = String(message ?? "").toLowerCase();
  return text.includes("login_attempts") || text.includes("relation") || text.includes("does not exist");
}

async function signInWithPassword(email: string, password: string) {
  const supabaseUrl = env("SUPABASE_URL");
  const anonKey = env("SUPABASE_ANON_KEY");

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight(req, "POST, OPTIONS");

  const originDenied = rejectIfOriginNotAllowed(req);
  if (originDenied) return originDenied;

  if (req.method !== "POST") return fail("Method not allowed", 405, null, req);

  try {
    const body = (await req.json().catch(() => null)) as Payload | null;
    const email = normalizeEmail(body?.email ?? "");
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return fail("email and password are required", 400, null, req);
    }

    const ipAddress = resolveClientIp(req);
    let admin: ReturnType<typeof createClient> | null = null;
    try {
      admin = adminClient();
    } catch (error: any) {
      console.error("[auth-login] admin client unavailable, continuing without throttle", {
        reason: error?.message ?? String(error),
      });
    }
    const now = Date.now();

    let currentAttemptRaw: {
      attempt_count: number;
      window_start: string | null;
      blocked_until: string | null;
    } | null = null;
    let fetchError: { message?: string } | null = null;

    if (admin) {
      const query = await admin
        .from("login_attempts")
        .select("attempt_count,window_start,blocked_until")
        .eq("email", email)
        .eq("ip_address", ipAddress)
        .maybeSingle();

      currentAttemptRaw = query.data as typeof currentAttemptRaw;
      fetchError = query.error as typeof fetchError;
    }

    if (fetchError && !isRateLimitStorageError(fetchError.message)) {
      return fail("Falha ao validar tentativas de login", 500, { reason: fetchError.message }, req);
    }

    if (fetchError) {
      console.error("[auth-login] rate-limit storage unavailable, continuing without throttle", {
        reason: fetchError.message,
      });
    }

    const currentAttempt = fetchError ? null : currentAttemptRaw;

    const blockedUntilMs = currentAttempt?.blocked_until ? new Date(currentAttempt.blocked_until).getTime() : 0;
    if (blockedUntilMs > now) {
      const retryAfterSeconds = Math.max(1, Math.ceil((blockedUntilMs - now) / 1000));
      return fail("Muitas tentativas de login. Tente novamente mais tarde.", 429, {
        retry_after_seconds: retryAfterSeconds,
      }, req);
    }

    const windowStartMs = currentAttempt?.window_start ? new Date(currentAttempt.window_start).getTime() : now;
    const isWindowExpired = now - windowStartMs > WINDOW_MS;

    const signIn = await signInWithPassword(email, password);

    if (!signIn.ok) {
      const nextAttemptCount = isWindowExpired
        ? 1
        : Number(currentAttempt?.attempt_count ?? 0) + 1;

      const shouldBlock = nextAttemptCount >= MAX_ATTEMPTS;
      const nextBlockedUntil = shouldBlock ? new Date(now + BLOCK_MS).toISOString() : null;

      if (admin) {
        const { error: upsertError } = await admin.from("login_attempts").upsert({
          email,
          ip_address: ipAddress,
          attempt_count: nextAttemptCount,
          window_start: new Date(isWindowExpired ? now : windowStartMs).toISOString(),
          blocked_until: nextBlockedUntil,
        }, {
          onConflict: "email,ip_address",
        });

        if (upsertError && !isRateLimitStorageError(upsertError.message)) {
          return fail("Falha ao registrar tentativa de login", 500, { reason: upsertError.message }, req);
        }

        if (upsertError) {
          console.error("[auth-login] failed to persist login attempt, returning auth result", {
            reason: upsertError.message,
          });
        }
      }

      if (shouldBlock) {
        return fail("Muitas tentativas de login. Tente novamente mais tarde.", 429, {
          retry_after_seconds: Math.ceil(BLOCK_MS / 1000),
        }, req);
      }

      return fail("Email ou senha inválidos", 401, null, req);
    }

    if (admin) {
      await admin
        .from("login_attempts")
        .upsert({
          email,
          ip_address: ipAddress,
          attempt_count: 0,
          window_start: new Date(now).toISOString(),
          blocked_until: null,
        }, {
          onConflict: "email,ip_address",
        })
        .catch(() => null);
    }

    return ok(signIn.payload ?? {}, 200, req);
  } catch (error: any) {
    return fail("Falha inesperada no login", 500, { reason: error?.message ?? String(error) }, req);
  }
});
