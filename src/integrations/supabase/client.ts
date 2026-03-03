import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || SUPABASE_ANON_KEY

const OWNER_DOMAIN = (import.meta.env.VITE_OWNER_DOMAIN || 'owner.gppis.com.br').toLowerCase()
const OWNER_SUPABASE_URL = import.meta.env.VITE_OWNER_SUPABASE_URL
const OWNER_SUPABASE_ANON_KEY = import.meta.env.VITE_OWNER_SUPABASE_ANON_KEY
const OWNER_SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_OWNER_SUPABASE_PUBLISHABLE_KEY || OWNER_SUPABASE_ANON_KEY

const SUPABASE_KEY = SUPABASE_PUBLISHABLE_KEY

const isTestEnvironment =
  import.meta.env.MODE === 'test' ||
  (typeof process !== 'undefined' && typeof process.env !== 'undefined' && !!process.env.VITEST)

const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_KEY)

const currentHostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
const isOwnerHostname = currentHostname === OWNER_DOMAIN

const hasOwnerSupabaseEnv = Boolean(OWNER_SUPABASE_URL && OWNER_SUPABASE_PUBLISHABLE_KEY)

const resolvedSupabaseUrl = isOwnerHostname && hasOwnerSupabaseEnv ? OWNER_SUPABASE_URL : SUPABASE_URL
const resolvedSupabaseKey = isOwnerHostname && hasOwnerSupabaseEnv ? OWNER_SUPABASE_PUBLISHABLE_KEY : SUPABASE_KEY

if (!hasSupabaseEnv && !isTestEnvironment && !import.meta.env.DEV) {
  throw new Error(
    'Supabase environment is not configured. Define VITE_SUPABASE_URL with VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY.'
  )
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

export const supabase = createClient<Database>(resolvedSupabaseUrl || fallbackUrl, resolvedSupabaseKey || fallbackKey, {
  auth: {
    storage: authStorage,
    persistSession: !isTestEnvironment,
    autoRefreshToken: !isTestEnvironment,
  },
})
