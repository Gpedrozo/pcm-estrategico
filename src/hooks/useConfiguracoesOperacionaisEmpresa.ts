import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { writeAuditLog } from '@/lib/audit'

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

      // If tenant.operational_profile exists, return it
      if (data?.valor) {
        return {
          id: data.id ?? null,
          valor: data.valor as ConfiguracoesOperacionaisEmpresa,
        }
      }

      // Fallback: try to bootstrap from owner.company_profile (for companies created before this sync)
      const { data: ownerProfile } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('empresa_id', tenantId)
        .eq('chave', 'owner.company_profile')
        .maybeSingle()

      if (ownerProfile?.valor) {
        const op = ownerProfile.valor as Record<string, unknown>
        const bootstrapped: ConfiguracoesOperacionaisEmpresa = {
          endereco: (op.endereco as string) ?? undefined,
          telefone: (op.telefone as string) ?? undefined,
          email: (op.email as string) ?? undefined,
          responsavel_nome: (op.responsavel as string) ?? undefined,
        }
        return {
          id: data?.id ?? null,
          valor: bootstrapped,
        }
      }

      return {
        id: data?.id ?? null,
        valor: null,
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
      writeAuditLog({ action: 'UPDATE_CONFIG_OPERACIONAL_EMPRESA', table: 'configuracoes_sistema', empresaId: tenantId, source: 'useConfiguracoesOperacionaisEmpresa' })
    },
  })
}
