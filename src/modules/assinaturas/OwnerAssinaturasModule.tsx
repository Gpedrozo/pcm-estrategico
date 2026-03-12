import { useMemo, useState } from 'react'
import { useOwnerCompanies, useOwnerCompanyActions, useOwnerPlans, useOwnerSubscriptions } from '@/hooks/useOwnerPortal'

type Subscription = {
  id: string
  empresa_id?: string
  plan_id?: string
  amount?: number
  period?: string
  status?: string
  payment_status?: string
  payment_method?: string
  starts_at?: string
  ends_at?: string
  renewal_at?: string
}

type Company = { id: string; nome?: string }
type Plan = { id: string; name?: string; code?: string; price_month?: number }

const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

export function OwnerAssinaturasModule() {
  const { createSubscriptionMutation, setSubscriptionStatusMutation } = useOwnerCompanyActions()
  const { data: companiesData, error: companiesError } = useOwnerCompanies()
  const { data: plansData, error: plansError } = useOwnerPlans()

  const companies = useMemo(() => toArray<Company>(companiesData?.companies).slice(0, 500), [companiesData])
  const plans = useMemo(() => toArray<Plan>(plansData).slice(0, 500), [plansData])

  const [form, setForm] = useState({
    empresa_id: '',
    plan_id: '',
    amount: '',
    period: 'monthly',
    payment_method: 'boleto',
    status: 'ativa',
    starts_at: '',
    ends_at: '',
  })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading, error: subscriptionsError } = useOwnerSubscriptions()

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando assinaturas...</div>
  }

  const subscriptions = toArray<Subscription>(data).slice(0, 30)

  if (companiesError || plansError || subscriptionsError) {
    return (
      <div className="rounded-lg border border-rose-700/50 bg-rose-950/20 p-4 text-sm text-rose-200">
        Falha ao carregar assinaturas: {String((companiesError as any)?.message || (plansError as any)?.message || (subscriptionsError as any)?.message || 'erro desconhecido')}
      </div>
    )
  }

  const handleCreateSubscription = () => {
    if (!form.empresa_id || !form.plan_id) {
      setError('Selecione empresa e plano para criar a assinatura.')
      return
    }

    setMessage(null)
    setError(null)

    createSubscriptionMutation.mutate(
      {
        empresa_id: form.empresa_id,
        plan_id: form.plan_id,
        amount: Number(form.amount || 0),
        period: form.period as 'monthly' | 'quarterly' | 'yearly' | 'custom',
        payment_method: form.payment_method,
        status: form.status as 'ativa' | 'atrasada' | 'cancelada' | 'teste',
        starts_at: form.starts_at || undefined,
        ends_at: form.ends_at || undefined,
      },
      {
        onSuccess: () => {
          setMessage('Assinatura criada/atualizada com sucesso.')
          setForm((prev) => ({ ...prev, amount: '', starts_at: '', ends_at: '' }))
        },
        onError: (err: any) => setError(err?.message ?? 'Falha ao criar assinatura.'),
      },
    )
  }

  const changeStatus = (empresaId: string, status: string) => {
    setMessage(null)
    setError(null)
    setSubscriptionStatusMutation.mutate(
      { empresaId, status },
      {
        onSuccess: () => setMessage(`Status atualizado para ${status}.`),
        onError: (err: any) => setError(err?.message ?? 'Falha ao atualizar status da assinatura.'),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold">Criar / Atualizar assinatura</h2>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={form.empresa_id} onChange={(e) => setForm((prev) => ({ ...prev, empresa_id: e.target.value }))}>
            <option value="">Empresa</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.nome ?? company.id}</option>
            ))}
          </select>
          <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={form.plan_id} onChange={(e) => {
            const selected = plans.find((plan) => plan.id === e.target.value)
            setForm((prev) => ({
              ...prev,
              plan_id: e.target.value,
              amount: selected?.price_month ? String(selected.price_month) : prev.amount,
            }))
          }}>
            <option value="">Plano</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>{plan.name ?? plan.code}</option>
            ))}
          </select>
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Valor" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} />
          <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={form.period} onChange={(e) => setForm((prev) => ({ ...prev, period: e.target.value }))}>
            <option value="monthly">Mensal</option>
            <option value="quarterly">Trimestral</option>
            <option value="yearly">Anual</option>
            <option value="custom">Customizado</option>
          </select>
          <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={form.payment_method} onChange={(e) => setForm((prev) => ({ ...prev, payment_method: e.target.value }))}>
            <option value="boleto">Boleto</option>
            <option value="pix">PIX</option>
            <option value="cartao">Cartão</option>
            <option value="transferencia">Transferência</option>
          </select>
          <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="ativa">Ativa</option>
            <option value="atrasada">Atrasada</option>
            <option value="cancelada">Cancelada</option>
            <option value="teste">Teste</option>
          </select>
          <input type="date" className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={form.starts_at} onChange={(e) => setForm((prev) => ({ ...prev, starts_at: e.target.value }))} />
          <input type="date" className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={form.ends_at} onChange={(e) => setForm((prev) => ({ ...prev, ends_at: e.target.value }))} />
        </div>
        <button onClick={handleCreateSubscription} className="mt-3 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900" disabled={createSubscriptionMutation.isPending}>
          Salvar assinatura
        </button>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold">Assinaturas</h2>
        <div className="space-y-2">
          {subscriptions.map((subscription) => (
            <div key={subscription.id} className="grid grid-cols-6 items-center gap-2 rounded-md border border-slate-800 p-3 text-sm">
              <span className="truncate">{subscription.empresa_id}</span>
              <span className="text-slate-400">{subscription.status ?? '-'}</span>
              <span className="text-slate-400">{subscription.payment_status ?? '-'}</span>
              <span className="text-slate-400">{subscription.renewal_at ? new Date(subscription.renewal_at).toLocaleDateString('pt-BR') : '-'}</span>
              <span className="text-slate-400">{subscription.payment_method ?? '-'}</span>
              <div className="flex gap-1">
                <button onClick={() => subscription.empresa_id && changeStatus(subscription.empresa_id, 'ativa')} className="rounded border border-emerald-800 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-950">Ativar</button>
                <button onClick={() => subscription.empresa_id && changeStatus(subscription.empresa_id, 'atrasada')} className="rounded border border-amber-800 px-2 py-1 text-xs text-amber-300 hover:bg-amber-950">Atrasada</button>
                <button onClick={() => subscription.empresa_id && changeStatus(subscription.empresa_id, 'cancelada')} className="rounded border border-rose-800 px-2 py-1 text-xs text-rose-300 hover:bg-rose-950">Cancelar</button>
              </div>
            </div>
          ))}
        </div>
        {message && <p className="mt-2 text-sm text-emerald-300">{message}</p>}
        {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
      </div>
    </div>
  )
}
