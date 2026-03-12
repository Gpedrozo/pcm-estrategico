import { useState } from 'react'
import { useOwnerCompanyActions, useOwnerPlans } from '@/hooks/useOwnerPortal'

type Plan = {
  id: string
  code?: string
  name?: string
  user_limit?: number
  price_month?: number
  active?: boolean
}

const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

const money = (value: unknown) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0))

export function OwnerPlanosModule() {
  const { createPlanMutation, updatePlanMutation } = useOwnerCompanyActions()
  const { data, isLoading, error: queryError } = useOwnerPlans()

  const [form, setForm] = useState({
    code: '',
    name: '',
    user_limit: '10',
    price_month: '0',
    active: true,
  })
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando planos...</div>
  }

  if (queryError) {
    return (
      <div className="rounded-lg border border-rose-700/50 bg-rose-950/20 p-4 text-sm text-rose-200">
        Falha ao carregar planos: {String((queryError as any)?.message ?? 'erro desconhecido')}
      </div>
    )
  }

  const plans = toArray<Plan>(data)

  const resetForm = () => {
    setForm({ code: '', name: '', user_limit: '10', price_month: '0', active: true })
    setEditingCode(null)
  }

  const handleSavePlan = () => {
    if (!form.code.trim() || !form.name.trim()) {
      setError('Preencha código e nome do plano.')
      return
    }

    setMessage(null)
    setError(null)

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      user_limit: Number(form.user_limit || 0),
      price_month: Number(form.price_month || 0),
      active: form.active,
    }

    const mutation = editingCode ? updatePlanMutation : createPlanMutation
    mutation.mutate(payload, {
      onSuccess: () => {
        setMessage(editingCode ? 'Plano atualizado com sucesso.' : 'Plano criado com sucesso.')
        resetForm()
      },
      onError: (err: any) => setError(err?.message ?? 'Falha ao salvar plano.'),
    })
  }

  const togglePlanStatus = (plan: Plan) => {
    setMessage(null)
    setError(null)
    updatePlanMutation.mutate(
      {
        code: plan.code,
        name: plan.name,
        user_limit: plan.user_limit,
        price_month: plan.price_month,
        active: !plan.active,
      },
      {
        onSuccess: () => setMessage(`Plano ${plan.code ?? plan.name} atualizado para ${!plan.active ? 'ativo' : 'inativo'}.`),
        onError: (err: any) => setError(err?.message ?? 'Falha ao atualizar status do plano.'),
      },
    )
  }

  const loadForEdit = (plan: Plan) => {
    setEditingCode(plan.code ?? null)
    setForm({
      code: plan.code ?? '',
      name: plan.name ?? '',
      user_limit: String(plan.user_limit ?? 0),
      price_month: String(plan.price_month ?? 0),
      active: Boolean(plan.active),
    })
    setMessage(null)
    setError(null)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold">{editingCode ? 'Editar plano' : 'Criar plano'}</h2>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Código (ex: PRO)" value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} disabled={Boolean(editingCode)} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Limite usuários" value={form.user_limit} onChange={(e) => setForm((prev) => ({ ...prev, user_limit: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Preço mensal" value={form.price_month} onChange={(e) => setForm((prev) => ({ ...prev, price_month: e.target.value }))} />
          <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={form.active ? 'true' : 'false'} onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.value === 'true' }))}>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={handleSavePlan} className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900" disabled={createPlanMutation.isPending || updatePlanMutation.isPending}>
            {editingCode ? 'Salvar alterações' : 'Criar plano'}
          </button>
          {editingCode && (
            <button onClick={resetForm} className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
              Cancelar edição
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold">Planos</h2>
        <div className="space-y-2">
          {plans.map((plan) => (
            <div key={plan.id} className="grid grid-cols-5 items-center gap-2 rounded-md border border-slate-800 p-3 text-sm">
              <span>{plan.name ?? plan.code}</span>
              <span className="text-slate-400">Usuários: {plan.user_limit ?? '-'}</span>
              <span className="text-slate-400">{money(plan.price_month)}</span>
              <span className={plan.active ? 'text-emerald-300' : 'text-slate-400'}>{plan.active ? 'Ativo' : 'Inativo'}</span>
              <div className="flex gap-2">
                <button onClick={() => loadForEdit(plan)} className="rounded border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800">Editar</button>
                <button onClick={() => togglePlanStatus(plan)} className="rounded border border-amber-800 px-3 py-1 text-xs text-amber-300 hover:bg-amber-950">Alternar status</button>
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
