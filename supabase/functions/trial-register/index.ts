import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient } from "../_shared/auth.ts";
import { fail, ok, preflight, resolveCorsHeaders } from "../_shared/response.ts";

declare const Deno: any;

// ─── Rate limiting simples por IP ──────────────────────────────────────────
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hora
const RATE_MAX = 5; // máx 5 trials por IP/hora
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count += 1;
  return true;
}

// ─── Geração de slug ────────────────────────────────────────────────────────
function normalizeSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48);
}

// ─── Validação básica ───────────────────────────────────────────────────────
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(pw: string): boolean {
  // mínimo 8 chars, 1 maiúscula, 1 número
  return pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw);
}

// ─── Dados demo pré-populados ───────────────────────────────────────────────
async function seedDemoData(admin: ReturnType<typeof adminClient>, empresaId: string) {
  try {
    // Equipamentos demo
    const equipamentos = [
      { empresa_id: empresaId, codigo: "EQ-001", nome: "Compressor de Ar Atlas Copco", tipo: "Mecânico", localizacao: "Sala de Compressores", status: "ativo" },
      { empresa_id: empresaId, codigo: "EQ-002", nome: "Torno CNC Romi", tipo: "Usinagem", localizacao: "Setor de Usinagem", status: "ativo" },
      { empresa_id: empresaId, codigo: "EQ-003", nome: "Ponte Rolante 10t", tipo: "Içamento", localizacao: "Nave Principal", status: "ativo" },
      { empresa_id: empresaId, codigo: "EQ-004", nome: "Gerador a Diesel 250kVA", tipo: "Elétrico", localizacao: "Casa de Máquinas", status: "ativo" },
      { empresa_id: empresaId, codigo: "EQ-005", nome: "Esteira Transportadora", tipo: "Transporte", localizacao: "Linha de Produção 1", status: "ativo" },
    ];
    await admin.from("equipamentos").insert(equipamentos);

    // Colaboradores/mecânicos demo (apenas na tabela colaboradores se existir, ou mecanicos)
    const mecanicos = [
      { empresa_id: empresaId, nome: "Carlos Silva", especialidade: "Mecânica", status: "ativo", matricula: "MEC-001" },
      { empresa_id: empresaId, nome: "João Pereira", especialidade: "Elétrica", status: "ativo", matricula: "MEC-002" },
    ];
    await admin.from("mecanicos").insert(mecanicos).throwOnError().catch(() => {});
  } catch {
    // Falha no seed não deve bloquear o trial
  }
}

// ─── Resolução do plano trial ───────────────────────────────────────────────
async function resolveTrialPlanId(admin: ReturnType<typeof adminClient>): Promise<string | null> {
  // Tenta planos por code 'trial' ou 'free' ou 'teste'
  const { data: plans } = await admin
    .from("plans")
    .select("id,code,name")
    .or("code.ilike.trial,code.ilike.free,code.ilike.teste,name.ilike.%trial%,name.ilike.%grátis%,name.ilike.%gratis%")
    .eq("active", true)
    .order("price_month", { ascending: true })
    .limit(1);

  if (plans && plans.length > 0) return plans[0].id;

  // Fallback: plano mais barato ativo
  const { data: fallback } = await admin
    .from("plans")
    .select("id")
    .eq("active", true)
    .order("price_month", { ascending: true })
    .limit(1);

  return fallback?.[0]?.id ?? null;
}

// ─── Handler principal ──────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return preflight(req);

  const corsHeaders = resolveCorsHeaders(req);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // Rate limit
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ success: false, error: "Limite de tentativas atingido. Tente novamente em 1 hora." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("Payload inválido.", 400, undefined, req);
  }

  const companyName = String(body.company_name ?? "").trim();
  const userName = String(body.user_name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const segment = String(body.segment ?? "").trim() || "Não informado";

  // Validações
  if (!companyName || companyName.length < 2) return fail("Nome da empresa é obrigatório (mínimo 2 caracteres).", 400, undefined, req);
  if (!userName || userName.length < 2) return fail("Seu nome é obrigatório.", 400, undefined, req);
  if (!validateEmail(email)) return fail("E-mail inválido.", 400, undefined, req);
  if (!validatePassword(password)) return fail("Senha fraca. Use mínimo 8 caracteres, 1 maiúscula e 1 número.", 400, undefined, req);

  const admin = adminClient();
  let authUserId: string | null = null;
  let empresaId: string | null = null;

  try {
    // ── 1. Gerar slug único ──────────────────────────────────────────────────
    let slug = normalizeSlug(companyName);
    const { data: existing } = await admin.from("empresas").select("slug").ilike("slug", `${slug}%`);
    if (existing && existing.length > 0) {
      const suffixes = existing.map((r: any) => r.slug as string);
      let counter = 2;
      let candidate = slug;
      while (suffixes.includes(candidate)) {
        candidate = `${slug}-${counter}`;
        counter++;
      }
      slug = candidate;
    }

    // ── 2. Criar empresa ─────────────────────────────────────────────────────
    const { data: empresa, error: empresaError } = await admin
      .from("empresas")
      .insert({ nome: companyName, slug, status: "active" })
      .select("id,nome,slug")
      .single();

    if (empresaError || !empresa) {
      throw new Error(`Falha ao criar empresa: ${empresaError?.message ?? "sem dados"}`);
    }
    empresaId = empresa.id;

    // ── 3. Salvar perfil da empresa ──────────────────────────────────────────
    await admin.from("configuracoes_sistema").upsert({
      empresa_id: empresaId,
      chave: "owner.company_profile",
      valor: JSON.stringify({
        tipo_pessoa: "PJ",
        telefone: phone,
        segmento: segment,
        responsavel: userName,
        source: "website_trial",
      }),
    }).throwOnError().catch(() => {});

    // ── 4. Criar usuário auth ────────────────────────────────────────────────
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        empresa_id: empresaId,
        empresa_slug: slug,
        role: "MASTER_TI",
        force_password_change: false,
        trial_source: "website",
      },
      user_metadata: {
        nome: userName,
        empresa_id: empresaId,
        empresa_slug: slug,
      },
    });

    if (authError || !authData?.user) {
      throw new Error(`Falha ao criar usuário: ${authError?.message ?? "sem dados"}`);
    }
    authUserId = authData.user.id;

    // ── 5. Criar profile ─────────────────────────────────────────────────────
    await admin.from("profiles").upsert({
      id: authUserId,
      empresa_id: empresaId,
      nome: userName,
      email,
      force_password_change: false,
    });

    // ── 6. Atribuir role MASTER_TI ──────────────────────────────────────────
    await admin.from("user_roles").insert({
      user_id: authUserId,
      empresa_id: empresaId,
      role: "MASTER_TI",
    }).throwOnError().catch(() =>
      admin.from("user_roles").upsert({
        user_id: authUserId,
        empresa_id: empresaId,
        role: "MASTER_TI",
      })
    );

    // ── 7. Criar assinatura trial ─────────────────────────────────────────────
    const planId = await resolveTrialPlanId(admin);
    const startsAt = new Date().toISOString().slice(0, 10);
    const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data: subscription } = await admin.from("subscriptions").insert({
      empresa_id: empresaId,
      plan_id: planId,
      amount: 0,
      period: "monthly",
      status: "teste",
      payment_status: null,
      starts_at: startsAt,
      ends_at: endsAt,
      renewal_at: endsAt,
    }).select("id").single().throwOnError().catch(() => ({ data: null }));

    // company_subscriptions (dual-table)
    if (planId) {
      await admin.from("company_subscriptions").upsert({
        empresa_id: empresaId,
        plan_id: planId,
        status: "trial",
        starts_at: startsAt,
        ends_at: endsAt,
      }).throwOnError().catch(() => {});
    }

    // ── 8. Seed dados demo ──────────────────────────────────────────────────
    await seedDemoData(admin, empresaId);

    // ── 9. Audit log ─────────────────────────────────────────────────────────
    await admin.from("enterprise_audit_logs").insert({
      usuario_id: authUserId,
      usuario_email: email,
      empresa_id: empresaId,
      acao: "TRIAL_REGISTER",
      tabela: "empresas",
      dados_depois: JSON.stringify({
        source: "website_trial",
        company_name: companyName,
        slug,
        trial_ends_at: endsAt,
        ip,
      }),
      resultado: "sucesso",
    }).throwOnError().catch(() => {});

    const tenantBase = Deno.env.get("VITE_TENANT_BASE_DOMAIN") ?? "gppis.com.br";
    const loginUrl = `https://${slug}.${tenantBase}/login`;

    return ok({
      success: true,
      empresa: { id: empresaId, nome: companyName, slug },
      user: { email, nome: userName },
      subscription: { status: "teste", starts_at: startsAt, ends_at: endsAt },
      login_url: loginUrl,
      trial_ends_at: endsAt,
    }, 200, req);
  } catch (err: any) {
    // Rollback: remover empresa e usuário criados em caso de falha
    if (authUserId) {
      await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    }
    if (empresaId) {
      await admin.from("user_roles").delete().eq("empresa_id", empresaId).catch(() => {});
      await admin.from("profiles").delete().eq("empresa_id", empresaId).catch(() => {});
      await admin.from("subscriptions").delete().eq("empresa_id", empresaId).catch(() => {});
      await admin.from("empresa_config").delete().eq("empresa_id", empresaId).catch(() => {});
      await admin.from("empresas").delete().eq("id", empresaId).catch(() => {});
    }

    const msg = String(err?.message ?? "Erro interno ao criar trial.");
    if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("already registered")) {
      return fail("Este e-mail já possui uma conta. Acesse pelo link do seu sistema ou use outro e-mail.", 409, undefined, req);
    }
    return fail(msg, 500, undefined, req);
  }
});
