import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { writeAuditLog } from '@/lib/audit'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SupportTicketMessage {
  id: string
  sender: 'client' | 'owner' | 'system'
  message: string
  attachments?: string[]
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
  unread_owner_messages: number
  unread_client_messages: number
  notification_email_pending: boolean
  notification_whatsapp_pending: boolean
  last_message_sender: 'client' | 'owner' | 'system' | null
  last_message_at: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const THREAD_COLUMNS = [
  'messages',
  'unread_owner_messages',
  'unread_client_messages',
  'notification_email_pending',
  'notification_whatsapp_pending',
  'last_message_sender',
  'last_message_at',
] as const

const isMissingSupportTicketColumnsError = (error: unknown): boolean => {
  const msg = String((error as { message?: string } | null)?.message ?? '').toLowerCase()
  if (!msg.includes('support_tickets')) return false
  return THREAD_COLUMNS.some((col) => msg.includes(col))
}

const FULL_SELECT =
  'id,empresa_id,user_id,subject,message,status,priority,owner_response,messages,unread_owner_messages,unread_client_messages,notification_email_pending,notification_whatsapp_pending,last_message_sender,last_message_at,created_at,updated_at'

const LEGACY_SELECT =
  'id,empresa_id,user_id,subject,message,status,priority,owner_response,created_at,updated_at'

function normalizeMessages(value: unknown): SupportTicketMessage[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item, index) => {
      const row = item as Record<string, unknown>
      const senderRaw = String(row?.sender ?? '').trim().toLowerCase()
      const sender: SupportTicketMessage['sender'] =
        senderRaw === 'owner' || senderRaw === 'system' ? senderRaw : 'client'
      const message = String(row?.message ?? '').trim()
      if (!message) return null

      return {
        id: String(row?.id ?? `${sender}-${index}`),
        sender,
        message,
        attachments: Array.isArray(row?.attachments)
          ? (row.attachments as unknown[]).map(String).filter(Boolean)
          : [],
        channel: String(row?.channel ?? 'in_app') as SupportTicketMessage['channel'],
        created_at: String(row?.created_at ?? new Date().toISOString()),
        sender_user_id: row?.sender_user_id ? String(row.sender_user_id) : null,
      } satisfies SupportTicketMessage
    })
    .filter((item): item is SupportTicketMessage => Boolean(item))
}

function buildFallbackThread(row: Record<string, unknown>): SupportTicketMessage[] {
  const msgs: SupportTicketMessage[] = []
  const clientMsg = String(row.message ?? '').trim()
  if (clientMsg) {
    msgs.push({
      id: `legacy-client-${String(row.id ?? crypto.randomUUID())}`,
      sender: 'client',
      channel: 'in_app',
      message: clientMsg,
      created_at: String(row.created_at ?? new Date().toISOString()),
      sender_user_id: row.user_id ? String(row.user_id) : null,
    })
  }
  const ownerResp = String(row.owner_response ?? '').trim()
  if (ownerResp) {
    msgs.push({
      id: `legacy-owner-${String(row.id ?? crypto.randomUUID())}`,
      sender: 'owner',
      channel: 'in_app',
      message: ownerResp,
      created_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
      sender_user_id: null,
    })
  }
  return msgs
}

function rowToTicket(row: Record<string, unknown>, hasThreadCols: boolean): SupportTicketRow {
  const parsed = normalizeMessages(row.messages)
  const fallback = buildFallbackThread(row)

  return {
    id: String(row.id ?? ''),
    empresa_id: String(row.empresa_id ?? ''),
    user_id: String(row.user_id ?? ''),
    subject: String(row.subject ?? ''),
    message: String(row.message ?? ''),
    status: String(row.status ?? 'aberto'),
    priority: row.priority ? String(row.priority) : null,
    owner_response: row.owner_response ? String(row.owner_response) : null,
    messages: parsed.length > 0 ? parsed : fallback,
    unread_owner_messages: hasThreadCols ? Number(row.unread_owner_messages ?? 0) : 0,
    unread_client_messages: hasThreadCols ? Number(row.unread_client_messages ?? 0) : 0,
    notification_email_pending: hasThreadCols ? Boolean(row.notification_email_pending) : false,
    notification_whatsapp_pending: hasThreadCols ? Boolean(row.notification_whatsapp_pending) : false,
    last_message_sender: hasThreadCols
      ? (String(row.last_message_sender ?? '') as SupportTicketRow['last_message_sender']) || null
      : null,
    last_message_at: hasThreadCols ? (row.last_message_at ? String(row.last_message_at) : null) : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useSupportTickets() {
  const { tenantId, user, isAdmin } = useAuth()

  return useQuery({
    queryKey: ['support-tickets', tenantId, user?.id, isAdmin],
    queryFn: async (): Promise<SupportTicketRow[]> => {
      if (!tenantId || !user?.id) return []

      const buildQuery = (selectClause: string) => {
        let q = supabase
          .from('support_tickets')
          .select(selectClause)
          .eq('empresa_id', tenantId)
          .order('updated_at', { ascending: false })
          .limit(500)
        if (!isAdmin) q = q.eq('user_id', user.id)
        return q
      }

      let hasThreadCols = true
      let { data, error } = await buildQuery(FULL_SELECT)

      if (error && isMissingSupportTicketColumnsError(error)) {
        hasThreadCols = false
        const legacy = await buildQuery(LEGACY_SELECT)
        data = legacy.data
        error = legacy.error
      }

      if (error) throw error
      return (data ?? []).map((ticket) => rowToTicket(ticket as Record<string, unknown>, hasThreadCols))
    },
    enabled: Boolean(tenantId && user?.id),
    refetchInterval: 30_000,
  })
}

export function useCreateSupportTicket() {
  const { tenantId, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      subject: string
      message: string
      priority: string
      attachments?: string[]
      empresaId?: string
    }) => {
      const effectiveEmpresaId = payload.empresaId ?? tenantId
      if (!effectiveEmpresaId || !user?.id) throw new Error('Sessão inválida para abrir chamado.')

      const attachments = (payload.attachments ?? []).map((s) => String(s).trim()).filter(Boolean)
      const messageWithAttachments =
        attachments.length > 0
          ? `${payload.message}\n\nAnexos:\n${attachments.map((url) => `- ${url}`).join('\n')}`
          : payload.message

      const nowIso = new Date().toISOString()

      const threadedPayload = {
        empresa_id: effectiveEmpresaId,
        user_id: user.id,
        subject: payload.subject,
        message: messageWithAttachments,
        priority: payload.priority,
        status: 'aberto',
        messages: [
          {
            id: crypto.randomUUID(),
            sender: 'client',
            message: payload.message,
            attachments,
            channel: 'in_app',
            created_at: nowIso,
            sender_user_id: user.id,
          },
        ],
        unread_owner_messages: 1,
        unread_client_messages: 0,
        notification_email_pending: true,
        notification_whatsapp_pending: true,
        last_message_sender: 'client',
        last_message_at: nowIso,
      }

      let result = await supabase.from('support_tickets').insert(threadedPayload).select('id').single()

      if (result.error && isMissingSupportTicketColumnsError(result.error)) {
        result = await supabase
          .from('support_tickets')
          .insert({
            empresa_id: effectiveEmpresaId,
            user_id: user.id,
            subject: payload.subject,
            message: messageWithAttachments,
            priority: payload.priority,
            status: 'aberto',
          })
          .select('id')
          .single()
      }

      if (result.error) throw new Error(result.error.message ?? 'Falha ao criar chamado no banco de dados.')
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
      writeAuditLog({ action: 'CREATE_SUPPORT_TICKET', table: 'support_tickets', recordId: data?.id, empresaId: tenantId, source: 'useSupportTickets' })
    },
  })
}

export function useAddSupportTicketMessage() {
  const { tenantId, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { ticketId: string; message: string; attachments?: string[] }) => {
      if (!tenantId || !user?.id) throw new Error('Sessão inválida para enviar mensagem no chamado.')
      const content = payload.message.trim()
      if (!payload.ticketId || !content) throw new Error('Ticket e mensagem são obrigatórios.')

      const attachments = (payload.attachments ?? []).map((s) => String(s).trim()).filter(Boolean)
      const contentWithAttachments =
        attachments.length > 0
          ? `${content}\n\nAnexos:\n${attachments.map((url) => `- ${url}`).join('\n')}`
          : content

      let hasThreadCols = true
      let { data: current, error: fetchErr } = await supabase
        .from('support_tickets')
        .select('id,empresa_id,user_id,status,message,messages,unread_owner_messages')
        .eq('id', payload.ticketId)
        .eq('empresa_id', tenantId)
        .single()

      if (fetchErr && isMissingSupportTicketColumnsError(fetchErr)) {
        hasThreadCols = false
        const legacy = await supabase
          .from('support_tickets')
          .select('id,empresa_id,user_id,status,message')
          .eq('id', payload.ticketId)
          .eq('empresa_id', tenantId)
          .single()
        current = legacy.data as any
        fetchErr = legacy.error
      }

      if (fetchErr || !current) throw new Error(fetchErr?.message ?? 'Chamado não encontrado.')

      const nowIso = new Date().toISOString()
      const ticket = current as Record<string, unknown>
      const prevStatus = String(ticket.status ?? 'aberto')
      const nextStatus = prevStatus === 'resolvido' ? 'em_analise' : prevStatus

      if (hasThreadCols) {
        const existingMsgs = normalizeMessages(ticket.messages)
        const newMsg: SupportTicketMessage = {
          id: crypto.randomUUID(),
          sender: 'client',
          message: content,
          attachments,
          channel: 'in_app',
          created_at: nowIso,
          sender_user_id: user.id,
        }

        const { error } = await supabase
          .from('support_tickets')
          .update({
            status: nextStatus,
            messages: [...existingMsgs, newMsg],
            unread_owner_messages: Number(ticket.unread_owner_messages ?? 0) + 1,
            last_message_sender: 'client',
            last_message_at: nowIso,
            notification_email_pending: true,
            notification_whatsapp_pending: true,
          })
          .eq('id', payload.ticketId)
          .eq('empresa_id', tenantId)

        if (error) throw error
        return
      }

      const prev = String(ticket.message ?? '').trim()
      const appended = prev
        ? `${prev}\n\n[${new Date(nowIso).toLocaleString('pt-BR')}] ${contentWithAttachments}`
        : contentWithAttachments

      const { error } = await supabase
        .from('support_tickets')
        .update({ status: nextStatus, message: appended })
        .eq('id', payload.ticketId)
        .eq('empresa_id', tenantId)

      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
      writeAuditLog({ action: 'ADD_SUPPORT_TICKET_MESSAGE', table: 'support_tickets', recordId: variables.ticketId, empresaId: tenantId, source: 'useSupportTickets' })
    },
  })
}

export function useMarkSupportMessagesReadByClient() {
  const { tenantId, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ticketId?: string) => {
      if (!tenantId || !user?.id) return

      let query = supabase
        .from('support_tickets')
        .update({
          unread_client_messages: 0,
          notification_email_pending: false,
          notification_whatsapp_pending: false,
        })
        .eq('empresa_id', tenantId)
        .gt('unread_client_messages', 0)

      if (ticketId) {
        query = query.eq('id', ticketId)
      } else {
        query = query.eq('user_id', user.id)
      }

      const { error } = await query
      if (error && !isMissingSupportTicketColumnsError(error)) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
    },
  })
}
