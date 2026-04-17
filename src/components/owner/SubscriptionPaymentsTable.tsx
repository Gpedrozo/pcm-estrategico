import { Loader2, RefreshCw } from 'lucide-react'
import { SurfaceCard } from '@/pages/owner2/owner2Components'
import { asNumber } from '@/pages/owner2/owner2Helpers'
import type { PaymentRecord } from '@/hooks/useSubscriptionDetail'

interface Props {
  payments: PaymentRecord[]
  loading: boolean
  onRefresh: () => void
}

export default function SubscriptionPaymentsTable({ payments, loading, onRefresh }: Props) {
  return (
    <SurfaceCard title="Historico de pagamentos" subtitle={`${payments.length} pagamento(s) registrado(s)`}>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando pagamentos...</span>
        </div>
      ) : (
        <div className="max-h-[320px] overflow-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="px-2 py-2 text-left">Data</th>
                <th className="px-2 py-2 text-left">Valor</th>
                <th className="px-2 py-2 text-left">Status</th>
                <th className="px-2 py-2 text-left">Provider</th>
                <th className="px-2 py-2 text-left">Metodo</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, idx) => {
                const pStatus = String(p.status ?? '-').toLowerCase()
                const pStatusBadge =
                  pStatus === 'paid' || pStatus === 'pago'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : pStatus === 'late' || pStatus === 'atrasado' || pStatus === 'overdue'
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : pStatus === 'failed' || pStatus === 'falhou'
                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                        : 'bg-muted text-muted-foreground border-border'
                const pProvider = String(p.provider ?? 'manual')
                const pProviderBadge =
                  pProvider === 'asaas'
                    ? 'bg-violet-100 text-violet-700 border-violet-200'
                    : pProvider === 'stripe'
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                      : 'bg-muted text-muted-foreground border-border'
                return (
                  <tr key={`pay-${String(p.id ?? idx)}`} className="border-t border-border hover:bg-muted/50">
                    <td className="px-2 py-2 text-muted-foreground">
                      {p.paid_at
                        ? new Date(String(p.paid_at)).toLocaleDateString('pt-BR')
                        : p.due_at
                          ? new Date(String(p.due_at)).toLocaleDateString('pt-BR')
                          : '-'}
                    </td>
                    <td className="px-2 py-2 font-medium">
                      R$ {asNumber(p.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pStatusBadge}`}>
                        {String(p.status ?? '-')}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pProviderBadge}`}>
                        {pProvider.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{String(p.method ?? '-')}</td>
                  </tr>
                )
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">
                    Nenhum pagamento registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <button
        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-input bg-background px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted/50"
        disabled={loading}
        onClick={onRefresh}
      >
        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Atualizar
      </button>
    </SurfaceCard>
  )
}
