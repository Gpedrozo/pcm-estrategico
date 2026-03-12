import { useMemo, useState } from 'react'
import { useOwnerCompanyActions, useOwnerStats, useOwnerSubscriptions } from '@/hooks/useOwnerPortal'

type Subscription = {
  id: string
  empresa_id?: string
  empresas?: { id: string; nome?: string } | null
  plans?: { id: string; code?: string; name?: string } | null
  amount?: number
  period?: string
  payment_method?: string
  status?: string
  payment_status?: string
  renewal_at?: string
  starts_at?: string
  ends_at?: string
}

const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

const money = (value: unknown) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0))

export function OwnerFinanceiroModule() {
  const { updateSubscriptionBillingMutation } = useOwnerCompanyActions()
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useOwnerStats()
  const { data: subscriptionsData, isLoading: isLoadingSubs, error: subscriptionsError } = useOwnerSubscriptions()

  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [billingForm, setBillingForm] = useState({
    amount: '',
    period: 'monthly',
    payment_method: 'boleto',
    payment_status: 'pendente',
    status: 'ativa',
    renewal_at: '',
    starts_at: '',
    ends_at: '',
  })

  const allSubscriptions = useMemo(() => toArray<Subscription>(subscriptionsData).slice(0, 120), [subscriptionsData])

  const subscriptions = useMemo(
    () =>
      allSubscriptions.filter((subscription) => {
        const statusOk = statusFilter === 'all' || subscription.status === statusFilter
        const paymentOk = paymentFilter === 'all' || subscription.payment_status === paymentFilter
        return statusOk && paymentOk
      }),
    [allSubscriptions, statusFilter, paymentFilter],
  )

  const selectedSubscription = subscriptions.find((subscription) => subscription.id === selectedSubscriptionId) ?? null

  if (isLoadingStats || isLoadingSubs) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando central financeira...</div>
  }

  if (statsError || subscriptionsError) {
    return (
      <div className="rounded-lg border border-rose-700/50 bg-rose-950/20 p-4 text-sm text-rose-200">
        Falha ao carregar financeiro: {String((statsError as any)?.message || (subscriptionsError as any)?.message || 'erro desconhecido')}
      </div>
    )
  }

  const selectSubscription = (subscription: Subscription) => {
    setSelectedSubscriptionId(subscription.id)
    setBillingForm({
      amount: String(subscription.amount ?? 0),
      period: subscription.period ?? 'monthly',
      payment_method: subscription.payment_method ?? 'boleto',
      payment_status: subscription.payment_status ?? 'pendente',
      status: subscription.status ?? 'ativa',
      renewal_at: subscription.renewal_at?.slice(0, 10) ?? '',
      starts_at: subscription.starts_at?.slice(0, 10) ?? '',
      ends_at: subscription.ends_at?.slice(0, 10) ?? '',
    })
    setMessage(null)
    setError(null)
  }

  const saveBilling = () => {
    if (!selectedSubscription) {
      setError('Selecione uma assinatura para atualizar o billing.')
      return
    }

    setMessage(null)
    setError(null)

    updateSubscriptionBillingMutation.mutate(
      {
        subscriptionId: selectedSubscription.id,
        empresaId: selectedSubscription.empresa_id,
        billing: {
          amount: Number(billingForm.amount || 0),
          period: billingForm.period,
          payment_method: billingForm.payment_method,
          payment_status: billingForm.payment_status,
          status: billingForm.status as 'ativa' | 'atrasada' | 'cancelada' | 'teste',
          renewal_at: billingForm.renewal_at || null,
          starts_at: billingForm.starts_at || null,
          ends_at: billingForm.ends_at || null,
        },
      },
      {
        onSuccess: () => setMessage('Billing atualizado com sucesso.'),
        onError: (err: any) => setError(err?.message ?? 'Falha ao atualizar billing.'),
      },
    )
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

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-sm font-semibold">Assinaturas e billing</h2>

          <div className="mb-3 grid gap-2 md:grid-cols-2">
            <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Todos status</option>
              <option value="ativa">Ativa</option>
              <option value="atrasada">Atrasada</option>
              <option value="cancelada">Cancelada</option>
              <option value="teste">Teste</option>
            </select>
            <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
              <option value="all">Todos pagamentos</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="inadimplente">Inadimplente</option>
              <option value="estornado">Estornado</option>
            </select>
          </div>

          <div className="space-y-2">
            {subscriptions.map((subscription) => (
              <button
                key={subscription.id}
                onClick={() => selectSubscription(subscription)}
                className={`grid w-full grid-cols-7 items-center gap-2 rounded-md border p-3 text-left text-xs ${
                  selectedSubscriptionId === subscription.id ? 'border-emerald-700 bg-slate-800' : 'border-slate-800'
                }`}
              >
                <span className="truncate">{subscription.empresas?.nome ?? subscription.empresa_id ?? '-'}</span>
                <span>{money(subscription.amount)}</span>
                <span>{subscription.period ?? '-'}</span>
                <span>{subscription.payment_method ?? '-'}</span>
                <span>{subscription.status ?? '-'}</span>
                <span>{subscription.payment_status ?? '-'}</span>
                <span>{subscription.renewal_at ? new Date(subscription.renewal_at).toLocaleDateString('pt-BR') : '-'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-sm font-semibold">Editor de billing</h2>

          {!selectedSubscription ? (
            <p className="text-sm text-slate-400">Selecione uma assinatura para editar dados financeiros.</p>
          ) : (
            <>
              <p className="text-sm font-medium">{selectedSubscription.empresas?.nome ?? selectedSubscription.empresa_id ?? '-'}</p>
              <p className="mt-1 text-xs text-slate-400">Plano: {selectedSubscription.plans?.name ?? selectedSubscription.plans?.code ?? '-'}</p>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Valor" value={billingForm.amount} onChange={(e) => setBillingForm((prev) => ({ ...prev, amount: e.target.value }))} />
                <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={billingForm.period} onChange={(e) => setBillingForm((prev) => ({ ...prev, period: e.target.value }))}>
                  <option value="monthly">Mensal</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="yearly">Anual</option>
                  <option value="custom">Customizado</option>
                </select>
                <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={billingForm.payment_method} onChange={(e) => setBillingForm((prev) => ({ ...prev, payment_method: e.target.value }))}>
                  <option value="boleto">Boleto</option>
                  <option value="pix">PIX</option>
                  <option value="cartao">Cartão</option>
                  <option value="transferencia">Transferência</option>
                </select>
                <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={billingForm.payment_status} onChange={(e) => setBillingForm((prev) => ({ ...prev, payment_status: e.target.value }))}>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="inadimplente">Inadimplente</option>
                  <option value="estornado">Estornado</option>
                </select>
                <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={billingForm.status} onChange={(e) => setBillingForm((prev) => ({ ...prev, status: e.target.value }))}>
                  <option value="ativa">Ativa</option>
                  <option value="atrasada">Atrasada</option>
                  <option value="cancelada">Cancelada</option>
                  <option value="teste">Teste</option>
                </select>
                <input type="date" className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={billingForm.renewal_at} onChange={(e) => setBillingForm((prev) => ({ ...prev, renewal_at: e.target.value }))} />
                <input type="date" className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={billingForm.starts_at} onChange={(e) => setBillingForm((prev) => ({ ...prev, starts_at: e.target.value }))} />
                <input type="date" className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={billingForm.ends_at} onChange={(e) => setBillingForm((prev) => ({ ...prev, ends_at: e.target.value }))} />
              </div>

              <button
                onClick={saveBilling}
                className="mt-3 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
                disabled={updateSubscriptionBillingMutation.isPending}
              >
                Salvar billing
              </button>
            </>
          )}

          {message && <p className="mt-2 text-sm text-emerald-300">{message}</p>}
          {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
        </div>
      </div>
    </section>
  )
}
