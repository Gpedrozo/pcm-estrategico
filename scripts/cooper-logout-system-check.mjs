import { chromium } from 'playwright'

const TENANT_LOGIN_URL = 'https://cooper.gppis.com.br/login'
const TENANT_DASHBOARD_URL = 'https://cooper.gppis.com.br/dashboard'
const BASE_LOGIN_HOST = 'gppis.com.br'
const EMAIL = 'coopertradicao@gmail.com'
const PASSWORD = 'Tmp#zZ8AauYGtaxMa3!'

async function waitForAuthenticatedRoute(page) {
  const started = Date.now()
  while (Date.now() - started < 45000) {
    const url = page.url()
    if (url.includes('/dashboard') || url.includes('/change-password')) {
      return { ok: true, url }
    }
    await page.waitForTimeout(600)
  }
  return { ok: false, url: page.url() }
}

async function clickLogout(page) {
  const selectors = [
    'button[title="Sair"]',
    'button:has-text("Sair")',
    '[role="menuitem"]:has-text("Sair")',
    'a:has-text("Sair")',
  ]

  for (const selector of selectors) {
    const target = page.locator(selector).first()
    if (await target.isVisible().catch(() => false)) {
      await target.click({ timeout: 5000 }).catch(() => null)
      return true
    }
  }

  return false
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ ignoreHTTPSErrors: true })

  const transitions = []
  const consoleLogs = []

  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      transitions.push({ at: new Date().toISOString(), url: frame.url() })
    }
  })

  page.on('console', (msg) => {
    const text = msg.text()
    if (
      text.includes('logout')
      || text.includes('auth_status_transition')
      || text.includes('window_closed')
      || text.includes('tenant_')
    ) {
      consoleLogs.push({ type: msg.type(), text })
    }
  })

  await page.goto(TENANT_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.fill('#login-email', EMAIL)
  await page.fill('#login-password', PASSWORD)
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => null),
    page.getByRole('button', { name: 'Entrar' }).click(),
  ])

  const authResult = await waitForAuthenticatedRoute(page)

  if (!authResult.ok) {
    const result = {
      ok: false,
      stage: 'login_not_authenticated',
      finalUrl: page.url(),
      transitions,
      consoleLogs,
    }
    console.log(JSON.stringify(result, null, 2))
    await browser.close()
    process.exit(2)
  }

  const logoutClicked = await clickLogout(page)
  if (!logoutClicked) {
    const result = {
      ok: false,
      stage: 'logout_button_not_found',
      finalUrl: page.url(),
      transitions,
      consoleLogs,
    }
    console.log(JSON.stringify(result, null, 2))
    await browser.close()
    process.exit(3)
  }

  await page.waitForTimeout(6000)

  const afterLogoutUrl = page.url()
  const afterLogout = new URL(afterLogoutUrl)
  const redirectedToBaseLogin =
    afterLogout.hostname === BASE_LOGIN_HOST
    && afterLogout.pathname === '/login'

  const logoutMarkerObserved = transitions.some((entry) => {
    try {
      const parsed = new URL(entry.url)
      return parsed.hostname === BASE_LOGIN_HOST
        && parsed.pathname === '/login'
        && parsed.searchParams.get('logout') === '1'
    } catch {
      return false
    }
  })

  await page.goto(TENANT_DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(3500)

  const postAccessUrl = page.url()
  const postAccess = new URL(postAccessUrl)
  const blockedAfterLogout =
    postAccess.pathname === '/login'
    || postAccess.hostname === BASE_LOGIN_HOST

  const result = {
    ok: redirectedToBaseLogin && blockedAfterLogout,
    redirectedToBaseLogin,
    logoutMarkerObserved,
    blockedAfterLogout,
    afterLogoutUrl,
    postAccessUrl,
    transitions,
    consoleLogs,
  }

  console.log(JSON.stringify(result, null, 2))
  await browser.close()

  if (!result.ok) {
    process.exit(4)
  }
}

main().catch((error) => {
  console.error('[COOPER_LOGOUT_SYSTEM_CHECK_FAIL]', error?.message || error)
  process.exit(1)
})
