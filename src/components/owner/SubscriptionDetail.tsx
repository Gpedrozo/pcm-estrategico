import SubscriptionPlanCard from './SubscriptionPlanCard'
import SubscriptionBillingCard from './SubscriptionBillingCard'
import SubscriptionPaymentsTable from './SubscriptionPaymentsTable'
import SubscriptionActions from './SubscriptionActions'
import type { SubscriptionRecord, PlanRecord, PaymentRecord } from '@/hooks/useSubscriptionDetail'
import type { OwnerAction } from '@/services/ownerPortal.service'

interface Props {
  subscription: SubscriptionRecord | null
  plans: PlanRecord[]
  companies: Record<string, unknown>[]
  payments: PaymentRecord[]
  paymentsLoading: boolean
  asaasHealthOk: boolean | null
  isOwnerMaster: boolean
  busy: boolean
  runAction: (action: OwnerAction, payload: Record<string, unknown>) => Promise<unknown>
  onRefreshPayments: () => void
  onFeedback: (msg: string) => void
  onError: (msg: string) => void
}

export default function SubscriptionDetail({
  subscription,
  plans,
  companies,
  payments,
  paymentsLoading,
  asaasHealthOk,
  isOwnerMaster,
  busy,
  runAction,
  onRefreshPayments,
  onFeedback,
  onError,
}: Props) {
  if (!subscription) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-muted/50 p-12">
        <p className="text-sm text-muted-foreground">Selecione uma assinatura na lista ao lado.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <SubscriptionActions
        subscription={subscription}
        companies={companies}
        isOwnerMaster={isOwnerMaster}
        busy={busy}
        runAction={runAction}
        onFeedback={onFeedback}
        onError={onError}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <SubscriptionPlanCard
          subscription={subscription}
          plans={plans}
          companies={companies}
          busy={busy}
          runAction={runAction}
          onFeedback={onFeedback}
          onError={onError}
        />
        <SubscriptionBillingCard
          subscription={subscription}
          companies={companies}
          asaasHealthOk={asaasHealthOk}
          isOwnerMaster={isOwnerMaster}
          busy={busy}
          runAction={runAction}
          onFeedback={onFeedback}
          onError={onError}
        />
      </div>
      <SubscriptionPaymentsTable
        payments={payments}
        loading={paymentsLoading}
        onRefresh={onRefreshPayments}
      />
    </div>
  )
}
