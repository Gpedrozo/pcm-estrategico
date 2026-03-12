import { useOwnerStats } from '@/hooks/useOwnerPortal'

const formatNumber = (value: unknown) => new Intl.NumberFormat('pt-BR').format(Number(value ?? 0))

const formatMoney = (value: unknown) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0))

export function OwnerDashboardModule() {
  const { data, isLoading, error } = useOwnerStats()

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando indicadores...</div>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-700/50 bg-rose-950/20 p-4 text-sm text-rose-200">
        Falha ao carregar dashboard owner: {String((error as any)?.message ?? 'erro desconhecido')}
      </div>
    )
  }

  const cards = [
    { label: 'Empresas', value: formatNumber(data?.total_companies) },
    { label: 'Novas empresas no mês', value: formatNumber(data?.new_companies_month) },
    { label: 'Empresas bloqueadas', value: formatNumber(data?.blocked_companies) },
    { label: 'Usuários', value: formatNumber(data?.total_users) },
    { label: 'Assinaturas ativas', value: formatNumber(data?.active_subscriptions) },
    { label: 'Assinaturas vencendo/atrasadas', value: formatNumber(data?.overdue_subscriptions) },
    { label: 'Chamados abertos', value: formatNumber(data?.open_tickets) },
    { label: 'MRR', value: formatMoney(data?.mrr) },
    { label: 'ARR', value: formatMoney(data?.arr) },
    { label: 'Churn 30d', value: `${Number(data?.churn_rate ?? 0).toFixed(2)}%` },
  ]

  const usageByPlan = Object.entries((data?.usage_by_plan && typeof data.usage_by_plan === 'object' ? data.usage_by_plan : {}) as Record<string, number>)
  const alertsRaw = data?.system_alerts
  const alerts = Array.isArray(alertsRaw)
    ? alertsRaw as Array<{ id: string; action_type?: string; severity?: string; created_at?: string }>
    : []

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-sm font-semibold">Planos mais utilizados</h3>
          <div className="mt-3 space-y-2">
            {usageByPlan.length === 0 ? (
              <p className="text-sm text-slate-400">Sem dados de uso por plano.</p>
            ) : (
              usageByPlan.map(([plan, total]) => (
                <div key={plan} className="flex items-center justify-between rounded-md border border-slate-800 px-3 py-2 text-sm">
                  <span>{plan}</span>
                  <span className="text-slate-300">{formatNumber(total)}</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-sm font-semibold">Alertas do sistema</h3>
          <div className="mt-3 space-y-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-400">Sem alertas críticos no período.</p>
            ) : (
              alerts.slice(0, 10).map((alert) => (
                <div key={alert.id} className="rounded-md border border-slate-800 px-3 py-2 text-xs">
                  <p className="font-medium">{alert.action_type ?? 'Evento'}</p>
                  <p className="text-slate-400">Severidade: {alert.severity ?? 'info'}</p>
                  <p className="text-slate-500">{alert.created_at ? new Date(alert.created_at).toLocaleString('pt-BR') : '-'}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  )
}
