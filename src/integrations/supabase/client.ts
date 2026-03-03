import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const OWNER_HOSTNAME = 'owner.gppis.com.br'
const STABLE_PROJECT_URL = 'https://cplowhoklcegnjvwmrsk.supabase.co'
const STABLE_PROJECT_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwbG93aG9rbGNlZ25qdndtcnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MjE3NjcsImV4cCI6MjA4NDA5Nzc2N30.2aKTjv_YQuxy1QVV28DVhTWpRqdn0AxZD5rVksfXdhE'

const isTestEnvironment =
  import.meta.env.MODE === 'test' ||
  (typeof process !== 'undefined' && typeof process.env !== 'undefined' && !!process.env.VITEST)

const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_KEY)

if (!hasSupabaseEnv && !isTestEnvironment && !import.meta.env.DEV) {
  throw new Error('Supabase environment is not configured. Define VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.')
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

const isOwnerHostname = typeof window !== 'undefined' && window.location.hostname.toLowerCase() === OWNER_HOSTNAME

const shouldUseStableProjectForOwner = isOwnerHostname

const effectiveSupabaseUrl = shouldUseStableProjectForOwner ? STABLE_PROJECT_URL : SUPABASE_URL
const effectiveSupabaseKey = shouldUseStableProjectForOwner ? STABLE_PROJECT_PUBLISHABLE_KEY : SUPABASE_KEY

const fallbackUrl = isTestEnvironment ? 'http://127.0.0.1:54321' : ''
const fallbackKey = isTestEnvironment ? 'test-key' : ''

export const supabase = createClient<Database>(effectiveSupabaseUrl || fallbackUrl, effectiveSupabaseKey || fallbackKey, {
  auth: {
    storage: authStorage,
    persistSession: !isTestEnvironment,
    autoRefreshToken: !isTestEnvironment,
  },
})
