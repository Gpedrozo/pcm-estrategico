export const resolveSupabaseConfig = (env: Partial<ImportMetaEnv> = import.meta.env) => {
  const url = env.VITE_SUPABASE_URL?.trim()
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!url || !key) {
    throw new Error('Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.')
  }

  return { url, key }
}
