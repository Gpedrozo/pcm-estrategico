import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const URL = process.env.SUPABASE_URL || 'https://dvwsferonoczgmvfubgu.supabase.co'
const PUB = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_d0dYFE0Pp0GaM43BpDGvtw_7F9cCOXU'
const EMAIL = process.env.OWNER_EMAIL || 'pedrozo@gppis.com.br'
const PASSWORD = process.env.OWNER_PASSWORD
if (!PASSWORD) throw new Error('OWNER_PASSWORD env var required')

const client = createClient(URL, PUB, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  mkdirSync('reports', { recursive: true })

  const out = {
    ok: false,
    checkedAt: new Date().toISOString(),
    userEmail: EMAIL,
    domain: null,
    empresaId: null,
    frontend: null,
  }

  const login = await client.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  })

  if (login.error || !login.data.user?.id) {
    throw new Error(`Supabase login falhou: ${login.error?.message || 'sem user'}`)
  }

  const userId = login.data.user.id

  const roles = await client
    .from('user_roles')
    .select('empresa_id,role')
    .eq('user_id', userId)
    .not('empresa_id', 'is', null)

  if (roles.error) {
    throw new Error(`Falha lendo user_roles: ${roles.error.message}`)
  }

  const empresaId = (roles.data || []).map((item) => item.empresa_id).find(Boolean) || null
  out.empresaId = empresaId

  if (!empresaId) {
    throw new Error('Usuario autenticado sem empresa_id em user_roles')
  }

  const config = await client
    .from('empresa_config')
    .select('dominio_custom')
    .eq('empresa_id', empresaId)
    .not('dominio_custom', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (config.error) {
    throw new Error(`Falha lendo empresa_config: ${config.error.message}`)
  }

  const domain = String(config.data?.dominio_custom || '').trim().toLowerCase()
  out.domain = domain || null

  if (!domain) {
    throw new Error('Empresa sem dominio_custom configurado')
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ ignoreHTTPSErrors: true })
  const netEvents = []

  page.on('requestfailed', (request) => {
    const url = request.url()
    if (url.includes('supabase.co') || url.includes('/auth/v1/') || url.includes('/functions/v1/')) {
      netEvents.push({
        type: 'requestfailed',
        method: request.method(),
        url,
        failure: request.failure()?.errorText || null,
      })
    }
  })

  page.on('response', async (response) => {
    const url = response.url()
    if (url.includes('supabase.co') || url.includes('/auth/v1/') || url.includes('/functions/v1/')) {
      netEvents.push({
        type: 'response',
        status: response.status(),
        method: response.request().method(),
        url,
      })
    }
  })

  try {
    const loginUrl = `https://${domain}/login`
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })

    await page.fill('#login-email', EMAIL)
    await page.fill('#login-password', PASSWORD)

    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => null),
      page.getByRole('button', { name: 'Entrar' }).click(),
    ])

    await page.waitForTimeout(4000)

    const currentUrl = page.url()
    const stillLogin = currentUrl.includes('/login')
    const tenantInvalidVisible = await page.locator('text=Tenant inválido').first().isVisible().catch(() => false)
    const loginErrorText = await page.locator('div[class*="rose"], p[class*="rose"], .text-red-400, .text-rose-300').first().textContent().catch(() => null)
    const buttonState = await page.getByRole('button', { name: /Entrar|Entrando|Redirecionando/i }).first().evaluate((el) => ({
      disabled: Boolean(el?.getAttribute('disabled') !== null),
      text: (el?.textContent || '').trim(),
    })).catch(() => null)

    await page.screenshot({ path: 'reports/tenant-domain-live-check.png', fullPage: true })
    const html = await page.content().catch(() => '')
    if (html) {
      writeFileSync('reports/tenant-domain-live-check.html', html, 'utf8')
    }

    out.frontend = {
      loginUrl,
      currentUrl,
      stillLogin,
      tenantInvalidVisible,
      loginErrorText: loginErrorText ? String(loginErrorText).trim() : null,
      buttonState,
      screenshot: 'reports/tenant-domain-live-check.png',
      htmlDump: 'reports/tenant-domain-live-check.html',
      netEvents,
    }

    out.ok = !stillLogin && !tenantInvalidVisible
  } finally {
    await browser.close()
    await client.auth.signOut().catch(() => null)
  }

  console.log(JSON.stringify(out, null, 2))

  if (!out.ok) {
    process.exit(2)
  }
}

main().catch((error) => {
  console.error('[TENANT_DOMAIN_LOGIN_LIVE_CHECK_FAIL]', error?.message || error)
  process.exit(1)
})
