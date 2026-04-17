import { useState } from 'react'
import { CheckCircle2, Link2, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { SurfaceCard } from '@/pages/owner2/owner2Components'
import { statusColor } from '@/pages/owner2/owner2Helpers'
import type { SubscriptionRecord } from '@/hooks/useSubscriptionDetail'
import type { OwnerAction } from '@/services/ownerPortal.service'

interface Props {
  subscription: SubscriptionRecord
  companies: Record<string, unknown>[]
  asaasHealthOk: boolean | null
  isOwnerMaster: boolean
  busy: boolean
  runAction: (action: OwnerAction, payload: Record<string, unknown>) => Promise<unknown>
  onFeedback: (msg: string) => void
  onError: (msg: string) => void
}

export default function SubscriptionBillingCard({
  subscription,
  companies: _companies,
  asaasHealthOk,
  isOwnerMaster,
  busy,
  runAction,
  onFeedback,
  onError,
}: Props) {
  const [billingAmount, setBillingAmount] = useState('')
  const [billingPaymentStatus, setBillingPaymentStatus] = useState('paid')
  const [billingRenewalAt, setBillingRenewalAt] = useState('')
  const [asaasCustomerId, setAsaasCustomerId] = useState('')
  const [asaasSubscriptionId, setAsaasSubscriptionId] = useState('')

  const provider = String(subscription.billing_provider ?? 'manual')
  const providerBadge =
    provider === 'asaas'
      ? 'bg-violet-100 text-violet-700 border-violet-200'
      : provider === 'stripe'
        ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
        : 'bg-muted text-muted-foreground border-border'

  async function handleUpdateBilling() {
    try {
      await runAction('update_subscription_billing' as OwnerAction, {
        subscription_id: String(subscription.id),
        amount: billingAmount ? Number(billingAmount) : undefined,
        payment_status: billingPaymentStatus,
        renewal_at: billingRenewalAt || undefined,
      })
      onFeedback('Cobranca atualizada com sucesso.')
    } catch (err: any) {
      onError(String(err?.message ?? 'Falha ao atualizar cobranca.'))
    }
  }

  async function handleLinkAsaas() {
    try {
      await runAction('asaas_link_subscription' as OwnerAction, {
        subscription_id: String(subscription.id),
        asaas_customer_id: asaasCustomerId || undefined,
        asaas_subscription_id: asaasSubscriptionId || undefined,
      })
      onFeedback('Vinculo ASAAS salvo com sucesso.')
    } catch (err: any) {
      onError(String(err?.message ?? 'Falha ao vincular ASAAS.'))
    }
  }

  async function handleSyncAsaas() {
    try {
      await runAction('asaas_sync_subscription' as OwnerAction, {
        subscription_id: String(subscription.id),
      })
      onFeedback('Sincronizacao ASAAS concluida.')
    } catch (err: any) {
      onError(String(err?.message ?? 'Falha na sincronizacao ASAAS.'))
    }
  }

  return (
    <div className="grid gap-4">
      {/* Provider + payment status */}
      <SurfaceCard title="Cobranca" subtitle="Provider e status de pagamento">
        <div className="grid gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Provider:</span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${providerBadge}`}>
              {provider.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Pagamento:</span>
            <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor(String(subscription.payment_status ?? ''))}`}>
              {String(subscription.payment_status ?? '-')}
            </span>
          </div>

          {/* Update billing form */}
          <div className="grid gap-2 rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-xs font-semibold text-muted-foreground">Atualizar cobranca</p>
            <input
              className="rounded-lg border border-input bg-background px-2 py-2 text-sm"
              placeholder="Novo valor (opcional)"
              value={billingAmount}
              onChange={(e) => setBillingAmount(e.target.value)}
            />
            <select
              className="rounded-lg border border-input bg-background px-2 py-2 text-sm"
              value={billingPaymentStatus}
              onChange={(e) => setBillingPaymentStatus(e.target.value)}
            >
              <option value="paid">Pago</option>
              <option value="late">Atrasado</option>
              <option value="pending">Pendente</option>
              <option value="failed">Falhou</option>
            </select>
            <input
              className="rounded-lg border border-input bg-background px-2 py-2 text-sm"
              type="date"
              value={billingRenewalAt}
              onChange={(e) => setBillingRenewalAt(e.target.value)}
              title="Prox. renovacao (opcional)"
              placeholder="Prox. renovacao"
            />
            <button
              className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50 transition-colors"
              disabled={busy || !billingPaymentStatus}
              onClick={handleUpdateBilling}
            >
              Atualizar cobranca
            </button>
          </div>
        </div>
      </SurfaceCard>

      {/* ASAAS Status + Link */}
      <SurfaceCard title="Integracao ASAAS" subtitle="Gateway de pagamento">
        <div className="grid gap-3">
          {/* Status indicator */}
          <div className={`flex items-center gap-3 rounded-xl border p-3 ${asaasHealthOk ? 'border-emerald-200 bg-emerald-50' : asaasHealthOk === false ? 'border-rose-200 bg-rose-50' : 'border-border bg-muted/50'}`}>
            {asaasHealthOk === null ? (
              <><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><div><p className="text-sm font-semibold text-foreground">Verificando...</p><p className="text-xs text-muted-foreground">Checando API key do ASAAS</p></div></>
            ) : asaasHealthOk ? (
              <><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="text-sm font-semibold text-emerald-700">ASAAS conectado</p><p className="text-xs text-emerald-600">API key configurada. Webhooks e sync prontos.</p></div></>
            ) : (
              <><XCircle className="h-5 w-5 text-rose-600" /><div><p className="text-sm font-semibold text-rose-700">ASAAS nao configurado</p><p className="text-xs text-rose-600">Defina ASAAS_API_KEY nos secrets do Supabase.</p></div></>
            )}
          </div>

          {/* Link ASAAS */}
          {isOwnerMaster ? (
            <div className="grid gap-2">
              <input
                className="rounded-lg border border-input bg-background px-2 py-2 text-sm"
                placeholder="Asaas customer ID (cus_xxx)"
                value={asaasCustomerId}
                onChange={(e) => setAsaasCustomerId(e.target.value)}
              />
              <input
                className="rounded-lg border border-input bg-background px-2 py-2 text-sm"
                placeholder="Asaas subscription ID (sub_xxx)"
                value={asaasSubscriptionId}
                onChange={(e) => setAsaasSubscriptionId(e.target.value)}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
                  disabled={busy}
                  onClick={handleLinkAsaas}
                >
                  <Link2 className="h-4 w-4" /> Salvar vinculo
                </button>
                <button
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                  disabled={busy}
                  onClick={handleSyncAsaas}
                >
                  <RefreshCw className="h-4 w-4" /> Sincronizar agora
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Ao vincular, o webhook do ASAAS vai atualizar status e pagamentos automaticamente.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">Vinculacao e sincronizacao ASAAS disponivel apenas para OWNER_MASTER.</p>
            </div>
          )}
        </div>
      </SurfaceCard>
    </div>
  )
}