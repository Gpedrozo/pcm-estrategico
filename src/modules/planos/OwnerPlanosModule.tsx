import { useOwnerPlans } from '@/hooks/useOwnerPortal'

type Plan = {
  id: string
  code?: string
  name?: string
  user_limit?: number
  price_month?: number
  active?: boolean
}

const money = (value: unknown) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0))

export function OwnerPlanosModule() {
  const { data, isLoading } = useOwnerPlans()

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando planos...</div>
  }

  const plans = (data as Plan[] | undefined) ?? []

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold">Planos</h2>
      <div className="space-y-2">
        {plans.map((plan) => (
          <div key={plan.id} className="grid grid-cols-4 items-center rounded-md border border-slate-800 p-3 text-sm">
            <span>{plan.name ?? plan.code}</span>
            <span className="text-slate-400">Usuários: {plan.user_limit ?? '-'}</span>
            <span className="text-slate-400">{money(plan.price_month)}</span>
            <span className={plan.active ? 'text-emerald-300' : 'text-slate-400'}>{plan.active ? 'Ativo' : 'Inativo'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
