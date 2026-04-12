import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { fail, ok, preflight, rejectIfOriginNotAllowed } from "../_shared/response.ts";
import { adminClient } from "../_shared/auth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { z } from "../_shared/validation.ts";

const ForgotPasswordSchema = z.object({
  email: z.string().email().max(255),
  redirect_to: z.string().url().max(512).optional(),
});

function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight(req, "POST, OPTIONS");

  const originDenied = rejectIfOriginNotAllowed(req);
  if (originDenied) return originDenied;

  if (req.method !== "POST") return fail("Method not allowed", 405, null, req);

  try {
    const raw = await req.json().catch(() => null);
    const parsed = ForgotPasswordSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("Email inválido", 400, null, req);
    }
    const email = normalizeEmail(parsed.data.email);

    if (!email || !isValidEmail(email)) {
      return fail("Email inválido", 400, null, req);
    }

    // Rate limit: max 5 requests per 5 minutes per IP
    const fpIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
    const rl = await enforceRateLimit(adminClient(), { scope: "forgot_password", identifier: fpIp, maxRequests: 5, windowSeconds: 300 });
    if (!rl.allowed) {
      // Return 200 to avoid leaking info about rate limiting
      return ok({ message: "Se o email existir, enviaremos um link de recuperação." }, 200, req);
    }

    const rawRedirect = String(parsed.data.redirect_to ?? "").trim();
    const fallbackRedirect = `${new URL(req.url).origin}/reset-password`;

    // Security: validate redirect_to against allowlist to prevent open redirect
    function isAllowedRedirect(url: string): boolean {
      try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        if (host === "gppis.com.br" || host === "www.gppis.com.br") return true;
        return host.endsWith(".gppis.com.br") && !host.includes("..");
      } catch {
        return false;
      }
    }

    const redirectTo = (rawRedirect && isAllowedRedirect(rawRedirect))
      ? rawRedirect
      : fallbackRedirect;

    const response = await fetch(`${env("SUPABASE_URL")}/auth/v1/recover`, {
      method: "POST",
      headers: {
        apikey: env("SUPABASE_ANON_KEY"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        redirect_to: redirectTo,
      }),
    });

    if (!response.ok) {
      const reason = await response.text().catch(() => "unknown");
      return fail("Falha ao iniciar recuperação de senha", 400, { reason }, req);
    }

    // Resposta neutra para evitar enumeração de usuários.
    return ok({ success: true, message: "Se o email existir, enviaremos um link de recuperação." }, 200, req);
  } catch (error: any) {
    return fail("Falha inesperada no fluxo de recuperação", 500, { reason: error?.message ?? String(error) }, req);
  }
});
