import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const OWNER_BASE_URL = process.env.OWNER_BASE_URL || 'https://owner.gppis.com.br'
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'pedrozo@gppis.com.br'
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || '@Gpp280693'
const OWNER_E2E_RUNS = Number(process.env.OWNER_E2E_RUNS || 5)
const HEADLESS = String(process.env.OWNER_E2E_HEADLESS || 'true').toLowerCase() !== 'false'
const AUTO_RELOGIN_ON_CRASH = String(process.env.OWNER_E2E_AUTO_RELOGIN || 'true').toLowerCase() !== 'false'
const OWNER_E2E_CHANNEL = process.env.OWNER_E2E_CHANNEL || ''
const OWNER_E2E_AUTO_REPAIR = String(process.env.OWNER_E2E_AUTO_REPAIR || 'true').toLowerCase() !== 'false'

const report = {
  startedAt: new Date().toISOString(),
  baseUrl: OWNER_BASE_URL,
  runs: OWNER_E2E_RUNS,
  successRuns: 0,
  failedRuns: 0,
  failures: [],
  events: [],
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function makeTag(prefix, i) {
  return `${prefix}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`
}

async function clickNav(page, label) {
  const candidates = [
    page.locator('aside button', { hasText: label }).first(),
    page.getByRole('button', { name: label }).first(),
    page.locator(`button:has-text("${label}")`).first(),
    page.locator(`a:has-text("${label}")`).first(),
  ]

  let lastError = null
  for (const candidate of candidates) {
    try {
      await candidate.click({ timeout: 8000 })
      return
    } catch (err) {
      lastError = err
    }
  }

  throw new Error(`Nao foi possivel navegar para aba '${label}': ${String(lastError?.message || lastError || 'sem detalhe')}`)
}

async function waitFeedback(page) {
  const ok = page.locator('p.text-emerald-300').last()
  const err = page.locator('p.text-rose-300').last()

  const result = await Promise.race([
    ok.waitFor({ state: 'visible', timeout: 20000 }).then(async () => ({ ok: true, msg: (await ok.textContent()) || 'ok' })).catch(() => null),
    err.waitFor({ state: 'visible', timeout: 20000 }).then(async () => ({ ok: false, msg: (await err.textContent()) || 'erro' })).catch(() => null),
  ])

  if (!result) {
    return { ok: false, msg: 'timeout aguardando feedback da operacao' }
  }

  return { ok: result.ok, msg: String(result.msg).trim() }
}

async function login(page) {
  await page.goto(OWNER_BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  const email = page.locator('#owner-login-email')
  const password = page.locator('#owner-login-password')

  await email.waitFor({ state: 'visible', timeout: 20000 })
  await password.waitFor({ state: 'visible', timeout: 20000 })

  await email.fill('')
  await password.fill('')
  await email.fill(OWNER_EMAIL)
  await password.fill(OWNER_PASSWORD)

  const typedSnapshot = await page.evaluate(() => {
    const e = document.querySelector('#owner-login-email')
    const p = document.querySelector('#owner-login-password')
    return {
      emailLength: e && 'value' in e ? String(e.value || '').length : -1,
      passwordLength: p && 'value' in p ? String(p.value || '').length : -1,
    }
  })
  report.events.push({ at: new Date().toISOString(), type: 'login_typed', details: typedSnapshot })

  await page.getByRole('button', { name: 'Entrar' }).click()

  const dashboardNav = page.getByRole('button', { name: 'Dashboard' }).first()
  const loginFormStillVisible = page.locator('#owner-login-email')
  const accessDenied = page.locator('text=Acesso negado').first()
  const loginError = page.locator('.text-red-400, .text-rose-300').first()

  const reachedApp = await dashboardNav.waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false)
  if (reachedApp) {
    return
  }

  if (await accessDenied.isVisible().catch(() => false)) {
    throw new Error('Login realizado sem permissao de Owner: tela de acesso negado exibida.')
  }

  if (await loginFormStillVisible.isVisible().catch(() => false)) {
    const errText = (await loginError.textContent().catch(() => null)) || 'formulario de login permaneceu aberto sem entrar no Owner'
    const pageUrl = page.url()
    report.events.push({ at: new Date().toISOString(), type: 'login_still_visible', details: { pageUrl, errText: String(errText).trim() } })
    throw new Error(`Falha de login no Owner Portal: ${String(errText).trim()}`)
  }

  throw new Error('Nao foi possivel confirmar login no Owner Portal.')
}

async function createCompany(page, i) {
  await clickNav(page, 'Empresas')
  const name = `E2E Empresa ${makeTag('owner', i)}`
  const slug = makeTag('slug', i).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40)
  const adminName = `Admin ${i}`
  const adminEmail = `${makeTag('admin', i)}@gppis-e2e.local`

  const allNameInputs = page.getByPlaceholder('Nome')
  await allNameInputs.nth(0).fill(name)
  await page.getByPlaceholder('Slug').fill(slug)
  await page.getByPlaceholder('Nome admin').fill(adminName)
  await page.getByPlaceholder('Email admin').fill(adminEmail)
  await page.getByRole('button', { name: 'Criar empresa' }).first().click()

  const fb = await waitFeedback(page)
  if (!fb.ok) throw new Error(`create_company: ${fb.msg}`)
  return name
}

async function updateCompany(page, companyName) {
  await clickNav(page, 'Empresas')
  const select = page.locator('select').nth(0)
  const companyValue = await select.evaluate((el, label) => {
    const options = Array.from(el.querySelectorAll('option'))
    const f = options.find((opt) => (opt.textContent || '').toLowerCase().includes(String(label).toLowerCase()))
    return f?.value || ''
  }, companyName)
  if (!companyValue) throw new Error('empresa nao encontrada no update')
  await select.selectOption(companyValue)
  await page.getByPlaceholder('Novo nome').fill(`${companyName} Atualizada`)
  await page.getByRole('button', { name: 'Salvar' }).first().click()
  const fb1 = await waitFeedback(page)
  if (!fb1.ok) throw new Error(`update_company: ${fb1.msg}`)
}

async function createPlan(page, i) {
  await clickNav(page, 'Planos')
  const code = makeTag('pln', i).toUpperCase().slice(0, 24)
  await page.getByPlaceholder('Codigo').fill(code)
  await page.getByPlaceholder('Nome').fill(`Plano E2E ${i}`)
  await page.getByPlaceholder('Preco mensal').fill(String(100 + i))
  await page.getByRole('button', { name: 'Criar plano' }).first().click()
  const fb = await waitFeedback(page)
  if (!fb.ok) throw new Error(`create_plan: ${fb.msg}`)
}

async function createSubscription(page, companyName) {
  await clickNav(page, 'Assinaturas')
  const empresaSelect = page.locator('select').nth(0)
  const empresaValue = await empresaSelect.evaluate((el, label) => {
    const options = Array.from(el.querySelectorAll('option'))
    const f = options.find((opt) => (opt.textContent || '').toLowerCase().includes(String(label).toLowerCase()))
    return f?.value || ''
  }, companyName)
  if (!empresaValue) throw new Error('empresa nao encontrada em assinaturas')
  await empresaSelect.selectOption(empresaValue)

  const planoSelect = page.locator('select').nth(1)
  const firstPlan = await planoSelect.evaluate((el) => {
    const options = Array.from(el.querySelectorAll('option')).filter((o) => o.value)
    return options[0]?.value || ''
  })
  if (!firstPlan) throw new Error('nenhum plano para assinatura')

  await planoSelect.selectOption(firstPlan)
  await page.getByPlaceholder('Valor').fill('199')
  await page.getByRole('button', { name: 'Criar assinatura' }).first().click()
  const fb = await waitFeedback(page)
  if (!fb.ok) throw new Error(`create_subscription: ${fb.msg}`)
}

async function monitoramento(page) {
  await clickNav(page, 'Monitoramento')
  await page.locator('text=Status dos bancos/tabelas').first().waitFor({ state: 'visible', timeout: 20000 })
  await sleep(500)
}

async function deleteCompany(page, companyName) {
  await clickNav(page, 'Sistema')
  const empresaSelect = page.locator('select').nth(0)
  const value = await empresaSelect.evaluate((el, label) => {
    const options = Array.from(el.querySelectorAll('option'))
    const f = options.find((opt) => (opt.textContent || '').toLowerCase().includes(String(label).toLowerCase()))
    return f?.value || ''
  }, companyName)
  if (!value) throw new Error('empresa nao encontrada para exclusao')

  await empresaSelect.selectOption(value)
  await page.getByPlaceholder('Senha de confirmacao').fill(OWNER_PASSWORD)
  await page.getByRole('button', { name: 'Excluir empresa' }).first().click()

  const fb = await waitFeedback(page)
  if (!fb.ok) throw new Error(`delete_company: ${fb.msg}`)
}

async function runCycle(page, i) {
  const company = await createCompany(page, i)
  await updateCompany(page, company)
  await createPlan(page, i)
  await createSubscription(page, company)
  await monitoramento(page)
  await deleteCompany(page, company)
}

async function main() {
  const browser = await chromium.launch({
    headless: HEADLESS,
    channel: OWNER_E2E_CHANNEL || undefined,
  })
  const context = await browser.newContext({ ignoreHTTPSErrors: true })
  let page = await context.newPage()

  browser.on('disconnected', () => {
    report.events.push({ at: new Date().toISOString(), type: 'browser_disconnected' })
  })
  context.on('close', () => {
    report.events.push({ at: new Date().toISOString(), type: 'context_closed' })
  })
  page.on('close', () => {
    report.events.push({ at: new Date().toISOString(), type: 'page_closed' })
  })
  page.on('crash', () => {
    report.events.push({ at: new Date().toISOString(), type: 'page_crashed' })
  })

  try {
    try {
      await login(page)
    } catch (loginErr) {
      const loginMessage = String(loginErr?.message || loginErr || '')
      if (
        OWNER_E2E_AUTO_REPAIR &&
        (loginMessage.toLowerCase().includes('sem permissao') || loginMessage.toLowerCase().includes('falha de login'))
      ) {
        report.events.push({ at: new Date().toISOString(), type: 'auto_repair_attempt', details: { loginMessage } })
        const repair = spawnSync('node', ['scripts/repair-and-verify-owner-login.mjs'], {
          cwd: process.cwd(),
          encoding: 'utf8',
          stdio: 'pipe',
          env: process.env,
        })

        report.events.push({
          at: new Date().toISOString(),
          type: 'auto_repair_result',
          details: {
            status: repair.status,
            stdout: String(repair.stdout || '').slice(-2000),
            stderr: String(repair.stderr || '').slice(-2000),
          },
        })

        if (repair.status === 0) {
          await login(page)
        } else {
          throw new Error(`Auto-repair falhou antes do E2E: ${String(repair.stderr || repair.stdout || 'sem detalhe')}`)
        }
      } else {
        throw loginErr
      }
    }

    for (let i = 1; i <= OWNER_E2E_RUNS; i += 1) {
      try {
        if (AUTO_RELOGIN_ON_CRASH && page.isClosed()) {
          page = await context.newPage()
          await login(page)
        }

        console.log(`[OWNER_E2E] ciclo ${i}/${OWNER_E2E_RUNS}`)
        await runCycle(page, i)
        report.successRuns += 1
      } catch (err) {
        const msg = err?.message || String(err)
        report.failedRuns += 1
        report.failures.push({ run: i, message: msg })
        try {
          mkdirSync('reports', { recursive: true })
          if (!page.isClosed()) {
            await page.screenshot({ path: `reports/owner-e2e-failure-run-${i}.png`, fullPage: true })
            const html = await page.content()
            writeFileSync(`reports/owner-e2e-failure-run-${i}.html`, html, 'utf8')
          }
        } catch {
        }
        console.error(`[OWNER_E2E_FAIL][${i}] ${msg}`)

        if (AUTO_RELOGIN_ON_CRASH && msg.toLowerCase().includes('target page, context or browser has been closed')) {
          try {
            if (!context.pages().length) {
              page = await context.newPage()
            } else {
              page = context.pages()[0]
            }
            if (page.isClosed()) {
              page = await context.newPage()
            }
            await login(page)
          } catch {
          }
        }
      }
    }
  } finally {
    report.finishedAt = new Date().toISOString()
    mkdirSync('reports', { recursive: true })
    const out = `reports/owner-e2e-report-${Date.now()}.json`
    writeFileSync(out, JSON.stringify(report, null, 2), 'utf8')
    console.log(`[OWNER_E2E_REPORT] ${out}`)
    try {
      if (context && context.pages) {
        await context.close()
      }
    } catch {
    }
    try {
      if (browser && browser.isConnected()) {
        await browser.close()
      }
    } catch {
    }
  }

  console.log(JSON.stringify(report, null, 2))
  if (report.failedRuns > 0) process.exit(1)
}

main().catch((err) => {
  console.error('[OWNER_E2E_FATAL]', err?.message || err)
  process.exit(1)
})
