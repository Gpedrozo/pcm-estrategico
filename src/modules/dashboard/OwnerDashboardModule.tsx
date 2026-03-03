import { useOwnerStats } from '@/hooks/useOwnerPortal'

const formatNumber = (value: unknown) => new Intl.NumberFormat('pt-BR').format(Number(value ?? 0))

const formatMoney = (value: unknown) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0))

export function OwnerDashboardModule() {
  const { data, isLoading } = useOwnerStats()

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando indicadores...</div>
  }

  const cards = [
    { label: 'Empresas', value: formatNumber(data?.total_companies) },
    { label: 'Usuários', value: formatNumber(data?.total_users) },
    { label: 'Assinaturas ativas', value: formatNumber(data?.active_subscriptions) },
    { label: 'MRR', value: formatMoney(data?.mrr) },
  ]

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.label} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold">{card.value}</p>
        </article>
      ))}
    </section>
  )
}
