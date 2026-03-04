import { useMemo } from 'react'
import { useOwnerStats, useOwnerSubscriptions } from '@/hooks/useOwnerPortal'

type Subscription = {
  id: string
  empresa_id?: string
  amount?: number
  period?: string
  payment_method?: string
  status?: string
  payment_status?: string
  renewal_at?: string
}

const money = (value: unknown) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0))

export function OwnerFinanceiroModule() {
  const { data: stats, isLoading: isLoadingStats } = useOwnerStats()
  const { data: subscriptionsData, isLoading: isLoadingSubs } = useOwnerSubscriptions()

  const subscriptions = useMemo(() => ((subscriptionsData as Subscription[] | undefined) ?? []).slice(0, 80), [subscriptionsData])

  if (isLoadingStats || isLoadingSubs) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando central financeira...</div>
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">MRR</p>
          <p className="mt-2 text-2xl font-semibold">{money(stats?.mrr)}</p>
        </article>
        <article className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">ARR</p>
          <p className="mt-2 text-2xl font-semibold">{money(stats?.arr)}</p>
        </article>
        <article className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Assinaturas ativas</p>
          <p className="mt-2 text-2xl font-semibold">{Number(stats?.active_subscriptions ?? 0)}</p>
        </article>
        <article className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Churn 30d</p>
          <p className="mt-2 text-2xl font-semibold">{Number(stats?.churn_rate ?? 0).toFixed(2)}%</p>
        </article>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold">Assinaturas e billing</h2>
        <div className="space-y-2">
          {subscriptions.map((subscription) => (
            <div key={subscription.id} className="grid grid-cols-7 items-center gap-2 rounded-md border border-slate-800 p-3 text-xs">
              <span className="truncate">{subscription.empresa_id ?? '-'}</span>
              <span>{money(subscription.amount)}</span>
              <span>{subscription.period ?? '-'}</span>
              <span>{subscription.payment_method ?? '-'}</span>
              <span>{subscription.status ?? '-'}</span>
              <span>{subscription.payment_status ?? '-'}</span>
              <span>{subscription.renewal_at ? new Date(subscription.renewal_at).toLocaleDateString('pt-BR') : '-'}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
