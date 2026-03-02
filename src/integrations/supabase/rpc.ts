import { supabase } from '@/integrations/supabase/client'

type RpcExecutor = {
  rpc: <TResponse>(fn: string, args?: Record<string, unknown>) => Promise<{ data: TResponse | null; error: Error | null }>
}

const rpcExecutor = supabase as unknown as RpcExecutor

export async function callRpc<TResponse>(fn: string, args?: Record<string, unknown>) {
  return rpcExecutor.rpc<TResponse>(fn, args)
}
