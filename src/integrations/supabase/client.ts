import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || SUPABASE_ANON_KEY

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID

const SUPABASE_KEY = SUPABASE_PUBLISHABLE_KEY

const isTestEnvironment =
  import.meta.env.MODE === 'test' ||
  (typeof process !== 'undefined' && typeof process.env !== 'undefined' && !!process.env.VITEST)

const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_KEY)

if (!hasSupabaseEnv && !isTestEnvironment && !import.meta.env.DEV) {
  throw new Error(
    'Supabase environment is not configured. Define VITE_SUPABASE_URL with VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY.'
  )
}

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

const projectRefFromUrl = extractProjectRefFromUrl(SUPABASE_URL)
const projectRefFromKey = (decodeJwtPayload(SUPABASE_KEY)?.ref as string | undefined) || null
const normalizedProjectId = SUPABASE_PROJECT_ID?.trim() || null

if (!isTestEnvironment && hasSupabaseEnv) {
  if (projectRefFromUrl && projectRefFromKey && projectRefFromUrl !== projectRefFromKey) {
    throw new Error('Supabase URL and publishable key are from different projects. Use a single Supabase project for all system databases.')
  }

  if (normalizedProjectId && projectRefFromUrl && normalizedProjectId !== projectRefFromUrl) {
    throw new Error('VITE_SUPABASE_PROJECT_ID does not match VITE_SUPABASE_URL. Keep all data in one Supabase project.')
  }

  if (normalizedProjectId && projectRefFromKey && normalizedProjectId !== projectRefFromKey) {
    throw new Error('VITE_SUPABASE_PROJECT_ID does not match VITE_SUPABASE_PUBLISHABLE_KEY. Keep all data in one Supabase project.')
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

export const supabase = createClient<Database>(SUPABASE_URL || fallbackUrl, SUPABASE_KEY || fallbackKey, {
  auth: {
    storage: authStorage,
    persistSession: !isTestEnvironment,
    autoRefreshToken: !isTestEnvironment,
  },
})
