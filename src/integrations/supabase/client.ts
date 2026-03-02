import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://dvwsferonoczgmvfubgu.supabase.co"

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_d0dYFE0Pp0GaM43BpDGvtw_7F9cCOXU"

const isTestEnvironment =
  import.meta.env.MODE === 'test' ||
  (typeof process !== 'undefined' && typeof process.env !== 'undefined' && !!process.env.VITEST)

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

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: authStorage,
    persistSession: !isTestEnvironment,
    autoRefreshToken: !isTestEnvironment,
  },
})
