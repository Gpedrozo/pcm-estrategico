import { useState } from 'react'
import { useOwner2Contracts } from '@/hooks/useOwner2Portal'
import type { OwnerContract } from '@/services/ownerPortal.service'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AlertTriangle, RefreshCw, Lock, Printer, FileDown, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  generateOwnerContractPDF,
  printOwnerContractDocument,
  type OwnerContractForDocument,
} from '@/lib/reportGenerator'

function fmt(val: string | null | undefined) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('pt-BR')
}

function fmtValor(val: unknown) {
  const n = Number(val)
  if (!val || isNaN(n)) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  if (s === 'ativo') return <Badge className="bg-green-100 text-green-800 border border-green-300">Ativo</Badge>
  if (s === 'rascunho') return <Badge className="bg-amber-100 text-amber-800 border border-amber-300">Rascunho</Badge>
  if (s === 'encerrado') return <Badge className="bg-gray-100 text-gray-700 border border-gray-300">Encerrado</Badge>
  if (s === 'cancelado') return <Badge className="bg-rose-100 text-rose-800 border border-rose-300">Cancelado</Badge>
  return <Badge variant="outline">{status}</Badge>
}

export function MasterContratosPanel() {
  const { isSystemOwner } = useAuth()
  const { toast } = useToast()
  const query = useOwner2Contracts(isSystemOwner) // só carrega se o usuário tiver acesso
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [previewContract, setPreviewContract] = useState<OwnerContract | null>(null)
  const contracts: OwnerContract[] = Array.isArray(query.data?.contracts)
    ? query.data.contracts
    : []

  const toDocumentContract = (contract: OwnerContract): OwnerContractForDocument => ({
    id: String(contract.id),
    empresaNome: contract.empresas?.nome ?? contract.empresa_id ?? '—',
    planoNome: contract.plans?.name ?? contract.plans?.code ?? '—',
    status: contract.status ?? 'rascunho',
    amount: contract.amount ?? null,
    starts_at: contract.starts_at ?? null,
    ends_at: contract.ends_at ?? null,
    generated_at: contract.generated_at ?? contract.created_at ?? null,
    signed_at: contract.signed_at ?? null,
    version: contract.version ?? 1,
    summary: contract.summary ?? null,
    content: contract.content ?? null,
  })

  const executeDocumentActionInternal = async (
    contract: OwnerContract,
    action: 'print' | 'pdf',
  ) => {
    const actionKey = `${action}:${contract.id}`
    setActiveAction(actionKey)

    try {
      const printable = toDocumentContract(contract)
      if (action === 'print') {
        printOwnerContractDocument(printable)
      } else {
        await generateOwnerContractPDF(printable)
      }
    } catch (error) {
      toast({
        title: action === 'print' ? 'Erro ao imprimir contrato' : 'Erro ao gerar PDF do contrato',
        description: error instanceof Error ? error.message : 'Falha inesperada ao processar o documento.',
        variant: 'destructive',
      })
    } finally {
      setActiveAction(null)
    }
  }

  const handlePreviewAction = async (contract: OwnerContract, action: 'print' | 'pdf') => {
    await executeDocumentActionInternal(contract, action)
  }

  if (!isSystemOwner) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <Lock className="h-5 w-5 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Contratos de serviço são exclusivos para perfil <strong>SYSTEM_OWNER</strong>.
        </p>
      </div>
    )
  }

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (query.isError) {
    const errMsg = String((query.error as Error)?.message ?? '').toLowerCase()
    const isForbidden = errMsg.includes('forbidden') || errMsg.includes('403') || errMsg.includes('unauthorized') || errMsg.includes('sem permiss')
    const isMissingTable = errMsg.includes('does not exist') || errMsg.includes('relation') || errMsg.includes('42p01') || errMsg.includes('contracts_table_missing')
    const errorLabel = isForbidden
      ? 'Sem permissão para carregar contratos. Requer perfil SYSTEM_OWNER no banco de dados.'
      : isMissingTable
        ? 'Tabela de contratos não encontrada. Execute as migrações pendentes no Supabase (20260405235000).'
        : 'Falha ao carregar contratos. Verifique se o edge function owner-portal-admin está ativo e republicado.'
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p className="text-sm">{errorLabel}</p>
        <Button size="sm" variant="outline" onClick={() => query.refetch()} className="ml-auto gap-1">
          <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Contratos de Serviço — PCM Estratégico</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{contracts.length} contrato(s) encontrado(s)</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => query.refetch()} disabled={query.isFetching} className="gap-1">
          <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium text-xs">Empresa</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs">Plano</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs">Valor/mês</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs">Vigência</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs">Status</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs">Assinatura</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs">Versão</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs">Gerado em</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs">Ações</th>
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground text-sm">
                  Nenhum contrato encontrado. Os contratos são gerados automaticamente ao criar uma empresa com assinatura.
                </td>
              </tr>
            )}
            {contracts.map((c) => {
              const empNome = String(c.empresas?.nome ?? c.empresa_id ?? '—')
              const planName = String(c.plans?.name ?? c.plans?.code ?? '—')
              const signedAt = c.signed_at ? fmt(String(c.signed_at)) : null
              const starts = fmt(String(c.starts_at ?? ''))
              const ends = fmt(String(c.ends_at ?? ''))
              const vigencia = starts !== '—' || ends !== '—' ? `${starts} → ${ends}` : '—'
              const hasDocumentContent = Boolean(String(c.content ?? c.summary ?? '').trim())
              const _isPrinting = activeAction === `print:${c.id}`
              const _isDownloading = activeAction === `pdf:${c.id}`

              return (
                <tr key={String(c.id)} className="border-t border-border hover:bg-muted/40">
                  <td className="px-3 py-2.5 font-medium">{empNome}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{planName}</td>
                  <td className="px-3 py-2.5">{fmtValor(c.amount)}</td>
                  <td className="px-3 py-2.5 text-xs">{vigencia}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={String(c.status ?? 'rascunho')} />
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {signedAt
                      ? <span className="text-green-700 dark:text-green-400">✓ {signedAt}</span>
                      : <span className="text-amber-600 dark:text-amber-400">Pendente</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs">v{String(c.version ?? '1')}</td>
                  <td className="px-3 py-2.5 text-xs">{fmt(String(c.generated_at ?? ''))}</td>
                  <td className="px-3 py-2.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={!hasDocumentContent}
                      title={hasDocumentContent ? 'Visualizar contrato' : 'Contrato sem conteúdo disponível'}
                      onClick={() => setPreviewContract(c)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Visualizar
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {previewContract && (
        <Sheet open={!!previewContract} onOpenChange={(open) => !open && setPreviewContract(null)}>
          <SheetContent className="w-full max-w-lg sm:max-w-xl space-y-6 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Prévia do Contrato</SheetTitle>
              <SheetDescription>
                Empresa: {String(previewContract.empresas?.nome ?? previewContract.empresa_id ?? '—')}
              </SheetDescription>
            </SheetHeader>

            {/* Metadata Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Identificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Plano</p>
                    <p className="font-medium">{String(previewContract.plans?.name ?? previewContract.plans?.code ?? '—')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1"><StatusBadge status={String(previewContract.status ?? 'rascunho')} /></div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor mensal</p>
                    <p className="font-medium">{fmtValor(previewContract.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Versão</p>
                    <p className="font-medium">v{String(previewContract.version ?? '1')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Vigência início</p>
                    <p className="font-medium text-xs">{fmt(String(previewContract.starts_at ?? ''))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vigência fim</p>
                    <p className="font-medium text-xs">{fmt(String(previewContract.ends_at ?? ''))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gerado em</p>
                    <p className="font-medium text-xs">{fmt(String(previewContract.generated_at ?? ''))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assinado em</p>
                    <p className="font-medium text-xs">
                      {previewContract.signed_at ? fmt(String(previewContract.signed_at)) : <span className="text-amber-600">Pendente</span>}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary / Content Preview */}
            {(previewContract.summary || previewContract.content) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Resumo / Conteúdo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-72 overflow-y-auto rounded border border-border bg-muted/30 p-3 text-xs leading-relaxed">
                    {previewContract.summary && (
                      <>
                        <p className="font-medium mb-2">Resumo executivo:</p>
                        <p className="text-muted-foreground mb-4">{previewContract.summary}</p>
                      </>
                    )}
                    {previewContract.content && (
                      <>
                        <p className="font-medium mb-2">Cláusulas:</p>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {String(previewContract.content).slice(0, 600)}
                          {String(previewContract.content).length > 600 ? '...' : ''}
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="sticky bottom-0 space-y-2 border-t bg-background pt-4">
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2"
                  disabled={Boolean(activeAction)}
                  onClick={() => void handlePreviewAction(previewContract, 'print')}
                >
                  <Printer className={`h-4 w-4 ${activeAction?.startsWith('print:') ? 'animate-pulse' : ''}`} />
                  Imprimir
                </Button>
                <Button
                  className="flex-1 gap-2"
                  variant="outline"
                  disabled={Boolean(activeAction)}
                  onClick={() => void handlePreviewAction(previewContract, 'pdf')}
                >
                  <FileDown className={`h-4 w-4 ${activeAction?.startsWith('pdf:') ? 'animate-pulse' : ''}`} />
                  Baixar PDF
                </Button>
              </div>
              <SheetClose asChild>
                <Button variant="outline" className="w-full">
                  Fechar
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
