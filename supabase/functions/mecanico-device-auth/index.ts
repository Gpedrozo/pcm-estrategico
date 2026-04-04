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
  // SERVICE_ROLE_KEY está sempre disponível em Edge Functions; JWT_SECRET não
  const secret = env("SUPABASE_SERVICE_ROLE_KEY").slice(-12);
  return `pcm-da-${deviceToken}-${secret}`;
}

// CORS aberto — segurança via device_token, não via origin
function cors(req: Request) {
  return {
    "Access-Control-Allow-Origin": req.headers.get("origin") || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// SEMPRE retorna 200 — supabase.functions.invoke descarta o body em non-2xx
function respond(body: Record<string, unknown>, req: Request) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...cors(req), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors(req) });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const deviceToken = String(body.device_token ?? "").trim();
    const qrToken = String(body.qr_token ?? "").trim();
    const deviceId = String(body.device_id ?? "").trim();
    const deviceNome = String(body.device_nome ?? "Android App").trim();
    const deviceOs = String(body.device_os ?? "React Native").trim();

    const admin = adminClient();

    // ── MODE 1: Bind via QR Code (qr_token + device_id) ──
    if (qrToken && deviceId) {
      console.log("[device-auth] BIND mode: qr_token=", qrToken.slice(0, 8), "device_id=", deviceId.slice(0, 8));

      // Validate QR code
      const { data: qr, error: qrErr } = await admin
        .from("qrcodes_vinculacao")
        .select("*")
        .eq("token", qrToken)
        .eq("ativo", true)
        .maybeSingle();

      if (qrErr || !qr) {
        return respond({ ok: false, error: "QR Code inválido ou revogado" }, req);
      }
      if (qr.expira_em && new Date(qr.expira_em) < new Date()) {
        return respond({ ok: false, error: "QR Code expirado" }, req);
      }
      if (qr.tipo === "UNICO" && qr.usos > 0) {
        return respond({ ok: false, error: "QR Code de uso único já utilizado" }, req);
      }
      if (qr.max_usos != null && qr.usos >= qr.max_usos) {
        return respond({ ok: false, error: "Limite de usos deste QR atingido" }, req);
      }

      // Validate empresa
      const { data: empresa, error: empErr } = await admin
        .from("empresas")
        .select("id, slug, nome, dispositivos_moveis_ativos, max_dispositivos_moveis")
        .eq("id", qr.empresa_id)
        .single();

      if (empErr || !empresa || !empresa.dispositivos_moveis_ativos) {
        return respond({ ok: false, error: "Dispositivos móveis desativados para esta empresa" }, req);
      }

      // Check device limit
      const { count } = await admin
        .from("dispositivos_moveis")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresa.id)
        .eq("ativo", true);

      const maxDevices = empresa.max_dispositivos_moveis ?? 10;
      // Check if this device already exists (won't count as new)
      const { data: existingDevice } = await admin
        .from("dispositivos_moveis")
        .select("id, ativo")
        .eq("empresa_id", empresa.id)
        .eq("device_id", deviceId)
        .maybeSingle();

      if (!existingDevice && (count ?? 0) >= maxDevices) {
        return respond({ ok: false, error: `Limite de dispositivos atingido (${maxDevices})` }, req);
      }

      // Upsert device
      let device: any;
      if (existingDevice) {
        const { data: updated, error: upErr } = await admin
          .from("dispositivos_moveis")
          .update({
            ativo: true,
            device_nome: deviceNome,
            device_os: deviceOs,
            desativado_por: null,
            desativado_em: null,
            motivo_desativacao: null,
            ultimo_acesso: new Date().toISOString(),
          })
          .eq("id", existingDevice.id)
          .select("id, device_id, token, empresa_id")
          .single();
        if (upErr) return respond({ ok: false, error: "Erro ao reativar dispositivo", detail: upErr.message }, req);
        device = updated;
      } else {
        const { data: inserted, error: insErr } = await admin
          .from("dispositivos_moveis")
          .insert({
            empresa_id: empresa.id,
            device_id: deviceId,
            device_nome: deviceNome,
            device_os: deviceOs,
            ultimo_acesso: new Date().toISOString(),
          })
          .select("id, device_id, token, empresa_id")
          .single();
        if (insErr) return respond({ ok: false, error: "Erro ao registrar dispositivo", detail: insErr.message }, req);
        device = inserted;
      }

      // Increment QR usage
      await admin.from("qrcodes_vinculacao").update({ usos: qr.usos + 1 }).eq("id", qr.id);
      if (qr.tipo === "UNICO") {
        await admin.from("qrcodes_vinculacao").update({ ativo: false }).eq("id", qr.id);
      }

      console.log("[device-auth] BIND success, device_token=", device.token?.slice(0, 8));

      // Now authenticate the newly bound device (fall through to auth logic)
      return await authenticateWithDevice(admin, device, empresa, req);
    }

    // ── MODE 2: Re-authenticate existing device (device_token) ──
    if (!deviceToken) {
      return respond({ ok: false, error: "device_token ou qr_token+device_id obrigatório" }, req);
    }

    // 1. Busca dispositivo ativo pelo token
    const { data: device, error: deviceError } = await admin
      .from("dispositivos_moveis")
      .select("id, device_id, device_nome, empresa_id, token, ativo")
      .eq("token", deviceToken)
      .eq("ativo", true)
      .maybeSingle();

    if (deviceError) {
      console.error("[device-auth] DB error:", deviceError);
      return respond({ ok: false, error: "Erro ao buscar dispositivo", detail: deviceError.message }, req);
    }
    if (!device) {
      return respond({ ok: false, error: "Dispositivo não encontrado ou desativado. Escaneie o QR Code novamente." }, req);
    }

    // 2. Busca empresa
    const { data: empresa, error: empresaError } = await admin
      .from("empresas")
      .select("id, slug, nome, razao_social")
      .eq("id", device.empresa_id)
      .single();

    if (empresaError || !empresa) {
      return respond({ ok: false, error: "Empresa não encontrada" }, req);
    }

    return await authenticateWithDevice(admin, device, empresa, req);
  } catch (err) {
    console.error("[device-auth] exception:", err);
    return respond({ ok: false, error: "Erro interno do servidor", detail: String(err) }, req);
  }
});

// ── Shared authentication logic ──
async function authenticateWithDevice(
  admin: any,
  device: { id: string; device_id: string; device_nome?: string; token: string; empresa_id: string },
  empresa: { id: string; slug: string; nome: string },
  req: Request
): Promise<Response> {
    const email = `device-${device.device_id}@mecanico.pcm.local`;
    const password = devicePassword(device.token);

    // 3. Tenta sign-in
    const anon = anonClient();
    let signIn = await anon.auth.signInWithPassword({ email, password });

    if (signIn.error) {
      console.log("[device-auth] sign-in falhou, tentando criar/atualizar user:", signIn.error.message);

      const appMeta = {
        empresa_id: empresa.id,
        empresa_slug: empresa.slug,
        provider: "device",
        providers: ["device"],
      };
      const userMeta = { empresa_id: empresa.id, empresa_slug: empresa.slug };
      const displayName = `Dispositivo ${device.device_nome || device.device_id.slice(0, 8)}`;

      // Tenta criar — se já existir, atualiza senha
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: appMeta,
        user_metadata: userMeta,
      });

      let userId: string | null = null;

      if (!createErr && newUser?.user) {
        userId = newUser.user.id;
        console.log("[device-auth] user criado:", email, userId);
      } else {
        // User já existe (re-vinculação) — busca no auth e atualiza senha
        console.log("[device-auth] createUser falhou:", createErr?.message, "— buscando user existente...");
        const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = listData?.users?.find((u: any) => u.email === email);

        if (existing) {
          userId = existing.id;
          console.log("[device-auth] user encontrado, atualizando senha:", email, userId);
          const { error: updateErr } = await admin.auth.admin.updateUserById(existing.id, {
            password,
            email_confirm: true,
            app_metadata: appMeta,
            user_metadata: userMeta,
          });
          if (updateErr) {
            console.error("[device-auth] falha ao atualizar user:", updateErr);
            return respond({ ok: false, error: "Falha ao atualizar credenciais do dispositivo", detail: updateErr.message }, req);
          }
        } else {
          return respond({ ok: false, error: "Falha ao criar usuário do dispositivo", detail: createErr?.message }, req);
        }
      }

      // Upsert profile e role
      if (userId) {
        await admin.from("profiles").upsert({
          id: userId,
          nome: displayName,
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

      // Sign-in com senha atualizada
      signIn = await anonClient().auth.signInWithPassword({ email, password });

      if (signIn.error || !signIn.data?.session) {
        console.error("[device-auth] sign-in final falhou:", signIn.error);
        return respond({ ok: false, error: "Falha na autenticação após criar/atualizar dispositivo", detail: signIn.error?.message }, req);
      }
    } else {
      // Sign-in OK — atualiza metadata
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

    // Atualiza último acesso
    await admin
      .from("dispositivos_moveis")
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq("id", device.id);

    return respond({
      ok: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      device_token: device.token,
      dispositivo_id: device.id,
      empresa_id: empresa.id,
      empresa_nome: empresa.nome,
      tenant_slug: empresa.slug,
    }, req);
}
