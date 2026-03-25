const fs = require('fs');
const path = require('path');

function patch(file, oldStr, newStr, label) {
  const full = path.join(__dirname, file);
  let content = fs.readFileSync(full, 'utf8');
  if (!content.includes(oldStr)) {
    console.log(`[SKIP] ${label} - pattern not found in ${file}`);
    return false;
  }
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(full, content, 'utf8');
  console.log(`[OK]   ${label}`);
  return true;
}

// 1. useSupportTickets.ts - add refetchInterval
patch(
  'src/hooks/useSupportTickets.ts',
  `enabled: Boolean(tenantId && user?.id),\n    staleTime: 20_000,\n  })`,
  `enabled: Boolean(tenantId && user?.id),\n    staleTime: 15_000,\n    refetchInterval: 15_000,\n  })`,
  'Hook: add refetchInterval'
);

// 2. useSupportTickets.ts - fix mark-read to per-ticket
patch(
  'src/hooks/useSupportTickets.ts',
  `export function useMarkSupportMessagesReadByClient() {
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

      if (error && !isMissingSupportTicketColumnsError(error)) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
    },
  })
}`,
  `export function useMarkSupportMessagesReadByClient() {
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
}`,
  'Hook: per-ticket mark-read'
);

// 3. Suporte.tsx - fix mark-read and scroll
patch(
  'src/pages/Suporte.tsx',
  `const unreadClientTotal = useMemo(
    () => (tickets ?? []).reduce((acc, ticket) => acc + Number(ticket.unread_client_messages ?? 0), 0),
    [tickets],
  )

  useEffect(() => {
    if (unreadClientTotal <= 0 || markMessagesRead.isPending) return
    markMessagesRead.mutate()
  }, [markMessagesRead, unreadClientTotal])

  const selectedTicket = useMemo(
    () => (tickets ?? []).find((t) => t.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId],
  )

  const threadMessages = useMemo(() => {
    if (!selectedTicket) return []
    return selectedTicket.messages ?? []
  }, [selectedTicket])

  useEffect(() => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [threadMessages.length])`,
  `const unreadClientTotal = useMemo(
    () => (tickets ?? []).reduce((acc, ticket) => acc + Number(ticket.unread_client_messages ?? 0), 0),
    [tickets],
  )

  const selectedTicket = useMemo(
    () => (tickets ?? []).find((t) => t.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId],
  )

  // Mark read per-ticket when selecting a ticket with unread messages
  const handleSelectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId)
    const ticket = (tickets ?? []).find((t) => t.id === ticketId)
    if (ticket && Number(ticket.unread_client_messages ?? 0) > 0 && !markMessagesRead.isPending) {
      markMessagesRead.mutate(ticketId)
    }
  }

  const threadMessages = useMemo(() => {
    if (!selectedTicket) return []
    return selectedTicket.messages ?? []
  }, [selectedTicket])

  // Scroll to bottom when messages change or ticket switches
  useEffect(() => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [threadMessages.length, selectedTicketId])`,
  'Suporte: per-ticket mark-read + scroll fix'
);

// 4. Suporte.tsx - fix click handler
patch(
  'src/pages/Suporte.tsx',
  `onClick={() => setSelectedTicketId(ticket.id)}`,
  `onClick={() => handleSelectTicket(ticket.id)}`,
  'Suporte: click handler'
);

// 5. useOwner2Portal.ts - add refetchInterval
patch(
  'src/hooks/useOwner2Portal.ts',
  `export function useOwner2Tickets(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.tickets,
    queryFn: async () => ({ tickets: await listSupportTickets() }),
    enabled,
    retry: 0,
  })
}`,
  `export function useOwner2Tickets(enabled = true) {
  return useQuery({
    queryKey: owner2Keys.tickets,
    queryFn: async () => ({ tickets: await listSupportTickets() }),
    enabled,
    staleTime: 15_000,
    refetchInterval: 15_000,
    retry: 0,
  })
}`,
  'Owner2 hook: add refetchInterval'
);

// 6. Owner2.tsx - add useRef import
patch(
  'src/pages/Owner2.tsx',
  `import { useEffect, useMemo, useState } from 'react'`,
  `import { useEffect, useMemo, useRef, useState } from 'react'`,
  'Owner2: add useRef import'
);

// 7. Owner2.tsx - add ownerThreadEndRef
patch(
  'src/pages/Owner2.tsx',
  `const [ticketAttachments, setTicketAttachments] = useState<File[]>([])
  const [ticketUploading, setTicketUploading] = useState(false)`,
  `const [ticketAttachments, setTicketAttachments] = useState<File[]>([])
  const [ticketUploading, setTicketUploading] = useState(false)
  const ownerThreadEndRef = useRef<HTMLDivElement>(null)`,
  'Owner2: add thread scroll ref'
);

// 8. Owner2.tsx - add scroll on ticket select
patch(
  'src/pages/Owner2.tsx',
  `} catch { /* silent - non-critical */ }
              }
            }

            return (`,
  `} catch { /* silent - non-critical */ }
              }
              // Scroll to bottom after selecting
              setTimeout(() => ownerThreadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
            }

            return (`,
  'Owner2: scroll on ticket select'
);

// 9. Owner2.tsx - add scroll ref div in thread
patch(
  'src/pages/Owner2.tsx',
  `                                </div>
                              )
                            })}
                          </div>
                        </SurfaceCard>

                        {/* Response Form */}`,
  `                                </div>
                              )
                            })}
                            <div ref={ownerThreadEndRef} />
                          </div>
                        </SurfaceCard>

                        {/* Response Form */}`,
  'Owner2: add thread end ref div'
);

console.log('\n--- All patches applied ---');
