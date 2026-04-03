import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

declare const Deno: any;

function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function adminClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
}

function anonClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"));
}

function devicePassword(deviceToken: string) {
  const secret = env("SUPABASE_JWT_SECRET").slice(0, 12);
  return `pcm-da-${deviceToken}-${secret}`;
}

// Mobile device auth always allows any origin
// Security is enforced by the device_token credential, not the origin
function mobileCorsHeaders(req: Request) {
  return {
    "Access-Control-Allow-Origin": req.headers.get("origin") || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(body: unknown, status: number, req: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...mobileCorsHeaders(req), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: mobileCorsHeaders(req) });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const deviceToken = String(body.device_token ?? "").trim();

    if (!deviceToken) {
      return jsonResponse({ error: "device_token is required" }, 400, req);
    }

    const admin = adminClient();

    const { data: device, error: deviceError } = await admin
      .from("dispositivos_moveis")
      .select("id, device_id, device_nome, empresa_id, token, ativo")
      .eq("token", deviceToken)
      .eq("ativo", true)
      .maybeSingle();

    if (deviceError || !device) {
      return jsonResponse({ error: "Device not found or inactive" }, 401, req);
    }

    const { data: empresa, error: empresaError } = await admin
      .from("empresas")
      .select("id, slug, nome, razao_social")
      .eq("id", device.empresa_id)
      .single();

    if (empresaError || !empresa) {
      return jsonResponse({ error: "Company not found" }, 401, req);
    }

    const email = `device-${device.device_id}@mecanico.pcm.local`;
    const password = devicePassword(device.token);

    const anon = anonClient();
    let signIn = await anon.auth.signInWithPassword({ email, password });

    if (signIn.error) {
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: {
          empresa_id: empresa.id,
          empresa_slug: empresa.slug,
          provider: "device",
          providers: ["device"],
        },
        user_metadata: {
          empresa_id: empresa.id,
          empresa_slug: empresa.slug,
        },
      });

      if (createError || !newUser?.user) {
        return jsonResponse({ error: "Failed to create device user", detail: createError?.message }, 500, req);
      }

      await admin.from("profiles").upsert({
        id: newUser.user.id,
        nome: `Dispositivo ${device.device_nome || device.device_id.slice(0, 8)}`,
        email,
        tipo: "TECHNICIAN",
        empresa_id: empresa.id,
      }, { onConflict: "id" });

      await admin.from("user_roles").upsert({
        user_id: newUser.user.id,
        role: "TECHNICIAN",
        empresa_id: empresa.id,
      }, { onConflict: "user_id,role" });

      signIn = await anonClient().auth.signInWithPassword({ email, password });

      if (signIn.error || !signIn.data?.session) {
        return jsonResponse({ error: "Failed to authenticate device user" }, 500, req);
      }
    } else {
      const userId = signIn.data.user?.id;
      if (userId) {
        await admin.auth.admin.updateUserById(userId, {
          app_metadata: {
            empresa_id: empresa.id,
            empresa_slug: empresa.slug,
            provider: "device",
            providers: ["device"],
          },
          user_metadata: {
            empresa_id: empresa.id,
            empresa_slug: empresa.slug,
          },
        });

        await admin.from("profiles").upsert({
          id: userId,
          nome: `Dispositivo ${device.device_nome || device.device_id.slice(0, 8)}`,
          email,
          tipo: "TECHNICIAN",
          empresa_id: empresa.id,
        }, { onConflict: "id" });

        await admin.from("user_roles").upsert({
          user_id: userId,
          role: "TECHNICIAN",
          empresa_id: empresa.id,
        }, { onConflict: "user_id,role" });
      }
    }

    const session = signIn.data!.session!;

    await admin
      .from("dispositivos_moveis")
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq("id", device.id);

    return jsonResponse({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      dispositivo_id: device.id,
      empresa_id: empresa.id,
      empresa_nome: empresa.nome,
      tenant_slug: empresa.slug,
    }, 200, req);
  } catch (err) {
    return jsonResponse({ error: "Internal error", detail: String(err) }, 500, req);
  }
});
