import { SurfaceCard } from '@/pages/owner2/owner2Components'
import { statusColor } from '@/pages/owner2/owner2Helpers'
import type { SubscriptionRecord } from '@/hooks/useSubscriptionDetail'
import type { OwnerAction } from '@/services/ownerPortal.service'

interface Props {
  subscription: SubscriptionRecord
  companies: Record<string, unknown>[]
  isOwnerMaster: boolean
  busy: boolean
  runAction: (action: OwnerAction, payload: Record<string, unknown>) => Promise<unknown>
  onFeedback: (msg: string) => void
  onError: (msg: string) => void
}

export default function SubscriptionActions({
  subscription,
  companies,
  isOwnerMaster,
  busy,
  runAction,
  onFeedback,
  onError,
}: Props) {
  const empresaId = String(subscription.empresa_id ?? '')
  const empresa = companies.find((c) => String(c.id) === empresaId)
  const empresaLabel = empresa ? String(empresa.nome ?? empresa.slug ?? '') : empresaId.slice(0, 8)
  const st = String(subscription.status ?? '-')

  async function handle(action: OwnerAction, payload: Record<string, unknown>, msg: string) {
    try {
      await runAction(action, payload)
      onFeedback(msg)
    } catch (err: any) {
      onError(String(err?.message ?? 'Falha na operacao.'))
    }
  }

  return (
    <SurfaceCard title="Acoes" subtitle={empresaLabel}>
      <div className="grid gap-2">
        {/* Current status */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Status atual:</span>
          <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor(st)}`}>{st}</span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            disabled={busy || !empresaId || st === 'ativa'}
            onClick={() => handle('set_subscription_status' as OwnerAction, { empresa_id: empresaId, status: 'ativa' }, 'Assinatura ativada.')}
            title="Ativa apenas a assinatura (nao altera status da empresa)"
          >
            Ativar assinatura
          </button>

          <button
            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            disabled={busy || !empresaId}
            onClick={() => handle('reactivate_company' as OwnerAction, { empresa_id: empresaId }, 'Empresa reativada com sucesso!')}
            title="Reativa subscription + desbloqueia empresa atomicamente"
          >
            Reativar empresa
          </button>

          <button
            className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            disabled={busy || !empresaId || st === 'cancelada'}
            onClick={() => { if (window.confirm('Tem certeza que deseja cancelar esta assinatura? Esta ação não pode ser desfeita facilmente.')) handle('set_subscription_status' as OwnerAction, { empresa_id: empresaId, status: 'cancelada' }, 'Assinatura cancelada.'); }}
          >
            Cancelar assinatura
          </button>

          {isOwnerMaster && (
            <button
              className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 px-3 py-2 text-sm text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 disabled:opacity-50 transition-colors"
              disabled={busy}
              onClick={() => handle('enforce_subscription_expiry' as OwnerAction, {}, 'Vencimentos processados.')}
            >
              Processar vencimentos
            </button>
          )}
        </div>
      </div>
    </SurfaceCard>
  )
}
