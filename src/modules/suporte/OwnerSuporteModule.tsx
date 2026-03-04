import { useMemo, useState } from 'react'
import { useOwnerCompanyActions, useOwnerSupportTickets } from '@/hooks/useOwnerPortal'

type Ticket = {
  id: string
  subject?: string
  message?: string
  owner_response?: string
  status?: string
  priority?: string
  empresas?: { nome?: string } | null
  updated_at?: string
}

export function OwnerSuporteModule() {
  const { respondSupportMutation } = useOwnerCompanyActions()
  const { data, isLoading } = useOwnerSupportTickets()

  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [response, setResponse] = useState('')
  const [nextStatus, setNextStatus] = useState('resolvido')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const allTickets = ((data as unknown as Ticket[] | undefined) ?? []).slice(0, 60)
  const tickets = useMemo(
    () =>
      allTickets.filter((ticket) => {
        const statusOk = statusFilter === 'all' || ticket.status === statusFilter
        const priorityOk = priorityFilter === 'all' || ticket.priority === priorityFilter
        return statusOk && priorityOk
      }),
    [allTickets, statusFilter, priorityFilter],
  )

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? null

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando chamados...</div>
  }

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicketId(ticket.id)
    setResponse(ticket.owner_response ?? '')
    setNextStatus(ticket.status ?? 'resolvido')
    setMessage(null)
    setError(null)
  }

  const handleRespond = () => {
    if (!selectedTicketId || !response.trim()) {
      setError('Selecione um chamado e informe uma resposta antes de salvar.')
      return
    }

    setMessage(null)
    setError(null)

    respondSupportMutation.mutate(
      { ticketId: selectedTicketId, response, status: nextStatus },
      {
        onSuccess: () => setMessage('Resposta enviada com sucesso.'),
        onError: (err: any) => setError(err?.message ?? 'Falha ao responder chamado.'),
      },
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold">Suporte</h2>

        <div className="mb-3 grid gap-2 md:grid-cols-2">
          <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos os status</option>
            <option value="aberto">Aberto</option>
            <option value="em_andamento">Em andamento</option>
            <option value="resolvido">Resolvido</option>
            <option value="fechado">Fechado</option>
          </select>
          <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">Todas as prioridades</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </div>

        <div className="space-y-2">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => handleSelectTicket(ticket)}
              className={`grid w-full grid-cols-4 items-center rounded-md border p-3 text-left text-sm ${
                selectedTicketId === ticket.id ? 'border-emerald-700 bg-slate-800' : 'border-slate-800'
              }`}
            >
              <span className="truncate">{ticket.subject ?? '-'}</span>
              <span className="truncate text-slate-400">{ticket.status ?? '-'}</span>
              <span className="truncate text-slate-400">{ticket.priority ?? '-'}</span>
              <span className="truncate text-slate-400">{ticket.updated_at ? new Date(ticket.updated_at).toLocaleString('pt-BR') : '-'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold">Resposta ao chamado</h2>

        {!selectedTicket ? (
          <p className="text-sm text-slate-400">Selecione um chamado para visualizar detalhes e responder.</p>
        ) : (
          <>
            <p className="text-sm font-medium">{selectedTicket.subject ?? 'Sem assunto'}</p>
            <p className="mt-1 text-xs text-slate-400">Empresa: {selectedTicket.empresas?.nome ?? 'N/D'}</p>
            <p className="mt-2 rounded border border-slate-800 bg-slate-950 p-2 text-xs text-slate-300">{selectedTicket.message ?? 'Sem mensagem'}</p>

            <select className="mt-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
              <option value="em_andamento">Em andamento</option>
              <option value="resolvido">Resolvido</option>
              <option value="fechado">Fechado</option>
            </select>

            <textarea
              className="mt-2 h-40 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder="Digite a resposta do owner"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
            />

            <button
              onClick={handleRespond}
              className="mt-3 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              disabled={respondSupportMutation.isPending}
            >
              Enviar resposta
            </button>
          </>
        )}

        {message && <p className="mt-2 text-sm text-emerald-300">{message}</p>}
        {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
      </div>
    </div>
  )
}
