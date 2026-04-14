import { useOwner2Contracts } from '@/hooks/useOwner2Portal'
import type { OwnerContract } from '@/services/ownerPortal.service'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, RefreshCw, Lock } from 'lucide-react'

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
  const query = useOwner2Contracts(isSystemOwner) // só carrega se o usuário tiver acesso
  const contracts: OwnerContract[] = Array.isArray(query.data?.contracts)
    ? query.data.contracts
    : []

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
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground text-sm">
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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
