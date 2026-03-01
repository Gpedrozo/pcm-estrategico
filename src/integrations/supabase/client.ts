import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { resolveSupabaseConfig } from './config'

const { url: SUPABASE_URL, key: SUPABASE_KEY } = resolveSupabaseConfig()

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
})
