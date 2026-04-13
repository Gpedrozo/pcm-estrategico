import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCheck, ChevronDown, ChevronUp, LifeBuoy, Loader2, MessageSquarePlus, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  useAddSupportTicketMessage,
  useCreateSupportTicket,
  useMarkSupportMessagesReadByClient,
  useSupportTickets,
} from '@/hooks/useSupportTickets'
import { uploadToStorage } from '@/services/storage'

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const PRIORITY_OPTIONS = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
]

const isImageUrl = (url: unknown) => {
  if (typeof url !== 'string') return false
  const normalized = url.split('?')[0].toLowerCase()
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg'].some((ext) => normalized.endsWith(ext))
}

const statusBadge = (status: string) => {
  const s = status.toLowerCase()
  if (s === 'resolvido' || s === 'resolved' || s === 'fechado') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (s === 'em_analise' || s === 'pending') return 'bg-sky-100 text-sky-700 border-sky-200'
  return 'bg-amber-100 text-amber-700 border-amber-200'
}

const priorityBadge = (priority: string) => {
  const p = priority.toLowerCase()
  if (p === 'critica' || p === 'critical') return 'bg-purple-100 text-purple-700 border-purple-200'
  if (p === 'alta' || p === 'high' || p === 'urgente') return 'bg-red-100 text-red-700 border-red-200'
  if (p === 'media' || p === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-muted text-muted-foreground border-border'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Suporte() {
  const { tenantId, user } = useAuth()

  // Form state
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState('media')
  const [replyText, setReplyText] = useState('')
  const [createAttachments, setCreateAttachments] = useState<File[]>([])
  const [replyAttachments, setReplyAttachments] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [showNewTicketForm, setShowNewTicketForm] = useState(false)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const canUploadAttachment = Boolean(tenantId && user?.id)

  // Hooks
  const { data: tickets, isLoading, error } = useSupportTickets()
  const createTicket = useCreateSupportTicket()
  const addTicketMessage = useAddSupportTicketMessage()
  const markMessagesRead = useMarkSupportMessagesReadByClient()

  // Derived
  const unreadClientTotal = useMemo(
    () => (tickets ?? []).reduce((acc, t) => acc + Number(t.unread_client_messages ?? 0), 0),
    [tickets],
  )

  const selectedTicket = useMemo(
    () => (tickets ?? []).find((t) => t.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId],
  )

  const threadMessages = useMemo(() => {
    if (!selectedTicket) return []
    return selectedTicket.messages ?? []
  }, [selectedTicket])

  const totals = useMemo(() => {
    const all = tickets ?? []
    return {
      total: all.length,
      aberto: all.filter((t) => t.status === 'aberto' || t.status === 'em_analise').length,
      resolvido: all.filter((t) => t.status === 'resolvido').length,
    }
  }, [tickets])

  // Mark read only when selecting a specific ticket
  const handleSelectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId)
    const ticket = (tickets ?? []).find((t) => t.id === ticketId)
    if (ticket && Number(ticket.unread_client_messages ?? 0) > 0 && !markMessagesRead.isPending) {
      markMessagesRead.mutate(ticketId)
    }
  }

  // Scroll to bottom on new messages or ticket switch
  useEffect(() => {
    if (threadEndRef.current) {
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [threadMessages.length, selectedTicketId])

  // File upload helper
  const uploadSupportFiles = async (files: File[], ticketId: string) => {
    if (!canUploadAttachment || files.length === 0 || !tenantId || !user?.id) return [] as string[]
    const validFiles = files.filter((f) => f.type.startsWith('image/'))
    const urls: string[] = []
    for (const file of validFiles) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${tenantId}/${user.id}/${ticketId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
      const publicUrl = await uploadToStorage('support-attachments', path, file)
      urls.push(publicUrl)
    }
    return urls
  }

  // Create ticket
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmedSubject = subject.trim()
    const trimmedMessage = message.trim()

    if (!trimmedSubject || !trimmedMessage) {
      toast({ title: 'Campos obrigatórios', description: 'Informe assunto e descrição do problema.', variant: 'destructive' })
      return
    }

    try {
      setUploading(true)
      const uploadedUrls = await uploadSupportFiles(createAttachments, 'new-ticket')
      await createTicket.mutateAsync({ subject: trimmedSubject, message: trimmedMessage, priority, attachments: uploadedUrls })
      setSubject('')
      setMessage('')
      setPriority('media')
      setCreateAttachments([])
      setShowNewTicketForm(false)
      toast({ title: 'Chamado aberto', description: 'Sua solicitação foi registrada no suporte do sistema.' })
    } catch (err: any) {
      toast({ title: 'Erro ao abrir chamado', description: String(err?.message ?? 'Falha ao registrar chamado.'), variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  // Reply / follow-up
  const handleSendFollowUp = async () => {
    if (!selectedTicketId) return
    const content = replyText.trim()
    if (!content && replyAttachments.length === 0) return

    try {
      setUploading(true)
      const uploadedUrls = await uploadSupportFiles(replyAttachments, selectedTicketId)
      await addTicketMessage.mutateAsync({
        ticketId: selectedTicketId,
        message: content || 'Anexo enviado pelo cliente.',
        attachments: uploadedUrls,
      })
      setReplyText('')
      setReplyAttachments([])
      toast({ title: 'Mensagem enviada', description: 'Sua mensagem foi registrada no chamado.' })
    } catch (err: any) {
      toast({ title: 'Falha ao enviar mensagem', description: String(err?.message ?? 'Não foi possível registrar sua mensagem.'), variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  // Error state
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
    <div className="module-page space-y-4">
      {/* Header */}
      <div className="module-page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suporte do Sistema</h1>
          <p className="text-sm text-muted-foreground">Abra chamados e acompanhe suas solicitações.</p>
        </div>
        <Button
          variant={showNewTicketForm ? 'outline' : 'default'}
          size="sm"
          className="gap-2"
          onClick={() => setShowNewTicketForm((v) => !v)}
        >
          {showNewTicketForm ? <ChevronUp className="h-4 w-4" /> : <MessageSquarePlus className="h-4 w-4" />}
          {showNewTicketForm ? 'Fechar formulário' : 'Novo chamado'}
        </Button>
      </div>

      {/* Stats */}
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="mt-1 text-xl font-semibold">{totals.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Em aberto</p>
          <p className="mt-1 text-xl font-semibold text-amber-600">{totals.aberto}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Resolvidos</p>
          <p className="mt-1 text-xl font-semibold text-emerald-600">{totals.resolvido}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Não lidas</p>
          <p className="mt-1 text-xl font-semibold text-sky-600">{unreadClientTotal}</p>
        </div>
      </section>

      {/* New ticket form */}
      {showNewTicketForm && (
        <section className="rounded-lg border bg-card p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <h2 className="flex items-center gap-2 text-base font-semibold mb-3">
            <MessageSquarePlus className="h-4 w-4" />
            Abrir novo chamado
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="support-subject">Assunto</Label>
              <Input id="support-subject" value={subject} maxLength={160} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Erro ao fechar ordem de serviço" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="support-priority">Prioridade</Label>
              <select id="support-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
                {PRIORITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="support-message">Descrição detalhada</Label>
              <Textarea id="support-message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Descreva o que aconteceu, em qual tela e como reproduzir." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="support-attachment">Anexo de imagem (opcional)</Label>
              <Input id="support-attachment" type="file" accept="image/*" multiple onChange={(e) => setCreateAttachments(Array.from(e.target.files ?? []))} />
            </div>
            <div className="flex items-end justify-end">
              <Button type="submit" disabled={createTicket.isPending || uploading} className="gap-2">
                {(createTicket.isPending || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
                Enviar chamado
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Main grid: ticket list + detail panel */}
      <div className="grid gap-4 xl:grid-cols-5">
        {/* Ticket List */}
        <div className="xl:col-span-2">
          <div className="rounded-lg border bg-card p-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold mb-2">
              <LifeBuoy className="h-4 w-4" />
              Chamados ({(tickets ?? []).length})
            </h2>

            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto h-5 w-5 animate-spin mb-2" />
                Carregando...
              </div>
            ) : (tickets ?? []).length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Nenhum chamado registrado.</div>
            ) : (
              <div className="max-h-[560px] overflow-auto space-y-1">
                {(tickets ?? []).map((ticket) => {
                  const isSelected = ticket.id === selectedTicketId
                  const unread = Number(ticket.unread_client_messages ?? 0)
                  const created = new Date(ticket.created_at).toLocaleDateString('pt-BR')
                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => handleSelectTicket(ticket.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30 hover:bg-accent/50'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : ''}`}>{ticket.subject}</p>
                        </div>
                        {unread > 0 && (
                          <span className="shrink-0 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5">{unread}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${statusBadge(ticket.status)}`}>{ticket.status}</span>
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${priorityBadge(ticket.priority ?? 'media')}`}>{ticket.priority ?? 'media'}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{created}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detail & Thread */}
        <div className="xl:col-span-3 space-y-3">
          {selectedTicket ? (
            <>
              {/* Ticket header */}
              <div className="rounded-lg border bg-card p-4">
                <h3 className="font-semibold text-base">{selectedTicket.subject}</h3>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                  <span className={`rounded border px-2 py-0.5 font-medium ${statusBadge(selectedTicket.status)}`}>{selectedTicket.status}</span>
                  <span className={`rounded border px-2 py-0.5 font-medium ${priorityBadge(selectedTicket.priority ?? 'media')}`}>{selectedTicket.priority ?? 'media'}</span>
                  <span className="text-muted-foreground">Criado em {new Date(selectedTicket.created_at).toLocaleString('pt-BR')}</span>
                  {selectedTicket.unread_owner_messages === 0 && threadMessages.some((m) => m.sender === 'client') && (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCheck className="h-3 w-3" /> Lido pelo suporte
                    </span>
                  )}
                </div>
              </div>

              {/* Thread conversation */}
              <div className="rounded-lg border bg-card p-4">
                <h4 className="text-sm font-semibold mb-3">Conversa ({threadMessages.length} mensagens)</h4>
                <div className="max-h-[380px] overflow-auto space-y-2 pr-1">
                  {threadMessages.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma mensagem ainda</p>
                  )}
                  {threadMessages.map((entry) => {
                    const isOwner = entry.sender === 'owner' || entry.sender === 'system'
                    return (
                      <div
                        key={entry.id}
                        className={`p-3 rounded-lg text-sm ${isOwner
                          ? 'bg-emerald-50 border border-emerald-200 ml-8 dark:bg-emerald-950/30 dark:border-emerald-800'
                          : 'bg-muted border border-border mr-8'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase ${isOwner ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            {isOwner ? 'Suporte' : 'Você'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{entry.message}</p>
                        {/* Read indicator on last client message */}
                        {entry.sender === 'client' && entry.id === threadMessages.filter((m) => m.sender === 'client').at(-1)?.id && selectedTicket.unread_owner_messages === 0 && (
                          <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1">
                            <CheckCheck className="h-2.5 w-2.5" /> Visto pelo suporte
                          </p>
                        )}
                        {Array.isArray(entry.attachments) && entry.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {entry.attachments.map((url) => (
                              <div key={url}>
                                {isImageUrl(url) ? (
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                                    <img src={url} alt="Anexo" loading="lazy" className="max-h-40 rounded-md border border-border object-contain hover:opacity-90 transition-opacity" />
                                  </a>
                                ) : (
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Ver anexo</a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div ref={threadEndRef} />
                </div>

                {/* Reply form */}
                <div className="mt-3 space-y-2 border-t pt-3">
                  <Textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={selectedTicket.status === 'resolvido' ? 'Reabrir chamado com nova mensagem...' : 'Enviar nova mensagem neste chamado...'}
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        className="text-xs"
                        onChange={(e) => setReplyAttachments(Array.from(e.target.files ?? []))}
                      />
                      {replyAttachments.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{replyAttachments.length} arquivo(s)</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2"
                      disabled={addTicketMessage.isPending || uploading || (!replyText.trim() && replyAttachments.length === 0)}
                      onClick={() => void handleSendFollowUp()}
                    >
                      {(addTicketMessage.isPending || uploading) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      {selectedTicket.status === 'resolvido' ? 'Reabrir' : 'Enviar'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border bg-card p-8 text-center">
              <LifeBuoy className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">Selecione um chamado na lista para visualizar a conversa</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
