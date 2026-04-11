import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL; if (!URL) throw new Error('SUPABASE_URL env var required')
const PUB = process.env.SUPABASE_PUBLISHABLE_KEY; if (!PUB) throw new Error('SUPABASE_PUBLISHABLE_KEY env var required')
const EMAIL = process.argv[2]; if (!EMAIL) throw new Error('Usage: node script.mjs <email> <password>')
const PASSWORD = process.argv[3]; if (!PASSWORD) throw new Error('Usage: node script.mjs <email> <password>')

const supabase = createClient(URL, PUB, { auth: { persistSession: false, autoRefreshToken: false } })

async function main() {
  const login = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (login.error || !login.data.user) throw new Error(login.error?.message || 'login failed')

  const user = login.data.user
  const userId = user.id

  const roles = await supabase.from('user_roles').select('role,empresa_id').eq('user_id', userId)
  const profile = await supabase.from('profiles').select('empresa_id,force_password_change,nome').eq('id', userId).maybeSingle()
  const baseConfig = await supabase.from('empresa_config').select('empresa_id,dominio_custom').eq('dominio_custom', 'gppis.com.br').maybeSingle()

  let company = null
  const profileEmpresa = profile.data?.empresa_id || null
  if (profileEmpresa) {
    const companyQuery = await supabase.from('empresas').select('id,nome,slug,status').eq('id', profileEmpresa).maybeSingle()
    company = companyQuery.data || null
  }

  console.log(JSON.stringify({
    userId,
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
    roles: roles.data,
    rolesError: roles.error,
    profile: profile.data,
    profileError: profile.error,
    baseDomainConfig: baseConfig.data,
    baseDomainConfigError: baseConfig.error,
    profileCompany: company,
  }, null, 2))

  await supabase.auth.signOut().catch(() => null)
}

main().catch((e) => {
  console.error('[DEBUG_USER_TENANT_MEMBERSHIP_FAIL]', e?.message || e)
  process.exit(1)
})
