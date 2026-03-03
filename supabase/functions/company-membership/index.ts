import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, ensureEmpresaAccess, requireUser } from "../_shared/auth.ts";
import { corsHeaders, fail, ok } from "../_shared/response.ts";

type Payload = {
  action: "list_members" | "upsert_member" | "disable_member";
  empresa_id: string;
  user_id?: string;
  role?: string;
  status?: "invited" | "active" | "inactive" | "blocked";
  cargo?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  const auth = await requireUser(req);
  if ("error" in auth) return fail(auth.error, auth.status);

  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body?.action || !body.empresa_id) return fail("action and empresa_id are required", 400);

  const admin = adminClient();
  const allowed = await ensureEmpresaAccess(admin, auth.user.id, body.empresa_id);
  if (!allowed) return fail("Forbidden for empresa", 403);

  if (body.action === "list_members") {
    const { data, error } = await admin
      .from("membros_empresa")
      .select("id,empresa_id,user_id,status,cargo,created_at,updated_at")
      .eq("empresa_id", body.empresa_id)
      .order("created_at", { ascending: false });
    if (error) return fail(error.message, 400);
    return ok({ members: data ?? [] });
  }

  if (body.action === "upsert_member") {
    if (!body.user_id || !body.role) return fail("user_id and role are required", 400);

    const { error: memberError } = await admin
      .from("membros_empresa")
      .upsert(
        {
          empresa_id: body.empresa_id,
          user_id: body.user_id,
          status: body.status ?? "active",
          cargo: body.cargo ?? null,
          invited_by: auth.user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "empresa_id,user_id" },
      );

    if (memberError) return fail(memberError.message, 400);

    const { error: roleError } = await admin
      .from("user_roles")
      .upsert(
        {
          user_id: body.user_id,
          empresa_id: body.empresa_id,
          role: body.role,
        },
        { onConflict: "user_id,empresa_id,role" },
      );

    if (roleError) return fail(roleError.message, 400);
    return ok({ success: true });
  }

  if (body.action === "disable_member") {
    if (!body.user_id) return fail("user_id is required", 400);

    const { error } = await admin
      .from("membros_empresa")
      .update({ status: body.status ?? "inactive", updated_at: new Date().toISOString() })
      .eq("empresa_id", body.empresa_id)
      .eq("user_id", body.user_id);

    if (error) return fail(error.message, 400);
    return ok({ success: true });
  }

  return fail("Unsupported action", 400);
});
