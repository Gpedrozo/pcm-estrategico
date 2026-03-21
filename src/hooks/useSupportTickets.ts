import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export interface SupportTicketMessage {
  id: string
  sender: 'client' | 'owner' | 'system'
  message: string
  channel?: 'in_app' | 'email' | 'whatsapp' | 'system'
  created_at: string
  sender_user_id?: string | null
}

export interface SupportTicketRow {
  id: string
  empresa_id: string
  user_id: string
  subject: string
  message: string
  status: string
  priority: string | null
  owner_response: string | null
  messages: SupportTicketMessage[] | null
  unread_owner_messages: number | null
  unread_client_messages: number | null
  notification_email_pending: boolean | null
  notification_whatsapp_pending: boolean | null
  last_message_sender: 'client' | 'owner' | 'system' | null
  last_message_at: string | null
  created_at: string
  updated_at: string
}

const normalizeMessages = (value: unknown): SupportTicketMessage[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((item, index) => {
      const row = item as Record<string, unknown>
      const senderRaw = String(row?.sender ?? '').trim().toLowerCase()
      const sender = senderRaw === 'owner' || senderRaw === 'system' ? senderRaw : 'client'
      const message = String(row?.message ?? '').trim()
      if (!message) return null

      return {
        id: String(row?.id ?? `${sender}-${index}`),
        sender,
        channel: String(row?.channel ?? 'in_app') as SupportTicketMessage['channel'],
        message,
        created_at: String(row?.created_at ?? new Date().toISOString()),
        sender_user_id: row?.sender_user_id ? String(row.sender_user_id) : null,
      } satisfies SupportTicketMessage
    })
    .filter((item): item is SupportTicketMessage => Boolean(item))
}

export function useSupportTickets() {
  const { tenantId, user, isAdmin } = useAuth()

  return useQuery({
    queryKey: ['support-tickets', tenantId, user?.id, isAdmin],
    queryFn: async () => {
      if (!tenantId || !user?.id) return []

      let query = supabase
        .from('support_tickets')
        .select('id,empresa_id,user_id,subject,message,status,priority,owner_response,messages,unread_owner_messages,unread_client_messages,notification_email_pending,notification_whatsapp_pending,last_message_sender,last_message_at,created_at,updated_at')
        .eq('empresa_id', tenantId)
        .order('updated_at', { ascending: false })

      if (!isAdmin) {
        query = query.eq('user_id', user.id)
      }

      const { data, error } = await query
      if (error) throw error

      return (data ?? []).map((ticket) => ({
        ...(ticket as SupportTicketRow),
        messages: normalizeMessages((ticket as Record<string, unknown>).messages),
      })) as SupportTicketRow[]
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
          messages: [
            {
              id: crypto.randomUUID(),
              sender: 'client',
              message: payload.message,
              channel: 'in_app',
              created_at: new Date().toISOString(),
              sender_user_id: user.id,
            },
          ],
          unread_owner_messages: 1,
          unread_client_messages: 0,
          notification_email_pending: true,
          notification_whatsapp_pending: true,
          last_message_sender: 'client',
          last_message_at: new Date().toISOString(),
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

export function useAddSupportTicketMessage() {
  const { tenantId, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { ticketId: string; message: string }) => {
      const content = payload.message.trim()
      if (!tenantId || !user?.id) {
        throw new Error('Sessão inválida para enviar mensagem no chamado.')
      }
      if (!payload.ticketId || !content) {
        throw new Error('Ticket e mensagem são obrigatórios.')
      }

      const { data: current, error: currentError } = await supabase
        .from('support_tickets')
        .select('id,empresa_id,user_id,status,messages,unread_owner_messages')
        .eq('id', payload.ticketId)
        .eq('empresa_id', tenantId)
        .single()

      if (currentError || !current) {
        throw new Error(currentError?.message ?? 'Chamado não encontrado.')
      }

      const currentOwnerUnread = Number((current as any).unread_owner_messages ?? 0)
      const existingMessages = normalizeMessages((current as any).messages)
      const nowIso = new Date().toISOString()
      const nextMessage: SupportTicketMessage = {
        id: crypto.randomUUID(),
        sender: 'client',
        message: content,
        channel: 'in_app',
        created_at: nowIso,
        sender_user_id: user.id,
      }

      const nextStatus = String((current as any).status ?? 'aberto') === 'resolvido'
        ? 'em_analise'
        : String((current as any).status ?? 'aberto')

      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: nextStatus,
          messages: [...existingMessages, nextMessage],
          unread_owner_messages: currentOwnerUnread + 1,
          last_message_sender: 'client',
          last_message_at: nowIso,
          notification_email_pending: true,
          notification_whatsapp_pending: true,
        })
        .eq('id', payload.ticketId)
        .eq('empresa_id', tenantId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
    },
  })
}

export function useMarkSupportMessagesReadByClient() {
  const { tenantId, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!tenantId || !user?.id) return

      const { error } = await supabase
        .from('support_tickets')
        .update({
          unread_client_messages: 0,
          notification_email_pending: false,
          notification_whatsapp_pending: false,
        })
        .eq('empresa_id', tenantId)
        .eq('user_id', user.id)
        .gt('unread_client_messages', 0)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
    },
  })
}
