import { useState } from 'react'
import { SurfaceCard } from '@/pages/owner2/owner2Components'
import { statusColor } from '@/pages/owner2/owner2Helpers'
import SubscriptionMetrics from './SubscriptionMetrics'
import SubscriptionList from './SubscriptionList'
import SubscriptionDetail from './SubscriptionDetail'
import type { OwnerAction } from '@/services/ownerPortal.service'
import type { useSubscriptionDetail } from '@/hooks/useSubscriptionDetail'

type HookReturn = ReturnType<typeof useSubscriptionDetail>

interface Props {
  hook: HookReturn
  companies: Record<string, unknown>[]
  isOwnerMaster: boolean
  onFeedback: (msg: string) => void
  onError: (msg: string) => void

  // Plan CRUD props (carried from Owner2 to keep plans section here)
  showPlanForm: boolean
  setShowPlanForm: (v: boolean) => void
  editingPlanId: string
  setEditingPlanId: (v: string) => void
  planCode: string
  setPlanCode: (v: string) => void
  planName: string
  setPlanName: (v: string) => void
  planPrice: string
  setPlanPrice: (v: string) => void
  planDefaultPeriod: 'monthly' | 'quarterly' | 'yearly'
  setPlanDefaultPeriod: (v: 'monthly' | 'quarterly' | 'yearly') => void
  planUserLimit: string
  setPlanUserLimit: (v: string) => void
  planDataLimitMb: string
  setPlanDataLimitMb: (v: string) => void
  busy: boolean
  runOwnerAction: (action: string, payload: Record<string, unknown>, msg: string) => void

  // Create subscription form – reuse existing state from Owner2
  companyId: string
  subscriptionPlanId: string
  setSubscriptionPlanId: (v: string) => void
  subscriptionAmount: string
  setSubscriptionAmount: (v: string) => void
  subscriptionPeriod: string
  setSubscriptionPeriod: (v: string) => void
  subscriptionStatus: string
  setSubscriptionStatus: (v: string) => void
  subscriptionPaymentMethod: string
  setSubscriptionPaymentMethod: (v: string) => void
  subscriptionStartsAt: string
  setSubscriptionStartsAt: (v: string) => void
  subscriptionEndsAt: string
  setSubscriptionEndsAt: (v: string) => void
  subscriptionRenewalAt: string
  setSubscriptionRenewalAt: (v: string) => void
}

export default function SubscriptionsTab({
  hook,
  companies,
  isOwnerMaster,
  onFeedback,
  onError,
  showPlanForm,
  setShowPlanForm,
  editingPlanId,
  setEditingPlanId,
  planCode,
  setPlanCode,
  planName,
  setPlanName,
  planPrice,
  setPlanPrice,
  planDefaultPeriod,
  setPlanDefaultPeriod,
  planUserLimit,
  setPlanUserLimit,
  planDataLimitMb,
  setPlanDataLimitMb,
  busy: ownerBusy,
  runOwnerAction,
  companyId,
  subscriptionPlanId,
  setSubscriptionPlanId,
  subscriptionAmount,
  setSubscriptionAmount,
  subscriptionPeriod,
  setSubscriptionPeriod,
  subscriptionStatus,
  setSubscriptionStatus,
  subscriptionPaymentMethod,
  setSubscriptionPaymentMethod,
  subscriptionStartsAt,
  setSubscriptionStartsAt,
  subscriptionEndsAt,
  setSubscriptionEndsAt,
  subscriptionRenewalAt,
  setSubscriptionRenewalAt,
}: Props) {
  const {
    plans,
    filteredSubscriptions,
    selectedSub,
    payments,
    metrics,
    paymentStatusChartData,
    subscriptions,
    asaasHealthOk,
    selectedSubId,
    setSelectedSubId,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    paymentsLoading,
    busy: hookBusy,
    runAction,
    refreshPayments,
    plansLoading,
    subscriptionsLoading,
  } = hook

  // Local company selector for new subscription form
  const [localCompanyId, setLocalCompanyId] = useState(companyId)

  const [showNewSubForm, setShowNewSubForm] = useState(false)

  const effectiveCompanyId = localCompanyId || companyId

  if (plansLoading || subscriptionsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin h-6 w-6 rounded-full border-2 border-sky-600 border-t-transparent" />
        <span className="ml-3 text-sm text-muted-foreground">Carregando dados de assinaturas...</span>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {/* Row 1: Metrics */}
      <SubscriptionMetrics
        metrics={metrics}
        paymentStatusChartData={paymentStatusChartData}
        subscriptions={subscriptions}
      />

      {/* Row 2: Plan catalog */}
      <SurfaceCard title="Catalogo de Planos" subtitle="Gerencie os planos disponiveis para as empresas">
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50 transition-colors"
            onClick={() => {
              setShowPlanForm(!showPlanForm)
              setEditingPlanId('')
              setPlanCode('')
              setPlanName('')
              setPlanPrice('0')
              setPlanDefaultPeriod('monthly')
              setPlanUserLimit('10')
              setPlanDataLimitMb('2048')
            }}
          >
            {showPlanForm && !editingPlanId ? 'Cancelar' : '+ Cadastrar Novo Plano'}
          </button>
        </div>
        {(showPlanForm || editingPlanId) && (
          <div className="mb-4 grid gap-2 rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-xs font-semibold text-muted-foreground">{editingPlanId ? 'Editar Plano' : 'Novo Plano'}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={planCode} onChange={(e) => setPlanCode(e.target.value)} placeholder="Codigo" />
              <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Nome" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} placeholder="Preco mensal" />
              <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={planDefaultPeriod} onChange={(e) => setPlanDefaultPeriod(e.target.value as 'monthly' | 'quarterly' | 'yearly')}>
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" type="number" min="1" value={planUserLimit} onChange={(e) => setPlanUserLimit(e.target.value)} placeholder="Limite de usuarios" />
              <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" type="number" min="256" value={planDataLimitMb} onChange={(e) => setPlanDataLimitMb(e.target.value)} placeholder="Limite dados (MB)" />
            </div>
            {editingPlanId ? (
              <div className="flex gap-2">
                <button className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white" disabled={ownerBusy || !planCode || !planName} onClick={() => { runOwnerAction('update_plan', { plan: { id: editingPlanId, code: planCode.toUpperCase(), name: planName, description: `Periodicidade padrao: ${planDefaultPeriod}`, price_month: Number(planPrice || 0), module_flags: { default_periodicity: planDefaultPeriod } } }, 'Plano atualizado com sucesso.'); setEditingPlanId(''); setPlanCode(''); setPlanName(''); setPlanPrice('0'); setPlanDefaultPeriod('monthly'); setPlanUserLimit('10'); setPlanDataLimitMb('2048'); }}>Alterar plano</button>
                <button className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50 transition-colors" onClick={() => { setEditingPlanId(''); setPlanCode(''); setPlanName(''); setPlanPrice('0'); setPlanDefaultPeriod('monthly'); setPlanUserLimit('10'); setPlanDataLimitMb('2048'); }}>Cancelar edicao</button>
              </div>
            ) : (
              <button className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50 transition-colors" disabled={ownerBusy || !planCode || !planName} onClick={() => { runOwnerAction('create_plan', { plan: { code: planCode.toUpperCase(), name: planName, description: `Periodicidade padrao: ${planDefaultPeriod}`, price_month: Number(planPrice || 0), user_limit: Number(planUserLimit) || 10, data_limit_mb: Number(planDataLimitMb) || 2048, module_flags: { default_periodicity: planDefaultPeriod }, active: true } }, 'Plano criado com sucesso.'); setShowPlanForm(false); }}>Criar plano</button>
            )}
          </div>
        )}
        <div className="max-h-[420px] overflow-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="px-2 py-2 text-left">Codigo</th>
                <th className="px-2 py-2 text-left">Nome</th>
                <th className="px-2 py-2 text-left">Preco</th>
                <th className="px-2 py-2 text-left">Periodo</th>
                <th className="px-2 py-2 text-left">Acao</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => {
                const flags = (p as Record<string, unknown>).module_flags as Record<string, unknown> | undefined
                const periodLabel = flags?.default_periodicity === 'yearly' ? 'Anual' : flags?.default_periodicity === 'quarterly' ? 'Trimestral' : 'Mensal'
                return (
                  <tr key={String(p.id)} className={`border-t border-border ${editingPlanId === String(p.id) ? 'bg-amber-50' : ''}`}>
                    <td className="px-2 py-2">{String(p.code ?? '-')}</td>
                    <td className="px-2 py-2">{String(p.name ?? '-')}</td>
                    <td className="px-2 py-2">R$ {Number(p.price_month ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2">{periodLabel}</td>
                    <td className="px-2 py-2">
                      <button className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700" onClick={() => { setEditingPlanId(String(p.id)); setPlanCode(String(p.code ?? '')); setPlanName(String(p.name ?? '')); setPlanPrice(String(p.price_month ?? '0')); setPlanDefaultPeriod((flags?.default_periodicity as 'monthly' | 'quarterly' | 'yearly') || 'monthly'); setShowPlanForm(false); }}>Editar</button>
                    </td>
                  </tr>
                )
              })}
              {plans.length === 0 && <tr><td colSpan={5} className="px-2 py-3 text-muted-foreground">Nenhum plano cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </SurfaceCard>

      {/* Row 3: New subscription form (toggle) */}
      <SurfaceCard title="Nova Assinatura" subtitle="Criar assinatura para uma empresa">
        <button
          className="mb-3 rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 transition-colors"
          onClick={() => setShowNewSubForm(!showNewSubForm)}
        >
          {showNewSubForm ? 'Fechar formulario' : '+ Nova assinatura'}
        </button>
        {showNewSubForm && (
          <div className="grid gap-2 rounded-lg border border-border bg-muted/50 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Empresa</label>
                <select className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-2 text-sm" value={effectiveCompanyId} onChange={(e) => setLocalCompanyId(e.target.value)}>
                  <option value="">Selecione a empresa</option>
                  {companies.map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.nome ?? c.slug ?? c.id)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Plano</label>
                <select className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-2 text-sm" value={subscriptionPlanId} onChange={(e) => setSubscriptionPlanId(e.target.value)}>
                  <option value="">Selecione o plano</option>
                  {plans.map((p) => <option key={String(p.id)} value={String(p.id)}>{String(p.name ?? p.code ?? p.id)}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={subscriptionAmount} onChange={(e) => setSubscriptionAmount(e.target.value)} placeholder="Valor (R$)" />
              <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={subscriptionPeriod} onChange={(e) => setSubscriptionPeriod(e.target.value)}>
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
                <option value="custom">Customizada</option>
              </select>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={subscriptionStatus} onChange={(e) => setSubscriptionStatus(e.target.value)}>
                <option value="teste">TESTE</option>
                <option value="ativa">Ativa</option>
                <option value="atrasada">Atrasada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={subscriptionPaymentMethod} onChange={(e) => setSubscriptionPaymentMethod(e.target.value)}>
                <option value="pix">PIX</option>
                <option value="boleto">Boleto</option>
                <option value="credit_card">Cartao de credito</option>
              </select>
              <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" type="date" value={subscriptionStartsAt} onChange={(e) => setSubscriptionStartsAt(e.target.value)} title="Inicio" />
              <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" type="date" value={subscriptionRenewalAt} onChange={(e) => setSubscriptionRenewalAt(e.target.value)} title="Proximo vencimento" />
              <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" type="date" value={subscriptionEndsAt} onChange={(e) => setSubscriptionEndsAt(e.target.value)} title="Fim (opcional)" />
            </div>
            <button
              className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50 transition-colors"
              disabled={ownerBusy || !effectiveCompanyId || !subscriptionPlanId}
              onClick={() => runOwnerAction('create_subscription', { subscription: { empresa_id: effectiveCompanyId, plan_id: subscriptionPlanId, amount: Number(subscriptionAmount || 0), period: subscriptionPeriod, payment_method: subscriptionPaymentMethod, starts_at: subscriptionStartsAt || undefined, renewal_at: subscriptionRenewalAt || undefined, ends_at: subscriptionEndsAt || undefined, status: subscriptionStatus } }, 'Assinatura criada com sucesso.')}
            >
              Criar assinatura
            </button>
          </div>
        )}
      </SurfaceCard>

      {/* Row 4: Master-detail */}
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <SubscriptionList
          subscriptions={filteredSubscriptions}
          plans={plans}
          companies={companies}
          selectedSubId={selectedSubId}
          onSelect={setSelectedSubId}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
        <SubscriptionDetail
          subscription={selectedSub}
          plans={plans}
          companies={companies}
          payments={payments}
          paymentsLoading={paymentsLoading}
          asaasHealthOk={asaasHealthOk}
          isOwnerMaster={isOwnerMaster}
          busy={hookBusy}
          runAction={runAction}
          onRefreshPayments={refreshPayments}
          onFeedback={onFeedback}
          onError={onError}
        />
      </div>
    </div>
  )
}
