import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, isSystemOperator, requireUser } from "../_shared/auth.ts";
import { corsHeaders, fail, ok } from "../_shared/response.ts";

type Payload = {
  action:
    | "list_companies"
    | "block_company"
    | "change_plan"
    | "platform_stats"
    | "create_system_admin";
  empresa_id?: string;
  plano_codigo?: string;
  reason?: string;
  user_id?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  const auth = await requireUser(req);
  if ("error" in auth) return fail(auth.error, auth.status);

  const admin = adminClient();
  const isSystem = await isSystemOperator(admin, auth.user.id);
  if (!isSystem) return fail("Forbidden", 403);

  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body?.action) return fail("Missing action", 400);

  if (body.action === "list_companies") {
    const { data, error } = await admin
      .from("empresas")
      .select("id,nome,slug,status,plano,blocked_at,blocked_reason,created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) return fail(error.message, 400);
    return ok({ companies: data ?? [] });
  }

  if (body.action === "platform_stats") {
    const [empresas, usuarios, osAbertas, osFechadas] = await Promise.all([
      admin.from("empresas").select("id", { count: "exact", head: true }),
      admin.from("usuarios").select("id", { count: "exact", head: true }),
      admin.from("ordens_servico").select("id", { count: "exact", head: true }).in("status", ["ABERTA", "EM_ANDAMENTO"]),
      admin.from("ordens_servico").select("id", { count: "exact", head: true }).eq("status", "FECHADA"),
    ]);

    return ok({
      empresas_ativas: empresas.count ?? 0,
      usuarios_ativos: usuarios.count ?? 0,
      os_abertas: osAbertas.count ?? 0,
      os_fechadas: osFechadas.count ?? 0,
      generated_at: new Date().toISOString(),
    });
  }

  if (body.action === "block_company") {
    if (!body.empresa_id) return fail("empresa_id is required", 400);
    const { error } = await admin
      .from("empresas")
      .update({
        status: "blocked",
        blocked_at: new Date().toISOString(),
        blocked_reason: body.reason ?? "Blocked by owner portal",
      })
      .eq("id", body.empresa_id);

    if (error) return fail(error.message, 400);
    return ok({ success: true });
  }

  if (body.action === "change_plan") {
    if (!body.empresa_id || !body.plano_codigo) return fail("empresa_id and plano_codigo are required", 400);

    const { data: plano, error: planoError } = await admin
      .from("planos")
      .select("id,codigo")
      .eq("codigo", body.plano_codigo)
      .single();

    if (planoError || !plano) return fail("Plan not found", 404);

    const { error: empresaError } = await admin
      .from("empresas")
      .update({ plano: plano.codigo, plano_id: plano.id, updated_at: new Date().toISOString() })
      .eq("id", body.empresa_id);

    if (empresaError) return fail(empresaError.message, 400);

    const { error: assinaturaError } = await admin
      .from("assinaturas")
      .upsert({
        empresa_id: body.empresa_id,
        plano_id: plano.id,
        status: "active",
        updated_at: new Date().toISOString(),
      }, { onConflict: "empresa_id" });

    if (assinaturaError) return fail(assinaturaError.message, 400);
    return ok({ success: true });
  }

  if (body.action === "create_system_admin") {
    if (!body.user_id) return fail("user_id is required", 400);

    const { data: profile } = await admin
      .from("profiles")
      .select("empresa_id")
      .eq("id", body.user_id)
      .maybeSingle();

    if (!profile?.empresa_id) return fail("User profile/empresa not found", 404);

    const { error } = await admin
      .from("user_roles")
      .upsert({
        user_id: body.user_id,
        empresa_id: profile.empresa_id,
        role: "SYSTEM_ADMIN",
      }, { onConflict: "user_id,empresa_id,role" });

    if (error) return fail(error.message, 400);
    return ok({ success: true });
  }

  return fail("Unsupported action", 400);
});
