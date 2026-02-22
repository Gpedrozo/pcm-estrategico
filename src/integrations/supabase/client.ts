import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://dvwsferonoczgmvfubgu.supabase.co"

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_d0dYFE0Pp0GaM43BpDGvtw_7F9cCOXU"

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
})
