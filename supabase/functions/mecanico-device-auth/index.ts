import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { fail, ok, preflight, rejectIfOriginNotAllowed } from "../_shared/response.ts";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return preflight(req);

  const rejected = rejectIfOriginNotAllowed(req);
  if (rejected) return rejected;

  try {
    const body = await req.json().catch(() => ({}));
    const deviceToken = String(body.device_token ?? "").trim();

    if (!deviceToken) {
      return fail("device_token is required", 400, null, req);
    }

    const admin = adminClient();

    const { data: device, error: deviceError } = await admin
      .from("dispositivos_moveis")
      .select("id, device_id, device_nome, empresa_id, token, ativo")
      .eq("token", deviceToken)
      .eq("ativo", true)
      .maybeSingle();

    if (deviceError || !device) {
      return fail("Device not found or inactive", 401, null, req);
    }

    const { data: empresa, error: empresaError } = await admin
      .from("empresas")
      .select("id, slug, nome_fantasia, razao_social")
      .eq("id", device.empresa_id)
      .single();

    if (empresaError || !empresa) {
      return fail("Company not found", 401, null, req);
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
        return fail("Failed to create device user", 500, { detail: createError?.message }, req);
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
        return fail("Failed to authenticate device user", 500, null, req);
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

    return ok({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      empresa_id: empresa.id,
      empresa_nome: empresa.nome_fantasia || empresa.razao_social,
      tenant_slug: empresa.slug,
    }, 200, req);
  } catch (err) {
    return fail("Internal error", 500, { detail: String(err) }, req);
  }
});
