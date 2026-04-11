import { chromium } from 'playwright'

const BASE_LOGIN_URL = 'https://gppis.com.br/login'
const EMAIL = process.env.COOPER_EMAIL; if (!EMAIL) throw new Error('COOPER_EMAIL env var required')
const PASSWORD = process.env.COOPER_PASSWORD; if (!PASSWORD) throw new Error('COOPER_PASSWORD env var required')

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ ignoreHTTPSErrors: true })

  const transitions = []
  const consoleLogs = []

  page.on('console', (msg) => {
    const text = msg.text()
    if (
      text.includes('tenant_')
      || text.includes('auth_')
      || text.includes('session_transfer')
      || text.includes('Loop de redirecionamento')
    ) {
      consoleLogs.push({
        type: msg.type(),
        text,
      })
    }
  })

  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      transitions.push({ at: new Date().toISOString(), url: frame.url() })
    }
  })

  const netEvents = []
  page.on('response', (response) => {
    const url = response.url()
    if (url.includes('/auth/v1/') || url.includes('/functions/v1/') || url.includes('/rest/v1/')) {
      netEvents.push({
        type: 'response',
        status: response.status(),
        method: response.request().method(),
        url,
      })
    }
  })

  await page.goto(BASE_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.fill('#login-email', EMAIL)
  await page.fill('#login-password', PASSWORD)

  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => null),
    page.getByRole('button', { name: 'Entrar' }).click(),
  ])

  await page.waitForTimeout(12000)

  const finalUrl = page.url()
  const loginErrorText = await page.locator('div[class*="rose"], p[class*="rose"], .text-red-400, .text-rose-300').first().textContent().catch(() => null)
  const tenantInvalidVisible = await page.locator('text=Tenant inválido').first().isVisible().catch(() => false)
  const isChangePassword = finalUrl.includes('/change-password')
  const isTenantLogin = finalUrl.includes('://cooper.gppis.com.br/login')
  const isTenantDashboard = finalUrl.includes('://cooper.gppis.com.br/dashboard')

  const result = {
    ok: isTenantDashboard || isChangePassword || isTenantLogin,
    startedAt: BASE_LOGIN_URL,
    finalUrl,
    flags: {
      isChangePassword,
      isTenantLogin,
      isTenantDashboard,
      tenantInvalidVisible,
    },
    loginErrorText: loginErrorText ? String(loginErrorText).trim() : null,
    transitions,
    consoleLogs,
    netEvents,
  }

  console.log(JSON.stringify(result, null, 2))
  await browser.close()

  if (!result.ok) {
    process.exit(2)
  }
}

main().catch((error) => {
  console.error('[COOPER_BASE_LOGIN_LOOP_CHECK_FAIL]', error?.message || error)
  process.exit(1)
})
