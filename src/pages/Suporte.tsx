import { useMemo, useState } from 'react'
import { AlertTriangle, LifeBuoy, Loader2, MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { useCreateSupportTicket, useSupportTickets } from '@/hooks/useSupportTickets'

const PRIORITY_OPTIONS = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Critica' },
]

export default function Suporte() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState('media')

  const { data: tickets, isLoading, error } = useSupportTickets()
  const createTicket = useCreateSupportTicket()

  const totals = useMemo(() => {
    const all = tickets ?? []
    return {
      total: all.length,
      aberto: all.filter((t) => t.status === 'aberto').length,
      resolvido: all.filter((t) => t.status === 'resolvido').length,
    }
  }, [tickets])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const trimmedSubject = subject.trim()
    const trimmedMessage = message.trim()

    if (!trimmedSubject || !trimmedMessage) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Informe assunto e descricao do problema.',
        variant: 'destructive',
      })
      return
    }

    try {
      await createTicket.mutateAsync({
        subject: trimmedSubject,
        message: trimmedMessage,
        priority,
      })

      setSubject('')
      setMessage('')
      setPriority('media')

      toast({
        title: 'Chamado aberto',
        description: 'Sua solicitacao foi registrada no suporte do sistema.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao abrir chamado',
        description: String(err?.message ?? 'Falha ao registrar chamado.'),
        variant: 'destructive',
      })
    }
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="rounded-lg border border-destructive/40 bg-card p-6 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <h2 className="mt-3 text-lg font-semibold">Falha ao carregar suporte</h2>
          <p className="mt-1 text-sm text-muted-foreground">{String((error as Error).message)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suporte do Sistema</h1>
        <p className="text-muted-foreground">Abra chamados para erros, lentidao, indisponibilidade ou comportamento incorreto do sistema.</p>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total de chamados</p>
          <p className="mt-1 text-xl font-semibold">{totals.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Em aberto</p>
          <p className="mt-1 text-xl font-semibold text-amber-600">{totals.aberto}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Resolvidos</p>
          <p className="mt-1 text-xl font-semibold text-emerald-600">{totals.resolvido}</p>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <MessageSquarePlus className="h-4 w-4" />
          Abrir novo chamado
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="support-subject">Assunto</Label>
            <Input
              id="support-subject"
              value={subject}
              maxLength={160}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Ex: Erro ao fechar ordem de servico"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="support-priority">Prioridade</Label>
            <select
              id="support-priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="support-message">Descricao detalhada</Label>
            <Textarea
              id="support-message"
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Descreva o que aconteceu, em qual tela e como reproduzir."
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={createTicket.isPending} className="gap-2">
              {createTicket.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar chamado
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <LifeBuoy className="h-4 w-4" />
          Historico de chamados
        </h2>

        {isLoading ? (
          <div className="py-6 text-sm text-muted-foreground">Carregando chamados...</div>
        ) : (tickets ?? []).length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">Nenhum chamado registrado ate o momento.</div>
        ) : (
          <div className="mt-3 space-y-3">
            {(tickets ?? []).map((ticket) => (
              <article key={ticket.id} className="rounded-md border bg-background p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{ticket.subject}</p>
                  <span className="rounded border px-2 py-0.5 text-xs uppercase">{ticket.status}</span>
                  <span className="rounded border px-2 py-0.5 text-xs uppercase">{ticket.priority ?? 'media'}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{ticket.message}</p>
                {ticket.owner_response && (
                  <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-900">
                    <strong>Resposta do suporte:</strong> {ticket.owner_response}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Atualizado em {new Date(ticket.updated_at).toLocaleString('pt-BR')}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
