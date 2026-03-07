import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL || 'https://dvwsferonoczgmvfubgu.supabase.co'
const PUB = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_d0dYFE0Pp0GaM43BpDGvtw_7F9cCOXU'
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'pedrozo@gppis.com.br'
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || '@Gpp280693'

const client = createClient(URL, PUB, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  const login = await client.auth.signInWithPassword({ email: OWNER_EMAIL, password: OWNER_PASSWORD })

  if (login.error || !login.data.session?.access_token) {
    throw new Error(`Falha login owner master: ${login.error?.message || 'sem sessão'}`)
  }

  const token = login.data.session.access_token

  const response = await fetch(`${URL}/functions/v1/owner-portal-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: PUB,
      Authorization: `Bearer ${token}`,
      Origin: 'https://owner.gppis.com.br',
    },
    body: JSON.stringify({ action: 'cleanup_owner_stress_data' }),
  })

  const raw = await response.text()
  let data
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    data = { raw }
  }

  if (!response.ok) {
    throw new Error(`Falha cleanup: HTTP ${response.status} - ${JSON.stringify(data)}`)
  }

  console.log(JSON.stringify(data, null, 2))

  await client.auth.signOut()
}

main().catch((error) => {
  console.error('[CLEANUP_FAIL]', error?.message || error)
  process.exit(1)
})
