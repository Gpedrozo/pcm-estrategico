import { supabase } from '@/integrations/supabase/client'

export async function callRpc<TResponse>(fn: string, args?: Record<string, unknown>) {
  const result = await supabase.rpc(fn, args)
  return {
    data: (result.data as TResponse | null),
    error: result.error,
  }
}
