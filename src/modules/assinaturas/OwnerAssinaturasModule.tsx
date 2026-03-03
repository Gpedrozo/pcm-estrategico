import { useOwnerSubscriptions } from '@/hooks/useOwnerPortal'

type Subscription = {
  id: string
  empresa_id?: string
  status?: string
  payment_status?: string
  renewal_at?: string
}

export function OwnerAssinaturasModule() {
  const { data, isLoading } = useOwnerSubscriptions()

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando assinaturas...</div>
  }

  const subscriptions = ((data as unknown as Subscription[] | undefined) ?? []).slice(0, 30)

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold">Assinaturas</h2>
      <div className="space-y-2">
        {subscriptions.map((subscription) => (
          <div key={subscription.id} className="grid grid-cols-4 items-center rounded-md border border-slate-800 p-3 text-sm">
            <span className="truncate">{subscription.empresa_id}</span>
            <span className="text-slate-400">{subscription.status ?? '-'}</span>
            <span className="text-slate-400">{subscription.payment_status ?? '-'}</span>
            <span className="text-slate-400">{subscription.renewal_at ? new Date(subscription.renewal_at).toLocaleDateString('pt-BR') : '-'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
