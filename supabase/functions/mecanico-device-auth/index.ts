import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { adminClient } from "../_shared/auth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { z } from "../_shared/validation.ts";

declare const Deno: any;

function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function anonClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"));
}

async function devicePassword(deviceToken: string): Promise<string> {
  const secret = Deno.env.get("DEVICE_AUTH_SECRET");
  if (!secret) throw new Error("DEVICE_AUTH_SECRET is required — do NOT fall back to SERVICE_ROLE_KEY");
  const encoder = new TextEncoder();
  const keyData = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", keyData, encoder.encode(`device:${deviceToken}`));
  const hash = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `pcm-da-${hash.slice(0, 32)}`;
}

// Origens permitidas: app Expo (sem Origin) e website web se necessário.
// Requisições sem Origin (Expo nativo / curl) retornam "null" em vez de "*".
const ALLOWED_ORIGINS = new Set([
  Deno.env.get("ALLOWED_ORIGIN_WEB") ?? "https://gppis.com.br",
  Deno.env.get("ALLOWED_ORIGIN_APP") ?? "",
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
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

// Timing-safe string comparison via HMAC-SHA256 to prevent timing attacks
async function timingSafeCompare(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode("pcm-compare-key"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign("HMAC", key, enc.encode(a)),
    crypto.subtle.sign("HMAC", key, enc.encode(b)),
  ]);
  const vA = new Uint8Array(sigA), vB = new Uint8Array(sigB);
  let diff = 0;
  for (let i = 0; i < vA.length; i++) diff |= vA[i] ^ vB[i];
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors(req) });
  }

  // Rate limit: 20 requests per 60 seconds per IP
  const daIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
  const rl = await enforceRateLimit(adminClient(), { scope: "device_auth", identifier: daIp, maxRequests: 20, windowSeconds: 60 });
  if (!rl.allowed) return respond({ ok: false, error: "Too many requests" }, req);

  try {
    const rawBody = await req.json().catch(() => ({}));
    const DeviceAuthSchema = z.object({
      device_token: z.string().max(512).optional(),
      qr_token: z.string().max(512).optional(),
      device_id: z.string().max(255).optional(),
      device_nome: z.string().max(255).optional(),
      device_os: z.string().max(100).optional(),
      action: z.string().max(50).optional(),
      mecanico_id: z.string().uuid().optional(),
      senha: z.string().max(128).optional(),
      p_mecanico_id: z.string().uuid().optional(),
      p_senha: z.string().max(128).optional(),
    });
    const parsed = DeviceAuthSchema.safeParse(rawBody);
    if (!parsed.success) return respond({ ok: false, error: "Invalid request body" }, req);
    const body = parsed.data;
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
        .select("id, slug, nome, ativo, status, dispositivos_moveis_ativos, max_dispositivos_moveis")
        .eq("id", qr.empresa_id)
        .single();

      if (empErr || !empresa || !empresa.dispositivos_moveis_ativos) {
        return respond({ ok: false, error: "Dispositivos móveis desativados para esta empresa" }, req);
      }

    // EF-09: Validate empresa is still active before trusting it in app_metadata
    if (empresa.ativo === false || empresa.status === "inactive" || empresa.status === "suspended") {
      return respond({ ok: false, error: "Empresa inativa ou suspensa. Contate o administrador." }, req);
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

    // MODE 3: Validate mechanic password (action=validar_senha)
    const action = String(body.action ?? "").trim();
    if (action === "validar_senha") {
      const mecanicoId = String(body.mecanico_id ?? "").trim();
      const senhaInput = String(body.senha ?? "").trim();
      if (!mecanicoId || !senhaInput) {
        return respond({ ok: false, error: "mecanico_id e senha obrigat\u00f3rios" }, req);
      }
      try {
        // V8: Usar RPC verificar_senha_mecanico (bcrypt) em vez de comparação plaintext
        const { data: valid, error: rpcErr } = await admin.rpc("verificar_senha_mecanico", {
          p_mecanico_id: mecanicoId,
          p_senha: senhaInput,
        });
        if (rpcErr) {
          console.error("[device-auth] verificar_senha_mecanico RPC error:", rpcErr);
          return respond({ ok: false, error: "Erro ao validar senha" }, req);
        }
        return respond({ ok: true, valid: !!valid }, req);
      } catch (e) {
        console.error("[device-auth] validar_senha error:", e);
        return respond({ ok: false, error: "Erro ao validar senha" }, req);
      }
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
    const password = await devicePassword(device.token);

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
        const { error: profileErr } = await admin.from("profiles").upsert({
          id: userId,
          nome: displayName,
          email,
          tipo: "TECHNICIAN",
          empresa_id: empresa.id,
        }, { onConflict: "id" });
        if (profileErr) console.warn("[device-auth] profiles upsert error:", profileErr.message);

        const { error: roleErr } = await admin.from("user_roles").upsert({
          user_id: userId,
          role: "TECHNICIAN",
          empresa_id: empresa.id,
        }, { onConflict: "user_id,empresa_id" });
        if (roleErr) {
          console.error("[device-auth] user_roles upsert FAILED:", roleErr.message);
          // Fallback: try plain insert (ignore if already exists)
          const { error: insertErr } = await admin.from("user_roles").insert({
            user_id: userId,
            role: "TECHNICIAN",
            empresa_id: empresa.id,
          });
          if (insertErr && !insertErr.message.includes("duplicate")) {
            console.error("[device-auth] user_roles insert also FAILED:", insertErr.message);
          }
        }
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

        const { error: profileErr2 } = await admin.from("profiles").upsert({
          id: userId,
          nome: `Dispositivo ${device.device_nome || device.device_id.slice(0, 8)}`,
          email,
          tipo: "TECHNICIAN",
          empresa_id: empresa.id,
        }, { onConflict: "id" });
        if (profileErr2) console.warn("[device-auth] profiles upsert error:", profileErr2.message);

        const { error: roleErr2 } = await admin.from("user_roles").upsert({
          user_id: userId,
          role: "TECHNICIAN",
          empresa_id: empresa.id,
        }, { onConflict: "user_id,empresa_id" });
        if (roleErr2) {
          console.error("[device-auth] user_roles upsert FAILED:", roleErr2.message);
          const { error: insertErr2 } = await admin.from("user_roles").insert({
            user_id: userId,
            role: "TECHNICIAN",
            empresa_id: empresa.id,
          });
          if (insertErr2 && !insertErr2.message.includes("duplicate")) {
            console.error("[device-auth] user_roles insert also FAILED:", insertErr2.message);
          }
        }
      }
    }

    const session = signIn.data!.session!;

    // Atualiza último acesso
    await admin
      .from("dispositivos_moveis")
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq("id", device.id);

    // Busca mecânicos ativos da empresa (admin bypassa RLS)
    let mecanicos: { id: string; nome: string; tipo: string }[] = [];
    try {
      const { data: mecList } = await admin
        .from("mecanicos")
        .select("id, nome, tipo")
        .eq("empresa_id", empresa.id)
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("nome", { ascending: true })
        .limit(200);
      if (mecList) mecanicos = mecList;
    } catch (e) {
      console.warn("[device-auth] falha ao buscar mecanicos:", e);
    }

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
      mecanicos,
    }, req);
}
