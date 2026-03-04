// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, isSystemOperator, requireUser } from "../_shared/auth.ts";
import { fail, ok, preflight, rejectIfOriginNotAllowed } from "../_shared/response.ts";

type Payload = {
  action:
    | "dashboard"
    | "list_companies"
    | "create_company"
    | "update_company"
    | "set_company_status"
    | "list_users"
    | "create_user"
    | "set_user_status"
    | "list_plans"
    | "create_plan"
    | "update_plan"
    | "list_subscriptions"
    | "create_subscription"
    | "set_subscription_status"
    | "list_contracts"
    | "update_contract"
    | "regenerate_contract"
    | "delete_contract"
    | "list_support_tickets"
    | "respond_support_ticket"
    | "list_audit_logs"
    | "get_company_settings"
    | "update_company_settings"
    | "block_company"
    | "change_plan"
    | "platform_stats"
    | "create_system_admin"
    | "impersonate_company"
    | "stop_impersonation";
  empresa_id?: string;
  company?: {
    nome: string;
    slug?: string;
    razao_social?: string;
    nome_fantasia?: string;
    cnpj?: string;
    endereco?: string;
    telefone?: string;
    email?: string;
    responsavel?: string;
    segmento?: string;
    status?: string;
  };
  user?: {
    nome: string;
    email: string;
    password?: string;
    empresa_id: string;
    role: string;
    status?: string;
  };
  plan?: {
    code: string;
    name: string;
    description?: string;
    user_limit?: number;
    module_flags?: Record<string, unknown>;
    data_limit_mb?: number;
    premium_features?: string[];
    company_limit?: number | null;
    price_month?: number;
    active?: boolean;
  };
  subscription?: {
    empresa_id: string;
    plan_id: string;
    amount?: number;
    payment_method?: string;
    period?: "monthly" | "quarterly" | "yearly" | "custom";
    starts_at?: string;
    ends_at?: string | null;
    renewal_at?: string | null;
    status?: "ativa" | "atrasada" | "cancelada" | "teste";
    payment_status?: string;
  };
  contract_id?: string;
  content?: string;
  status?: string;
  summary?: string;
  ticket_id?: string;
  response?: string;
  filters?: {
    empresa_id?: string;
    user_id?: string;
    module?: string;
    from?: string;
    to?: string;
  };
  settings?: {
    modules?: Record<string, boolean>;
    limits?: Record<string, number>;
    features?: Record<string, boolean>;
  };
  plano_codigo?: string;
  reason?: string;
  user_id?: string;
  empresa_nome?: string;
};

function normalizeSlug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48);
}

function isDuplicateKeyError(message?: string | null) {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("duplicate key") || normalized.includes("unique constraint");
}

function contractTemplate(input: {
  empresaNome: string;
  cnpj?: string | null;
  responsavel?: string | null;
  planoNome: string;
  valor: number;
  formaPagamento?: string | null;
  inicio?: string | null;
  fim?: string | null;
  limiteUsuarios?: number | null;
  modulos?: Record<string, unknown> | null;
}) {
  const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(input.valor ?? 0),
  );

  const modulos = input.modulos ? JSON.stringify(input.modulos, null, 2) : "{}";

  return `CONTRATO DE LICENÇA DE USO DE SOFTWARE\n\nCONTRATANTE\nEmpresa: ${input.empresaNome}\nCNPJ: ${input.cnpj ?? "N/A"}\nResponsável: ${input.responsavel ?? "N/A"}\n\nCONTRATADA\nPCM Estratégio Sistemas\n\nOBJETO\nLicença de uso do sistema PCM Estratégico.\n\nPLANO CONTRATADO\nPlano: ${input.planoNome}\n\nVALOR\n${currency}\n\nFORMA DE PAGAMENTO\n${input.formaPagamento ?? "A definir"}\n\nVIGÊNCIA\nInício: ${input.inicio ?? "N/A"}\nTérmino: ${input.fim ?? "Indeterminado"}\n\nUSUÁRIOS PERMITIDOS\n${input.limiteUsuarios ?? "N/A"}\n\nMÓDULOS INCLUSOS\n${modulos}\n`;
}

async function createContractFromSubscription(
  admin: ReturnType<typeof adminClient>,
  actorUserId: string,
  subscription: any,
) {
  const { data: company } = await admin
    .from("empresas")
    .select("id,nome")
    .eq("id", subscription.empresa_id)
    .single();

  const { data: companyData } = await admin
    .from("dados_empresa")
    .select("razao_social,nome_fantasia,cnpj")
    .eq("empresa_id", subscription.empresa_id)
    .maybeSingle();

  const { data: plan } = await admin
    .from("plans")
    .select("id,name,user_limit,module_flags")
    .eq("id", subscription.plan_id)
    .single();

  const content = contractTemplate({
    empresaNome: companyData?.razao_social ?? companyData?.nome_fantasia ?? company?.nome ?? "Empresa",
    cnpj: companyData?.cnpj,
    responsavel: null,
    planoNome: plan?.name ?? "Plano",
    valor: Number(subscription.amount ?? 0),
    formaPagamento: subscription.payment_method,
    inicio: subscription.starts_at,
    fim: subscription.ends_at,
    limiteUsuarios: plan?.user_limit,
    modulos: plan?.module_flags,
  });

  const { data: existing } = await admin
    .from("contracts")
    .select("id,version")
    .eq("subscription_id", subscription.id)
    .maybeSingle();

  if (existing?.id) {
    const nextVersion = Number(existing.version ?? 1) + 1;

    const { data: updated, error: updateError } = await admin
      .from("contracts")
      .update({
        content,
        starts_at: subscription.starts_at,
        ends_at: subscription.ends_at,
        amount: subscription.amount,
        payment_method: subscription.payment_method,
        version: nextVersion,
        status: "ativo",
        updated_by: actorUserId,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    await admin.from("contract_versions").insert({
      contract_id: existing.id,
      version: nextVersion,
      content,
      change_summary: "Regeneração automática por atualização de assinatura",
      created_by: actorUserId,
    });

    return updated;
  }

  const { data: created, error: createError } = await admin
    .from("contracts")
    .insert({
      empresa_id: subscription.empresa_id,
      subscription_id: subscription.id,
      plan_id: subscription.plan_id,
      content,
      generated_at: new Date().toISOString(),
      starts_at: subscription.starts_at,
      ends_at: subscription.ends_at,
      amount: subscription.amount,
      payment_method: subscription.payment_method,
      version: 1,
      status: "ativo",
      created_by: actorUserId,
      updated_by: actorUserId,
    })
    .select("*")
    .single();

  if (createError) throw createError;

  await admin.from("contract_versions").insert({
    contract_id: created.id,
    version: 1,
    content,
    change_summary: "Geração automática na criação da assinatura",
    created_by: actorUserId,
  });

  return created;
}

async function logPlatformAudit(
  admin: ReturnType<typeof adminClient>,
  payload: {
    actorId: string;
    actorEmail?: string | null;
    empresaId?: string | null;
    actionType: string;
    details?: Record<string, unknown>;
  },
) {
  await admin.from("enterprise_audit_logs").insert({
    actor_id: payload.actorId,
    actor_email: payload.actorEmail ?? null,
    empresa_id: payload.empresaId ?? null,
    action_type: payload.actionType,
    details: payload.details ?? {},
    severity: "info",
    source: "owner-portal-admin",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight(req, "POST, OPTIONS");

  const originDenied = rejectIfOriginNotAllowed(req);
  if (originDenied) return originDenied;

  if (req.method !== "POST") return fail("Method not allowed", 405, null, req);

  const auth = await requireUser(req);
  if ("error" in auth) return fail(auth.error ?? "Unauthorized", auth.status ?? 401, null, req);

  const admin = adminClient();
  const isSystem = await isSystemOperator(admin, auth.user.id);
  if (!isSystem) return fail("Forbidden", 403, null, req);

  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body?.action) return fail("Missing action", 400, null, req);

  if (body.action === "dashboard" || body.action === "platform_stats") {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [{ count: totalCompanies }, { count: blockedCompanies }, { count: totalUsers }, { count: activeSubscriptions }, { count: overdueSubscriptions }, { count: newCompaniesMonth }, { count: openTickets }, { data: revenue }, { data: plans }, { data: canceledSubscriptions }] = await Promise.all([
      admin.from("empresas").select("id", { count: "exact", head: true }),
      admin.from("empresas").select("id", { count: "exact", head: true }).eq("status", "blocked"),
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "ativa"),
      admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "atrasada"),
      admin.from("empresas").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
      admin.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["aberto", "em_andamento"]),
      admin.from("subscriptions").select("amount").eq("status", "ativa"),
      admin.from("subscriptions").select("plan_id, plans(name)").eq("status", "ativa"),
      admin
        .from("subscriptions")
        .select("id")
        .eq("status", "cancelada")
        .gte("updated_at", thirtyDaysAgo),
    ]);

    const mrr = (revenue ?? []).reduce((acc, item: any) => acc + Number(item.amount ?? 0), 0);
    const arr = mrr * 12;
    const usageByPlan = (plans ?? []).reduce((acc: Record<string, number>, item: any) => {
      const planName = item?.plans?.name ?? "Sem plano";
      acc[planName] = (acc[planName] ?? 0) + 1;
      return acc;
    }, {});
    const canceledIn30Days = (canceledSubscriptions ?? []).length;
    const churnRate = Number(activeSubscriptions ?? 0) + canceledIn30Days > 0
      ? (canceledIn30Days / (Number(activeSubscriptions ?? 0) + canceledIn30Days)) * 100
      : 0;

    const { data: alerts } = await admin
      .from("enterprise_audit_logs")
      .select("id,action_type,severity,created_at")
      .in("severity", ["warning", "error", "critical"])
      .order("created_at", { ascending: false })
      .limit(20);

    return ok({
      total_companies: totalCompanies ?? 0,
      blocked_companies: blockedCompanies ?? 0,
      total_users: totalUsers ?? 0,
      active_subscriptions: activeSubscriptions ?? 0,
      overdue_subscriptions: overdueSubscriptions ?? 0,
      new_companies_month: newCompaniesMonth ?? 0,
      open_tickets: openTickets ?? 0,
      mrr,
      arr,
      churn_rate: Number(churnRate.toFixed(2)),
      usage_by_plan: usageByPlan,
      system_alerts: alerts ?? [],
      generated_at: new Date().toISOString(),
    }, 200, req);
  }

  if (body.action === "list_companies") {
    const { data, error } = await admin
      .from("empresas")
      .select("id,nome,slug,status,plano,created_at,updated_at,dados_empresa(razao_social,nome_fantasia,cnpj)")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) return fail(error.message, 400, null, req);
    return ok({ companies: data ?? [] }, 200, req);
  }

  if (body.action === "create_company") {
    if (!body.company?.nome || !body.user?.nome || !body.user?.email) {
      return fail("company and master user fields are required", 400, null, req);
    }

    const companyName = body.company.nome.trim();
    const requestedSlug = body.company.slug?.trim() || null;
    let slug = (requestedSlug || normalizeSlug(companyName)) || `empresa-${Date.now()}`;

    if (requestedSlug) {
      const { data: sameSlug } = await admin
        .from("empresas")
        .select("id")
        .eq("slug", requestedSlug)
        .maybeSingle();

      if (sameSlug?.id) {
        return fail("Já existe uma empresa com esse slug. Informe outro slug.", 409, null, req);
      }
    } else {
      for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
        const { data: sameSlug } = await admin
          .from("empresas")
          .select("id")
          .eq("slug", candidate)
          .maybeSingle();

        if (!sameSlug?.id) {
          slug = candidate;
          break;
        }
      }
    }

    const { data: company, error: companyError } = await admin
      .from("empresas")
      .insert({
        nome: companyName,
        slug,
        cnpj: body.company.cnpj ?? null,
        status: body.company.status ?? "active",
        plano: null,
      })
      .select("id,nome,slug,status,created_at")
      .single();

    if (companyError) {
      if (isDuplicateKeyError(companyError.message)) {
        return fail("Não foi possível criar a empresa por conflito de dados únicos (slug/código).", 409, { reason: companyError.message }, req);
      }
      return fail(companyError.message, 400, null, req);
    }

    const { error: companyDataError } = await admin.from("dados_empresa").upsert({
      empresa_id: company.id,
      razao_social: body.company.razao_social ?? companyName,
      nome_fantasia: body.company.nome_fantasia ?? companyName,
      cnpj: body.company.cnpj ?? null,
    }, { onConflict: "empresa_id" });

    if (companyDataError) {
      await admin.from("empresas").delete().eq("id", company.id);
      return fail("Falha ao salvar dados da empresa.", 400, { reason: companyDataError.message }, req);
    }

    const { error: configError } = await admin.from("configuracoes_sistema").upsert({
      empresa_id: company.id,
      chave: "owner.company_profile",
      valor: {
        endereco: body.company.endereco ?? null,
        telefone: body.company.telefone ?? null,
        email: body.company.email ?? null,
        responsavel: body.company.responsavel ?? null,
        segmento: body.company.segmento ?? null,
      },
    }, { onConflict: "empresa_id,chave" });

    if (configError) {
      await admin.from("empresas").delete().eq("id", company.id);
      return fail("Falha ao salvar configurações iniciais da empresa.", 400, { reason: configError.message }, req);
    }

    const password = body.user.password?.trim() || `Tmp#${Math.random().toString(36).slice(2, 10)}!`;

    const { data: createdAuth, error: authError } = await admin.auth.admin.createUser({
      email: body.user.email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        nome: body.user.nome,
        empresa_id: company.id,
      },
    });

    if (authError || !createdAuth?.user?.id) {
      await admin.from("empresas").delete().eq("id", company.id);
      const authMessage = authError?.message ?? "Failed to create company master user";
      if (authMessage.toLowerCase().includes("already") || authMessage.toLowerCase().includes("registered")) {
        return fail("O email do usuário MASTER já está cadastrado. Use outro email.", 409, { reason: authMessage }, req);
      }
      return fail(authMessage, 400, null, req);
    }

    const masterRole = body.user.role ?? "ADMIN";

    await admin.from("profiles").upsert({
      id: createdAuth.user.id,
      empresa_id: company.id,
      nome: body.user.nome,
      email: body.user.email.trim().toLowerCase(),
    }, { onConflict: "id" });

    await admin.from("user_roles").upsert({
      user_id: createdAuth.user.id,
      empresa_id: company.id,
      role: masterRole,
    }, { onConflict: "user_id,empresa_id,role" });

    let subscriptionWarning: string | null = null;

    if (body.subscription?.plan_id) {
      try {
        const startsAt = body.subscription.starts_at ?? new Date().toISOString().slice(0, 10);
        const { data: subscription, error: subscriptionError } = await admin
          .from("subscriptions")
          .upsert({
            empresa_id: company.id,
            plan_id: body.subscription.plan_id,
            amount: body.subscription.amount ?? 0,
            payment_method: body.subscription.payment_method ?? null,
            period: body.subscription.period ?? "monthly",
            starts_at: startsAt,
            ends_at: body.subscription.ends_at ?? null,
            renewal_at: body.subscription.renewal_at ?? body.subscription.ends_at ?? null,
            status: body.subscription.status ?? "teste",
            payment_status: body.subscription.payment_status ?? null,
          }, { onConflict: "empresa_id" })
          .select("*")
          .single();

        if (subscriptionError) {
          throw subscriptionError;
        }

        await createContractFromSubscription(admin, auth.user.id, subscription);
      } catch (error: any) {
        subscriptionWarning = error?.message ?? "Falha ao criar assinatura/contrato inicial";
      }
    }

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: company.id,
      actionType: "OWNER_CREATE_COMPANY",
      details: { company_id: company.id, master_email: body.user.email },
    });

    return ok({
      company,
      master_user: {
        id: createdAuth.user.id,
        email: body.user.email,
        initial_password: password,
      },
      warning: subscriptionWarning,
    }, 200, req);
  }

  if (body.action === "update_company") {
    if (!body.empresa_id || !body.company) return fail("empresa_id and company are required", 400, null, req);

    const updatePayload: Record<string, unknown> = {};
    if (body.company.nome) updatePayload.nome = body.company.nome;
    if (body.company.slug) updatePayload.slug = body.company.slug;
    if (body.company.status) updatePayload.status = body.company.status;
    if (body.company.cnpj !== undefined) updatePayload.cnpj = body.company.cnpj;

    const { error: empresaError } = await admin
      .from("empresas")
      .update(updatePayload)
      .eq("id", body.empresa_id);
    if (empresaError) return fail(empresaError.message, 400, null, req);

    await admin.from("dados_empresa").upsert({
      empresa_id: body.empresa_id,
      razao_social: body.company.razao_social ?? null,
      nome_fantasia: body.company.nome_fantasia ?? null,
      cnpj: body.company.cnpj ?? null,
    }, { onConflict: "empresa_id" });

    await admin.from("configuracoes_sistema").upsert({
      empresa_id: body.empresa_id,
      chave: "owner.company_profile",
      valor: {
        endereco: body.company.endereco ?? null,
        telefone: body.company.telefone ?? null,
        email: body.company.email ?? null,
        responsavel: body.company.responsavel ?? null,
        segmento: body.company.segmento ?? null,
      },
    }, { onConflict: "empresa_id,chave" });

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: body.empresa_id,
      actionType: "OWNER_UPDATE_COMPANY",
      details: { fields: Object.keys(updatePayload) },
    });

    return ok({ success: true }, 200, req);
  }

  if (body.action === "set_company_status" || body.action === "block_company") {
    if (!body.empresa_id) return fail("empresa_id is required", 400, null, req);
    const status = body.action === "block_company" ? "blocked" : (body.status ?? "active");
    const { error } = await admin
      .from("empresas")
      .update({ status })
      .eq("id", body.empresa_id);

    if (error) return fail(error.message, 400, null, req);

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: body.empresa_id,
      actionType: "OWNER_SET_COMPANY_STATUS",
      details: { status, reason: body.reason ?? null },
    });

    return ok({ success: true }, 200, req);
  }

  if (body.action === "list_users") {
    let query = admin
      .from("profiles")
      .select("id,nome,email,empresa_id,created_at,user_roles(role)")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (body.empresa_id) query = query.eq("empresa_id", body.empresa_id);

    const { data, error } = await query;
    if (error) return fail(error.message, 400, null, req);
    return ok({ users: data ?? [] }, 200, req);
  }

  if (body.action === "create_user") {
    if (!body.user?.nome || !body.user.email || !body.user.empresa_id || !body.user.role) {
      return fail("user payload is required", 400, null, req);
    }

    const password = body.user.password?.trim() || `Tmp#${Math.random().toString(36).slice(2, 10)}!`;

    const { data: createdAuth, error: createError } = await admin.auth.admin.createUser({
      email: body.user.email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        nome: body.user.nome,
        empresa_id: body.user.empresa_id,
      },
    });

    if (createError || !createdAuth?.user?.id) return fail(createError?.message ?? "Failed to create user", 400, null, req);

    await admin.from("profiles").upsert({
      id: createdAuth.user.id,
      empresa_id: body.user.empresa_id,
      nome: body.user.nome,
      email: body.user.email.trim().toLowerCase(),
    }, { onConflict: "id" });

    await admin.from("user_roles").insert({
      user_id: createdAuth.user.id,
      empresa_id: body.user.empresa_id,
      role: body.user.role,
    });

    if (body.user.status && body.user.status !== "ativo") {
      await admin.auth.admin.updateUserById(createdAuth.user.id, { ban_duration: "876000h" });
    }

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: body.user.empresa_id,
      actionType: "OWNER_CREATE_USER",
      details: { user_id: createdAuth.user.id, role: body.user.role },
    });

    return ok({ success: true, user_id: createdAuth.user.id, initial_password: password }, 200, req);
  }

  if (body.action === "set_user_status") {
    if (!body.user_id || !body.status) return fail("user_id and status are required", 400, null, req);
    const enabled = body.status === "ativo";
    const { error } = await admin.auth.admin.updateUserById(body.user_id, {
      ban_duration: enabled ? "none" : "876000h",
    });

    if (error) return fail(error.message, 400, null, req);
    return ok({ success: true }, 200, req);
  }

  if (body.action === "list_plans") {
    const { data, error } = await admin
      .from("plans")
      .select("*")
      .order("price_month", { ascending: true });
    if (error) return fail(error.message, 400, null, req);
    return ok({ plans: data ?? [] }, 200, req);
  }

  if (body.action === "create_plan") {
    if (!body.plan?.code || !body.plan?.name) return fail("plan code and name are required", 400, null, req);
    const { data, error } = await admin
      .from("plans")
      .insert({
        code: body.plan.code,
        name: body.plan.name,
        description: body.plan.description ?? null,
        user_limit: body.plan.user_limit ?? 10,
        module_flags: body.plan.module_flags ?? {},
        data_limit_mb: body.plan.data_limit_mb ?? 2048,
        premium_features: body.plan.premium_features ?? [],
        company_limit: body.plan.company_limit ?? null,
        price_month: body.plan.price_month ?? 0,
        active: body.plan.active ?? true,
      })
      .select("*")
      .single();
    if (error) return fail(error.message, 400, null, req);
    return ok({ plan: data }, 200, req);
  }

  if (body.action === "update_plan") {
    if (!body.plan?.code) return fail("plan code is required", 400, null, req);
    const { error } = await admin
      .from("plans")
      .update({
        name: body.plan.name,
        description: body.plan.description,
        user_limit: body.plan.user_limit,
        module_flags: body.plan.module_flags,
        data_limit_mb: body.plan.data_limit_mb,
        premium_features: body.plan.premium_features,
        company_limit: body.plan.company_limit,
        price_month: body.plan.price_month,
        active: body.plan.active,
      })
      .eq("code", body.plan.code);
    if (error) return fail(error.message, 400, null, req);
    return ok({ success: true }, 200, req);
  }

  if (body.action === "list_subscriptions") {
    const { data, error } = await admin
      .from("subscriptions")
      .select("*, plans(id,code,name,user_limit,module_flags), empresas(id,nome)")
      .order("updated_at", { ascending: false })
      .limit(1000);
    if (error) return fail(error.message, 400, null, req);
    return ok({ subscriptions: data ?? [] }, 200, req);
  }

  if (body.action === "create_subscription") {
    if (!body.subscription?.empresa_id || !body.subscription?.plan_id) {
      return fail("subscription payload is required", 400, null, req);
    }

    const startsAt = body.subscription.starts_at ?? new Date().toISOString().slice(0, 10);

    const { data, error } = await admin
      .from("subscriptions")
      .upsert({
        empresa_id: body.subscription.empresa_id,
        plan_id: body.subscription.plan_id,
        amount: body.subscription.amount ?? 0,
        payment_method: body.subscription.payment_method ?? null,
        period: body.subscription.period ?? "monthly",
        starts_at: startsAt,
        ends_at: body.subscription.ends_at ?? null,
        renewal_at: body.subscription.renewal_at ?? body.subscription.ends_at ?? null,
        status: body.subscription.status ?? "teste",
        payment_status: body.subscription.payment_status ?? null,
      }, { onConflict: "empresa_id" })
      .select("*")
      .single();

    if (error) return fail(error.message, 400, null, req);

    const contract = await createContractFromSubscription(admin, auth.user.id, data);

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: data.empresa_id,
      actionType: "OWNER_CREATE_SUBSCRIPTION",
      details: { subscription_id: data.id, contract_id: contract.id },
    });

    return ok({ subscription: data, contract }, 200, req);
  }

  if (body.action === "set_subscription_status") {
    if (!body.empresa_id || !body.status) return fail("empresa_id and status are required", 400, null, req);
    const { error } = await admin
      .from("subscriptions")
      .update({ status: body.status })
      .eq("empresa_id", body.empresa_id);
    if (error) return fail(error.message, 400, null, req);
    return ok({ success: true }, 200, req);
  }

  if (body.action === "list_contracts") {
    const { data, error } = await admin
      .from("contracts")
      .select("*, empresas(id,nome), plans(id,name,code), subscriptions(id,status)")
      .order("generated_at", { ascending: false })
      .limit(1000);
    if (error) return fail(error.message, 400, null, req);
    return ok({ contracts: data ?? [] }, 200, req);
  }

  if (body.action === "update_contract") {
    if (!body.contract_id || !body.content) return fail("contract_id and content are required", 400, null, req);
    const { data: current } = await admin
      .from("contracts")
      .select("id,version")
      .eq("id", body.contract_id)
      .single();
    const nextVersion = Number(current?.version ?? 1) + 1;

    const { error } = await admin
      .from("contracts")
      .update({
        content: body.content,
        version: nextVersion,
        updated_by: auth.user.id,
        status: body.status ?? undefined,
      })
      .eq("id", body.contract_id);

    if (error) return fail(error.message, 400, null, req);

    await admin.from("contract_versions").insert({
      contract_id: body.contract_id,
      version: nextVersion,
      content: body.content,
      change_summary: body.summary ?? "Edição manual via owner",
      created_by: auth.user.id,
    });

    return ok({ success: true }, 200, req);
  }

  if (body.action === "regenerate_contract") {
    if (!body.contract_id) return fail("contract_id is required", 400, null, req);

    const { data: contract, error: contractError } = await admin
      .from("contracts")
      .select("id,subscription_id")
      .eq("id", body.contract_id)
      .single();
    if (contractError || !contract?.subscription_id) return fail("contract subscription not found", 404, null, req);

    const { data: subscription } = await admin
      .from("subscriptions")
      .select("*")
      .eq("id", contract.subscription_id)
      .single();
    if (!subscription) return fail("subscription not found", 404, null, req);

    const regenerated = await createContractFromSubscription(admin, auth.user.id, subscription);
    return ok({ contract: regenerated }, 200, req);
  }

  if (body.action === "delete_contract") {
    if (!body.contract_id) return fail("contract_id is required", 400, null, req);
    const { error } = await admin.from("contracts").delete().eq("id", body.contract_id);
    if (error) return fail(error.message, 400, null, req);
    return ok({ success: true }, 200, req);
  }

  if (body.action === "list_support_tickets") {
    const { data, error } = await admin
      .from("support_tickets")
      .select("*, empresas(id,nome), profiles(id,nome,email)")
      .order("updated_at", { ascending: false })
      .limit(1000);
    if (error) return fail(error.message, 400, null, req);
    return ok({ tickets: data ?? [] }, 200, req);
  }

  if (body.action === "respond_support_ticket") {
    if (!body.ticket_id || !body.response) return fail("ticket_id and response are required", 400, null, req);
    const { error } = await admin
      .from("support_tickets")
      .update({
        owner_response: body.response,
        owner_responder_id: auth.user.id,
        responded_at: new Date().toISOString(),
        status: body.status ?? "resolvido",
      })
      .eq("id", body.ticket_id);
    if (error) return fail(error.message, 400, null, req);
    return ok({ success: true }, 200, req);
  }

  if (body.action === "list_audit_logs") {
    const filters = body.filters ?? {};
    let query = admin
      .from("enterprise_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (filters.empresa_id) query = query.eq("empresa_id", filters.empresa_id);
    if (filters.user_id) query = query.eq("actor_id", filters.user_id);
    if (filters.module) query = query.ilike("source", `%${filters.module}%`);
    if (filters.from) query = query.gte("created_at", filters.from);
    if (filters.to) query = query.lte("created_at", filters.to);

    const { data, error } = await query;
    if (error) return fail(error.message, 400, null, req);
    return ok({ logs: data ?? [] }, 200, req);
  }

  if (body.action === "get_company_settings") {
    if (!body.empresa_id) return fail("empresa_id is required", 400, null, req);
    const { data, error } = await admin
      .from("configuracoes_sistema")
      .select("chave,valor")
      .eq("empresa_id", body.empresa_id)
      .in("chave", ["owner.features", "owner.limits", "owner.modules"]);
    if (error) return fail(error.message, 400, null, req);
    return ok({ settings: data ?? [] }, 200, req);
  }

  if (body.action === "update_company_settings") {
    if (!body.empresa_id || !body.settings) return fail("empresa_id and settings are required", 400, null, req);
    const rows = [
      { empresa_id: body.empresa_id, chave: "owner.modules", valor: body.settings.modules ?? {} },
      { empresa_id: body.empresa_id, chave: "owner.limits", valor: body.settings.limits ?? {} },
      { empresa_id: body.empresa_id, chave: "owner.features", valor: body.settings.features ?? {} },
    ];

    const { error } = await admin.from("configuracoes_sistema").upsert(rows, { onConflict: "empresa_id,chave" });
    if (error) return fail(error.message, 400, null, req);
    return ok({ success: true }, 200, req);
  }

  if (body.action === "change_plan") {
    if (!body.empresa_id || !body.plano_codigo) return fail("empresa_id and plano_codigo are required", 400, null, req);

    const { data: plano, error: planoError } = await admin
      .from("plans")
      .select("id,code,price_month")
      .eq("code", body.plano_codigo)
      .single();

    if (planoError || !plano) return fail("Plan not found", 404, null, req);

    const { data: subscription, error: subscriptionError } = await admin
      .from("subscriptions")
      .upsert({
        empresa_id: body.empresa_id,
        plan_id: plano.id,
        amount: plano.price_month ?? 0,
        period: "monthly",
        starts_at: new Date().toISOString().slice(0, 10),
        status: "ativa",
      }, { onConflict: "empresa_id" })
      .select("*")
      .single();

    if (subscriptionError) return fail(subscriptionError.message, 400, null, req);
    const contract = await createContractFromSubscription(admin, auth.user.id, subscription);
    return ok({ success: true, contract_id: contract.id }, 200, req);
  }

  if (body.action === "impersonate_company") {
    if (!body.empresa_id) return fail("empresa_id is required", 400, null, req);

    const { data: company, error: companyError } = await admin
      .from("empresas")
      .select("id,nome,status")
      .eq("id", body.empresa_id)
      .maybeSingle();

    if (companyError) return fail(companyError.message, 400, null, req);
    if (!company?.id) return fail("Empresa não encontrada", 404, null, req);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (60 * 60 * 1000));

    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: company.id,
      actionType: "OWNER_IMPERSONATION_START",
      details: {
        company_id: company.id,
        company_name: company.nome ?? null,
        company_status: company.status ?? null,
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
    });

    return ok({
      success: true,
      impersonation: {
        empresa_id: company.id,
        empresa_nome: company.nome ?? null,
        company_status: company.status ?? null,
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
    }, 200, req);
  }

  if (body.action === "stop_impersonation") {
    await logPlatformAudit(admin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      empresaId: body.empresa_id ?? null,
      actionType: "OWNER_IMPERSONATION_STOP",
      details: {
        company_id: body.empresa_id ?? null,
        company_name: body.empresa_nome ?? null,
        reason: body.reason ?? "manual",
        stopped_at: new Date().toISOString(),
      },
    });

    return ok({ success: true }, 200, req);
  }

  if (body.action === "create_system_admin") {
    if (!body.user_id) return fail("user_id is required", 400, null, req);

    const { data: profile } = await admin
      .from("profiles")
      .select("empresa_id")
      .eq("id", body.user_id)
      .maybeSingle();

    if (!profile?.empresa_id) return fail("User profile/empresa not found", 404, null, req);

    const { error } = await admin
      .from("user_roles")
      .upsert({
        user_id: body.user_id,
        empresa_id: profile.empresa_id,
        role: "SYSTEM_ADMIN",
      }, { onConflict: "user_id,empresa_id,role" });

    if (error) return fail(error.message, 400, null, req);
    return ok({ success: true }, 200, req);
  }

  return fail("Unsupported action", 400, null, req);
});
