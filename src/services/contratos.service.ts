import { supabase } from '@/integrations/supabase/client'
import { contratoSchema } from '@/schemas/contrato.schema'

export async function listarContratos() {
  const { data, error } = await supabase
    .from('contratos')
    .select('*, fornecedor(*)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return data
}

export async function criarContrato(payload: unknown) {
  const validated = contratoSchema.parse(payload)

  const { data, error } = await supabase
    .from('contratos')
    .insert(validated)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}
