import { supabase } from '@/integrations/supabase/client'

export interface PlatformContract {
  id: string
  empresa_id: string
  subscription_id: string | null
  plan_id: string | null
  content: string
  generated_at: string
  starts_at: string | null
  ends_at: string | null
  amount: number | null
  payment_method: string | null
  version: number
  status: string
  signed_at: string | null
  signed_by: string | null
  created_at: string
  updated_at: string
  // joined
  plans?: { id: string; name: string; code: string } | null
}

/**
 * Busca o contrato de serviço PCM Estratégico da empresa do usuário logado.
 * A RLS contracts_tenant_select (can_access_empresa) garante isolamento.
 * A tabela "contracts" não está no types.ts gerado, por isso o cast "as never".
 */
export async function getMyContract(): Promise<PlatformContract | null> {
  const { data, error } = await supabase
    .from('contracts' as never)
    .select('*, plans(id,name,code)')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle() as unknown as { data: PlatformContract | null; error: { message: string } | null }

  if (error) throw new Error(error.message)
  return data ?? null
}

/**
 * Registra a assinatura digital do contrato via RPC SECURITY DEFINER.
 * Valida empresa_id e que o contrato ainda não foi assinado no banco.
 */
export async function signMyContract(contractId: string): Promise<void> {
  const { error } = await supabase.rpc('sign_my_contract', {
    p_contract_id: contractId,
  } as never)

  if (error) throw new Error(error.message)
}
