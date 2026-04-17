import { statusColor, asNumber } from '@/pages/owner2/owner2Helpers'
import type { SubscriptionRecord, PlanRecord } from '@/hooks/useSubscriptionDetail'

interface Props {
  subscriptions: SubscriptionRecord[]
  plans: PlanRecord[]
  companies: Record<string, unknown>[]
  selectedSubId: string
  onSelect: (id: string) => void
  searchTerm: string
  onSearchChange: (v: string) => void
  statusFilter: string
  onStatusFilterChange: (v: string) => void
}

export default function SubscriptionList({
  subscriptions,
  plans,
  companies,
  selectedSubId,
  onSelect,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: Props) {
  const fmtDate = (d: unknown) => (d ? new Date(String(d)).toLocaleDateString('pt-BR') : '–')

  return (
    <div className="flex flex-col gap-2">
      {/* Search + Filter */}
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-input bg-background px-2 py-2 text-sm"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar empresa..."
        />
        <select
          className="rounded-lg border border-input bg-background px-2 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
        >
          <option value="todos">Todos</option>
          <option value="ativa">Ativa</option>
          <option value="atrasada">Atrasada</option>
          <option value="teste">Teste</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {/* List */}
      <div className="max-h-[520px] overflow-auto rounded-xl border border-border">
        {subscriptions.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            {searchTerm || statusFilter !== 'todos'
              ? 'Nenhuma assinatura encontrada para o filtro.'
              : 'Nenhuma assinatura cadastrada.'}
          </div>
        ) : (
          subscriptions.map((s, idx) => {
            const id = String(s.id ?? '')
            const empresa = companies.find((c) => String(c.id) === String(s.empresa_id))
            const empresaLabel = empresa
              ? String(empresa.nome ?? empresa.slug ?? '')
              : String(s.empresa_id ?? '-').slice(0, 8)
            const planObj = plans.find(
              (p) => String(p.id) === String(s.plan_id ?? (s as Record<string, unknown>).plano_id),
            )
            // Use embedded planos data from list_subscriptions response, fallback to plans list
            const embeddedPlano = (s as Record<string, unknown>).planos as Record<string, unknown> | null | undefined
            const planLabel = embeddedPlano
              ? String(embeddedPlano.nome ?? embeddedPlano.codigo ?? '-')
              : planObj ? String(planObj.name ?? planObj.code) : '-'
            const st = String(s.status ?? '-')
            const provider = String(s.billing_provider ?? 'manual')
            const providerBadge =
              provider === 'asaas'
                ? 'bg-violet-100 text-violet-700 border-violet-200'
                : provider === 'stripe'
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                  : 'bg-muted text-muted-foreground border-border'
            const isSelected = id === selectedSubId

            return (
              <button
                key={`${id}-${idx}`}
                type="button"
                className={`flex w-full items-center justify-between border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${
                  isSelected ? 'bg-sky-50 dark:bg-sky-950/30' : ''
                }`}
                onClick={() => onSelect(id)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{empresaLabel}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {planLabel} · R$ {asNumber(s.amount, 0).toLocaleString('pt-BR')} · {fmtDate(s.renewal_at)}
                  </p>
                </div>
                <div className="ml-2 flex flex-col items-end gap-1">
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor(st)}`}>
                    {st}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${providerBadge}`}>
                    {provider.toUpperCase()}
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">{subscriptions.length} assinatura(s)</p>
    </div>
  )
}
