import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadDotEnvFile() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return

  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const index = trimmed.indexOf('=')
    if (index <= 0) continue

    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^"|"$/g, '')

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadDotEnvFile()

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://dvwsferonoczgmvfubgu.supabase.co'

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY

const SHOULD_PROCESS_NOTIFICATIONS = process.argv.includes('--process-notifications')

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL and/or key for verification.')
  console.error('Expected one of: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

function printSection(title) {
  console.log('\n' + '='.repeat(80))
  console.log(title)
  console.log('='.repeat(80))
}

function printPassFail(label, passed, details = '') {
  console.log(`${passed ? 'PASS' : 'FAIL'} | ${label}${details ? ` | ${details}` : ''}`)
}

async function checkRpc(name, args = undefined) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) {
    return { ok: false, error: error.message, data: null }
  }
  return { ok: true, error: null, data }
}

async function checkView(viewName, queryBuilder) {
  const { data, error, count } = await queryBuilder
  if (error) {
    return { ok: false, error: error.message, data: null, count: null }
  }
  return { ok: true, error: null, data, count }
}

async function main() {
  console.log('Starting SaaS Phase 1 verification...')
  console.log(`Project URL: ${SUPABASE_URL}`)

  printSection('1) RLS SUITE')
  const rlsSuite = await checkRpc('run_multitenant_rls_suite')

  if (!rlsSuite.ok) {
    printPassFail('run_multitenant_rls_suite', false, rlsSuite.error)
  } else {
    const rows = Array.isArray(rlsSuite.data) ? rlsSuite.data : []
    if (rows.length === 0) {
      printPassFail('run_multitenant_rls_suite returned rows', false, 'empty result')
    } else {
      const failed = rows.filter((r) => !r.passed)
      rows.forEach((r) => printPassFail(r.test_name, !!r.passed, String(r.details || '')))
      printPassFail('RLS suite summary', failed.length === 0, `failed=${failed.length} total=${rows.length}`)
    }
  }

  printSection('2) CRITICAL VIEWS')
  const slaView = await checkView(
    'v_ordens_servico_sla',
    supabase.from('v_ordens_servico_sla').select('id, is_breached', { count: 'exact' }).limit(5),
  )
  printPassFail('view v_ordens_servico_sla readable', slaView.ok, slaView.ok ? `sample=${(slaView.data || []).length} total=${slaView.count ?? 0}` : slaView.error)

  const dashboardView = await checkView(
    'v_dashboard_kpis',
    supabase.from('v_dashboard_kpis').select('*').limit(1),
  )
  printPassFail('view v_dashboard_kpis readable', dashboardView.ok, dashboardView.ok ? `rows=${(dashboardView.data || []).length}` : dashboardView.error)

  const budgetView = await checkView(
    'v_custos_orcado_realizado',
    supabase.from('v_custos_orcado_realizado').select('empresa_id, ano, mes, orcado_total, realizado_total').limit(5),
  )
  printPassFail('view v_custos_orcado_realizado readable', budgetView.ok, budgetView.ok ? `sample=${(budgetView.data || []).length}` : budgetView.error)

  printSection('3) ATOMIC CLOSE FUNCTION')
  const atomicClose = await checkRpc('close_os_with_execution_atomic', {
    p_os_id: null,
    p_mecanico_id: null,
    p_mecanico_nome: 'probe',
    p_hora_inicio: '08:00',
    p_hora_fim: '09:00',
    p_tempo_execucao: 60,
    p_servico_executado: 'probe',
    p_custo_mao_obra: 0,
    p_custo_materiais: 0,
    p_custo_terceiros: 0,
    p_custo_total: 0,
    p_materiais: [],
  })

  if (atomicClose.ok) {
    printPassFail('RPC close_os_with_execution_atomic exists', true, 'callable')
  } else {
    // Expected to fail with os_not_found for null id if function exists.
    const likelyExists = String(atomicClose.error || '').toLowerCase().includes('os_not_found')
    printPassFail('RPC close_os_with_execution_atomic exists', likelyExists, atomicClose.error || '')
  }

  printSection('4) NOTIFICATION QUEUE')
  const queueRead = await checkView(
    'system_notifications',
    supabase.from('system_notifications').select('id, status, scheduled_for', { count: 'exact' }).limit(5),
  )
  printPassFail('table system_notifications readable', queueRead.ok, queueRead.ok ? `sample=${(queueRead.data || []).length} total=${queueRead.count ?? 0}` : queueRead.error)

  if (SHOULD_PROCESS_NOTIFICATIONS) {
    const processQueue = await checkRpc('process_pending_system_notifications', { p_limit: 20 })
    printPassFail(
      'RPC process_pending_system_notifications',
      processQueue.ok,
      processQueue.ok ? `processed=${Array.isArray(processQueue.data) ? processQueue.data.length : 0}` : processQueue.error,
    )
  } else {
    console.log('SKIP | process_pending_system_notifications not executed (use --process-notifications)')
  }

  printSection('DONE')
  console.log('Verification completed. Review FAIL lines first.')
}

main().catch((error) => {
  console.error('Fatal verification error:', error)
  process.exit(1)
})
