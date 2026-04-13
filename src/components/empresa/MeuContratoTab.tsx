import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { usePlatformContract, useSignContract } from '@/hooks/usePlatformContract'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function MeuContratoTab() {
  const { data: contract, isLoading, isError } = usePlatformContract()
  const signContract = useSignContract()
  const { user } = useAuth()
  const [signing, setSigning] = useState(false)

  const isSigned = Boolean(contract?.signed_at)

  const handleSign = async () => {
    if (!contract?.id) return
    setSigning(true)
    try {
      await signContract.mutateAsync(contract.id)
      toast({
        title: 'Contrato assinado',
        description: 'Assinatura digital registrada com sucesso.',
      })
    } catch (err: unknown) {
      toast({
        title: 'Erro ao assinar',
        description: err instanceof Error ? err.message : 'Falha ao registrar assinatura.',
        variant: 'destructive',
      })
    } finally {
      setSigning(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6 text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm">Falha ao carregar contrato. Tente novamente mais tarde.</p>
        </CardContent>
      </Card>
    )
  }

  if (!contract) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
          <FileText className="h-8 w-8" />
          <p className="text-sm">Nenhum contrato encontrado para esta empresa.</p>
          <p className="text-xs">O contrato é gerado automaticamente ao ativar a assinatura. Entre em contato com o suporte se necessário.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Contrato de Prestação de Serviços — PCM Estratégico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Plano</p>
              <p className="font-medium">{contract.plans?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor mensal</p>
              <p className="font-medium">{formatCurrency(contract.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vigência início</p>
              <p className="font-medium">{formatDate(contract.starts_at)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vigência fim</p>
              <p className="font-medium">{formatDate(contract.ends_at)}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSigned ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-700 dark:text-green-400">
                    Assinado em {formatDate(contract.signed_at)}
                  </span>
                  <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                    Assinado
                  </Badge>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-700 dark:text-amber-400">
                    Aguardando assinatura
                  </span>
                  <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
                    Pendente
                  </Badge>
                </>
              )}
            </div>

            {!isSigned && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" disabled={signing || signContract.isPending}>
                    {signing || signContract.isPending ? 'Assinando…' : 'Assinar Contrato'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar assinatura digital</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ao confirmar, você registra a assinatura digital deste contrato com o usuário{' '}
                      <strong>{user?.email ?? 'autenticado'}</strong>. Esta ação é irreversível e tem validade
                      jurídica conforme MP 2.200-2/2001.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void handleSign()}>
                      Confirmar assinatura
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo do contrato */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Conteúdo do contrato — versão {contract.version}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[480px] overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-4 text-xs leading-relaxed text-foreground">
            {contract.content || 'Conteúdo não disponível.'}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
