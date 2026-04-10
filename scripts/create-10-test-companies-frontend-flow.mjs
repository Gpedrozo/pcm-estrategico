import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY/VITE_SUPABASE_ANON_KEY in environment')
}

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'pedrozo@gppis.com.br'
const OWNER_PASSWORD = process.env.OWNER_PASSWORD
if (!OWNER_PASSWORD) throw new Error('OWNER_PASSWORD env var required')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const basePrefix = `zz-teste-frontend-${dateTag}`

function slugify(input) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 48)
}

async function callOwnerAdmin(payload, accessToken) {
  const { data, error } = await supabase.functions.invoke('owner-portal-admin', {
    body: payload,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Origin: 'https://owner.gppis.com.br',
    },
  })

  if (error) {
    let details = ''
    try {
      if (typeof error?.context?.text === 'function') {
        details = await error.context.text()
      }
    } catch {
    }
    const msg = details || error?.message || JSON.stringify(error)
    throw new Error(msg)
  }

  return data
}

async function main() {
  console.log('[1/4] Login Owner (fluxo frontend)')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
  })

  if (signInError || !signInData?.session?.access_token) {
    throw new Error(`Falha login owner: ${signInError?.message || 'sem token'}`)
  }

  const token = signInData.session.access_token

  console.log('[2/4] Criando 10 empresas via action create_company')
  const created = []

  for (let i = 1; i <= 10; i += 1) {
    const suffix = `${String(i).padStart(2, '0')}-${randomUUID().slice(0, 6)}`
    const nome = `Empresa Teste Frontend ${dateTag} ${String(i).padStart(2, '0')}`
    const slug = slugify(`${basePrefix}-${suffix}`)
    const masterEmail = `master.${slug}@gppis-teste.local`

    const payload = {
      action: 'create_company',
      company: {
        nome,
        slug,
        razao_social: `${nome} LTDA`,
        nome_fantasia: nome,
        cnpj: `0000000000${String(i).padStart(2, '0')}`,
        endereco: 'Endereço de Teste',
        telefone: '(11) 99999-0000',
        email: `contato+${slug}@gppis-teste.local`,
        responsavel: 'Owner Test Bot',
        segmento: 'Teste Automatizado',
        status: 'active',
      },
      user: {
        nome: `Master ${String(i).padStart(2, '0')}`,
        email: masterEmail,
        password: `Tmp@${dateTag}${String(i).padStart(2, '0')}`,
        role: 'ADMIN',
      },
    }

    const result = await callOwnerAdmin(payload, token)
    created.push({
      index: i,
      nome,
      slug,
      empresa_id: result?.empresa?.id || result?.company?.id || null,
      master_email: masterEmail,
      warning: result?.warning || null,
    })
    console.log(`  - [OK ${i}/10] ${nome} (${slug})`)
  }

  console.log('[3/4] Validando presença das 10 empresas no list_companies')
  const listed = await callOwnerAdmin({ action: 'list_companies' }, token)
  const companies = Array.isArray(listed?.companies) ? listed.companies : []
  const found = created.filter((item) => companies.some((c) => c?.slug === item.slug))

  if (found.length !== 10) {
    throw new Error(`Validação falhou: apenas ${found.length}/10 encontradas no list_companies`) 
  }

  console.log('[4/4] Sucesso: 10/10 empresas criadas e validadas via fluxo frontend')
  console.log(JSON.stringify(created, null, 2))

  await supabase.auth.signOut()
}

main().catch((err) => {
  console.error('[ERRO]', err?.message || err)
  process.exit(1)
})
