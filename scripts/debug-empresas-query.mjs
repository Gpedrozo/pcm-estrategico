import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL; if (!URL) throw new Error('SUPABASE_URL env var required')
const PUB = process.env.SUPABASE_PUBLISHABLE_KEY; if (!PUB) throw new Error('SUPABASE_PUBLISHABLE_KEY env var required')
const EMAIL = process.env.OWNER_EMAIL; if (!EMAIL) throw new Error('OWNER_EMAIL env var required')
const PASSWORD = process.env.OWNER_PASSWORD
if (!PASSWORD) throw new Error('OWNER_PASSWORD env var required')
const EMPRESA_ID = process.argv[2] || 'c8a7bfeb-ffd3-41c6-b6e7-e144b09b0b29'
const PROJECTION = process.argv[3] || 'id,nome,ativo,slug'

const client = createClient(URL, PUB, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  const login = await client.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (login.error) throw login.error

  const q = await client
    .from('empresas')
    .select(PROJECTION)
    .eq('id', EMPRESA_ID)
    .maybeSingle()

  console.log(JSON.stringify({
    empresaId: EMPRESA_ID,
    projection: PROJECTION,
    data: q.data,
    error: q.error,
  }, null, 2))

  await client.auth.signOut().catch(() => null)
}

main().catch((e) => {
  console.error('[DEBUG_EMPRESAS_QUERY_FAIL]', e?.message || e)
  process.exit(1)
})
