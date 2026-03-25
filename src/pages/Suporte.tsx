import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, LifeBuoy, Loader2, MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useAddSupportTicketMessage, useCreateSupportTicket, useMarkSupportMessagesReadByClient, useSupportTickets } from '@/hooks/useSupportTickets'
import { uploadToStorage } from '@/services/storage'

const PRIORITY_OPTIONS = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Critica' },
]

const isImageAttachmentUrl = (url: unknown) => {
  if (typeof url !== 'string') return false
  const normalized = url.split('?')[0].toLowerCase()
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg'].some((extension) => normalized.endsWith(extension))
}

export default function Suporte() {
  const { tenantId, user } = useAuth()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState('media')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [createAttachments, setCreateAttachments] = useState<File[]>([])
  const [replyAttachments, setReplyAttachments] = useState<Record<string, File[]>>({})
  const [uploading, setUploading] = useState(false)

  const canUploadAttachment = Boolean(tenantId && user?.id)

  const { data: tickets, isLoading, error } = useSupportTickets()
  const createTicket = useCreateSupportTicket()
  const addTicketMessage = useAddSupportTicketMessage()
  const markMessagesRead = useMarkSupportMessagesReadByClient()

  const unreadClientTotal = useMemo(
    () => (tickets ?? []).reduce((acc, ticket) => acc + Number(ticket.unread_client_messages ?? 0), 0),
    [tickets],
  )

  useEffect(() => {
    if (unreadClientTotal <= 0 || markMessagesRead.isPending) return
    markMessagesRead.mutate()
  }, [markMessagesRead, unreadClientTotal])

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
      setUploading(true)
      const uploadedAttachments = await uploadSupportFiles(createAttachments, 'new-ticket')
      await createTicket.mutateAsync({
        subject: trimmedSubject,
        message: trimmedMessage,
        priority,
        attachments: uploadedAttachments,
      })

      setSubject('')
      setMessage('')
      setPriority('media')
      setCreateAttachments([])

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
    } finally {
      setUploading(false)
    }
  }

  const uploadSupportFiles = async (files: File[], ticketId: string) => {
    if (!canUploadAttachment || files.length === 0 || !tenantId || !user?.id) return [] as string[]

    const validFiles = files.filter((file) => file.type.startsWith('image/'))
    const urls: string[] = []

    for (const file of validFiles) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${tenantId}/${user.id}/${ticketId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
      const publicUrl = await uploadToStorage('support-attachments', filePath, file)
      urls.push(publicUrl)
    }

    return urls
  }

  const handleSendFollowUp = async (ticketId: string) => {
    const content = (replyDrafts[ticketId] ?? '').trim()
    const files = replyAttachments[ticketId] ?? []
    if (!content && files.length === 0) return

    try {
      setUploading(true)
      const uploadedAttachments = await uploadSupportFiles(files, ticketId)
      await addTicketMessage.mutateAsync({ ticketId, message: content || 'Anexo enviado pelo cliente.', attachments: uploadedAttachments })
      setReplyDrafts((current) => ({ ...current, [ticketId]: '' }))
      setReplyAttachments((current) => ({ ...current, [ticketId]: [] }))
      toast({
        title: 'Mensagem enviada',
        description: 'Sua dúvida foi registrada no chamado.',
      })
    } catch (err: any) {
      toast({
        title: 'Falha ao enviar mensagem',
        description: String(err?.message ?? 'Não foi possível registrar sua dúvida.'),
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
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
    <div className="module-page space-y-6">
      <div className="module-page-header">
        <h1 className="text-2xl font-bold">Suporte do Sistema</h1>
        <p className="text-muted-foreground">Abra chamados para erros, lentidao, indisponibilidade ou comportamento incorreto do sistema.</p>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
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
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Mensagens não lidas</p>
          <p className="mt-1 text-xl font-semibold text-info">{unreadClientTotal}</p>
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

          <div className="grid gap-2">
            <Label htmlFor="support-attachment">Anexo de imagem (opcional)</Label>
            <Input
              id="support-attachment"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setCreateAttachments(Array.from(event.target.files ?? []))}
            />
            <p className="text-xs text-muted-foreground">Envie print do erro para acelerar o diagnóstico.</p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={createTicket.isPending || uploading} className="gap-2">
              {(createTicket.isPending || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
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
                  {Number(ticket.unread_client_messages ?? 0) > 0 && (
                    <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {ticket.unread_client_messages} nova(s)
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {(ticket.messages ?? []).length > 0 ? (
                    (ticket.messages ?? []).map((entry) => {
                      const isOwner = entry.sender === 'owner'
                      return (
                        <div
                          key={entry.id}
                          className={isOwner
                            ? 'rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-900'
                            : 'rounded-md border border-border bg-card p-2 text-sm text-foreground'}
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                            {isOwner ? 'Suporte' : 'Você'}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap">{entry.message}</p>
                          {Array.isArray(entry.attachments) && entry.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {entry.attachments.map((url) => (
                                <div key={url} className="space-y-1">
                                  {isImageAttachmentUrl(url) && (
                                    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                                      <img
                                        src={url}
                                        alt="Anexo do chamado"
                                        loading="lazy"
                                        className="max-h-52 rounded-md border border-border object-contain"
                                      />
                                    </a>
                                  )}
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="block text-xs text-info underline">
                                    Ver anexo
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="mt-1 text-[10px] opacity-70">
                            {new Date(entry.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.message}</p>
                  )}
                </div>

                {/* Always show reply form - even for resolved tickets (will reopen on send) */}
                <div className="mt-3 space-y-2">
                  <Textarea
                    rows={3}
                    value={replyDrafts[ticket.id] ?? ''}
                    onChange={(event) =>
                      setReplyDrafts((current) => ({
                        ...current,
                        [ticket.id]: event.target.value,
                      }))
                    }
                    placeholder={ticket.status === 'resolvido' ? 'Reabrir chamado com nova mensagem...' : 'Enviar nova dúvida ou atualização neste chamado'}
                  />
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Anexar imagens (opcional)</label>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) =>
                        setReplyAttachments((current) => ({
                          ...current,
                          [ticket.id]: Array.from(event.target.files ?? []),
                        }))
                      }
                    />
                    {(replyAttachments[ticket.id] ?? []).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{(replyAttachments[ticket.id] ?? []).length} arquivo(s) selecionado(s)</p>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      disabled={addTicketMessage.isPending || uploading || (!(replyDrafts[ticket.id] ?? '').trim() && (replyAttachments[ticket.id] ?? []).length === 0)}
                      onClick={() => void handleSendFollowUp(ticket.id)}
                    >
                      {ticket.status === 'resolvido' ? 'Reabrir e enviar' : 'Enviar mensagem'}
                    </Button>
                  </div>
                </div>

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
