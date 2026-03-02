import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface OwnerMetrics {
  total_empresas: number
  empresas_ativas: number
  empresas_suspensas: number
  total_usuarios: number
  mrr: number
  receita_anual_estimada: number
  crescimento_mensal: number
  empresas_trial: number
  inadimplentes: number
}

export interface OwnerCompany {
  id: string
  nome: string
  status: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export function useOwnerDashboardMetrics() {
  return useQuery({
    queryKey: ['owner-dashboard-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('owner_dashboard_metrics')
      if (error) throw error
      const metrics = Array.isArray(data) ? data[0] : null
      return (metrics ?? null) as OwnerMetrics | null
    },
    staleTime: 30_000,
  })
}

export function useOwnerCompanies(page = 1, pageSize = 25) {
  return useQuery({
    queryKey: ['owner-companies', page, pageSize],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('owner_list_companies', {
        p_page: page,
        p_page_size: pageSize,
      })

      if (error) throw error
      return (data ?? []) as OwnerCompany[]
    },
    staleTime: 30_000,
  })
}
