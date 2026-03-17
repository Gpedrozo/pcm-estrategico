import { supabase } from '@/integrations/supabase/client'

export async function callRpc<TResponse>(fn: string, args?: Record<string, unknown>) {
  const rpc = supabase.rpc as (name: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>
  const result = await rpc(fn, args)
  return {
    data: (result.data as TResponse | null),
    error: result.error,
  }
}
