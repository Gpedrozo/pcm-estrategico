import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

const CONFIG_KEY = 'tenant.operational_profile'

export interface ConfiguracoesOperacionaisEmpresa {
  endereco?: string
  telefone?: string
  email?: string
  site?: string
  responsavel_nome?: string
  responsavel_cargo?: string
  observacoes?: string
}

export function useConfiguracoesOperacionaisEmpresa() {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: ['tenant-operational-settings', tenantId],
    queryFn: async () => {
      if (!tenantId) return null

      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('id,valor')
        .eq('empresa_id', tenantId)
        .eq('chave', CONFIG_KEY)
        .maybeSingle()

      if (error) throw error

      return {
        id: data?.id ?? null,
        valor: (data?.valor as ConfiguracoesOperacionaisEmpresa | null) ?? null,
      }
    },
    enabled: Boolean(tenantId),
  })
}

export function useSalvarConfiguracoesOperacionaisEmpresa() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (valor: ConfiguracoesOperacionaisEmpresa) => {
      if (!tenantId) throw new Error('Tenant não identificado.')

      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .upsert(
          {
            empresa_id: tenantId,
            chave: CONFIG_KEY,
            valor,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'empresa_id,chave' },
        )
        .select('id,valor')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-operational-settings', tenantId] })
    },
  })
}
