import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export interface SupportTicketRow {
  id: string
  empresa_id: string
  user_id: string
  subject: string
  message: string
  status: string
  priority: string | null
  owner_response: string | null
  created_at: string
  updated_at: string
}

export function useSupportTickets() {
  const { tenantId, user, isAdmin } = useAuth()

  return useQuery({
    queryKey: ['support-tickets', tenantId, user?.id, isAdmin],
    queryFn: async () => {
      if (!tenantId || !user?.id) return []

      let query = supabase
        .from('support_tickets')
        .select('id,empresa_id,user_id,subject,message,status,priority,owner_response,created_at,updated_at')
        .eq('empresa_id', tenantId)
        .order('updated_at', { ascending: false })

      if (!isAdmin) {
        query = query.eq('user_id', user.id)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as SupportTicketRow[]
    },
    enabled: Boolean(tenantId && user?.id),
    staleTime: 20_000,
  })
}

export function useCreateSupportTicket() {
  const { tenantId, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { subject: string; message: string; priority: string }) => {
      if (!tenantId || !user?.id) {
        throw new Error('Sessão inválida para abrir chamado.')
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          empresa_id: tenantId,
          user_id: user.id,
          subject: payload.subject,
          message: payload.message,
          priority: payload.priority,
          status: 'aberto',
        })
        .select('id')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
    },
  })
}
