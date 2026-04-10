import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL || 'https://dvwsferonoczgmvfubgu.supabase.co'
const PUB = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_d0dYFE0Pp0GaM43BpDGvtw_7F9cCOXU'
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'pedrozo@gppis.com.br'
const OWNER_PASSWORD = process.env.OWNER_PASSWORD
if (!OWNER_PASSWORD) throw new Error('OWNER_PASSWORD env var required')
const RUNS = Number(process.env.OWNER_STRESS_RUNS || 5)

const client = createClient(URL, PUB, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const report = {
  startedAt: new Date().toISOString(),
  runs: RUNS,
  success: [],
  failed: [],
  skipped: [],
}

function unique(base, i) {
  return `${base}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`
}

function registerSuccess(name, details = {}) {
  report.success.push({ name, at: new Date().toISOString(), details })
}

function registerSkip(name, reason) {
  report.skipped.push({ name, at: new Date().toISOString(), reason })
}

function registerFailure(name, error, payload = null) {
  const message = error?.message || String(error)
  report.failed.push({ name, at: new Date().toISOString(), message, payload })
}

async function ownerAction(token, body) {
  const response = await fetch(`${URL}/functions/v1/owner-portal-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: PUB,
      Authorization: `Bearer ${token}`,
      Origin: 'https://owner.gppis.com.br',
    },
    body: JSON.stringify(body),
  })

  const raw = await response.text()
  let data
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    data = { raw }
  }

  if (!response.ok) {
    const errorMessage = data?.error || `HTTP ${response.status}`
    const err = new Error(`${errorMessage} | action=${body.action}`)
    err.details = data
    throw err
  }

  return data
}

async function runStep(stepName, fn, payloadForDebug = null) {
  try {
    const result = await fn()
    registerSuccess(stepName)
    return result
  } catch (error) {
    registerFailure(stepName, error, payloadForDebug)
    throw error
  }
}

async function main() {
  const login = await client.auth.signInWithPassword({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
  })

  if (login.error || !login.data.session?.access_token || !login.data.user?.id) {
    throw new Error(`OWNER login falhou: ${login.error?.message || 'sem sessão'}`)
  }

  const roles = await client
    .from('user_roles')
    .select('role')
    .eq('user_id', login.data.user.id)

  if (roles.error) {
    throw new Error(`Leitura de roles falhou: ${roles.error.message}`)
  }

  const isOwner = (roles.data || []).some((row) => {
    const role = String(row.role || '').toUpperCase()
    return role === 'SYSTEM_OWNER' || role === 'SYSTEM_ADMIN'
  })

  if (!isOwner) {
    throw new Error(`Usuário autenticou sem role de owner/admin: ${JSON.stringify(roles.data || [])}`)
  }

  const token = login.data.session.access_token
  const touched = []

  for (let i = 1; i <= RUNS; i += 1) {
    const label = `run_${i}`
    console.log(`\n[OWNER_STRESS] Iniciando ${label}`)

    await runStep(`${label}:dashboard`, () => ownerAction(token, { action: 'dashboard' }))
    await runStep(`${label}:platform_stats`, () => ownerAction(token, { action: 'platform_stats' }))
    await runStep(`${label}:list_companies`, () => ownerAction(token, { action: 'list_companies' }))

    const planCode = unique('stress-plan', i)
    const companySlug = unique('stress-company', i)
    const companyName = `Stress Company ${i}`
    const masterEmail = `${unique('master', i)}@gppis.com.br`
    const extraEmail = `${unique('user', i)}@gppis.com.br`

    const createdPlan = await runStep(`${label}:create_plan`, () => ownerAction(token, {
      action: 'create_plan',
      plan: {
        code: planCode,
        name: `Plano Stress ${i}`,
        description: `Plano de estresse ${i}`,
        user_limit: 20 + i,
        data_limit_mb: 512 + i,
        price_month: 199 + i,
        module_flags: { os: true, preventiva: true, dashboard: true },
        premium_features: ['stress'],
        active: true,
      },
    }))

    const planId = createdPlan?.plan?.id
    if (!planId) {
      throw new Error(`create_plan não retornou plan.id para ${label}`)
    }

    await runStep(`${label}:update_plan`, () => ownerAction(token, {
      action: 'update_plan',
      plan: {
        code: planCode,
        name: `Plano Stress ${i} Atualizado`,
        description: `Plano atualizado ${i}`,
        user_limit: 50 + i,
        data_limit_mb: 1024 + i,
        price_month: 299 + i,
        module_flags: { os: true, preventiva: true, dashboard: true, contratos: true },
        premium_features: ['stress', 'priority-support'],
        company_limit: null,
        active: true,
      },
    }))

    const createCompanyPayload = {
      action: 'create_company',
      company: {
        nome: companyName,
        slug: companySlug,
        razao_social: `${companyName} LTDA`,
        nome_fantasia: companyName,
        cnpj: `00.000.000/000${i}-00`,
        telefone: '(11) 90000-0000',
        email: `contato+${i}@gppis.com.br`,
        responsavel: `Responsável ${i}`,
        segmento: 'Industrial',
        status: 'active',
      },
      user: {
        nome: `Master ${i}`,
        email: masterEmail,
        password: process.env.OWNER_PASSWORD || OWNER_PASSWORD,
        role: 'ADMIN',
      },
    }

    const createdCompany = await runStep(`${label}:create_company`, () => ownerAction(token, createCompanyPayload), createCompanyPayload)

    const empresaId = createdCompany?.company?.id
    const masterUserId = createdCompany?.master_user?.id

    if (!empresaId || !masterUserId) {
      throw new Error(`create_company não retornou ids esperados em ${label}`)
    }

    touched.push({ empresaId, planCode, planId, masterUserId })

    await runStep(`${label}:update_company`, () => ownerAction(token, {
      action: 'update_company',
      empresa_id: empresaId,
      company: {
        nome: `${companyName} Updated`,
        slug: `${companySlug}-upd`,
        razao_social: `${companyName} UPDATED LTDA`,
        nome_fantasia: `${companyName} Updated`,
        cnpj: `11.111.111/000${i}-11`,
        telefone: '(11) 98888-8888',
        email: `financeiro+${i}@gppis.com.br`,
        responsavel: `Novo Responsável ${i}`,
        segmento: 'Serviços',
        status: 'active',
      },
    }))

    await runStep(`${label}:set_company_status_blocked`, () => ownerAction(token, {
      action: 'set_company_status',
      empresa_id: empresaId,
      status: 'blocked',
      reason: 'stress test',
    }))

    await runStep(`${label}:set_company_status_active`, () => ownerAction(token, {
      action: 'set_company_status',
      empresa_id: empresaId,
      status: 'active',
      reason: 'stress test restore',
    }))

    await runStep(`${label}:list_users`, () => ownerAction(token, {
      action: 'list_users',
      empresa_id: empresaId,
    }))

    const createdUser = await runStep(`${label}:create_user`, () => ownerAction(token, {
      action: 'create_user',
      user: {
        nome: `Operador ${i}`,
        email: extraEmail,
        empresa_id: empresaId,
        role: 'MECANICO',
        status: 'ativo',
      },
    }))

    const extraUserId = createdUser?.user_id
    if (!extraUserId) {
      throw new Error(`create_user não retornou user_id em ${label}`)
    }

    await runStep(`${label}:set_user_status_inativo`, () => ownerAction(token, {
      action: 'set_user_status',
      user_id: extraUserId,
      status: 'inativo',
    }))

    await runStep(`${label}:set_user_status_ativo`, () => ownerAction(token, {
      action: 'set_user_status',
      user_id: extraUserId,
      status: 'ativo',
    }))

    const createdSubscription = await runStep(`${label}:create_subscription`, () => ownerAction(token, {
      action: 'create_subscription',
      subscription: {
        empresa_id: empresaId,
        plan_id: planId,
        amount: 299 + i,
        period: 'monthly',
        status: 'ativa',
        payment_status: 'paid',
      },
    }))

    await runStep(`${label}:set_subscription_status_teste`, () => ownerAction(token, {
      action: 'set_subscription_status',
      empresa_id: empresaId,
      status: 'teste',
    }))

    await runStep(`${label}:set_subscription_status_ativa`, () => ownerAction(token, {
      action: 'set_subscription_status',
      empresa_id: empresaId,
      status: 'ativa',
    }))

    const contractId = createdSubscription?.contract?.id
    if (!contractId) {
      throw new Error(`create_subscription não retornou contract.id em ${label}`)
    }

    await runStep(`${label}:list_contracts`, () => ownerAction(token, { action: 'list_contracts' }))

    await runStep(`${label}:update_contract`, () => ownerAction(token, {
      action: 'update_contract',
      contract_id: contractId,
      content: `Contrato atualizado no stress ${label}`,
      summary: `update ${label}`,
    }))

    const regenerated = await runStep(`${label}:regenerate_contract`, () => ownerAction(token, {
      action: 'regenerate_contract',
      contract_id: contractId,
    }))

    const regeneratedId = regenerated?.contract?.id
    if (regeneratedId) {
      await runStep(`${label}:delete_contract`, () => ownerAction(token, {
        action: 'delete_contract',
        contract_id: regeneratedId,
      }))
    } else {
      registerSkip(`${label}:delete_contract`, 'regenerate_contract não retornou contract.id')
    }

    await runStep(`${label}:get_company_settings`, () => ownerAction(token, {
      action: 'get_company_settings',
      empresa_id: empresaId,
    }))

    await runStep(`${label}:update_company_settings`, () => ownerAction(token, {
      action: 'update_company_settings',
      empresa_id: empresaId,
      settings: {
        modules: { os: true, preventiva: true, contratos: true },
        limits: { users: 100 + i, storage_mb: 2048 + i },
        features: { ai: true, reports: true },
      },
    }))

    await runStep(`${label}:change_plan`, () => ownerAction(token, {
      action: 'change_plan',
      empresa_id: empresaId,
      plano_codigo: planCode,
    }))

    await runStep(`${label}:impersonate_company`, () => ownerAction(token, {
      action: 'impersonate_company',
      empresa_id: empresaId,
    }))

    await runStep(`${label}:stop_impersonation`, () => ownerAction(token, {
      action: 'stop_impersonation',
      empresa_id: empresaId,
      empresa_nome: companyName,
      reason: 'stress-test',
    }))

    await runStep(`${label}:create_system_admin`, () => ownerAction(token, {
      action: 'create_system_admin',
      user_id: extraUserId,
    }))

    await runStep(`${label}:list_subscriptions`, () => ownerAction(token, { action: 'list_subscriptions' }))
    await runStep(`${label}:list_plans`, () => ownerAction(token, { action: 'list_plans' }))
    await runStep(`${label}:list_audit_logs`, () => ownerAction(token, {
      action: 'list_audit_logs',
      filters: { empresa_id: empresaId },
    }))

    const tickets = await runStep(`${label}:list_support_tickets`, () => ownerAction(token, { action: 'list_support_tickets' }))
    const firstTicketId = tickets?.tickets?.[0]?.id

    if (firstTicketId) {
      await runStep(`${label}:respond_support_ticket`, () => ownerAction(token, {
        action: 'respond_support_ticket',
        ticket_id: firstTicketId,
        response: `Resposta automática stress ${label}`,
        status: 'resolvido',
      }))
    } else {
      registerSkip(`${label}:respond_support_ticket`, 'Nenhum ticket disponível para responder')
    }
  }

  await client.auth.signOut()

  report.finishedAt = new Date().toISOString()
  report.summary = {
    totalSuccess: report.success.length,
    totalFailed: report.failed.length,
    totalSkipped: report.skipped.length,
    touchedEntities: touched.length,
  }

  console.log(JSON.stringify(report, null, 2))

  if (report.failed.length > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  registerFailure('fatal', error)
  report.finishedAt = new Date().toISOString()
  report.summary = {
    totalSuccess: report.success.length,
    totalFailed: report.failed.length,
    totalSkipped: report.skipped.length,
  }
  console.error(JSON.stringify(report, null, 2))
  process.exit(1)
})
