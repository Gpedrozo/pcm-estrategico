import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL || 'https://dvwsferonoczgmvfubgu.supabase.co'
const PUB = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_d0dYFE0Pp0GaM43BpDGvtw_7F9cCOXU'

const client = createClient(URL, PUB, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function testOwnerLogin() {
  const login = await client.auth.signInWithPassword({
    email: 'pedrozo@gppis.com.br',
    password: process.env.OWNER_PASSWORD,
  })

  if (login.error || !login.data.session?.access_token || !login.data.user?.id) {
    throw new Error(`OWNER login falhou: ${login.error?.message || 'sem sessão'}`)
  }

  const roles = await client
    .from('user_roles')
    .select('role,empresa_id')
    .eq('user_id', login.data.user.id)

  if (roles.error) {
    throw new Error(`Leitura de roles no frontend falhou: ${roles.error.message}`)
  }

  const hasOwner = (roles.data || []).some((item) => String(item.role).toUpperCase() === 'SYSTEM_OWNER')
  if (!hasOwner) {
    throw new Error(`Usuário logou mas sem SYSTEM_OWNER. Roles: ${JSON.stringify(roles.data || [])}`)
  }

  const response = await fetch(`${URL}/functions/v1/owner-portal-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: PUB,
      Authorization: `Bearer ${login.data.session.access_token}`,
      Origin: 'https://owner.gppis.com.br',
    },
    body: JSON.stringify({ action: 'list_companies' }),
  })

  const raw = await response.text()
  if (!response.ok) {
    throw new Error(`Owner endpoint falhou: HTTP ${response.status} - ${raw}`)
  }

  await client.auth.signOut()

  return {
    ownerUserId: login.data.user.id,
    ownerRoles: roles.data || [],
    ownerEndpointStatus: response.status,
  }
}

async function testTenantDomainLookup() {
  const lookup = await client
    .from('empresa_config')
    .select('empresa_id,dominio_custom')
    .not('dominio_custom', 'is', null)
    .limit(1)
    .maybeSingle()

  if (lookup.error) {
    throw new Error(`Domain lookup falhou: ${lookup.error.message}`)
  }

  if (!lookup.data?.dominio_custom) {
    return {
      dominio_custom: null,
      empresa_id: null,
      note: 'Nenhum dominio_custom configurado. Dominio base deve operar via redirect por slug.',
    }
  }

  return lookup.data
}

async function main() {
  const owner = await testOwnerLogin()
  const domain = await testTenantDomainLookup()

  console.log(JSON.stringify({
    ok: true,
    owner,
    domain,
    timestamp: new Date().toISOString(),
  }, null, 2))
}

main().catch((err) => {
  console.error('[LOGIN_SMOKE_FAIL]', err?.message || err)
  process.exit(1)
})
