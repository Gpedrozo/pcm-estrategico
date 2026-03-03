import { useOwnerSupportTickets } from '@/hooks/useOwnerPortal'

type Ticket = {
  id: string
  subject?: string
  status?: string
  priority?: string
  updated_at?: string
}

export function OwnerSuporteModule() {
  const { data, isLoading } = useOwnerSupportTickets()

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando chamados...</div>
  }

  const tickets = ((data as unknown as Ticket[] | undefined) ?? []).slice(0, 30)

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold">Suporte</h2>
      <div className="space-y-2">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="grid grid-cols-4 items-center rounded-md border border-slate-800 p-3 text-sm">
            <span className="truncate">{ticket.subject ?? '-'}</span>
            <span className="text-slate-400">{ticket.status ?? '-'}</span>
            <span className="text-slate-400">{ticket.priority ?? '-'}</span>
            <span className="text-slate-400">{ticket.updated_at ? new Date(ticket.updated_at).toLocaleString('pt-BR') : '-'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
