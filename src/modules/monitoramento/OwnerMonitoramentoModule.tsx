import { useMemo } from 'react'
import { useOwnerStats } from '@/hooks/useOwnerPortal'

type Alert = {
  id: string
  action_type?: string
  severity?: string
  created_at?: string
}

export function OwnerMonitoramentoModule() {
  const { data, isLoading } = useOwnerStats()

  const alerts = useMemo(() => ((data?.system_alerts as Alert[] | undefined) ?? []).slice(0, 20), [data])

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando monitoramento...</div>
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Alertas ativos</p>
          <p className="mt-2 text-2xl font-semibold">{alerts.length}</p>
        </article>
        <article className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Assinaturas atrasadas</p>
          <p className="mt-2 text-2xl font-semibold">{Number(data?.overdue_subscriptions ?? 0)}</p>
        </article>
        <article className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Chamados abertos</p>
          <p className="mt-2 text-2xl font-semibold">{Number(data?.open_tickets ?? 0)}</p>
        </article>
        <article className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Churn (30d)</p>
          <p className="mt-2 text-2xl font-semibold">{Number(data?.churn_rate ?? 0).toFixed(2)}%</p>
        </article>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold">Alertas técnicos e operacionais</h2>
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-400">Sem alertas críticos no momento.</p>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="rounded border border-slate-800 p-3 text-xs">
                <p className="font-medium">{alert.action_type ?? 'Evento'}</p>
                <p className="text-slate-400">Severidade: {alert.severity ?? 'info'}</p>
                <p className="text-slate-500">{alert.created_at ? new Date(alert.created_at).toLocaleString('pt-BR') : '-'}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
