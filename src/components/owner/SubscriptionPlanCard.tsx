import { useState } from 'react'
import { SurfaceCard } from '@/pages/owner2/owner2Components'
import { asNumber } from '@/pages/owner2/owner2Helpers'
import type { SubscriptionRecord, PlanRecord } from '@/hooks/useSubscriptionDetail'
import type { OwnerAction } from '@/services/ownerPortal.service'

interface Props {
  subscription: SubscriptionRecord
  plans: PlanRecord[]
  companies: Record<string, unknown>[]
  busy: boolean
  runAction: (action: OwnerAction, payload: Record<string, unknown>) => Promise<unknown>
  onFeedback: (msg: string) => void
  onError: (msg: string) => void
}

export default function SubscriptionPlanCard({
  subscription,
  plans,
  companies,
  busy,
  runAction,
  onFeedback,
  onError,
}: Props) {
  const [planCodeToChange, setPlanCodeToChange] = useState('')

  const planObj = plans.find(
    (p) => String(p.id) === String(subscription.plan_id ?? (subscription as Record<string, unknown>).plano_id),
  )
  const empresa = companies.find((c) => String(c.id) === String(subscription.empresa_id))
  const empresaLabel = empresa ? String(empresa.nome ?? empresa.slug ?? '') : String(subscription.empresa_id ?? '-')
  const flags = planObj ? ((planObj as Record<string, unknown>).module_flags as Record<string, unknown> | undefined) : undefined
  const periodLabel = flags?.default_periodicity === 'yearly' ? 'Anual' : flags?.default_periodicity === 'quarterly' ? 'Trimestral' : 'Mensal'

  const fmtDate = (d: unknown) => (d ? new Date(String(d)).toLocaleDateString('pt-BR') : '–')

  async function handleChangePlan() {
    if (!planCodeToChange.trim()) return
    try {
      await runAction('change_plan' as OwnerAction, {
        empresa_id: String(subscription.empresa_id ?? ''),
        plano_codigo: planCodeToChange.toUpperCase(),
      })
      onFeedback('Plano alterado com sucesso.')
      setPlanCodeToChange('')
    } catch (err: any) {
      onError(String(err?.message ?? 'Falha ao trocar plano.'))
    }
  }

  return (
    <SurfaceCard title="Dados do plano" subtitle={empresaLabel}>
      <div className="grid gap-3">
        <div className="grid gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plano</span>
            <span className="font-medium">{planObj ? String(planObj.name ?? planObj.code) : '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor</span>
            <span className="font-medium">R$ {asNumber(subscription.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Periodicidade</span>
            <span className="font-medium">{String(subscription.period ?? periodLabel)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Inicio</span>
            <span className="font-medium">{fmtDate(subscription.starts_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Renovacao</span>
            <span className="font-medium">{fmtDate(subscription.renewal_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fim</span>
            <span className="font-medium">{fmtDate(subscription.ends_at)}</span>
          </div>
        </div>

        {/* Change plan inline */}
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
            value={planCodeToChange}
            onChange={(e) => setPlanCodeToChange(e.target.value)}
            placeholder="Codigo novo plano"
          />
          <button
            className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 px-3 py-1.5 text-sm text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 disabled:opacity-50 transition-colors"
            disabled={busy || !planCodeToChange.trim()}
            onClick={handleChangePlan}
          >
            Trocar plano
          </button>
        </div>
      </div>
    </SurfaceCard>
  )
}
