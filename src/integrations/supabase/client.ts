import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { isOwnerDomain } from '@/lib/security'

const extractProjectRefFromUrl = (url?: string) => {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.hostname.split('.')[0] || null
  } catch {
    return null
  }
}

const decodeJwtPayload = (token?: string) => {
  if (!token) return null
  const tokenParts = token.split('.')
  if (tokenParts.length < 2) return null
  try {
    const base64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const decoded = atob(padded)
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }
}

const isOwnerRuntime = typeof window !== 'undefined' && isOwnerDomain(window.location.hostname)

const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const DEFAULT_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_ANON_KEY

const OWNER_SUPABASE_URL = import.meta.env.VITE_OWNER_SUPABASE_URL
const OWNER_SUPABASE_ANON_KEY = import.meta.env.VITE_OWNER_SUPABASE_ANON_KEY
const OWNER_SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_OWNER_SUPABASE_PUBLISHABLE_KEY || OWNER_SUPABASE_ANON_KEY
const OWNER_SUPABASE_MULTI_PROJECT_ENABLED = ['1', 'true', 'yes', 'on'].includes(
  String(import.meta.env.VITE_OWNER_SUPABASE_MULTI_PROJECT ?? '').trim().toLowerCase(),
)

const defaultProjectRef =
  extractProjectRefFromUrl(DEFAULT_SUPABASE_URL) ||
  ((decodeJwtPayload(DEFAULT_SUPABASE_PUBLISHABLE_KEY)?.ref as string | undefined) ?? null)

const ownerProjectRef =
  extractProjectRefFromUrl(OWNER_SUPABASE_URL) ||
  ((decodeJwtPayload(OWNER_SUPABASE_PUBLISHABLE_KEY)?.ref as string | undefined) ?? null)

const ownerConfigExists = Boolean(OWNER_SUPABASE_URL && OWNER_SUPABASE_PUBLISHABLE_KEY)
const ownerProjectMismatch = Boolean(ownerProjectRef && defaultProjectRef && ownerProjectRef !== defaultProjectRef)

const canUseOwnerSupabaseConfig =
  isOwnerRuntime &&
  ownerConfigExists &&
  (!ownerProjectMismatch || OWNER_SUPABASE_MULTI_PROJECT_ENABLED)

const SUPABASE_URL = canUseOwnerSupabaseConfig ? OWNER_SUPABASE_URL : DEFAULT_SUPABASE_URL
const SUPABASE_KEY = canUseOwnerSupabaseConfig ? OWNER_SUPABASE_PUBLISHABLE_KEY : DEFAULT_SUPABASE_PUBLISHABLE_KEY

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID

const isTestEnvironment =
  import.meta.env.MODE === 'test' ||
  (typeof process !== 'undefined' && typeof process.env !== 'undefined' && !!process.env.VITEST)

const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_KEY)

if (!hasSupabaseEnv && !isTestEnvironment && !import.meta.env.DEV) {
  console.error(
    '[supabase-client] Ambiente Supabase nao configurado. A aplicacao sera inicializada em modo de seguranca ate as variaveis VITE_SUPABASE_* serem definidas.'
  )
}

if (!isTestEnvironment && isOwnerRuntime && ownerConfigExists && ownerProjectMismatch) {
  if (OWNER_SUPABASE_MULTI_PROJECT_ENABLED) {
    console.warn(
      '[owner-auth] VITE_OWNER_SUPABASE_* aponta para projeto diferente do tenant runtime. Modo multi-projeto ativo para owner por opt-in.'
    )
  } else {
    console.warn(
      '[owner-auth] VITE_OWNER_SUPABASE_* aponta para projeto diferente do tenant runtime e sera ignorado para evitar conexao dupla. Defina VITE_OWNER_SUPABASE_MULTI_PROJECT=true para habilitar multi-projeto conscientemente.'
    )
  }
}

const projectRefFromUrl = extractProjectRefFromUrl(SUPABASE_URL)
const projectRefFromKey = (decodeJwtPayload(SUPABASE_KEY)?.ref as string | undefined) || null
const normalizedProjectId = SUPABASE_PROJECT_ID?.trim() || null

if (!isTestEnvironment && hasSupabaseEnv) {
  if (projectRefFromUrl && projectRefFromKey && projectRefFromUrl !== projectRefFromKey) {
    console.error('[supabase-client] VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY apontam para projetos diferentes.')
  }

  if (normalizedProjectId && projectRefFromUrl && normalizedProjectId !== projectRefFromUrl) {
    console.error('[supabase-client] VITE_SUPABASE_PROJECT_ID diverge de VITE_SUPABASE_URL.')
  }

  if (normalizedProjectId && projectRefFromKey && normalizedProjectId !== projectRefFromKey) {
    console.error('[supabase-client] VITE_SUPABASE_PROJECT_ID diverge de VITE_SUPABASE_PUBLISHABLE_KEY.')
  }
}

const memoryStorage = (() => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
})()

const hasLocalStorageApi =
  typeof window !== 'undefined' &&
  typeof window.localStorage !== 'undefined' &&
  typeof window.localStorage.getItem === 'function' &&
  typeof window.localStorage.setItem === 'function' &&
  typeof window.localStorage.removeItem === 'function'

const authStorage = hasLocalStorageApi ? window.localStorage : memoryStorage

const fallbackUrl = isTestEnvironment ? 'http://127.0.0.1:54321' : ''
const fallbackKey = isTestEnvironment ? 'test-key' : ''

if (!isTestEnvironment && (!SUPABASE_URL || !SUPABASE_KEY)) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in production/development.');
}

export const supabase = createClient<Database>(SUPABASE_URL || fallbackUrl, SUPABASE_KEY || fallbackKey, {
  auth: {
    storage: authStorage,
    persistSession: !isTestEnvironment,
    autoRefreshToken: !isTestEnvironment,
  },
})
