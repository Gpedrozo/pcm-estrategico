import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { fail, ok, preflight, rejectIfOriginNotAllowed } from "../_shared/response.ts";

type Payload = {
  email?: string;
  redirect_to?: string;
};

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
    const body = (await req.json().catch(() => null)) as Payload | null;
    const email = normalizeEmail(body?.email ?? "");

    if (!email || !isValidEmail(email)) {
      return fail("Email inválido", 400, null, req);
    }

    const rawRedirect = String(body?.redirect_to ?? "").trim();
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
