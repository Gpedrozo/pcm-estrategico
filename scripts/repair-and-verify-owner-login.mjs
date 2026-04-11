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

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !PUBLISHABLE_KEY) {
  throw new Error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY')
}

const OWNER_EMAIL = process.env.OWNER_EMAIL; if (!OWNER_EMAIL) throw new Error('OWNER_EMAIL env var required')
const OWNER_PASSWORD = process.env.OWNER_PASSWORD
if (!OWNER_PASSWORD) throw new Error('OWNER_PASSWORD env var required')

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const front = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function ensureOwnerUser() {
  const { data: usersPage, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (usersError) throw new Error(`listUsers failed: ${usersError.message}`)

  const existing = (usersPage?.users || []).filter((user) => (user.email || '').toLowerCase() === OWNER_EMAIL)

  for (const user of existing) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteError) throw new Error(`deleteUser(${user.id}) failed: ${deleteError.message}`)
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    email_confirm: true,
    user_metadata: { nome: 'Pedrozo' },
    app_metadata: { provider: 'email', providers: ['email'] },
  })

  if (createError || !created?.user?.id) {
    throw new Error(`createUser failed: ${createError?.message || 'missing user id'}`)
  }

  const ownerId = created.user.id

  const { data: empresaRow, error: empresaError } = await admin
    .from('empresas')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (empresaError || !empresaRow?.id) {
    throw new Error(`empresa lookup failed: ${empresaError?.message || 'no empresa found'}`)
  }

  const empresaId = empresaRow.id

  const { error: profileError } = await admin
    .from('profiles')
    .upsert({ id: ownerId, empresa_id: empresaId, nome: 'Pedrozo', email: OWNER_EMAIL }, { onConflict: 'id' })

  if (profileError) throw new Error(`profiles upsert failed: ${profileError.message}`)

  const { error: roleError } = await admin
    .from('user_roles')
    .upsert({ user_id: ownerId, empresa_id: empresaId, role: 'SYSTEM_OWNER' }, { onConflict: 'user_id,empresa_id' })

  if (roleError) throw new Error(`user_roles upsert failed: ${roleError.message}`)

  const { error: allowlistError } = await admin
    .from('system_owner_allowlist')
    .upsert({ email: OWNER_EMAIL }, { onConflict: 'email' })

  if (allowlistError && !allowlistError.message.toLowerCase().includes('does not exist')) {
    throw new Error(`allowlist upsert failed: ${allowlistError.message}`)
  }

  return { ownerId, empresaId }
}

async function verifyFrontendLoginAndOwnerAccess() {
  const { data: loginData, error: loginError } = await front.auth.signInWithPassword({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
  })

  if (loginError || !loginData?.session?.access_token || !loginData?.user?.id) {
    throw new Error(`frontend login failed: ${loginError?.message || 'missing session'}`)
  }

  const accessToken = loginData.session.access_token
  const ownerId = loginData.user.id

  const { data: roles, error: rolesError } = await front
    .from('user_roles')
    .select('role, empresa_id')
    .eq('user_id', ownerId)

  if (rolesError) throw new Error(`frontend roles query failed: ${rolesError.message}`)

  const normalizedRoles = (roles || []).map((row) => String(row.role || '').toUpperCase())
  if (!normalizedRoles.includes('SYSTEM_OWNER')) {
    throw new Error(`SYSTEM_OWNER role missing in frontend session. Roles: ${JSON.stringify(normalizedRoles)}`)
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/owner-portal-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
      Origin: 'https://owner.gppis.com.br',
    },
    body: JSON.stringify({ action: 'list_companies' }),
  })

  const raw = await response.text()
  if (!response.ok) {
    throw new Error(`owner-portal-admin access failed: HTTP ${response.status} - ${raw}`)
  }

  let parsed = null
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = null
  }

  const companyCount = Array.isArray(parsed?.companies) ? parsed.companies.length : 0

  await front.auth.signOut()

  return { ownerId, companyCount }
}

async function main() {
  console.log('[1/3] Repairing owner user via admin API')
  const repaired = await ensureOwnerUser()
  console.log(JSON.stringify(repaired))

  console.log(`[2/3] Verifying frontend login with ${OWNER_EMAIL}`)
  const verification = await verifyFrontendLoginAndOwnerAccess()
  console.log(JSON.stringify(verification))

  console.log('[3/3] SUCCESS: owner frontend login and owner access are functional')
}

main().catch((error) => {
  console.error('[FAIL]', error?.message || error)
  process.exit(1)
})
