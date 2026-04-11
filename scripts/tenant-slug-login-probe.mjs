import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'

const URL = process.env.SUPABASE_URL; if (!URL) throw new Error('SUPABASE_URL env var required')
const PUB = process.env.SUPABASE_PUBLISHABLE_KEY; if (!PUB) throw new Error('SUPABASE_PUBLISHABLE_KEY env var required')
const OWNER_EMAIL = process.env.OWNER_EMAIL; if (!OWNER_EMAIL) throw new Error('OWNER_EMAIL env var required')
const OWNER_PASSWORD = process.env.OWNER_PASSWORD
if (!OWNER_PASSWORD) throw new Error('OWNER_PASSWORD env var required')

const client = createClient(URL, PUB, {
  auth: { persistSession: false, autoRefreshToken: false },
})

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
  let data = null
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    data = { raw }
  }

  if (!response.ok) {
    throw new Error(`owner action ${body.action} falhou: HTTP ${response.status} - ${JSON.stringify(data)}`)
  }

  return data
}

async function main() {
  const out = {
    ok: false,
    checkedAt: new Date().toISOString(),
    tenant: null,
    tempUser: null,
    frontend: null,
  }

  const ownerLogin = await client.auth.signInWithPassword({ email: OWNER_EMAIL, password: OWNER_PASSWORD })
  if (ownerLogin.error || !ownerLogin.data.session?.access_token || !ownerLogin.data.user?.id) {
    throw new Error(`owner login falhou: ${ownerLogin.error?.message || 'sem sessão'}`)
  }

  const ownerToken = ownerLogin.data.session.access_token
  const ownerUserId = ownerLogin.data.user.id

  const ownerRoles = await client
    .from('user_roles')
    .select('empresa_id')
    .eq('user_id', ownerUserId)
    .not('empresa_id', 'is', null)
    .limit(1)

  if (ownerRoles.error) throw new Error(`falha lendo user_roles: ${ownerRoles.error.message}`)

  const empresaId = ownerRoles.data?.[0]?.empresa_id
  if (!empresaId) throw new Error('owner sem empresa_id para probe')

  const config = await client
    .from('empresa_config')
    .select('dominio_custom')
    .eq('empresa_id', empresaId)
    .not('dominio_custom', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (config.error) throw new Error(`falha lendo dominio_custom: ${config.error.message}`)

  const domain = String(config.data?.dominio_custom || '').trim().toLowerCase()
  if (!domain) throw new Error('empresa sem dominio_custom')

  out.tenant = { empresaId, domain }

  const stamp = Date.now()
  const probeEmail = `probe.${stamp}@gppis-teste.local`
  const probePassword = `Tmp@${String(stamp).slice(-8)}Aa1!`

  const created = await ownerAction(ownerToken, {
    action: 'create_user',
    user: {
      nome: `Probe User ${stamp}`,
      email: probeEmail,
      password: probePassword,
      empresa_id: empresaId,
      role: 'ADMIN',
      status: 'ativo',
    },
  })

  out.tempUser = {
    email: probeEmail,
    password: probePassword,
    userId: created?.user_id ?? null,
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ ignoreHTTPSErrors: true })

  try {
    const loginUrl = `https://${domain}/login`
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })

    await page.fill('#login-email', probeEmail)
    await page.fill('#login-password', probePassword)

    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => null),
      page.getByRole('button', { name: 'Entrar' }).click(),
    ])

    await page.waitForTimeout(5000)

    const currentUrl = page.url()
    const stillLogin = currentUrl.includes('/login')
    const tenantInvalidVisible = await page.locator('text=Tenant inválido').first().isVisible().catch(() => false)
    const loginErrorText = await page.locator('div[class*="rose"], p[class*="rose"], .text-red-400, .text-rose-300').first().textContent().catch(() => null)

    out.frontend = {
      loginUrl,
      currentUrl,
      stillLogin,
      tenantInvalidVisible,
      loginErrorText: loginErrorText ? String(loginErrorText).trim() : null,
    }

    out.ok = !stillLogin && !tenantInvalidVisible
  } finally {
    await browser.close().catch(() => null)
    await client.auth.signOut().catch(() => null)
  }

  console.log(JSON.stringify(out, null, 2))

  if (!out.ok) process.exit(2)
}

main().catch((error) => {
  console.error('[TENANT_SLUG_LOGIN_PROBE_FAIL]', error?.message || error)
  process.exit(1)
})
