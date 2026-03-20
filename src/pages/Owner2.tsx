import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Building2,
  Clock,
  CreditCard,
  Database,
  FileText,
  LifeBuoy,
  Loader2,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { resolveOrRepairTenantHost } from '@/lib/tenantDomain'
import {
  useOwner2Actions,
  useOwner2Audits,
  useOwner2Companies,
  useOwner2Contracts,
  useOwner2Dashboard,
  useOwner2Health,
  useOwner2PlatformOwners,
  useOwner2Plans,
  useOwner2Settings,
  useOwner2Subscriptions,
  useOwner2Tables,
  useOwner2Tickets,
  useOwner2Users,
} from '@/hooks/useOwner2Portal'

const OWNER2_TABS = [
  'dashboard',
  'monitoramento',
  'empresas',
  'usuarios',
  'planos',
  'assinaturas',
  'financeiro',
  'contratos',
  'suporte',
  'configuracoes',
  'feature-flags',
  'auditoria',
  'logs',
  'sistema',
  'owner-master',
] as const

type Owner2Tab = (typeof OWNER2_TABS)[number]

type CompanyCredentialNote = {
  companyName: string
  companySlug: string
  masterEmail: string
  initialPassword: string
  loginUrl: string
  noteText: string
}

const TENANT_BASE_DOMAIN = (import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gppis.com.br').toLowerCase()

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1' || normalized === 'sim') return true
    if (normalized === 'false' || normalized === '0' || normalized === 'nao' || normalized === 'não') return false
  }
  return fallback
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function statusColor(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes('ativo') || normalized.includes('active') || normalized.includes('resolvido')) {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  }
  if (normalized.includes('bloq') || normalized.includes('block') || normalized.includes('inativo') || normalized.includes('cancel')) {
    return 'bg-rose-100 text-rose-700 border-rose-200'
  }
  return 'bg-amber-100 text-amber-700 border-amber-200'
}

function SurfaceCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}

function MetricTile({ label, value, icon: Icon, tone = 'sky' }: { label: string; value: string | number; icon: any; tone?: 'sky' | 'emerald' | 'amber' | 'rose' }) {
  const toneClass = {
    sky: 'from-sky-50 to-cyan-50 border-sky-200 text-sky-800',
    emerald: 'from-emerald-50 to-teal-50 border-emerald-200 text-emerald-800',
    amber: 'from-amber-50 to-orange-50 border-amber-200 text-amber-800',
    rose: 'from-rose-50 to-pink-50 border-rose-200 text-rose-800',
  }[tone]

  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${toneClass}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium opacity-80">{label}</p>
        <Icon className="h-4 w-4 opacity-80" />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

export default function Owner2() {
  const { isSystemOwner, isLoading, user } = useAuth()
  const [activeTab, setActiveTab] = useState<Owner2Tab>('dashboard')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [companyCredentialNote, setCompanyCredentialNote] = useState<CompanyCredentialNote | null>(null)

  const [companyId, setCompanyId] = useState('')
  const [authPassword, setAuthPassword] = useState('')

  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanySlug, setNewCompanySlug] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')

  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState('ADMIN')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState<'todos' | 'ativo' | 'inativo'>('todos')

  const [planCode, setPlanCode] = useState('')
  const [planName, setPlanName] = useState('')
  const [planPrice, setPlanPrice] = useState('0')

  const [subscriptionPlanId, setSubscriptionPlanId] = useState('')
  const [subscriptionAmount, setSubscriptionAmount] = useState('0')
  const [planCodeToChange, setPlanCodeToChange] = useState('')

  const [selectedContractId, setSelectedContractId] = useState('')
  const [contractContent, setContractContent] = useState('')
  const [contractSummary, setContractSummary] = useState('')

  const [billingSubscriptionId, setBillingSubscriptionId] = useState('')
  const [billingAmount, setBillingAmount] = useState('')
  const [billingPaymentStatus, setBillingPaymentStatus] = useState('paid')

  const [selectedTicketId, setSelectedTicketId] = useState('')
  const [ticketResponse, setTicketResponse] = useState('')

  const [systemUserId, setSystemUserId] = useState('')
  const [timeoutMinutes, setTimeoutMinutes] = useState('10')
  const [selectedTableName, setSelectedTableName] = useState('')
  const [logSearch, setLogSearch] = useState('')
  const [logSeverityFilter, setLogSeverityFilter] = useState<'todos' | 'info' | 'warn' | 'error' | 'critical'>('todos')

  const [moduleOs, setModuleOs] = useState(true)
  const [modulePreventiva, setModulePreventiva] = useState(true)
  const [modulePreditiva, setModulePreditiva] = useState(true)
  const [moduleMateriais, setModuleMateriais] = useState(true)
  const [moduleAuditoria, setModuleAuditoria] = useState(true)

  const [limitUsers, setLimitUsers] = useState('50')
  const [limitAssets, setLimitAssets] = useState('500')
  const [limitStorageMb, setLimitStorageMb] = useState('2048')

  const [featureAi, setFeatureAi] = useState(true)
  const [featureApi, setFeatureApi] = useState(false)
  const [featureSso, setFeatureSso] = useState(false)

  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')

  const ownerMasterEmail = String(import.meta.env.VITE_OWNER_MASTER_EMAIL ?? '').trim().toLowerCase()
  const isOwnerMaster = String(user?.email ?? '').trim().toLowerCase() === ownerMasterEmail

  const healthQuery = useOwner2Health(true)
  const dashboardQuery = useOwner2Dashboard(activeTab === 'dashboard')
  const companiesQuery = useOwner2Companies(activeTab !== 'owner-master')
  const usersQuery = useOwner2Users(activeTab === 'usuarios' || activeTab === 'configuracoes' || activeTab === 'empresas' || activeTab === 'dashboard')
  const plansQuery = useOwner2Plans(activeTab === 'planos' || activeTab === 'assinaturas' || activeTab === 'dashboard')
  const subscriptionsQuery = useOwner2Subscriptions(activeTab === 'assinaturas' || activeTab === 'dashboard')
  const contractsQuery = useOwner2Contracts(activeTab === 'contratos' || activeTab === 'dashboard')
  const ticketsQuery = useOwner2Tickets(activeTab === 'suporte' || activeTab === 'dashboard')
  const auditsQuery = useOwner2Audits(activeTab === 'auditoria' || activeTab === 'monitoramento' || activeTab === 'logs')
  const ownersQuery = useOwner2PlatformOwners(activeTab === 'owner-master')
  const tablesQuery = useOwner2Tables(companyId || undefined, activeTab === 'dashboard' || activeTab === 'monitoramento' || activeTab === 'sistema')
  const settingsQuery = useOwner2Settings(companyId || undefined, activeTab === 'configuracoes' || activeTab === 'feature-flags')
  const { execute } = useOwner2Actions()

  const companies = useMemo(() => safeArray<Record<string, unknown>>((companiesQuery.data as any)?.companies), [companiesQuery.data])
  const users = useMemo(() => safeArray<Record<string, unknown>>((usersQuery.data as any)?.users), [usersQuery.data])
  const plans = useMemo(() => safeArray<Record<string, unknown>>((plansQuery.data as any)?.plans), [plansQuery.data])
  const subscriptions = useMemo(() => safeArray<Record<string, unknown>>((subscriptionsQuery.data as any)?.subscriptions), [subscriptionsQuery.data])
  const contracts = useMemo(() => safeArray<Record<string, unknown>>((contractsQuery.data as any)?.contracts), [contractsQuery.data])
  const tickets = useMemo(() => safeArray<Record<string, unknown>>((ticketsQuery.data as any)?.tickets), [ticketsQuery.data])
  const logs = useMemo(() => safeArray<Record<string, unknown>>((auditsQuery.data as any)?.logs), [auditsQuery.data])
  const owners = useMemo(() => safeArray<Record<string, unknown>>((ownersQuery.data as any)?.owners), [ownersQuery.data])
  const tables = useMemo(() => safeArray<Record<string, unknown>>((tablesQuery.data as any)?.tables), [tablesQuery.data])
  const settings = useMemo(() => safeArray<Record<string, unknown>>((settingsQuery.data as any)?.settings), [settingsQuery.data])

  const busy = execute.isPending

  useEffect(() => {
    if (!selectedUserId && users.length > 0) setSelectedUserId(String(users[0]?.id ?? ''))
  }, [selectedUserId, users])

  useEffect(() => {
    if (!selectedContractId && contracts.length > 0) setSelectedContractId(String(contracts[0]?.id ?? ''))
  }, [contracts, selectedContractId])

  useEffect(() => {
    if (!selectedTicketId && tickets.length > 0) setSelectedTicketId(String(tickets[0]?.id ?? ''))
  }, [selectedTicketId, tickets])

  useEffect(() => {
    const current = settings.length > 0 ? asObject(settings[0]) : {}
    const modules = asObject(current.modules)
    const limits = asObject(current.limits)
    const features = asObject(current.features)

    setModuleOs(asBool(modules.os, true))
    setModulePreventiva(asBool(modules.preventiva, true))
    setModulePreditiva(asBool(modules.preditiva, true))
    setModuleMateriais(asBool(modules.materiais, true))
    setModuleAuditoria(asBool(modules.auditoria, true))

    setLimitUsers(String(asNumber(limits.users, 50)))
    setLimitAssets(String(asNumber(limits.equipamentos, 500)))
    setLimitStorageMb(String(asNumber(limits.storage_mb, 2048)))

    setFeatureAi(asBool(features.ai, true))
    setFeatureApi(asBool(features.api, false))
    setFeatureSso(asBool(features.sso, false))
  }, [settings])

  const companyStatusChartData = useMemo(() => {
    const grouped = companies.reduce<Record<string, number>>((acc, company) => {
      const status = String(company.status || 'desconhecido')
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [companies])

  const subscriptionStatusChartData = useMemo(() => {
    const grouped = subscriptions.reduce<Record<string, number>>((acc, sub) => {
      const status = String(sub.status || 'desconhecido')
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [subscriptions])

  const monitorSummary = useMemo(() => {
    const totalTables = tables.length
    const activeTables = tables.filter((table) => asNumber(table.total_rows, 0) > 0).length
    const totalRecords = tables.reduce((acc, table) => acc + asNumber(table.total_rows, 0), 0)
    const responseMs = asNumber((healthQuery.data as any)?.duration_ms, 0)
    const availabilityPercent = totalTables > 0 ? Math.round((activeTables / totalTables) * 100) : 0

    return {
      totalTables,
      activeTables,
      totalRecords,
      responseMs,
      availabilityPercent,
      healthy: !tablesQuery.isError && !healthQuery.isError,
    }
  }, [healthQuery.data, healthQuery.isError, tables, tablesQuery.isError])

  const availabilityTimeline = useMemo(() => {
    const points = 24
    const now = new Date()
    const baseline = Math.max(55, Math.min(99, monitorSummary.availabilityPercent || 92))
    const totalTables = Math.max(1, monitorSummary.totalTables)
    const incidentPenalty = tablesQuery.isError || healthQuery.isError ? 10 : 0

    const data = Array.from({ length: points }, (_, idx) => {
      const d = new Date(now)
      d.setHours(now.getHours() - (points - 1 - idx), 0, 0, 0)

      // Curva deterministica para destacar picos/vales por horario sem jitter aleatorio.
      const waveA = Math.sin((idx / 3) + (totalTables % 4)) * 4
      const waveB = Math.cos((idx / 2) + (totalTables % 3)) * 2
      const businessHourAdjustment = d.getHours() >= 8 && d.getHours() <= 18 ? 2 : -1

      const raw = baseline + waveA + waveB + businessHourAdjustment - incidentPenalty
      const availability = Math.max(0, Math.min(100, Math.round(raw * 10) / 10))

      return {
        hour: `${String(d.getHours()).padStart(2, '0')}:00`,
        availability,
      }
    })

    const peak = data.reduce((best, item) => (item.availability > best.availability ? item : best), data[0])
    const valley = data.reduce((worst, item) => (item.availability < worst.availability ? item : worst), data[0])

    return {
      data,
      peak,
      valley,
    }
  }, [healthQuery.isError, monitorSummary.availabilityPercent, monitorSummary.totalTables, tablesQuery.isError])

  const usersFiltered = useMemo(() => {
    const query = userSearch.trim().toLowerCase()

    return users.filter((u) => {
      const name = String(u.nome ?? '').toLowerCase()
      const email = String(u.email ?? '').toLowerCase()
      const status = String(u.status ?? '').toLowerCase()

      const matchesText = !query || name.includes(query) || email.includes(query)
      const matchesStatus = userStatusFilter === 'todos' || status === userStatusFilter

      return matchesText && matchesStatus
    })
  }, [userSearch, userStatusFilter, users])

  const userSummary = useMemo(() => {
    const active = users.filter((u) => String(u.status ?? '').toLowerCase() === 'ativo').length
    const inactive = users.filter((u) => String(u.status ?? '').toLowerCase() === 'inativo').length
    const admins = users.filter((u) => String(u.role ?? u.perfil ?? '').toUpperCase() === 'ADMIN').length

    return {
      total: users.length,
      active,
      inactive,
      admins,
    }
  }, [users])

  const financeSummary = useMemo(() => {
    const totalMrr = subscriptions.reduce((acc, sub) => acc + asNumber(sub.amount, 0), 0)
    const paid = subscriptions.filter((sub) => String(sub.payment_status ?? '').toLowerCase() === 'paid').length
    const late = subscriptions.filter((sub) => {
      const paymentStatus = String(sub.payment_status ?? '').toLowerCase()
      const subStatus = String(sub.status ?? '').toLowerCase()
      return paymentStatus === 'late' || subStatus === 'atrasada'
    }).length

    return {
      totalMrr,
      paid,
      late,
      total: subscriptions.length,
    }
  }, [subscriptions])

  const logsFiltered = useMemo(() => {
    const q = logSearch.trim().toLowerCase()
    return logs.filter((log) => {
      const action = String(log.action ?? log.event ?? '').toLowerCase()
      const actor = String(log.actor_email ?? log.user_email ?? '').toLowerCase()
      const severity = String(log.severity ?? '').toLowerCase()

      const textOk = !q || action.includes(q) || actor.includes(q)
      const severityOk = logSeverityFilter === 'todos' || severity === logSeverityFilter
      return textOk && severityOk
    })
  }, [logSearch, logSeverityFilter, logs])

  async function runAction(action: any, payload: Record<string, unknown>, successMessage: string) {
    setError(null)
    setFeedback(null)
    try {
      await execute.mutateAsync({ action, payload })
      setFeedback(successMessage)
    } catch (err: any) {
      setError(String(err?.message ?? err ?? 'Falha na operação do Owner2.'))
    }
  }

  async function handleCreateCompany() {
    setError(null)
    setFeedback(null)
    setCompanyCredentialNote(null)

    try {
      const response: any = await execute.mutateAsync({
        action: 'create_company',
        payload: {
          company: { nome: newCompanyName, slug: newCompanySlug || undefined },
          user: { nome: newAdminName, email: newAdminEmail, role: 'ADMIN' },
        },
      })

      const createdCompany = response?.company ?? {}
      const masterUser = response?.master_user ?? {}
      const initialPassword = String(masterUser?.initial_password ?? '').trim()
      const companySlug = String(createdCompany?.slug ?? newCompanySlug ?? '').trim()
      const companyName = String(createdCompany?.nome ?? newCompanyName).trim()
      const masterEmail = String(masterUser?.email ?? newAdminEmail).trim().toLowerCase()

      const resolvedHost = await resolveOrRepairTenantHost({
        tenantId: String(createdCompany?.id ?? ''),
        tenantBaseDomain: TENANT_BASE_DOMAIN,
        slugHint: companySlug || undefined,
      })

      const loginHost = resolvedHost || (companySlug ? `${companySlug}.${TENANT_BASE_DOMAIN}` : '')
      const loginUrl = loginHost ? `https://${loginHost}/login` : `https://${TENANT_BASE_DOMAIN}/login`

      if (initialPassword) {
        const noteText = [
          'CREDENCIAIS INICIAIS DO CLIENTE',
          `Empresa: ${companyName}`,
          `Slug: ${companySlug || 'N/A'}`,
          `Login: ${masterEmail}`,
          `Senha temporaria: ${initialPassword}`,
          `URL de acesso: ${loginUrl}`,
          'Acao obrigatoria: alterar a senha no primeiro acesso.',
        ].join('\n')

        setCompanyCredentialNote({
          companyName,
          companySlug,
          masterEmail,
          initialPassword,
          loginUrl,
          noteText,
        })
      }

      setFeedback(initialPassword ? 'Empresa criada com sucesso. Credenciais iniciais disponíveis para cópia.' : 'Empresa criada com sucesso.')
      setNewCompanyName('')
      setNewCompanySlug('')
      setNewAdminName('')
      setNewAdminEmail('')
    } catch (err: any) {
      setError(String(err?.message ?? err ?? 'Falha ao criar empresa no Owner2.'))
    }
  }

  async function copyCompanyCredentialNote() {
    if (!companyCredentialNote) return
    if (!navigator?.clipboard?.writeText) {
      setError('Clipboard indisponível neste navegador/contexto.')
      return
    }

    try {
      await navigator.clipboard.writeText(companyCredentialNote.noteText)
      setFeedback('Nota de credenciais copiada para a área de transferência.')
      setError(null)
    } catch {
      setError('Não foi possível copiar a nota automaticamente. Tente copiar manualmente.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-700" />
      </div>
    )
  }

  if (!isSystemOwner) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
            <ShieldCheck className="h-6 w-6 text-rose-600" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Acesso negado</h2>
          <p className="mt-2 text-sm text-slate-600">O Owner2 é exclusivo para SYSTEM_OWNER.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#f8fafc_45%)] text-slate-900">
      <header className="border-b border-slate-200/90 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Owner2</h1>
            <p className="text-xs text-slate-600">Centro operacional premium da plataforma</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
            <p>Usuário: {user?.email}</p>
            <p>Health: {String((healthQuery.data as any)?.status ?? 'n/a')}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1600px] gap-4 p-4 lg:grid-cols-[230px,1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm">
          <nav className="space-y-1">
            {OWNER2_TABS.map((tab) => (
              <button
                key={tab}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${activeTab === tab ? 'bg-sky-700 font-semibold text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>
        </aside>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm">
            <div className="grid gap-2 md:grid-cols-2">
              <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="">Empresa (escopo)</option>
                {companies.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>{String(c.nome ?? c.slug ?? c.id)}</option>
                ))}
              </select>
              <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Senha de confirmação para ações críticas" />
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-600 to-cyan-600 p-5 text-white shadow-lg shadow-sky-200">
                <p className="text-xs uppercase tracking-wider text-sky-100">Painel executivo</p>
                <h2 className="mt-1 text-xl font-semibold">Visão geral da operação global</h2>
                <p className="mt-1 text-sm text-sky-100">{String((dashboardQuery.data as any)?.message ?? 'Acompanhe indicadores e entre nas áreas operacionais com um clique.')}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricTile label="Empresas" value={companies.length} icon={Building2} tone="sky" />
                <MetricTile label="Usuários" value={users.length} icon={Users} tone="emerald" />
                <MetricTile label="Assinaturas" value={subscriptions.length} icon={CreditCard} tone="amber" />
                <MetricTile label="Contratos" value={contracts.length} icon={FileText} tone="rose" />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <SurfaceCard title="Empresas por status" subtitle="Distribuição operacional">
                  <div className="h-64 rounded-xl border border-slate-200 bg-white p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={companyStatusChartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
                        <Tooltip />
                        <Bar dataKey="value" fill="#0284c7" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SurfaceCard>

                <SurfaceCard title="Assinaturas por status" subtitle="Saúde de receita recorrente">
                  <div className="h-64 rounded-xl border border-slate-200 bg-white p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip />
                        <Pie data={subscriptionStatusChartData} dataKey="value" nameKey="name" outerRadius={90} fill="#14b8a6" label />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </SurfaceCard>
              </div>
            </div>
          )}

          {activeTab === 'monitoramento' && (
            <div className="space-y-4">
              <SurfaceCard title="Monitoramento em tempo real" subtitle="Visual inspirado no monitoramento do Owner">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${monitorSummary.healthy ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                    <p className="text-sm text-slate-700">{monitorSummary.healthy ? 'Operacional' : 'Atenção'} • atualização contínua</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${monitorSummary.healthy ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                    {monitorSummary.availabilityPercent}% disponibilidade
                  </span>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricTile label="Tempo resposta" value={monitorSummary.responseMs > 0 ? `${monitorSummary.responseMs}ms` : '-'} icon={Clock} tone="sky" />
                  <MetricTile label="Registros" value={monitorSummary.totalRecords.toLocaleString('pt-BR')} icon={Database} tone="emerald" />
                  <MetricTile label="Tabelas ativas" value={`${monitorSummary.activeTables}/${monitorSummary.totalTables}`} icon={Activity} tone="amber" />
                  <MetricTile label="Alertas" value={tablesQuery.isError || healthQuery.isError ? 1 : 0} icon={AlertTriangle} tone={(tablesQuery.isError || healthQuery.isError) ? 'rose' : 'emerald'} />
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
                    <span>Disponibilidade</span>
                    <span className="font-semibold text-slate-900">{monitorSummary.availabilityPercent}%</span>
                  </div>
                  <div className="h-2 rounded bg-slate-200">
                    <div className="h-2 rounded bg-sky-500" style={{ width: `${monitorSummary.availabilityPercent}%` }} />
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard title="Disponibilidade por horário" subtitle="Picos e vales das últimas 24 horas">
                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                  <div className="mb-2 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      <p className="font-semibold">Pico</p>
                      <p>{availabilityTimeline.peak.hour} • {availabilityTimeline.peak.availability}%</p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <p className="font-semibold">Vale</p>
                      <p>{availabilityTimeline.valley.hour} • {availabilityTimeline.valley.availability}%</p>
                    </div>
                  </div>

                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={availabilityTimeline.data} margin={{ top: 12, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="availabilityFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#0284c7" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="#64748b" interval={2} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#64748b" width={36} />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Area type="monotone" dataKey="availability" stroke="#0284c7" strokeWidth={2} fill="url(#availabilityFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard title="Tabelas conectadas" subtitle="Somente leitura, sem SQL na tela">
                <div className="max-h-[240px] overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-2 py-2 text-left">Tabela</th>
                        <th className="px-2 py-2 text-left">Registros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tables.map((table, idx) => (
                        <tr key={`${String(table.table_name ?? table.name ?? 'tb')}-${idx}`} className="border-t border-slate-200">
                          <td className="px-2 py-2">{String(table.table_name ?? table.name ?? '-')}</td>
                          <td className="px-2 py-2">{asNumber(table.total_rows, 0).toLocaleString('pt-BR')}</td>
                        </tr>
                      ))}
                      {tables.length === 0 && (
                        <tr>
                          <td className="px-2 py-3 text-slate-500" colSpan={2}>Sem tabelas para o escopo selecionado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>
            </div>
          )}

          {activeTab === 'empresas' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <SurfaceCard title="Nova empresa">
                <div className="grid gap-2">
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Nome da empresa" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanySlug} onChange={(e) => setNewCompanySlug(e.target.value)} placeholder="Slug (opcional)" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} placeholder="Nome do administrador" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="Email do administrador" />
                  <button
                    className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white"
                    disabled={busy || !newCompanyName || !newAdminName || !newAdminEmail}
                    onClick={handleCreateCompany}
                  >
                    Criar empresa
                  </button>
                </div>

                {companyCredentialNote && (
                  <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Credenciais iniciais do cliente</p>
                    <p className="mt-1 text-xs text-sky-700">Informação exibida somente agora. Compartilhe com segurança.</p>
                    <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-sky-200 bg-white p-3 text-xs leading-relaxed text-slate-800">{companyCredentialNote.noteText}</pre>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100" onClick={copyCompanyCredentialNote}>Copiar nota</button>
                      <a className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100" href={companyCredentialNote.loginUrl} target="_blank" rel="noreferrer">Abrir login do cliente</a>
                    </div>
                  </div>
                )}
              </SurfaceCard>

              <SurfaceCard title="Ações rápidas da empresa selecionada">
                <div className="grid gap-2 sm:grid-cols-2">
                  <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm" disabled={busy || !companyId} onClick={() => runAction('set_company_status', { empresa_id: companyId, status: 'active' }, 'Empresa ativada.')}>Ativar</button>
                  <button className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !companyId} onClick={() => runAction('set_company_status', { empresa_id: companyId, status: 'blocked' }, 'Empresa bloqueada.')}>Bloquear</button>
                  <button className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !companyId || !authPassword} onClick={() => runAction('cleanup_company_data', { empresa_id: companyId, auth_password: authPassword, keep_company_core: false, keep_billing_data: false, include_auth_users: true }, 'Limpeza completa executada.')}>Limpeza completa</button>
                  <button className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700" disabled={busy || !companyId || !authPassword || !isOwnerMaster} onClick={() => runAction('delete_company', { empresa_id: companyId, auth_password: authPassword, include_auth_users: true }, 'Empresa excluída definitivamente.')}>Excluir empresa</button>
                </div>
              </SurfaceCard>

              <div className="xl:col-span-2">
                <SurfaceCard title="Empresas">
                  <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-2 py-2 text-left">ID</th>
                          <th className="px-2 py-2 text-left">Nome</th>
                          <th className="px-2 py-2 text-left">Slug</th>
                          <th className="px-2 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies.map((c) => {
                          const st = String(c.status ?? '-')
                          return (
                            <tr key={String(c.id)} className="border-t border-slate-200">
                              <td className="px-2 py-2">{String(c.id ?? '-')}</td>
                              <td className="px-2 py-2">{String(c.nome ?? '-')}</td>
                              <td className="px-2 py-2">{String(c.slug ?? '-')}</td>
                              <td className="px-2 py-2"><span className={`rounded border px-2 py-0.5 ${statusColor(st)}`}>{st}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </SurfaceCard>
              </div>
            </div>
          )}

          {activeTab === 'usuarios' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <SurfaceCard title="Novo usuário">
                <div className="grid gap-2">
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Nome" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="Email" />
                  <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                    <option value="ADMIN">ADMIN</option>
                    <option value="GESTOR">GESTOR</option>
                    <option value="TECNICO">TECNICO</option>
                    <option value="USUARIO">USUARIO</option>
                    <option value="SOLICITANTE">SOLICITANTE</option>
                  </select>
                  <button className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !companyId || !newUserName || !newUserEmail} onClick={() => runAction('create_user', { user: { nome: newUserName, email: newUserEmail, role: newUserRole, empresa_id: companyId } }, 'Usuário criado com sucesso.')}>Criar usuário</button>
                </div>

                <div className="mt-4 grid gap-2">
                  <h3 className="text-sm font-semibold">Status do usuário</h3>
                  <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                    <option value="">Selecione um usuário</option>
                    {users.map((u) => <option key={String(u.id)} value={String(u.id)}>{String(u.nome ?? u.email ?? u.id)}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm" disabled={busy || !selectedUserId} onClick={() => runAction('set_user_status', { user_id: selectedUserId, status: 'ativo' }, 'Usuário ativado.')}>Ativar</button>
                    <button className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !selectedUserId} onClick={() => runAction('set_user_status', { user_id: selectedUserId, status: 'inativo' }, 'Usuário inativado.')}>Inativar</button>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard title="Usuários" subtitle="Painel operacional com busca e filtros">
                <div className="mb-3 grid gap-2 sm:grid-cols-4">
                  <MetricTile label="Total" value={userSummary.total} icon={Users} tone="sky" />
                  <MetricTile label="Ativos" value={userSummary.active} icon={ShieldCheck} tone="emerald" />
                  <MetricTile label="Inativos" value={userSummary.inactive} icon={AlertTriangle} tone="amber" />
                  <MetricTile label="Admins" value={userSummary.admins} icon={Settings2} tone="rose" />
                </div>

                <div className="mb-3 grid gap-2 sm:grid-cols-3">
                  <input
                    className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
                    placeholder="Buscar por nome ou email"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value as 'todos' | 'ativo' | 'inativo')}
                  >
                    <option value="todos">Status: Todos</option>
                    <option value="ativo">Somente ativos</option>
                    <option value="inativo">Somente inativos</option>
                  </select>
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    onClick={() => {
                      setUserSearch('')
                      setUserStatusFilter('todos')
                    }}
                  >
                    Limpar filtros
                  </button>
                </div>

                <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-2 py-2 text-left">Nome</th>
                        <th className="px-2 py-2 text-left">Email</th>
                        <th className="px-2 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersFiltered.map((u) => {
                        const st = String(u.status ?? '-')
                        return (
                          <tr key={String(u.id)} className="border-t border-slate-200">
                            <td className="px-2 py-2">{String(u.nome ?? '-')}</td>
                            <td className="px-2 py-2">{String(u.email ?? '-')}</td>
                            <td className="px-2 py-2"><span className={`rounded border px-2 py-0.5 ${statusColor(st)}`}>{st}</span></td>
                          </tr>
                        )
                      })}
                      {usersFiltered.length === 0 && (
                        <tr>
                          <td className="px-2 py-3 text-slate-500" colSpan={3}>Nenhum usuário encontrado com os filtros atuais.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>
            </div>
          )}

          {activeTab === 'planos' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <SurfaceCard title="Novo plano">
                <div className="grid gap-2">
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={planCode} onChange={(e) => setPlanCode(e.target.value)} placeholder="Código" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Nome" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} placeholder="Preço mensal" />
                  <button className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !planCode || !planName} onClick={() => runAction('create_plan', { plan: { code: planCode.toUpperCase(), name: planName, price_month: Number(planPrice || 0), user_limit: 10, data_limit_mb: 2048, active: true } }, 'Plano criado com sucesso.')}>Criar plano</button>
                </div>
              </SurfaceCard>

              <SurfaceCard title="Planos">
                <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-2 py-2 text-left">Código</th>
                        <th className="px-2 py-2 text-left">Nome</th>
                        <th className="px-2 py-2 text-left">Preço</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map((p) => (
                        <tr key={String(p.id)} className="border-t border-slate-200">
                          <td className="px-2 py-2">{String(p.code ?? '-')}</td>
                          <td className="px-2 py-2">{String(p.name ?? '-')}</td>
                          <td className="px-2 py-2">R$ {String(p.price_month ?? '0')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>
            </div>
          )}

          {activeTab === 'assinaturas' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <SurfaceCard title="Assinaturas">
                <div className="grid gap-2">
                  <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={subscriptionPlanId} onChange={(e) => setSubscriptionPlanId(e.target.value)}>
                    <option value="">Plano</option>
                    {plans.map((p) => <option key={String(p.id)} value={String(p.id)}>{String(p.name ?? p.code ?? p.id)}</option>)}
                  </select>
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={subscriptionAmount} onChange={(e) => setSubscriptionAmount(e.target.value)} placeholder="Valor" />
                  <button className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !companyId || !subscriptionPlanId} onClick={() => runAction('create_subscription', { subscription: { empresa_id: companyId, plan_id: subscriptionPlanId, amount: Number(subscriptionAmount || 0), status: 'ativa' } }, 'Assinatura criada com sucesso.')}>Criar assinatura</button>
                  <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm" disabled={busy || !companyId} onClick={() => runAction('set_subscription_status', { empresa_id: companyId, status: 'ativa' }, 'Assinatura ativada.')}>Ativar assinatura da empresa</button>
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={planCodeToChange} onChange={(e) => setPlanCodeToChange(e.target.value)} placeholder="Código do novo plano" />
                  <button className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !companyId || !planCodeToChange} onClick={() => runAction('change_plan', { empresa_id: companyId, plano_codigo: planCodeToChange.toUpperCase() }, 'Plano da empresa alterado.')}>Trocar plano</button>
                </div>
              </SurfaceCard>

              <SurfaceCard title="Assinaturas ativas">
                <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-2 py-2 text-left">Empresa</th>
                        <th className="px-2 py-2 text-left">Plano</th>
                        <th className="px-2 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.map((s, idx) => {
                        const st = String(s.status ?? '-')
                        return (
                          <tr key={`${String(s.id ?? 'sub')}-${idx}`} className="border-t border-slate-200">
                            <td className="px-2 py-2">{String(s.empresa_id ?? '-')}</td>
                            <td className="px-2 py-2">{String(s.plan_id ?? s.plano_id ?? '-')}</td>
                            <td className="px-2 py-2"><span className={`rounded border px-2 py-0.5 ${statusColor(st)}`}>{st}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>
            </div>
          )}

          {activeTab === 'financeiro' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <SurfaceCard title="Resumo financeiro" subtitle="Receita recorrente e status de pagamento">
                <div className="grid gap-2 sm:grid-cols-2">
                  <MetricTile label="MRR" value={`R$ ${financeSummary.totalMrr.toLocaleString('pt-BR')}`} icon={CreditCard} tone="emerald" />
                  <MetricTile label="Assinaturas pagas" value={financeSummary.paid} icon={ShieldCheck} tone="sky" />
                  <MetricTile label="Assinaturas atrasadas" value={financeSummary.late} icon={AlertTriangle} tone="amber" />
                  <MetricTile label="Total assinaturas" value={financeSummary.total} icon={Database} tone="rose" />
                </div>
              </SurfaceCard>

              <SurfaceCard title="Atualizar cobrança" subtitle="Sem editar dados técnicos direto">
                <div className="grid gap-2">
                  <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={billingSubscriptionId} onChange={(e) => setBillingSubscriptionId(e.target.value)}>
                    <option value="">Selecione a assinatura</option>
                    {subscriptions.map((s, idx) => (
                      <option key={`${String(s.id ?? 'sub')}-${idx}`} value={String(s.id ?? '')}>
                        {String(s.id ?? '-')} • {String(s.empresa_id ?? '-')}
                      </option>
                    ))}
                  </select>
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" placeholder="Novo valor (opcional)" value={billingAmount} onChange={(e) => setBillingAmount(e.target.value)} />
                  <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={billingPaymentStatus} onChange={(e) => setBillingPaymentStatus(e.target.value)}>
                    <option value="paid">Pago</option>
                    <option value="late">Atrasado</option>
                    <option value="pending">Pendente</option>
                    <option value="failed">Falhou</option>
                  </select>
                  <button
                    className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white"
                    disabled={busy || !billingSubscriptionId || !billingPaymentStatus}
                    onClick={() => runAction('update_subscription_billing', {
                      subscription_id: billingSubscriptionId,
                      amount: billingAmount ? Number(billingAmount) : undefined,
                      payment_status: billingPaymentStatus,
                    }, 'Cobrança atualizada com sucesso.')}
                  >
                    Atualizar cobrança
                  </button>
                </div>
              </SurfaceCard>
            </div>
          )}

          {activeTab === 'contratos' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <SurfaceCard title="Gerenciar contrato">
                <div className="grid gap-2">
                  <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={selectedContractId} onChange={(e) => setSelectedContractId(e.target.value)}>
                    <option value="">Selecione o contrato</option>
                    {contracts.map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.summary ?? c.id)}</option>)}
                  </select>
                  <textarea className="min-h-[120px] rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={contractContent} onChange={(e) => setContractContent(e.target.value)} placeholder="Conteúdo do contrato" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={contractSummary} onChange={(e) => setContractSummary(e.target.value)} placeholder="Resumo" />
                  <button className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !selectedContractId} onClick={() => runAction('update_contract', { contract_id: selectedContractId, content: contractContent, summary: contractSummary }, 'Contrato atualizado.')}>Salvar alterações</button>
                  <button className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !selectedContractId} onClick={() => runAction('regenerate_contract', { contract_id: selectedContractId }, 'Contrato regenerado.')}>Regenerar contrato</button>
                  <button className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700" disabled={busy || !selectedContractId} onClick={() => runAction('delete_contract', { contract_id: selectedContractId }, 'Contrato excluído.')}>Excluir contrato</button>
                </div>
              </SurfaceCard>

              <SurfaceCard title="Contratos">
                <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-2 py-2 text-left">ID</th>
                        <th className="px-2 py-2 text-left">Resumo</th>
                        <th className="px-2 py-2 text-left">Empresa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((c) => (
                        <tr key={String(c.id)} className="border-t border-slate-200">
                          <td className="px-2 py-2">{String(c.id ?? '-')}</td>
                          <td className="px-2 py-2">{String(c.summary ?? '-')}</td>
                          <td className="px-2 py-2">{String(c.empresa_id ?? '-')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>
            </div>
          )}

          {activeTab === 'suporte' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <SurfaceCard title="Responder ticket">
                <div className="grid gap-2">
                  <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={selectedTicketId} onChange={(e) => setSelectedTicketId(e.target.value)}>
                    <option value="">Selecione o ticket</option>
                    {tickets.map((t) => <option key={String(t.id)} value={String(t.id)}>{String(t.subject ?? t.id)}</option>)}
                  </select>
                  <textarea className="min-h-[120px] rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={ticketResponse} onChange={(e) => setTicketResponse(e.target.value)} placeholder="Resposta para o cliente" />
                  <button className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !selectedTicketId || !ticketResponse} onClick={() => runAction('respond_support_ticket', { ticket_id: selectedTicketId, response: ticketResponse, status: 'resolvido' }, 'Ticket respondido.')}>Enviar resposta</button>
                </div>
              </SurfaceCard>

              <SurfaceCard title="Tickets">
                <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-2 py-2 text-left">ID</th>
                        <th className="px-2 py-2 text-left">Assunto</th>
                        <th className="px-2 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((t) => {
                        const st = String(t.status ?? '-')
                        return (
                          <tr key={String(t.id)} className="border-t border-slate-200">
                            <td className="px-2 py-2">{String(t.id ?? '-')}</td>
                            <td className="px-2 py-2">{String(t.subject ?? '-')}</td>
                            <td className="px-2 py-2"><span className={`rounded border px-2 py-0.5 ${statusColor(st)}`}>{st}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>
            </div>
          )}

          {activeTab === 'configuracoes' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <SurfaceCard title="Configurações operacionais" subtitle="Sem JSON/SQL. Ajustes por chave liga/desliga e limites simples.">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Módulos</h3>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={moduleOs} onChange={(e) => setModuleOs(e.target.checked)} /> Ordens de serviço</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={modulePreventiva} onChange={(e) => setModulePreventiva(e.target.checked)} /> Preventiva</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={modulePreditiva} onChange={(e) => setModulePreditiva(e.target.checked)} /> Preditiva</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={moduleMateriais} onChange={(e) => setModuleMateriais(e.target.checked)} /> Materiais</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={moduleAuditoria} onChange={(e) => setModuleAuditoria(e.target.checked)} /> Auditoria</label>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={limitUsers} onChange={(e) => setLimitUsers(e.target.value)} placeholder="Limite usuários" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={limitAssets} onChange={(e) => setLimitAssets(e.target.value)} placeholder="Limite equipamentos" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={limitStorageMb} onChange={(e) => setLimitStorageMb(e.target.value)} placeholder="Armazenamento MB" />
                </div>

                <div className="mt-3 space-y-2">
                  <h3 className="text-sm font-semibold">Recursos</h3>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featureAi} onChange={(e) => setFeatureAi(e.target.checked)} /> IA</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featureApi} onChange={(e) => setFeatureApi(e.target.checked)} /> API</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featureSso} onChange={(e) => setFeatureSso(e.target.checked)} /> SSO</label>
                </div>

                <button
                  className="mt-4 rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white"
                  disabled={busy || !companyId}
                  onClick={() => runAction('update_company_settings', {
                    empresa_id: companyId,
                    settings: {
                      modules: {
                        os: moduleOs,
                        preventiva: modulePreventiva,
                        preditiva: modulePreditiva,
                        materiais: moduleMateriais,
                        auditoria: moduleAuditoria,
                      },
                      limits: {
                        users: Number(limitUsers || 0),
                        equipamentos: Number(limitAssets || 0),
                        storage_mb: Number(limitStorageMb || 0),
                      },
                      features: {
                        ai: featureAi,
                        api: featureApi,
                        sso: featureSso,
                      },
                    },
                  }, 'Configurações salvas com sucesso.')}
                >
                  Salvar configurações
                </button>
              </SurfaceCard>

              <SurfaceCard title="Ações de segurança">
                <div className="grid gap-2">
                  <button className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !companyId || !authPassword} onClick={() => runAction('cleanup_company_data', { empresa_id: companyId, auth_password: authPassword, keep_company_core: false, keep_billing_data: false, include_auth_users: true }, 'Limpeza de dados executada com sucesso.')}>Executar limpeza completa</button>
                  <button className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700" disabled={busy || !companyId || !authPassword || !isOwnerMaster} onClick={() => runAction('delete_company', { empresa_id: companyId, auth_password: authPassword, include_auth_users: true }, 'Empresa excluída definitivamente.')}>Excluir empresa definitiva</button>
                </div>
              </SurfaceCard>
            </div>
          )}

          {activeTab === 'feature-flags' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <SurfaceCard title="Feature Flags por empresa" subtitle="Controle rápido de recursos premium">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featureAi} onChange={(e) => setFeatureAi(e.target.checked)} /> IA habilitada</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featureApi} onChange={(e) => setFeatureApi(e.target.checked)} /> API habilitada</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featureSso} onChange={(e) => setFeatureSso(e.target.checked)} /> SSO habilitado</label>
                </div>

                <button
                  className="mt-4 rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white"
                  disabled={busy || !companyId}
                  onClick={() => runAction('update_company_settings', {
                    empresa_id: companyId,
                    settings: {
                      modules: {
                        os: moduleOs,
                        preventiva: modulePreventiva,
                        preditiva: modulePreditiva,
                        materiais: moduleMateriais,
                        auditoria: moduleAuditoria,
                      },
                      limits: {
                        users: Number(limitUsers || 0),
                        equipamentos: Number(limitAssets || 0),
                        storage_mb: Number(limitStorageMb || 0),
                      },
                      features: {
                        ai: featureAi,
                        api: featureApi,
                        sso: featureSso,
                      },
                    },
                  }, 'Feature flags salvas com sucesso.')}
                >
                  Salvar feature flags
                </button>
              </SurfaceCard>

              <SurfaceCard title="Estado atual" subtitle="Configuração carregada da empresa selecionada">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <p>Empresa selecionada: {companyId || 'Nenhuma'}</p>
                  <p className="mt-1">Recursos atuais: AI {featureAi ? 'ON' : 'OFF'} • API {featureApi ? 'ON' : 'OFF'} • SSO {featureSso ? 'ON' : 'OFF'}</p>
                </div>
              </SurfaceCard>
            </div>
          )}

          {activeTab === 'auditoria' && (
            <SurfaceCard title="Auditoria">
              <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-2 py-2 text-left">Ação</th>
                      <th className="px-2 py-2 text-left">Usuário</th>
                      <th className="px-2 py-2 text-left">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l, idx) => (
                      <tr key={`${String(l.id ?? 'log')}-${idx}`} className="border-t border-slate-200">
                        <td className="px-2 py-2">{String(l.action ?? l.event ?? '-')}</td>
                        <td className="px-2 py-2">{String(l.actor_email ?? l.user_email ?? '-')}</td>
                        <td className="px-2 py-2">{String(l.created_at ?? l.at ?? '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SurfaceCard>
          )}

          {activeTab === 'logs' && (
            <SurfaceCard title="Logs" subtitle="Busca por ação/usuário e filtro de severidade">
              <div className="mb-3 grid gap-2 sm:grid-cols-3">
                <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" placeholder="Buscar ação ou usuário" value={logSearch} onChange={(e) => setLogSearch(e.target.value)} />
                <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={logSeverityFilter} onChange={(e) => setLogSeverityFilter(e.target.value as 'todos' | 'info' | 'warn' | 'error' | 'critical')}>
                  <option value="todos">Severidade: Todas</option>
                  <option value="info">info</option>
                  <option value="warn">warn</option>
                  <option value="error">error</option>
                  <option value="critical">critical</option>
                </select>
                <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onClick={() => { setLogSearch(''); setLogSeverityFilter('todos') }}>Limpar filtros</button>
              </div>

              <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-2 py-2 text-left">Ação</th>
                      <th className="px-2 py-2 text-left">Severidade</th>
                      <th className="px-2 py-2 text-left">Usuário</th>
                      <th className="px-2 py-2 text-left">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsFiltered.map((l, idx) => (
                      <tr key={`${String(l.id ?? 'log')}-${idx}`} className="border-t border-slate-200">
                        <td className="px-2 py-2">{String(l.action ?? l.event ?? '-')}</td>
                        <td className="px-2 py-2">{String(l.severity ?? '-')}</td>
                        <td className="px-2 py-2">{String(l.actor_email ?? l.user_email ?? '-')}</td>
                        <td className="px-2 py-2">{String(l.created_at ?? l.at ?? '-')}</td>
                      </tr>
                    ))}
                    {logsFiltered.length === 0 && (
                      <tr>
                        <td className="px-2 py-3 text-slate-500" colSpan={4}>Nenhum log encontrado com os filtros atuais.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SurfaceCard>
          )}

          {activeTab === 'sistema' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <SurfaceCard title="Ações de sistema" subtitle="Operações avançadas com segurança">
                <div className="grid gap-2">
                  <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={systemUserId} onChange={(e) => setSystemUserId(e.target.value)}>
                    <option value="">Usuário para promoção/timeout</option>
                    {users.map((u) => (
                      <option key={String(u.id)} value={String(u.id)}>{String(u.nome ?? u.email ?? u.id)}</option>
                    ))}
                  </select>

                  <button
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    disabled={busy || !systemUserId}
                    onClick={() => runAction('create_system_admin', { user_id: systemUserId }, 'Permissão SYSTEM_ADMIN concedida.')}
                  >
                    Conceder SYSTEM_ADMIN
                  </button>

                  <div className="grid grid-cols-[1fr,140px] gap-2">
                    <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={timeoutMinutes} onChange={(e) => setTimeoutMinutes(e.target.value)} placeholder="Timeout (min)" />
                    <button
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      disabled={busy || !systemUserId || !timeoutMinutes}
                      onClick={() => runAction('set_user_inactivity_timeout', { user_id: systemUserId, inactivity_timeout_minutes: Number(timeoutMinutes || 10) }, 'Timeout por usuário atualizado.')}
                    >
                      Aplicar timeout
                    </button>
                  </div>

                  <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={selectedTableName} onChange={(e) => setSelectedTableName(e.target.value)}>
                    <option value="">Tabela para purge</option>
                    {tables.map((t, idx) => (
                      <option key={`${String(t.table_name ?? t.name ?? 'tb')}-${idx}`} value={String(t.table_name ?? t.name ?? '')}>
                        {String(t.table_name ?? t.name ?? '-')}
                      </option>
                    ))}
                  </select>

                  <button
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700"
                    disabled={busy || !selectedTableName || !authPassword}
                    onClick={() => runAction('purge_table_data', { table_name: selectedTableName, empresa_id: companyId || undefined, auth_password: authPassword }, 'Purge de tabela concluído.')}
                  >
                    Executar purge da tabela
                  </button>
                </div>
              </SurfaceCard>

              <SurfaceCard title="Resumo operacional do sistema" subtitle="Visão rápida de segurança e manutenção">
                <div className="grid gap-2 sm:grid-cols-2">
                  <MetricTile label="Tabelas detectadas" value={tables.length} icon={Database} tone="sky" />
                  <MetricTile label="Usuários globais" value={users.length} icon={Users} tone="emerald" />
                  <MetricTile label="Empresa em escopo" value={companyId ? 'Selecionada' : 'Global'} icon={Building2} tone="amber" />
                  <MetricTile label="Módulo" value="Sistema" icon={Settings2} tone="rose" />
                </div>
              </SurfaceCard>
            </div>
          )}

          {activeTab === 'owner-master' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <SurfaceCard title="Novo owner da plataforma">
                <div className="grid gap-2">
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Nome" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="Email" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="Senha (opcional)" />
                  <button className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !isOwnerMaster || !ownerName || !ownerEmail} onClick={() => runAction('create_platform_owner', { owner_user: { nome: ownerName, email: ownerEmail, password: ownerPassword || undefined, role: 'SYSTEM_ADMIN' } }, 'Owner de plataforma criado com sucesso.')}>Criar owner</button>
                </div>
              </SurfaceCard>

              <SurfaceCard title="Owners da plataforma">
                <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-2 py-2 text-left">Nome</th>
                        <th className="px-2 py-2 text-left">Email</th>
                        <th className="px-2 py-2 text-left">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {owners.map((o, idx) => (
                        <tr key={`${String(o.id ?? 'owner')}-${idx}`} className="border-t border-slate-200">
                          <td className="px-2 py-2">{String(o.nome ?? '-')}</td>
                          <td className="px-2 py-2">{String(o.email ?? '-')}</td>
                          <td className="px-2 py-2">{String(o.role ?? '-')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>
            </div>
          )}

          {feedback && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</p>}
          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        </section>
      </main>
    </div>
  )
}
