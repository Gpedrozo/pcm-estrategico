// Supabase client configuration
// Pode usar tanto variáveis de ambiente quanto fallback direto

import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://dvwsferonoczgmvfubgu.supabase.co"

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_d0dYFE0Pp0GaM43BpDGvtw_7F9cCOXU"

// Verificação para evitar erro silencioso
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Supabase environment variables are missing.")
}

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
