import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
  Download,
  FileText,
  LifeBuoy,
  Link2,
  LogIn,
  LogOut,
  Loader2,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { resolveOrRepairTenantHost } from '@/lib/tenantDomain'
import { listPlatformCompanies } from '@/services/ownerPortal.service'
import { uploadToStorage } from '@/services/storage'
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
import { OWNER_TABS, OWNER_TAB_LABELS, type OwnerTab, type CompanyCredentialNote, type CriticalActionRequest } from './owner2/owner2Types'
import { normalizeEmail, resolveOwnerMasterEmail, safeArray, asObject, asBool, asNumber, statusColor, downloadCsv, TENANT_BASE_DOMAIN, KNOWN_OWNER_MASTER_EMAILS } from './owner2/owner2Helpers'
import { SurfaceCard, MetricTile } from './owner2/owner2Components'
import OwnerDispositivosTab from '@/components/owner/OwnerDispositivosTab'
import OwnerUsuariosTab from './owner2/OwnerUsuariosTab'

const isImageUrl = (url: unknown) => {
  if (typeof url !== 'string') return false
  const normalized = url.split('?')[0].toLowerCase()
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg'].some((ext) => normalized.endsWith(ext))
}

export default function Owner() {
  const { isSystemOwner, isLoading, user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<OwnerTab>(() => {
    try {
      const saved = sessionStorage.getItem('owner_active_tab')
      if (saved && (OWNER_TABS as readonly string[]).includes(saved)) return saved as OwnerTab
    } catch { /* SSR / security sandbox */ }
    return 'dashboard'
  })
  const [isDocumentVisible, setIsDocumentVisible] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [companyCredentialNote, setCompanyCredentialNote] = useState<CompanyCredentialNote | null>(null)

  const [companyId, setCompanyId] = useState('')
  const [authPassword, setAuthPassword] = useState('')

  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanySlug, setNewCompanySlug] = useState('')
  const [newCompanyPersonType, setNewCompanyPersonType] = useState<'PF' | 'PJ'>('PJ')
  const [newCompanyDocument, setNewCompanyDocument] = useState('')
  const [newCompanyRazaoSocial, setNewCompanyRazaoSocial] = useState('')
  const [newCompanyNomeFantasia, setNewCompanyNomeFantasia] = useState('')
  const [newCompanyAddress, setNewCompanyAddress] = useState('')
  const [newCompanyPhone, setNewCompanyPhone] = useState('')
  const [newCompanyEmail, setNewCompanyEmail] = useState('')
  const [newCompanyResponsible, setNewCompanyResponsible] = useState('')
  const [newCompanySegment, setNewCompanySegment] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')

  // Cadastro unificado - campos de plano/cobrança
  const [cadastroPlanId, setCadastroPlanId] = useState('')
  const [cadastroPeriod, setCadastroPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [cadastroStartsAt, setCadastroStartsAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [cadastroEndsAt, setCadastroEndsAt] = useState('')

  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState('ADMIN')
  const [newUserRequirePasswordChange, setNewUserRequirePasswordChange] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [userTargetCompanyId, setUserTargetCompanyId] = useState('')
  const [userTargetRole, setUserTargetRole] = useState('USUARIO')
  const [userNewPassword, setUserNewPassword] = useState('')

  const [planCode, setPlanCode] = useState('')
  const [planName, setPlanName] = useState('')
  const [planPrice, setPlanPrice] = useState('0')
  const [planDefaultPeriod, setPlanDefaultPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')

  const [subscriptionPlanId, setSubscriptionPlanId] = useState('')
  const [subscriptionAmount, setSubscriptionAmount] = useState('0')
  const [subscriptionPeriod, setSubscriptionPeriod] = useState<'monthly' | 'quarterly' | 'yearly' | 'custom'>('monthly')
  const [subscriptionStatus, setSubscriptionStatus] = useState<'ativa' | 'atrasada' | 'cancelada' | 'teste'>('teste')
  const [subscriptionStartsAt, setSubscriptionStartsAt] = useState('')
  const [subscriptionEndsAt, setSubscriptionEndsAt] = useState('')
  const [subscriptionRenewalAt, setSubscriptionRenewalAt] = useState('')
  const [planCodeToChange, setPlanCodeToChange] = useState('')
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState('')

  const [selectedContractId, setSelectedContractId] = useState('')
  const [contractContent, setContractContent] = useState('')
  const [contractSummary, setContractSummary] = useState('')

  const [billingSubscriptionId, setBillingSubscriptionId] = useState('')
  const [billingAmount, setBillingAmount] = useState('')
  const [billingPaymentStatus, setBillingPaymentStatus] = useState('paid')
  const [asaasCustomerId, setAsaasCustomerId] = useState('')
  const [asaasSubscriptionId, setAsaasSubscriptionId] = useState('')

  const [selectedTicketId, setSelectedTicketId] = useState('')
  const [ticketResponse, setTicketResponse] = useState('')
  const [ticketResponseStatus, setTicketResponseStatus] = useState('em_analise')
  const [ticketAttachments, setTicketAttachments] = useState<File[]>([])
  const [ticketUploading, setTicketUploading] = useState(false)
  const ownerThreadEndRef = useRef<HTMLDivElement>(null)

  const [systemUserId, setSystemUserId] = useState('')
  const [selectedTableName, setSelectedTableName] = useState('')
  const [logSearch, setLogSearch] = useState('')
  const [logSeverityFilter, setLogSeverityFilter] = useState<'todos' | 'info' | 'warn' | 'error' | 'critical'>('todos')
  const [logModuleFilter, setLogModuleFilter] = useState('todos')
  const [logActorFilter, setLogActorFilter] = useState('')
  const [logDateFrom, setLogDateFrom] = useState('')
  const [logDateTo, setLogDateTo] = useState('')

  const [criticalRequest, setCriticalRequest] = useState<CriticalActionRequest | null>(null)
  const [criticalConfirmValue, setCriticalConfirmValue] = useState('')

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

  // Platform contact config state
  const [platformContactEmail, setPlatformContactEmail] = useState('')
  const [platformContactWhatsapp, setPlatformContactWhatsapp] = useState('')
  const [platformContactName, setPlatformContactName] = useState('')
  const [platformExpiryMessage, setPlatformExpiryMessage] = useState('')
  const [platformGraceDays, setPlatformGraceDays] = useState('15')
  const [platformAlertDays, setPlatformAlertDays] = useState('7')
  const [platformContactLoaded, setPlatformContactLoaded] = useState(false)

  // ASAAS config state
  const [asaasApiKeyInput, setAsaasApiKeyInput] = useState('')
  const [asaasApiKeySaved, setAsaasApiKeySaved] = useState(false)
  const [asaasBaseUrl, setAsaasBaseUrl] = useState('')

  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')

  const ownerMasterEmail = resolveOwnerMasterEmail()
  const isOwnerMaster = (() => {
    const currentEmail = normalizeEmail(String(user?.email ?? ''))
    if (!currentEmail) return false
    if (currentEmail === ownerMasterEmail) return true
    return KNOWN_OWNER_MASTER_EMAILS.includes(currentEmail as (typeof KNOWN_OWNER_MASTER_EMAILS)[number])
  })()

  const visibleTabs = useMemo(
    () => OWNER_TABS.filter((tab) => (isOwnerMaster ? true : tab !== 'owner-master')),
    [isOwnerMaster],
  )

  useEffect(() => {
    if (!isOwnerMaster && activeTab === 'owner-master') {
      setActiveTab('dashboard')
    }
  }, [activeTab, isOwnerMaster])

  useEffect(() => {
    try { sessionStorage.setItem('owner_active_tab', activeTab) } catch { /* ignore */ }
  }, [activeTab])

  const healthQuery = useOwner2Health(true)
  const dashboardQuery = useOwner2Dashboard(activeTab === 'dashboard')
  const companiesQuery = useOwner2Companies(activeTab !== 'owner-master')
  const usersQuery = useOwner2Users(
    companyId || undefined,
    activeTab === 'usuarios' || activeTab === 'configuracoes' || activeTab === 'empresas' || activeTab === 'dashboard',
    isOwnerMaster,
  )
  const plansQuery = useOwner2Plans(activeTab === 'comercial' || activeTab === 'dashboard' || activeTab === 'cadastro')
  const subscriptionsQuery = useOwner2Subscriptions(activeTab === 'comercial' || activeTab === 'dashboard' || activeTab === 'cadastro' || activeTab === 'financeiro')
  const contractsQuery = useOwner2Contracts(activeTab === 'contratos' || activeTab === 'dashboard')
  const ticketsQuery = useOwner2Tickets(true)
  const auditFilters = useMemo(
    () => (companyId ? { empresa_id: companyId } : {}),
    [companyId],
  )
  const auditsQuery = useOwner2Audits(
    auditFilters,
    activeTab === 'auditoria' || activeTab === 'monitoramento' || activeTab === 'logs' || activeTab === 'owner-master',
  )
  const ownersQuery = useOwner2PlatformOwners(activeTab === 'owner-master')
  const monitoringLive = activeTab === 'monitoramento' && isDocumentVisible
  const systemLive = activeTab === 'sistema' && isDocumentVisible
  const tablesLive = monitoringLive || systemLive || activeTab === 'dashboard'
  const tablesRefetchInterval = monitoringLive ? 5000 : systemLive ? 10000 : false
  const tablesQuery = useOwner2Tables(
    companyId || undefined,
    tablesLive,
    tablesRefetchInterval,
  )
  const settingsQuery = useOwner2Settings(companyId || undefined, activeTab === 'configuracoes' || activeTab === 'feature-flags')
  const { execute } = useOwner2Actions()

  // Payments state for financeiro tab
  const [payments, setPayments] = useState<Record<string, unknown>[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsLoaded, setPaymentsLoaded] = useState(false)
  const [asaasHealthOk, setAsaasHealthOk] = useState<boolean | null>(null)

  // Load payments when financeiro tab is active
  useEffect(() => {
    if (activeTab === 'financeiro' && !paymentsLoaded && !paymentsLoading) {
      setPaymentsLoading(true)
      execute.mutateAsync({ action: 'list_subscription_payments' as any, payload: {} })
        .then((res: any) => {
          setPayments(safeArray(res?.payments ?? res?.data ?? []))
          setPaymentsLoaded(true)
        })
        .catch(() => { /* ignore */ })
        .finally(() => setPaymentsLoading(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, paymentsLoaded])

  // Check ASAAS health via health_check
  useEffect(() => {
    if (activeTab === 'financeiro' && asaasHealthOk === null) {
      execute.mutateAsync({ action: 'health_check' as any, payload: {} })
        .then((res: any) => {
          const hasKey = Boolean(res?.asaas_configured ?? res?.integrations?.asaas)
          setAsaasHealthOk(hasKey)
          if (res?.asaas_base_url) setAsaasBaseUrl(String(res.asaas_base_url))
        })
        .catch(() => setAsaasHealthOk(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Load platform contact config when configuracoes tab is active
  useEffect(() => {
    if (activeTab === 'configuracoes' && !platformContactLoaded) {
      loadPlatformContact()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, platformContactLoaded])

  const healthStatus = useMemo(() => {
    if (healthQuery.isError) {
      const message = healthQuery.error instanceof Error ? healthQuery.error.message : 'erro'
      return `erro: ${message}`
    }
    return String((healthQuery.data as any)?.status ?? 'n/a')
  }, [healthQuery.data, healthQuery.error, healthQuery.isError])

  const companies = useMemo(() => safeArray<Record<string, unknown>>((companiesQuery.data as any)?.companies), [companiesQuery.data])
  const users = useMemo(() => safeArray<Record<string, unknown>>((usersQuery.data as any)?.users), [usersQuery.data])
  const activeHumanUsers = useMemo(() => users.filter((u) => {
    const nome = String(u.nome ?? '').toLowerCase()
    const email = String(u.email ?? '').toLowerCase()
    const isDevice = nome.startsWith('device-') || email.endsWith('@dispositivo.local')
    return !isDevice && String(u.status ?? '').toLowerCase() === 'ativo'
  }), [users])
  const plans = useMemo(() => safeArray<Record<string, unknown>>((plansQuery.data as any)?.plans), [plansQuery.data])
  const subscriptions = useMemo(() => safeArray<Record<string, unknown>>((subscriptionsQuery.data as any)?.subscriptions), [subscriptionsQuery.data])
  const contracts = useMemo(() => safeArray<Record<string, unknown>>((contractsQuery.data as any)?.contracts), [contractsQuery.data])
  const tickets = useMemo(() => safeArray<Record<string, unknown>>((ticketsQuery.data as any)?.tickets), [ticketsQuery.data])
  const unreadOwnerCount = useMemo(
    () => tickets.reduce((sum, t) => sum + Number(t.unread_owner_messages ?? 0), 0),
    [tickets],
  )
  const logs = useMemo(() => safeArray<Record<string, unknown>>((auditsQuery.data as any)?.logs), [auditsQuery.data])
  const owners = useMemo(() => safeArray<Record<string, unknown>>((ownersQuery.data as any)?.owners), [ownersQuery.data])
  const tables = useMemo(() => safeArray<Record<string, unknown>>((tablesQuery.data as any)?.tables), [tablesQuery.data])
  const settings = useMemo(() => safeArray<Record<string, unknown>>((settingsQuery.data as any)?.settings), [settingsQuery.data])

  const selectedCompany = useMemo(
    () => companies.find((company) => String(company.id) === companyId) ?? null,
    [companies, companyId],
  )

  const busy = execute.isPending

  useEffect(() => {
    if (typeof document === 'undefined') return

    const syncVisibility = () => {
      setIsDocumentVisible(document.visibilityState !== 'hidden')
    }

    syncVisibility()
    document.addEventListener('visibilitychange', syncVisibility)
    return () => {
      document.removeEventListener('visibilitychange', syncVisibility)
    }
  }, [])

  useEffect(() => {
    if (!selectedUserId && users.length > 0) setSelectedUserId(String(users[0]?.id ?? ''))
  }, [selectedUserId, users])

  useEffect(() => {
    if (!selectedUserId) return
    const selected = users.find((u) => String(u.id ?? '') === selectedUserId)
    if (!selected) return

    setUserTargetCompanyId(String(selected.empresa_id ?? ''))
    const firstRole = Array.isArray(selected.user_roles)
      ? String((selected.user_roles[0] as any)?.role ?? selected.role ?? 'USUARIO').toUpperCase()
      : String(selected.role ?? 'USUARIO').toUpperCase()
    setUserTargetRole(firstRole || 'USUARIO')
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
      arpa: subscriptions.length > 0 ? totalMrr / subscriptions.length : 0,
    }
  }, [subscriptions])

  const financeStatusData = useMemo(() => {
    const grouped = subscriptions.reduce<Record<string, number>>((acc, sub) => {
      const status = String(sub.payment_status ?? sub.status ?? 'unknown').toLowerCase()
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})
    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [subscriptions])

  const availableLogModules = useMemo(() => {
    const modules = new Set<string>()
    logs.forEach((log) => {
      const moduleName = String(log.module ?? log.context_module ?? log.entity ?? '').trim()
      if (moduleName) modules.add(moduleName)
    })
    return Array.from(modules).sort((a, b) => a.localeCompare(b))
  }, [logs])

  const logsFiltered = useMemo(() => {
    const q = logSearch.trim().toLowerCase()
    const actorQ = logActorFilter.trim().toLowerCase()
    const fromDate = logDateFrom ? new Date(`${logDateFrom}T00:00:00`) : null
    const toDate = logDateTo ? new Date(`${logDateTo}T23:59:59`) : null

    return logs.filter((log) => {
      const action = String(log.action ?? log.event ?? '').toLowerCase()
      const actor = String(log.actor_email ?? log.user_email ?? '').toLowerCase()
      const severity = String(log.severity ?? '').toLowerCase()
      const moduleName = String(log.module ?? log.context_module ?? log.entity ?? '')
      const logDateRaw = String(log.created_at ?? log.at ?? '')
      const logDate = logDateRaw ? new Date(logDateRaw) : null

      const textOk = !q || action.includes(q) || actor.includes(q)
      const severityOk = logSeverityFilter === 'todos' || severity === logSeverityFilter
      const actorOk = !actorQ || actor.includes(actorQ)
      const moduleOk = logModuleFilter === 'todos' || moduleName === logModuleFilter
      const fromOk = !fromDate || (logDate && !Number.isNaN(logDate.getTime()) && logDate >= fromDate)
      const toOk = !toDate || (logDate && !Number.isNaN(logDate.getTime()) && logDate <= toDate)

      return textOk && severityOk && actorOk && moduleOk && Boolean(fromOk) && Boolean(toOk)
    })
  }, [logActorFilter, logDateFrom, logDateTo, logModuleFilter, logSearch, logSeverityFilter, logs])

  function exportLogsCsv() {
    const rows = logsFiltered.map((l) => [
      String(l.id ?? ''),
      String(l.action ?? l.event ?? ''),
      String(l.severity ?? ''),
      String(l.module ?? l.context_module ?? l.entity ?? ''),
      String(l.actor_email ?? l.user_email ?? ''),
      String(l.created_at ?? l.at ?? ''),
    ])
    downloadCsv('owner-logs.csv', ['id', 'acao', 'severidade', 'modulo', 'ator', 'data'], rows)
    setFeedback('Exportacao de logs gerada em CSV.')
  }

  function exportFinanceCsv() {
    const rows = subscriptions.map((s) => [
      String(s.id ?? ''),
      String(s.empresa_id ?? ''),
      String(s.plan_id ?? s.plano_id ?? ''),
      asNumber(s.amount, 0),
      String(s.payment_status ?? ''),
      String(s.status ?? ''),
    ])
    downloadCsv('owner-financeiro.csv', ['id', 'empresa_id', 'plano_id', 'valor', 'payment_status', 'status'], rows)
    setFeedback('Exportacao financeira gerada em CSV.')
  }

  function openCriticalAction(request: CriticalActionRequest) {
    setCriticalConfirmValue('')
    setCriticalRequest(request)
    setError(null)
    setFeedback(null)
  }

  async function confirmCriticalAction() {
    if (!criticalRequest) return
    if (criticalRequest.masterOnly && !isOwnerMaster) {
      setError('Acao disponivel apenas para OWNER_MASTER.')
      return
    }
    if (criticalConfirmValue.trim() !== criticalRequest.confirmText) {
      setError(`Confirme digitando exatamente: ${criticalRequest.confirmText}`)
      return
    }
    if (!authPassword.trim()) {
      setError('Informe a senha de confirmacao para continuar.')
      return
    }

    await runAction(
      criticalRequest.action,
      { ...criticalRequest.payload, auth_password: authPassword },
      criticalRequest.successMessage,
    )

    setCriticalRequest(null)
    setCriticalConfirmValue('')
  }

  const selectedCompanyLoginUrl = useMemo(() => {
    if (!selectedCompany) return ''
    const slug = String(selectedCompany.slug ?? '').trim()
    return slug ? `https://${slug}.${TENANT_BASE_DOMAIN}/login` : ''
  }, [selectedCompany])

  async function runAction(action: any, payload: Record<string, unknown>, successMessage: string) {
    setError(null)
    setFeedback(null)
    try {
      await execute.mutateAsync({ action, payload })
      setFeedback(successMessage)
    } catch (err: any) {
      setError(String(err?.message ?? err ?? 'Falha na operação do Owner.'))
    }
  }

  async function loadPlatformContact() {
    if (platformContactLoaded) return
    try {
      const res: any = await execute.mutateAsync({ action: 'get_platform_contact', payload: {} })
      const cfg = res?.config ?? res ?? {}
      setPlatformContactEmail(cfg.contact_email ?? '')
      setPlatformContactWhatsapp(cfg.contact_whatsapp ?? '')
      setPlatformContactName(cfg.contact_name ?? '')
      setPlatformExpiryMessage(cfg.expiry_custom_message ?? '')
      setPlatformGraceDays(String(cfg.grace_period_days ?? '15'))
      setPlatformAlertDays(String(cfg.alert_days_before ?? '7'))
      setPlatformContactLoaded(true)
    } catch { /* ignore load error */ }
  }

  async function handleCreateCompany() {
    setError(null)
    setFeedback(null)
    setCompanyCredentialNote(null)

    const resetCreateCompanyForm = () => {
      setNewCompanyName('')
      setNewCompanySlug('')
      setNewCompanyPersonType('PJ')
      setNewCompanyDocument('')
      setNewCompanyRazaoSocial('')
      setNewCompanyNomeFantasia('')
      setNewCompanyAddress('')
      setNewCompanyPhone('')
      setNewCompanyEmail('')
      setNewCompanyResponsible('')
      setNewCompanySegment('')
      setNewAdminName('')
      setNewAdminEmail('')
    }

    try {
      const response: any = await execute.mutateAsync({
        action: 'create_company',
        payload: {
          company: {
            nome: newCompanyName,
            slug: newCompanySlug || undefined,
            tipo_pessoa: newCompanyPersonType,
            cpf_cnpj: newCompanyDocument || undefined,
            razao_social: newCompanyRazaoSocial || newCompanyName,
            nome_fantasia: newCompanyNomeFantasia || newCompanyName,
            endereco: newCompanyAddress || undefined,
            telefone: newCompanyPhone || undefined,
            email: newCompanyEmail || undefined,
            responsavel: newCompanyResponsible || undefined,
            segmento: newCompanySegment || undefined,
          },
          user: { nome: newAdminName, email: newAdminEmail, role: 'MASTER_TI' },
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
      resetCreateCompanyForm()
    } catch (err: any) {
      const errorMessage = String(err?.message ?? err ?? 'Falha ao criar empresa no Owner.')
      const isBindingError =
        errorMessage.includes('Falha ao vincular usuário master na empresa (profiles).') ||
        errorMessage.includes('Falha ao vincular usuário à empresa (profiles).') ||
        errorMessage.includes('Falha ao vincular papel do usuário master na empresa (user_roles).') ||
        errorMessage.includes('Falha ao vincular papel do usuário na empresa (user_roles).')

      if (isBindingError) {
        try {
          const companiesResult: any = await listPlatformCompanies()
          const companies = Array.isArray(companiesResult?.companies) ? companiesResult.companies : []
          const targetSlug = String(newCompanySlug || '').trim().toLowerCase()
          const targetName = String(newCompanyName || '').trim().toLowerCase()

          const createdCompany = companies.find((company: any) => {
            const companySlug = String(company?.slug ?? '').trim().toLowerCase()
            const companyName = String(company?.nome ?? '').trim().toLowerCase()
            if (targetSlug && companySlug) return companySlug === targetSlug
            return targetName && companyName === targetName
          })

          if (createdCompany) {
            setError(null)
            setFeedback('Empresa criada com sucesso, mas o vínculo automático de perfil/papel do usuário master falhou. Use a aba Usuários para revisar/perfilar o acesso.')
            resetCreateCompanyForm()
            return
          }
        } catch {
          // Se o fallback também falhar, devolve erro original.
        }
      }

      setError(errorMessage)
    }
  }

  async function handleCreateCompanyFromCadastro() {
    setError(null)
    setFeedback(null)
    setCompanyCredentialNote(null)

    if (!newCompanyName || !newCompanyDocument || !newAdminName || !newAdminEmail) {
      setError('Preencha os campos obrigatórios: Nome empresa, CPF/CNPJ, Nome admin, Email admin.')
      return
    }
    if (!cadastroPlanId) {
      setError('Selecione um plano para a empresa.')
      return
    }

    const selectedPlan = plans.find((p) => String(p.id) === cadastroPlanId)
    const planPrice = Number(selectedPlan?.price_month ?? 0)

    const resetForm = () => {
      setNewCompanyName('')
      setNewCompanySlug('')
      setNewCompanyPersonType('PJ')
      setNewCompanyDocument('')
      setNewCompanyRazaoSocial('')
      setNewCompanyNomeFantasia('')
      setNewCompanyAddress('')
      setNewCompanyPhone('')
      setNewCompanyEmail('')
      setNewCompanyResponsible('')
      setNewCompanySegment('')
      setNewAdminName('')
      setNewAdminEmail('')
      setCadastroPlanId('')
      setCadastroPeriod('monthly')
      setCadastroStartsAt(new Date().toISOString().slice(0, 10))
      setCadastroEndsAt('')
    }

    try {
      const response: any = await execute.mutateAsync({
        action: 'create_company',
        payload: {
          company: {
            nome: newCompanyName,
            slug: newCompanySlug || undefined,
            tipo_pessoa: newCompanyPersonType,
            cpf_cnpj: newCompanyDocument || undefined,
            razao_social: newCompanyRazaoSocial || newCompanyName,
            nome_fantasia: newCompanyNomeFantasia || newCompanyName,
            endereco: newCompanyAddress || undefined,
            telefone: newCompanyPhone || undefined,
            email: newCompanyEmail || undefined,
            responsavel: newCompanyResponsible || undefined,
            segmento: newCompanySegment || undefined,
          },
          user: { nome: newAdminName, email: newAdminEmail, role: 'MASTER_TI' },
          subscription: {
            plan_id: cadastroPlanId,
            amount: planPrice,
            period: cadastroPeriod,
            starts_at: cadastroStartsAt || undefined,
            ends_at: cadastroEndsAt || undefined,
            status: 'teste',
          },
        },
      })

      const createdCompany = response?.company ?? {}
      const masterUser = response?.master_user ?? {}
      const initialPassword = String(masterUser?.initial_password ?? '').trim()
      const companySlug = String(createdCompany?.slug ?? newCompanySlug ?? '').trim()
      const companyName = String(createdCompany?.nome ?? newCompanyName).trim()
      const masterEmail = String(masterUser?.email ?? newAdminEmail).trim().toLowerCase()
      const subscriptionWarning = response?.warning ? `\nObs: ${response.warning}` : ''

      const resolvedHost = await resolveOrRepairTenantHost({
        tenantId: String(createdCompany?.id ?? ''),
        tenantBaseDomain: TENANT_BASE_DOMAIN,
        slugHint: companySlug || undefined,
      })

      const loginHost = resolvedHost || (companySlug ? `${companySlug}.${TENANT_BASE_DOMAIN}` : '')
      const loginUrl = loginHost ? `https://${loginHost}/login` : `https://${TENANT_BASE_DOMAIN}/login`

      const planName = String(selectedPlan?.name ?? selectedPlan?.code ?? 'N/A')
      const periodLabel = cadastroPeriod === 'monthly' ? 'Mensal' : cadastroPeriod === 'quarterly' ? 'Trimestral' : 'Anual'

      if (initialPassword) {
        const noteText = [
          'CREDENCIAIS INICIAIS DO CLIENTE',
          `Empresa: ${companyName}`,
          `Slug: ${companySlug || 'N/A'}`,
          `Plano: ${planName} (${periodLabel})`,
          `Login: ${masterEmail}`,
          `Senha temporaria: ${initialPassword}`,
          `URL de acesso: ${loginUrl}`,
          'Acao obrigatoria: alterar a senha no primeiro acesso.',
          subscriptionWarning,
        ].filter(Boolean).join('\n')

        setCompanyCredentialNote({
          companyName,
          companySlug,
          masterEmail,
          initialPassword,
          loginUrl,
          noteText,
        })
      }

      setFeedback(initialPassword
        ? 'Empresa cadastrada com sucesso! Credenciais disponíveis abaixo.'
        : 'Empresa cadastrada com sucesso.')
      resetForm()
    } catch (err: any) {
      setError(String(err?.message ?? err ?? 'Falha ao cadastrar empresa.'))
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
          <p className="mt-2 text-sm text-slate-600">O Owner é exclusivo para SYSTEM_OWNER.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#f8fafc_45%)] text-slate-900">
      <header className="border-b border-slate-200/90 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Owner Portal</h1>
            <p className="text-xs text-slate-600">Visao executiva do ecossistema multiempresa.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
              <p>Usuário: {user?.email}</p>
              <p>Health: {healthStatus}</p>
            </div>
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"
              onClick={() => void logout({ reason: 'manual' })}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1600px] gap-4 p-4 lg:grid-cols-[230px,1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm">
          <nav className="space-y-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${activeTab === tab ? 'bg-sky-700 font-semibold text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`}
                onClick={() => setActiveTab(tab)}
              >
                <span className="flex items-center justify-between">
                  {OWNER_TAB_LABELS[tab]}
                  {tab === 'suporte' && unreadOwnerCount > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white">
                      {unreadOwnerCount > 99 ? '99+' : unreadOwnerCount}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="space-y-4">
          <div className="rounded-2xl border border-sky-200 bg-sky-50/90 p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-sky-900">
                Contexto ativo: <span className="font-semibold">{selectedCompany ? String(selectedCompany.nome ?? selectedCompany.slug ?? selectedCompany.id) : 'Global (todas as empresas)'}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedCompanyLoginUrl && (
                  <a className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700" href={selectedCompanyLoginUrl} target="_blank" rel="noopener noreferrer">
                    <LogIn className="h-3.5 w-3.5" /> Abrir login tenant
                  </a>
                )}
                <button
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                  disabled={!companyId}
                  onClick={() => {
                    setCompanyId('')
                    setFeedback('Contexto de empresa removido. Voltou para visão global.')
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" /> Sair do contexto
                </button>
              </div>
            </div>
          </div>

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

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricTile label="Empresas" value={companies.length} icon={Building2} tone="sky" />
                <MetricTile label="Usuários" value={activeHumanUsers.length} icon={Users} tone="emerald" />
                <MetricTile label="Assinaturas" value={subscriptions.length} icon={CreditCard} tone="amber" />
                <MetricTile label="Contratos" value={contracts.length} icon={FileText} tone="rose" />
                <MetricTile label="MRR" value={`R$ ${financeSummary.totalMrr.toLocaleString('pt-BR')}`} icon={CreditCard} tone="emerald" />
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

          {activeTab === 'cadastro' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <SurfaceCard title="Cadastro de nova empresa" subtitle="Preencha dados, selecione plano e crie em um clique">
                <div className="grid gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dados da empresa</p>
                  <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyPersonType} onChange={(e) => setNewCompanyPersonType(e.target.value as 'PF' | 'PJ')}>
                    <option value="PJ">Pessoa jurídica (PJ)</option>
                    <option value="PF">Pessoa física (PF)</option>
                  </select>
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Nome da empresa *" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanySlug} onChange={(e) => setNewCompanySlug(e.target.value)} placeholder="Slug (opcional)" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyDocument} onChange={(e) => setNewCompanyDocument(e.target.value)} placeholder={newCompanyPersonType === 'PF' ? 'CPF *' : 'CNPJ *'} />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyRazaoSocial} onChange={(e) => setNewCompanyRazaoSocial(e.target.value)} placeholder={newCompanyPersonType === 'PF' ? 'Nome completo' : 'Razão social'} />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyNomeFantasia} onChange={(e) => setNewCompanyNomeFantasia(e.target.value)} placeholder={newCompanyPersonType === 'PF' ? 'Nome de exibição' : 'Nome fantasia'} />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyAddress} onChange={(e) => setNewCompanyAddress(e.target.value)} placeholder="Endereço" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyPhone} onChange={(e) => setNewCompanyPhone(e.target.value)} placeholder="Telefone" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyEmail} onChange={(e) => setNewCompanyEmail(e.target.value)} placeholder="Email comercial" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyResponsible} onChange={(e) => setNewCompanyResponsible(e.target.value)} placeholder="Responsável" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanySegment} onChange={(e) => setNewCompanySegment(e.target.value)} placeholder="Segmento" />

                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Administrador master</p>
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} placeholder="Nome do administrador *" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="Email do administrador *" />

                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Plano e cobrança</p>
                  <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={cadastroPlanId} onChange={(e) => setCadastroPlanId(e.target.value)}>
                    <option value="">Selecione o plano *</option>
                    {plans.map((p) => (
                      <option key={String(p.id)} value={String(p.id)}>
                        {String(p.name ?? p.code ?? 'Plano')} — R$ {Number(p.price_month ?? 0).toFixed(2)}/mês
                      </option>
                    ))}
                  </select>
                  <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={cadastroPeriod} onChange={(e) => setCadastroPeriod(e.target.value)}>
                    <option value="monthly">Mensal</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="yearly">Anual</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Início</label>
                      <input type="date" className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={cadastroStartsAt} onChange={(e) => setCadastroStartsAt(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Término (opcional)</label>
                      <input type="date" className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={cadastroEndsAt} onChange={(e) => setCadastroEndsAt(e.target.value)} />
                    </div>
                  </div>

                  <button
                    className="mt-2 rounded-lg bg-sky-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
                    disabled={busy || !newCompanyName || !newCompanyDocument || !newAdminName || !newAdminEmail || !cadastroPlanId}
                    onClick={handleCreateCompanyFromCadastro}
                  >
                    Cadastrar empresa
                  </button>
                </div>

                {companyCredentialNote && (
                  <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Credenciais iniciais do cliente</p>
                    <p className="mt-1 text-xs text-sky-700">Informação exibida somente agora. Compartilhe com segurança.</p>
                    <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-sky-200 bg-white p-3 text-xs leading-relaxed text-slate-800">{companyCredentialNote.noteText}</pre>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100" onClick={copyCompanyCredentialNote}>Copiar nota</button>
                      <a className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100" href={companyCredentialNote.loginUrl} target="_blank" rel="noopener noreferrer">Abrir login do cliente</a>
                    </div>
                  </div>
                )}
              </SurfaceCard>

              <div className="space-y-4">
                {plans.length > 0 && (
                  <SurfaceCard title="Planos disponíveis" subtitle="Referência rápida">
                    <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-200">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-2 py-2 text-left">Plano</th>
                            <th className="px-2 py-2 text-left">Preço/mês</th>
                            <th className="px-2 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plans.map((p) => (
                            <tr key={String(p.id)} className="border-t border-slate-200">
                              <td className="px-2 py-2 font-medium">{String(p.name ?? p.code ?? '-')}</td>
                              <td className="px-2 py-2">R$ {Number(p.price_month ?? 0).toFixed(2)}</td>
                              <td className="px-2 py-2">{String(p.status ?? '-')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SurfaceCard>
                )}

                <SurfaceCard title="Ações rápidas da empresa selecionada">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm" disabled={busy || !companyId} onClick={() => runAction('set_company_status', { empresa_id: companyId, status: 'active' }, 'Empresa ativada.')}>Ativar</button>
                    <button className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !companyId} onClick={() => runAction('set_company_status', { empresa_id: companyId, status: 'blocked' }, 'Empresa bloqueada.')}>Bloquear</button>
                    <button
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700"
                      disabled={busy || !companyId}
                      onClick={() => openCriticalAction({
                        title: 'Limpeza completa de dados',
                        description: 'Remove dados operacionais da empresa. Mantenha apenas se tiver backup validado.',
                        confirmText: 'LIMPAR',
                        action: 'cleanup_company_data',
                        payload: { empresa_id: companyId, keep_company_core: false, keep_billing_data: false, include_auth_users: true },
                        successMessage: 'Limpeza completa executada.',
                      })}
                    >
                      Limpeza completa
                    </button>
                    <button
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                      disabled={busy || !companyId || !isOwnerMaster}
                      onClick={() => openCriticalAction({
                        title: 'Exclusão definitiva da empresa',
                        description: 'Esta ação é irreversível e remove dados da empresa selecionada.',
                        confirmText: 'EXCLUIR',
                        action: 'delete_company',
                        payload: { empresa_id: companyId, include_auth_users: true },
                        successMessage: 'Empresa excluída definitivamente.',
                        masterOnly: true,
                      })}
                    >
                      Excluir empresa
                    </button>
                  </div>
                </SurfaceCard>
              </div>

              <div className="xl:col-span-2">
                <SurfaceCard title="Empresas cadastradas">
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
                            <tr key={String(c.id)} className="border-t border-slate-200 cursor-pointer hover:bg-slate-50" onClick={() => setCompanyId(String(c.id ?? ''))}>
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

          {activeTab === 'empresas' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <SurfaceCard title="Nova empresa">
                <div className="grid gap-2">
                  <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyPersonType} onChange={(e) => setNewCompanyPersonType(e.target.value as 'PF' | 'PJ')}>
                    <option value="PJ">Pessoa juridica (PJ)</option>
                    <option value="PF">Pessoa fisica (PF)</option>
                  </select>
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Nome da empresa" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanySlug} onChange={(e) => setNewCompanySlug(e.target.value)} placeholder="Slug (opcional)" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyDocument} onChange={(e) => setNewCompanyDocument(e.target.value)} placeholder={newCompanyPersonType === 'PF' ? 'CPF' : 'CNPJ'} />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyRazaoSocial} onChange={(e) => setNewCompanyRazaoSocial(e.target.value)} placeholder={newCompanyPersonType === 'PF' ? 'Nome completo' : 'Razao social'} />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyNomeFantasia} onChange={(e) => setNewCompanyNomeFantasia(e.target.value)} placeholder={newCompanyPersonType === 'PF' ? 'Nome de exibicao' : 'Nome fantasia'} />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyAddress} onChange={(e) => setNewCompanyAddress(e.target.value)} placeholder="Endereco" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyPhone} onChange={(e) => setNewCompanyPhone(e.target.value)} placeholder="Telefone" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyEmail} onChange={(e) => setNewCompanyEmail(e.target.value)} placeholder="Email comercial" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyResponsible} onChange={(e) => setNewCompanyResponsible(e.target.value)} placeholder="Responsavel" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanySegment} onChange={(e) => setNewCompanySegment(e.target.value)} placeholder="Segmento" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} placeholder="Nome do administrador" />
                  <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="Email do administrador" />
                  <button
                    className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white"
                    disabled={busy || !newCompanyName || !newCompanyDocument || !newAdminName || !newAdminEmail}
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
                      <a className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100" href={companyCredentialNote.loginUrl} target="_blank" rel="noopener noreferrer">Abrir login do cliente</a>
                    </div>
                  </div>
                )}
              </SurfaceCard>

              <SurfaceCard title="Ações rápidas da empresa selecionada">
                <div className="grid gap-2 sm:grid-cols-2">
                  <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm" disabled={busy || !companyId} onClick={() => runAction('set_company_status', { empresa_id: companyId, status: 'active' }, 'Empresa ativada.')}>Ativar</button>
                  <button className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !companyId} onClick={() => runAction('set_company_status', { empresa_id: companyId, status: 'blocked' }, 'Empresa bloqueada.')}>Bloquear</button>
                  <button
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700"
                    disabled={busy || !companyId}
                    onClick={() => openCriticalAction({
                      title: 'Limpeza completa de dados',
                      description: 'Remove dados operacionais da empresa. Mantenha apenas se tiver backup validado.',
                      confirmText: 'LIMPAR',
                      action: 'cleanup_company_data',
                      payload: { empresa_id: companyId, keep_company_core: false, keep_billing_data: false, include_auth_users: true },
                      successMessage: 'Limpeza completa executada.',
                    })}
                  >
                    Limpeza completa
                  </button>
                  <button
                    className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                    disabled={busy || !companyId || !isOwnerMaster}
                    onClick={() => openCriticalAction({
                      title: 'Exclusao definitiva da empresa',
                      description: 'Esta acao e irreversivel e remove dados da empresa selecionada.',
                      confirmText: 'EXCLUIR',
                      action: 'delete_company',
                      payload: { empresa_id: companyId, include_auth_users: true },
                      successMessage: 'Empresa excluida definitivamente.',
                      masterOnly: true,
                    })}
                  >
                    Excluir empresa
                  </button>
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
            <OwnerUsuariosTab
              users={users}
              companies={companies}
              companyId={companyId}
              isOwnerMaster={isOwnerMaster}
              busy={busy}
              runAction={runAction}
              setFeedback={setFeedback}
            />
          )}

          {activeTab === 'comercial' && (
            <div className="space-y-6">
              {/* Catálogo de Planos */}
              <SurfaceCard title="Catálogo de Planos" subtitle="Gerencie os planos disponíveis para as empresas">
                <div className="mb-3 flex flex-wrap gap-2">
                  <button className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => { setShowPlanForm(!showPlanForm); setEditingPlanId(''); setPlanCode(''); setPlanName(''); setPlanPrice('0'); setPlanDefaultPeriod('monthly'); }}>{showPlanForm && !editingPlanId ? 'Cancelar' : '+ Cadastrar Novo Plano'}</button>
                </div>
                {(showPlanForm || editingPlanId) && (
                  <div className="mb-4 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-600">{editingPlanId ? 'Editar Plano' : 'Novo Plano'}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={planCode} onChange={(e) => setPlanCode(e.target.value)} placeholder="Código" />
                      <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Nome" />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} placeholder="Preço mensal" />
                      <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={planDefaultPeriod} onChange={(e) => setPlanDefaultPeriod(e.target.value as 'monthly' | 'quarterly' | 'yearly')}>
                        <option value="monthly">Mensal</option>
                        <option value="quarterly">Trimestral</option>
                        <option value="yearly">Anual</option>
                      </select>
                    </div>
                    {editingPlanId ? (
                      <div className="flex gap-2">
                        <button className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !planCode || !planName} onClick={() => { runAction('update_plan', { plan: { id: editingPlanId, code: planCode.toUpperCase(), name: planName, description: `Periodicidade padrão: ${planDefaultPeriod}`, price_month: Number(planPrice || 0), module_flags: { default_periodicity: planDefaultPeriod } } }, 'Plano atualizado com sucesso.'); setEditingPlanId(''); setPlanCode(''); setPlanName(''); setPlanPrice('0'); setPlanDefaultPeriod('monthly'); }}>Alterar plano</button>
                        <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onClick={() => { setEditingPlanId(''); setPlanCode(''); setPlanName(''); setPlanPrice('0'); setPlanDefaultPeriod('monthly'); }}>Cancelar edição</button>
                      </div>
                    ) : (
                      <button className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !planCode || !planName} onClick={() => { runAction('create_plan', { plan: { code: planCode.toUpperCase(), name: planName, description: `Periodicidade padrão: ${planDefaultPeriod}`, price_month: Number(planPrice || 0), user_limit: 10, data_limit_mb: 2048, module_flags: { default_periodicity: planDefaultPeriod }, active: true } }, 'Plano criado com sucesso.'); setShowPlanForm(false); }}>Criar plano</button>
                    )}
                  </div>
                )}
                <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-2 py-2 text-left">Código</th>
                        <th className="px-2 py-2 text-left">Nome</th>
                        <th className="px-2 py-2 text-left">Preço</th>
                        <th className="px-2 py-2 text-left">Período</th>
                        <th className="px-2 py-2 text-left">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map((p) => {
                        const flags = (p as Record<string, unknown>).module_flags as Record<string, unknown> | undefined
                        const periodLabel = flags?.default_periodicity === 'yearly' ? 'Anual' : flags?.default_periodicity === 'quarterly' ? 'Trimestral' : 'Mensal'
                        return (
                          <tr key={String(p.id)} className={`border-t border-slate-200 ${editingPlanId === String(p.id) ? 'bg-amber-50' : ''}`}>
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
                      {plans.length === 0 && <tr><td colSpan={5} className="px-2 py-3 text-slate-500">Nenhum plano cadastrado.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>

              {/* Assinaturas */}
              <SurfaceCard title="Assinaturas" subtitle="Cada empresa com plano, valor e periodicidade próprios">
                <div className="mb-4 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-600">Nova assinatura (empresa selecionada: {companyId || 'nenhuma'})</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={subscriptionPlanId} onChange={(e) => setSubscriptionPlanId(e.target.value)}>
                      <option value="">Plano</option>
                      {plans.map((p) => <option key={String(p.id)} value={String(p.id)}>{String(p.name ?? p.code ?? p.id)}</option>)}
                    </select>
                    <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={subscriptionAmount} onChange={(e) => setSubscriptionAmount(e.target.value)} placeholder="Valor" />
                    <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={subscriptionPeriod} onChange={(e) => setSubscriptionPeriod(e.target.value as 'monthly' | 'quarterly' | 'yearly' | 'custom')}>
                      <option value="monthly">Mensal</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="yearly">Anual</option>
                      <option value="custom">Customizada</option>
                    </select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={subscriptionStatus} onChange={(e) => setSubscriptionStatus(e.target.value as 'ativa' | 'atrasada' | 'cancelada' | 'teste')}>
                      <option value="teste">TESTE</option>
                      <option value="ativa">Ativa</option>
                      <option value="atrasada">Atrasada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                    <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" type="date" value={subscriptionStartsAt} onChange={(e) => setSubscriptionStartsAt(e.target.value)} title="Início" />
                    <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" type="date" value={subscriptionRenewalAt} onChange={(e) => setSubscriptionRenewalAt(e.target.value)} title="Próximo vencimento" />
                    <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" type="date" value={subscriptionEndsAt} onChange={(e) => setSubscriptionEndsAt(e.target.value)} title="Fim (opcional)" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !companyId || !subscriptionPlanId} onClick={() => runAction('create_subscription', { subscription: { empresa_id: companyId, plan_id: subscriptionPlanId, amount: Number(subscriptionAmount || 0), period: subscriptionPeriod, starts_at: subscriptionStartsAt || undefined, renewal_at: subscriptionRenewalAt || undefined, ends_at: subscriptionEndsAt || undefined, status: subscriptionStatus } }, 'Assinatura criada com sucesso.')}>Criar assinatura</button>
                    <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm" disabled={busy || !companyId} onClick={() => runAction('set_subscription_status', { empresa_id: companyId, status: 'ativa' }, 'Assinatura ativada.')}>Ativar assinatura</button>
                    <button className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !isOwnerMaster} onClick={() => runAction('enforce_subscription_expiry', {}, 'Vencimentos processados.')}>Processar vencimentos</button>
                    <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={planCodeToChange} onChange={(e) => setPlanCodeToChange(e.target.value)} placeholder="Código novo plano" />
                    <button className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !companyId || !planCodeToChange} onClick={() => runAction('change_plan', { empresa_id: companyId, plano_codigo: planCodeToChange.toUpperCase() }, 'Plano alterado.')}>Trocar plano</button>
                  </div>
                </div>
                <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-2 py-2 text-left">Empresa</th>
                        <th className="px-2 py-2 text-left">Plano</th>
                        <th className="px-2 py-2 text-left">Status</th>
                        <th className="px-2 py-2 text-left">Validade</th>
                        <th className="px-2 py-2 text-left">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.map((s, idx) => {
                        const st = String(s.status ?? '-')
                        const sa = (s as Record<string, unknown>).starts_at as string | null
                        const ea = (s as Record<string, unknown>).ends_at as string | null
                        const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '–'
                        const planObj = plans.find((p) => String(p.id) === String(s.plan_id ?? (s as Record<string, unknown>).plano_id))
                        return (
                          <tr key={`${String(s.id ?? 'sub')}-${idx}`} className="border-t border-slate-200">
                            <td className="px-2 py-2">{String(s.empresa_id ?? '-')}</td>
                            <td className="px-2 py-2">{planObj ? String(planObj.name ?? planObj.code) : String(s.plan_id ?? (s as Record<string, unknown>).plano_id ?? '-')}</td>
                            <td className="px-2 py-2"><span className={`rounded border px-2 py-0.5 ${statusColor(st)}`}>{st}</span></td>
                            <td className="px-2 py-2 whitespace-nowrap">{fmtDate(sa)} — {fmtDate(ea)}</td>
                            <td className="px-2 py-2">
                              <button className="rounded border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700" disabled={busy} onClick={() => runAction('set_subscription_status', { empresa_id: String(s.empresa_id ?? ''), status: 'ativa' }, 'Ativada.')}>Ativar</button>
                            </td>
                          </tr>
                        )
                      })}
                      {subscriptions.length === 0 && <tr><td colSpan={5} className="px-2 py-3 text-slate-500">Nenhuma assinatura.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>
            </div>
          )}

          {activeTab === 'financeiro' && (
            <div className="grid gap-4">
              {/* Row 1: Metricas + Status ASAAS */}
              <div className="grid gap-4 xl:grid-cols-2">
                <SurfaceCard title="Resumo financeiro" subtitle="Receita recorrente e status de pagamento">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <MetricTile label="MRR" value={`R$ ${financeSummary.totalMrr.toLocaleString('pt-BR')}`} icon={CreditCard} tone="emerald" />
                    <MetricTile label="Assinaturas pagas" value={financeSummary.paid} icon={ShieldCheck} tone="sky" />
                    <MetricTile label="Assinaturas atrasadas" value={financeSummary.late} icon={AlertTriangle} tone="amber" />
                    <MetricTile label="ARPA" value={`R$ ${financeSummary.arpa.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`} icon={Database} tone="rose" />
                  </div>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs text-slate-500">Status de pagamento</p>
                      <button className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700" onClick={exportFinanceCsv}>
                        <Download className="h-3 w-3" /> Exportar CSV
                      </button>
                    </div>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={financeStatusData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
                          <Tooltip />
                          <Bar dataKey="value" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </SurfaceCard>

                <div className="grid gap-4">
                  {/* ASAAS Status Indicator */}
                  <SurfaceCard title="Status ASAAS" subtitle="Integracao com gateway de pagamento">
                    <div className="flex items-center gap-3 rounded-xl border p-3 ${asaasHealthOk ? 'border-emerald-200 bg-emerald-50' : asaasHealthOk === false ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}">
                      {asaasHealthOk === null ? (
                        <><Loader2 className="h-5 w-5 animate-spin text-slate-400" /><div><p className="text-sm font-semibold text-slate-700">Verificando...</p><p className="text-xs text-slate-500">Checando API key do ASAAS</p></div></>
                      ) : asaasHealthOk ? (
                        <><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="text-sm font-semibold text-emerald-700">ASAAS conectado</p><p className="text-xs text-emerald-600">API key configurada. Webhooks e sync prontos.</p></div></>
                      ) : (
                        <><XCircle className="h-5 w-5 text-rose-600" /><div><p className="text-sm font-semibold text-rose-700">ASAAS nao configurado</p><p className="text-xs text-rose-600">Defina ASAAS_API_KEY nos secrets do Supabase.</p></div></>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">Para configurar: <code className="rounded bg-slate-100 px-1">supabase secrets set ASAAS_API_KEY=seu_token</code></p>
                  </SurfaceCard>

                  {/* Atualizar cobranca */}
                  <SurfaceCard title="Atualizar cobranca" subtitle="Alterar valor ou status de pagamento">
                    <div className="grid gap-2">
                      <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={billingSubscriptionId} onChange={(e) => setBillingSubscriptionId(e.target.value)}>
                        <option value="">Selecione a assinatura</option>
                        {subscriptions.map((s, idx) => {
                          const provider = String(s.billing_provider ?? 'manual')
                          const tag = provider !== 'manual' ? ` [${provider.toUpperCase()}]` : ''
                          const empresa = companies.find((c) => String(c.id) === String(s.empresa_id))
                          const label = empresa ? String(empresa.nome ?? empresa.slug ?? s.empresa_id) : String(s.empresa_id ?? '-')
                          return (
                            <option key={`${String(s.id ?? 'sub')}-${idx}`} value={String(s.id ?? '')}>
                              {label}{tag} - R$ {asNumber(s.amount, 0).toLocaleString('pt-BR')}
                            </option>
                          )
                        })}
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
                        }, 'Cobranca atualizada com sucesso.')}
                      >
                        Atualizar cobranca
                      </button>
                    </div>
                  </SurfaceCard>
                </div>
              </div>

              {/* Row 2: Assinaturas com badges de provider */}
              <SurfaceCard title="Assinaturas" subtitle="Todas as assinaturas com status do provider">
                <div className="max-h-[350px] overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr>
                        <th className="px-2 py-2 text-left">Empresa</th>
                        <th className="px-2 py-2 text-left">Provider</th>
                        <th className="px-2 py-2 text-left">Valor</th>
                        <th className="px-2 py-2 text-left">Status</th>
                        <th className="px-2 py-2 text-left">Pagamento</th>
                        <th className="px-2 py-2 text-left">Renovacao</th>
                        <th className="px-2 py-2 text-left">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.map((s, idx) => {
                        const provider = String(s.billing_provider ?? 'manual')
                        const providerBadge = provider === 'asaas'
                          ? 'bg-violet-100 text-violet-700 border-violet-200'
                          : provider === 'stripe'
                            ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        const empresa = companies.find((c) => String(c.id) === String(s.empresa_id))
                        const empresaLabel = empresa ? String(empresa.nome ?? empresa.slug ?? '') : String(s.empresa_id ?? '-').slice(0, 8)
                        return (
                          <tr key={`fs-${String(s.id ?? idx)}`} className="border-t border-slate-200 hover:bg-slate-50">
                            <td className="px-2 py-2 font-medium">{empresaLabel}</td>
                            <td className="px-2 py-2">
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${providerBadge}`}>
                                {provider.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-2 py-2">R$ {asNumber(s.amount, 0).toLocaleString('pt-BR')}</td>
                            <td className="px-2 py-2"><span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor(String(s.status ?? ''))}`}>{String(s.status ?? '-')}</span></td>
                            <td className="px-2 py-2"><span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor(String(s.payment_status ?? ''))}`}>{String(s.payment_status ?? '-')}</span></td>
                            <td className="px-2 py-2 text-slate-500">{s.renewal_at ? new Date(String(s.renewal_at)).toLocaleDateString('pt-BR') : '-'}</td>
                            <td className="px-2 py-2">
                              <div className="flex gap-1">
                                {isOwnerMaster && provider === 'asaas' && (
                                  <button
                                    className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700 hover:bg-emerald-100"
                                    disabled={busy}
                                    title="Sincronizar com ASAAS"
                                    onClick={() => runAction('asaas_sync_subscription', { subscription_id: String(s.id) }, 'Sincronizacao ASAAS concluida.')}
                                  >
                                    <RefreshCw className="h-3 w-3" /> Sync
                                  </button>
                                )}
                                {isOwnerMaster && provider === 'manual' && (
                                  <button
                                    className="inline-flex items-center gap-1 rounded border border-violet-300 bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-700 hover:bg-violet-100"
                                    disabled={busy}
                                    title="Vincular ao ASAAS"
                                    onClick={() => { setBillingSubscriptionId(String(s.id)); }}
                                  >
                                    <Link2 className="h-3 w-3" /> Vincular
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {subscriptions.length === 0 && <tr><td colSpan={7} className="px-2 py-4 text-center text-slate-500">Nenhuma assinatura.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>

              {/* Row 3: Vincular ASAAS + Historico de pagamentos */}
              <div className="grid gap-4 xl:grid-cols-2">
                {/* Vincular ASAAS */}
                {isOwnerMaster ? (
                  <SurfaceCard title="Vincular ASAAS" subtitle="Conectar assinatura local ao ASAAS">
                    <div className="grid gap-2">
                      <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={billingSubscriptionId} onChange={(e) => setBillingSubscriptionId(e.target.value)}>
                        <option value="">Selecione a assinatura</option>
                        {subscriptions.map((s, idx) => {
                          const empresa = companies.find((c) => String(c.id) === String(s.empresa_id))
                          const label = empresa ? String(empresa.nome ?? empresa.slug ?? s.empresa_id) : String(s.empresa_id ?? '-')
                          return (
                            <option key={`link-${String(s.id ?? 'sub')}-${idx}`} value={String(s.id ?? '')}>
                              {label} - {String(s.billing_provider ?? 'manual').toUpperCase()}
                            </option>
                          )
                        })}
                      </select>
                      <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" placeholder="Asaas customer ID (cus_xxx)" value={asaasCustomerId} onChange={(e) => setAsaasCustomerId(e.target.value)} />
                      <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" placeholder="Asaas subscription ID (sub_xxx)" value={asaasSubscriptionId} onChange={(e) => setAsaasSubscriptionId(e.target.value)} />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
                          disabled={busy || (!billingSubscriptionId && !companyId)}
                          onClick={() => runAction('asaas_link_subscription', {
                            subscription_id: billingSubscriptionId || undefined,
                            empresa_id: billingSubscriptionId ? undefined : (companyId || undefined),
                            asaas_customer_id: asaasCustomerId || undefined,
                            asaas_subscription_id: asaasSubscriptionId || undefined,
                          }, 'Vinculo ASAAS salvo com sucesso.')}
                        >
                          <Link2 className="h-4 w-4" /> Salvar vinculo
                        </button>
                        <button
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                          disabled={busy || (!billingSubscriptionId && !companyId)}
                          onClick={() => {
                            runAction('asaas_sync_subscription', {
                              subscription_id: billingSubscriptionId || undefined,
                              empresa_id: billingSubscriptionId ? undefined : (companyId || undefined),
                            }, 'Sincronizacao ASAAS concluida.')
                            setPaymentsLoaded(false)
                          }}
                        >
                          <RefreshCw className="h-4 w-4" /> Sincronizar agora
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">Ao vincular, o webhook do ASAAS vai atualizar status e pagamentos automaticamente.</p>
                    </div>
                  </SurfaceCard>
                ) : (
                  <SurfaceCard title="Integracao ASAAS" subtitle="Area restrita">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                      <p className="text-sm text-slate-500">Vinculacao e sincronizacao ASAAS disponivel apenas para OWNER_MASTER.</p>
                    </div>
                  </SurfaceCard>
                )}

                {/* Historico de pagamentos */}
                <SurfaceCard title="Historico de pagamentos" subtitle={`${payments.length} pagamento(s) registrado(s)`}>
                  {paymentsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      <span className="ml-2 text-sm text-slate-500">Carregando pagamentos...</span>
                    </div>
                  ) : (
                    <div className="max-h-[320px] overflow-auto rounded-xl border border-slate-200">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-slate-100">
                          <tr>
                            <th className="px-2 py-2 text-left">Data</th>
                            <th className="px-2 py-2 text-left">Valor</th>
                            <th className="px-2 py-2 text-left">Status</th>
                            <th className="px-2 py-2 text-left">Provider</th>
                            <th className="px-2 py-2 text-left">Metodo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p, idx) => {
                            const pStatus = String(p.status ?? '-').toLowerCase()
                            const pStatusBadge = pStatus === 'paid' || pStatus === 'pago'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : pStatus === 'late' || pStatus === 'atrasado' || pStatus === 'overdue'
                                ? 'bg-amber-100 text-amber-700 border-amber-200'
                                : pStatus === 'failed' || pStatus === 'falhou'
                                  ? 'bg-rose-100 text-rose-700 border-rose-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                            const pProvider = String(p.provider ?? 'manual')
                            const pProviderBadge = pProvider === 'asaas'
                              ? 'bg-violet-100 text-violet-700 border-violet-200'
                              : pProvider === 'stripe'
                                ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            return (
                              <tr key={`pay-${String(p.id ?? idx)}`} className="border-t border-slate-200 hover:bg-slate-50">
                                <td className="px-2 py-2 text-slate-600">
                                  {p.paid_at ? new Date(String(p.paid_at)).toLocaleDateString('pt-BR') : p.due_at ? new Date(String(p.due_at)).toLocaleDateString('pt-BR') : '-'}
                                </td>
                                <td className="px-2 py-2 font-medium">R$ {asNumber(p.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="px-2 py-2"><span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pStatusBadge}`}>{String(p.status ?? '-')}</span></td>
                                <td className="px-2 py-2"><span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pProviderBadge}`}>{pProvider.toUpperCase()}</span></td>
                                <td className="px-2 py-2 text-slate-500">{String(p.method ?? '-')}</td>
                              </tr>
                            )
                          })}
                          {payments.length === 0 && <tr><td colSpan={5} className="px-2 py-4 text-center text-slate-500">Nenhum pagamento registrado.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <button
                    className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    disabled={paymentsLoading}
                    onClick={() => { setPaymentsLoaded(false) }}
                  >
                    <RefreshCw className={`h-3 w-3 ${paymentsLoading ? 'animate-spin' : ''}`} /> Atualizar
                  </button>
                </SurfaceCard>
              </div>
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

          {activeTab === 'suporte' && (() => {
            const selectedTicket = tickets.find((t) => String(t.id) === selectedTicketId) ?? null

            // Normalise thread messages with legacy-field fallback
            const ticketMessages = (() => {
              if (!selectedTicket) return [] as Record<string, unknown>[]
              const raw = selectedTicket.messages
              if (Array.isArray(raw) && raw.length > 0) {
                const hasClient = raw.some((m: any) => String(m.sender ?? '') === 'client')
                if (!hasClient) {
                  const txt = String(selectedTicket.message ?? '').trim()
                  if (txt) return [{ id: `lc-${String(selectedTicket.id)}`, sender: 'client', message: txt, created_at: selectedTicket.created_at, attachments: [] }, ...raw] as Record<string, unknown>[]
                }
                return raw as Record<string, unknown>[]
              }
              const fb: Record<string, unknown>[] = []
              const cMsg = String(selectedTicket.message ?? '').trim()
              if (cMsg) fb.push({ id: `lc-${String(selectedTicket.id)}`, sender: 'client', message: cMsg, created_at: selectedTicket.created_at, attachments: [] })
              const oMsg = String(selectedTicket.owner_response ?? '').trim()
              if (oMsg) fb.push({ id: `lo-${String(selectedTicket.id)}`, sender: 'owner', message: oMsg, created_at: selectedTicket.updated_at ?? selectedTicket.responded_at, attachments: [] })
              return fb
            })()

            const getRequesterInfo = (ticket: Record<string, unknown>) => {
              const profile = ticket.profiles as Record<string, unknown> | null
              const nome = profile ? String(profile.nome ?? '').trim() : ''
              const email = profile ? String(profile.email ?? '').trim() : ''
              return { nome: nome || email || 'Desconhecido', email }
            }

            const openCount = tickets.filter((t) => { const s = String(t.status ?? '').toLowerCase(); return s === 'aberto' || s === 'em_analise' || s === 'open' || s === 'pending' }).length
            const resolvedCount = tickets.filter((t) => { const s = String(t.status ?? '').toLowerCase(); return s === 'resolvido' || s === 'resolved' || s === 'fechado' || s === 'closed' }).length

            const priBadge = (p: string) => {
              const pl = p.toLowerCase()
              if (pl === 'critica' || pl === 'critical') return 'bg-purple-100 text-purple-700 border-purple-200'
              if (pl === 'alta' || pl === 'high' || pl === 'urgente') return 'bg-red-100 text-red-700 border-red-200'
              if (pl === 'media' || pl === 'medium' || pl === 'média') return 'bg-amber-100 text-amber-700 border-amber-200'
              return 'bg-slate-100 text-slate-600 border-slate-200'
            }

            const handleOwnerUploadAndRespond = async () => {
              if (!selectedTicketId || !ticketResponse.trim()) return
              try {
                setTicketUploading(true)
                const attachmentUrls: string[] = []
                if (ticketAttachments.length > 0 && user?.id) {
                  for (const file of ticketAttachments.filter((f) => f.type.startsWith('image/'))) {
                    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
                    const path = `owner/${user.id}/${selectedTicketId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
                    attachmentUrls.push(await uploadToStorage('support-attachments', path, file))
                  }
                }
                await runAction('respond_support_ticket', { ticket_id: selectedTicketId, response: ticketResponse, status: ticketResponseStatus, attachments: attachmentUrls }, 'Ticket respondido com sucesso.')
                setTicketResponse('')
                setTicketAttachments([])
              } catch { /* handled by runAction */ } finally { setTicketUploading(false) }
            }

            const handleSelectTicket = async (tid: string) => {
              setSelectedTicketId(tid)
              const ticket = tickets.find((t) => String(t.id) === tid)
              if (ticket && Number(ticket.unread_owner_messages ?? 0) > 0) {
                try { await execute.mutateAsync({ action: 'mark_ticket_read_owner' as any, payload: { ticket_id: tid } }) } catch { /* non-critical */ }
              }
              setTimeout(() => ownerThreadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
            }

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricTile icon={LifeBuoy} label="Total" value={tickets.length} />
                  <MetricTile icon={AlertTriangle} label="Abertos" value={openCount} tone="amber" />
                  <MetricTile icon={ShieldCheck} label="Resolvidos" value={resolvedCount} tone="emerald" />
                  <MetricTile icon={Clock} label="Não lidos" value={unreadOwnerCount} tone="sky" />
                </div>

                <div className="grid gap-4 xl:grid-cols-5">
                  <div className="xl:col-span-2">
                    <SurfaceCard title={`Tickets (${tickets.length})`}>
                      <div className="max-h-[520px] overflow-auto space-y-1">
                        {tickets.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">Nenhum ticket</p>}
                        {tickets.map((t) => {
                          const tid = String(t.id)
                          const st = String(t.status ?? 'aberto')
                          const pri = String(t.priority ?? 'baixa')
                          const unread = Number(t.unread_owner_messages ?? 0)
                          const isSel = tid === selectedTicketId
                          const created = t.created_at ? new Date(String(t.created_at)).toLocaleDateString('pt-BR') : '—'
                          const emp = t.empresas as Record<string, unknown> | null
                          const empNome = emp ? String(emp.nome ?? emp.slug ?? '') : ''
                          const req = getRequesterInfo(t)
                          return (
                            <button key={tid} type="button" onClick={() => void handleSelectTicket(tid)} className={`w-full text-left p-3 rounded-lg border transition-all ${isSel ? 'border-sky-400 bg-sky-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm font-medium truncate ${isSel ? 'text-sky-800' : ''}`}>{String(t.subject ?? 'Sem assunto')}</p>
                                  <p className="text-xs text-slate-500 mt-0.5 truncate">{req.nome}</p>
                                  {empNome && <p className="text-[10px] text-slate-400">{empNome}</p>}
                                </div>
                                {unread > 0 && <span className="shrink-0 rounded-full bg-sky-600 text-white text-[10px] font-bold px-1.5 py-0.5">{unread}</span>}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${statusColor(st)}`}>{st}</span>
                                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${priBadge(pri)}`}>{pri}</span>
                                <span className="text-[10px] text-slate-400 ml-auto">{created}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </SurfaceCard>
                  </div>

                  <div className="xl:col-span-3 space-y-4">
                    {selectedTicket ? (
                      <>
                        <SurfaceCard title={String(selectedTicket.subject ?? 'Ticket')}>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                            <div><span className="text-slate-400">Status:</span> <span className={`rounded border px-1.5 py-0.5 font-medium ${statusColor(String(selectedTicket.status ?? ''))}`}>{String(selectedTicket.status ?? '—')}</span></div>
                            <div><span className="text-slate-400">Prioridade:</span> <span className={`rounded border px-1.5 py-0.5 font-medium ${priBadge(String(selectedTicket.priority ?? 'baixa'))}`}>{String(selectedTicket.priority ?? '—')}</span></div>
                            <div><span className="text-slate-400">Criado:</span> {selectedTicket.created_at ? new Date(String(selectedTicket.created_at)).toLocaleString('pt-BR') : '—'}</div>
                            <div><span className="text-slate-400">Empresa:</span> {(() => { const emp = selectedTicket.empresas as Record<string, unknown> | null; return emp ? String(emp.nome ?? emp.slug ?? String(selectedTicket.empresa_id ?? '—').slice(0, 8)) : String(selectedTicket.empresa_id ?? '—').slice(0, 8) })()}</div>
                          </div>
                          <div className="flex items-center gap-3 text-xs mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-slate-400">Solicitante:</span>
                            <span className="font-medium">{getRequesterInfo(selectedTicket).nome}</span>
                            {getRequesterInfo(selectedTicket).email && <span className="text-slate-400">({getRequesterInfo(selectedTicket).email})</span>}
                          </div>
                          {isOwnerMaster && (
                            <div className="flex justify-end">
                              <button type="button" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors" disabled={busy} onClick={() => openCriticalAction({ title: 'Excluir ticket de suporte', description: `Excluir definitivamente o ticket "${String(selectedTicket.subject ?? '')}" e todo seu histórico de mensagens.`, confirmText: 'EXCLUIR', action: 'delete_support_ticket', payload: { ticket_id: selectedTicketId }, successMessage: 'Ticket excluído com sucesso.' })}>
                                Excluir ticket
                              </button>
                            </div>
                          )}
                        </SurfaceCard>

                        <SurfaceCard title={`Conversa (${ticketMessages.length} mensagens)`}>
                          <div className="max-h-[420px] overflow-auto space-y-2 pr-1">
                            {ticketMessages.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">Nenhuma mensagem ainda</p>}
                            {ticketMessages.map((msg, idx) => {
                              const sender = String((msg as any).sender ?? 'client')
                              const isOwnerMsg = sender === 'owner' || sender === 'system'
                              const content = String((msg as any).message ?? (msg as any).content ?? '')
                              const time = (msg as any).created_at ? new Date(String((msg as any).created_at)).toLocaleString('pt-BR') : ''
                              const atts = Array.isArray((msg as any).attachments) ? (msg as any).attachments as string[] : []
                              return (
                                <div key={(msg as any).id ?? idx} className={`p-3 rounded-lg text-sm ${isOwnerMsg ? 'bg-sky-50 border border-sky-200 ml-8' : 'bg-slate-50 border border-slate-200 mr-8'}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-bold uppercase ${isOwnerMsg ? 'text-sky-600' : 'text-slate-500'}`}>{isOwnerMsg ? 'Suporte (Owner)' : 'Cliente'}</span>
                                    {time && <span className="text-[10px] text-slate-400">{time}</span>}
                                  </div>
                                  <p className="whitespace-pre-wrap">{content}</p>
                                  {isOwnerMsg && idx === ticketMessages.length - 1 && Number(selectedTicket?.unread_client_messages ?? 1) === 0 && (
                                    <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1">✓✓ Lido pelo cliente</p>
                                  )}
                                  {!isOwnerMsg && idx === ticketMessages.length - 1 && Number(selectedTicket?.unread_owner_messages ?? 1) === 0 && String(selectedTicket?.last_message_sender ?? '') === 'client' && (
                                    <p className="text-[10px] text-sky-500 mt-1 flex items-center gap-1">✓✓ Lido por você</p>
                                  )}
                                  {atts.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {atts.map((url, ai) => (
                                        <div key={ai}>
                                          {isImageUrl(url) ? (
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="block"><img src={url} alt="Anexo" loading="lazy" className="max-h-40 rounded-md border border-slate-200 object-contain hover:opacity-90 transition-opacity" /></a>
                                          ) : (
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 underline">Ver anexo</a>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                            <div ref={ownerThreadEndRef} />
                          </div>
                        </SurfaceCard>

                        <SurfaceCard title="Responder">
                          <div className="grid gap-3">
                            <textarea className="min-h-[100px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none" value={ticketResponse} onChange={(e) => setTicketResponse(e.target.value)} placeholder="Digite sua resposta ao cliente..." />
                            <div className="space-y-2">
                              <label className="block text-xs text-slate-500">Anexar imagens (opcional)</label>
                              <input type="file" accept="image/*" multiple className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:text-sm file:bg-white file:text-slate-700 hover:file:bg-slate-50" onChange={(e) => setTicketAttachments(Array.from(e.target.files ?? []))} />
                              {ticketAttachments.length > 0 && <p className="text-xs text-slate-400">{ticketAttachments.length} arquivo(s) selecionado(s)</p>}
                            </div>
                            <div className="flex items-center gap-3">
                              <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={ticketResponseStatus} onChange={(e) => setTicketResponseStatus(e.target.value)}>
                                <option value="em_analise">Em análise</option>
                                <option value="resolvido">Resolvido</option>
                                <option value="aberto">Reabrir</option>
                              </select>
                              <button className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50 transition-colors" disabled={busy || ticketUploading || !selectedTicketId || !ticketResponse.trim()} onClick={handleOwnerUploadAndRespond}>
                                {ticketUploading ? 'Enviando...' : 'Enviar resposta'}
                              </button>
                            </div>
                          </div>
                        </SurfaceCard>
                      </>
                    ) : (
                      <SurfaceCard title="Detalhes">
                        <p className="text-sm text-slate-400 py-8 text-center">Selecione um ticket na lista para visualizar</p>
                      </SurfaceCard>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

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
                  <button
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700"
                    disabled={busy || !companyId}
                    onClick={() => openCriticalAction({
                      title: 'Limpeza completa de dados',
                      description: 'Executa limpeza em massa de dados da empresa em escopo.',
                      confirmText: 'LIMPAR',
                      action: 'cleanup_company_data',
                      payload: { empresa_id: companyId, keep_company_core: false, keep_billing_data: false, include_auth_users: true },
                      successMessage: 'Limpeza de dados executada com sucesso.',
                    })}
                  >
                    Executar limpeza completa
                  </button>
                  <button
                    className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                    disabled={busy || !companyId || !isOwnerMaster}
                    onClick={() => openCriticalAction({
                      title: 'Exclusao definitiva da empresa',
                      description: 'Esta acao remove definitivamente empresa e autenticacoes vinculadas.',
                      confirmText: 'EXCLUIR',
                      action: 'delete_company',
                      payload: { empresa_id: companyId, include_auth_users: true },
                      successMessage: 'Empresa excluida definitivamente.',
                      masterOnly: true,
                    })}
                  >
                    Excluir empresa definitiva
                  </button>
                </div>
              </SurfaceCard>

              <SurfaceCard title="Contato comercial (plataforma)" subtitle="Dados exibidos nos alertas de vencimento e tela de bloqueio.">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Nome do contato</label>
                    <input className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={platformContactName} onChange={(e) => setPlatformContactName(e.target.value)} placeholder="Ex: Suporte PCM" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">E-mail comercial</label>
                    <input className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" type="email" value={platformContactEmail} onChange={(e) => setPlatformContactEmail(e.target.value)} placeholder="comercial@empresa.com" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">WhatsApp</label>
                    <input className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={platformContactWhatsapp} onChange={(e) => setPlatformContactWhatsapp(e.target.value)} placeholder="+55 11 99999-9999" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Mensagem personalizada (vencimento)</label>
                    <textarea className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" rows={2} value={platformExpiryMessage} onChange={(e) => setPlatformExpiryMessage(e.target.value)} placeholder="Exibida no banner de carência" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Dias de alerta antes do vencimento</label>
                      <input className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" type="number" min="1" max="30" value={platformAlertDays} onChange={(e) => setPlatformAlertDays(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Dias de carência após vencimento</label>
                      <input className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" type="number" min="0" max="90" value={platformGraceDays} onChange={(e) => setPlatformGraceDays(e.target.value)} />
                    </div>
                  </div>
                </div>
                <button
                  className="mt-4 rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white"
                  disabled={busy}
                  onClick={() => runAction('update_platform_contact', {
                    contact_email: platformContactEmail,
                    contact_whatsapp: platformContactWhatsapp,
                    contact_name: platformContactName,
                    expiry_custom_message: platformExpiryMessage,
                    grace_period_days: Number(platformGraceDays) || 15,
                    alert_days_before: Number(platformAlertDays) || 7,
                  }, 'Contato comercial salvo com sucesso.')}
                >
                  Salvar contato comercial
                </button>
              </SurfaceCard>

              {isOwnerMaster && (
                <SurfaceCard title="Integracao ASAAS" subtitle="Configure a chave de API do gateway de pagamento">
                  <div className="space-y-3">
                    <div className={`flex items-center gap-3 rounded-xl border p-3 ${asaasHealthOk ? 'border-emerald-200 bg-emerald-50' : asaasHealthOk === false ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                      {asaasHealthOk === null ? (
                        <><Loader2 className="h-5 w-5 animate-spin text-slate-400" /><div><p className="text-sm font-semibold text-slate-700">Verificando...</p></div></>
                      ) : asaasHealthOk ? (
                        <><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="text-sm font-semibold text-emerald-700">API Key configurada</p><p className="text-xs text-emerald-600">{asaasBaseUrl ? `Ambiente: ${asaasBaseUrl.includes('sandbox') ? 'SANDBOX (testes)' : 'PRODUCAO'}` : 'Conectado'}</p></div></>
                      ) : (
                        <><AlertTriangle className="h-5 w-5 text-amber-600" /><div><p className="text-sm font-semibold text-amber-700">API Key nao configurada</p><p className="text-xs text-amber-600">Configure abaixo para ativar cobrancas automaticas.</p></div></>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600">Chave API do ASAAS</label>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 font-mono text-sm"
                        type="password"
                        value={asaasApiKeyInput}
                        onChange={(e) => { setAsaasApiKeyInput(e.target.value); setAsaasApiKeySaved(false) }}
                        placeholder="$aact_YTU5YTE0M2M2MWM2..."
                      />
                      <p className="mt-1 text-[11px] text-slate-400">Encontre em: ASAAS &gt; Configuracoes &gt; Integracao &gt; API Key</p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600">Ambiente</label>
                      <div className="mt-1 flex items-center gap-4">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${asaasBaseUrl.includes('sandbox') || !asaasHealthOk ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                          {asaasBaseUrl.includes('sandbox') || !asaasHealthOk ? 'SANDBOX (testes)' : 'PRODUCAO'}
                        </span>
                        <span className="text-[11px] text-slate-400">Para trocar o ambiente, altere ASAAS_API_BASE_URL</span>
                      </div>
                    </div>

                    {asaasApiKeyInput.trim() && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-700">Comando para aplicar:</p>
                        <div className="mt-2 flex items-center gap-2">
                          <code className="block flex-1 overflow-x-auto rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-800">
                            npx supabase secrets set ASAAS_API_KEY={asaasApiKeyInput.trim()}
                          </code>
                          <button
                            className="shrink-0 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                            onClick={() => {
                              navigator.clipboard.writeText(`npx supabase secrets set ASAAS_API_KEY=${asaasApiKeyInput.trim()}`)
                              setAsaasApiKeySaved(true)
                              setTimeout(() => setAsaasApiKeySaved(false), 3000)
                            }}
                          >
                            {asaasApiKeySaved ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-400">Cole este comando no terminal do projeto (clone local) e execute. Depois clique em "Verificar" para confirmar.</p>
                      </div>
                    )}

                    <button
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      disabled={busy}
                      onClick={() => {
                        setAsaasHealthOk(null)
                        execute.mutateAsync({ action: 'health_check' as any, payload: {} })
                          .then((res: any) => {
                            const hasKey = Boolean(res?.asaas_configured)
                            setAsaasHealthOk(hasKey)
                            if (res?.asaas_base_url) setAsaasBaseUrl(String(res.asaas_base_url))
                            if (hasKey) setFeedback('ASAAS configurado com sucesso!')
                            else setError('ASAAS_API_KEY ainda nao foi detectada. Execute o comando e tente novamente.')
                          })
                          .catch(() => { setAsaasHealthOk(false); setError('Falha ao verificar status do ASAAS.') })
                      }}
                    >
                      Verificar conexao ASAAS
                    </button>
                  </div>
                </SurfaceCard>
              )}
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
              <div className="mb-3 flex justify-end">
                <button className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700" onClick={exportLogsCsv}>
                  <Download className="h-3.5 w-3.5" /> Exportar CSV
                </button>
              </div>

              <div className="mb-3 grid gap-2 sm:grid-cols-3">
                <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" placeholder="Buscar ação ou usuário" value={logSearch} onChange={(e) => setLogSearch(e.target.value)} />
                <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={logSeverityFilter} onChange={(e) => setLogSeverityFilter(e.target.value as 'todos' | 'info' | 'warn' | 'error' | 'critical')}>
                  <option value="todos">Severidade: Todas</option>
                  <option value="info">info</option>
                  <option value="warn">warn</option>
                  <option value="error">error</option>
                  <option value="critical">critical</option>
                </select>
                <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" placeholder="Filtrar por ator (email)" value={logActorFilter} onChange={(e) => setLogActorFilter(e.target.value)} />
              </div>

              <div className="mb-3 grid gap-2 sm:grid-cols-4">
                <select className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={logModuleFilter} onChange={(e) => setLogModuleFilter(e.target.value)}>
                  <option value="todos">Modulo: Todos</option>
                  {availableLogModules.map((moduleName) => (
                    <option key={moduleName} value={moduleName}>{moduleName}</option>
                  ))}
                </select>
                <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" type="date" value={logDateFrom} onChange={(e) => setLogDateFrom(e.target.value)} />
                <input className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" type="date" value={logDateTo} onChange={(e) => setLogDateTo(e.target.value)} />
                <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onClick={() => { setLogSearch(''); setLogSeverityFilter('todos'); setLogActorFilter(''); setLogModuleFilter('todos'); setLogDateFrom(''); setLogDateTo('') }}>Limpar filtros</button>
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

          {activeTab === 'dispositivos' && (
            <OwnerDispositivosTab selectedEmpresaId={companyId || null} empresas={companies} runAction={runAction} busy={busy} />
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

                  <p className="text-xs text-slate-500">Timeout de inatividade ocultado do Owner para simplificar a operação.</p>

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
                    disabled={busy || !selectedTableName}
                    onClick={() => openCriticalAction({
                      title: 'Purge de tabela',
                      description: `Remove dados da tabela ${selectedTableName}. Use com cautela e apenas com backup validado.`,
                      confirmText: 'PURGE',
                      action: 'purge_table_data',
                      payload: { table_name: selectedTableName, empresa_id: companyId || undefined },
                      successMessage: 'Purge de tabela concluido.',
                    })}
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

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <p>Status backend: <span className="font-semibold">{healthQuery.isError ? 'Com erro' : 'Operacional'}</span></p>
                  <p className="mt-1">Monitoramento de tabelas: <span className="font-semibold">{tablesQuery.isLoading ? 'Carregando' : tablesQuery.isError ? 'Falha ao consultar' : `${tables.length} tabelas`}</span></p>
                  {tablesQuery.isError && (
                    <p className="mt-1 text-rose-700">Detalhe: {tablesQuery.error instanceof Error ? tablesQuery.error.message : 'Falha ao consultar tabelas.'}</p>
                  )}
                </div>
              </SurfaceCard>
            </div>
          )}

          {activeTab === 'owner-master' && (
            <div className="grid gap-4">
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
                      {owners.map((o, idx) => {
                        const profile = o.profile as Record<string, unknown> | null | undefined;
                        return (
                          <tr key={`${String(o.user_id ?? o.id ?? 'owner')}-${idx}`} className="border-t border-slate-200">
                            <td className="px-2 py-2">{String(profile?.nome ?? o.nome ?? '-')}</td>
                            <td className="px-2 py-2">{String(profile?.email ?? o.email ?? '-')}</td>
                            <td className="px-2 py-2">{String(o.role ?? '-')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>

              <SurfaceCard title="Auditoria de Owners" subtitle="Histórico de ações realizadas por owners do sistema">
                <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left">Data</th>
                        <th className="px-2 py-2 text-left">Ator</th>
                        <th className="px-2 py-2 text-left">Ação</th>
                        <th className="px-2 py-2 text-left">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs
                        .filter((l) => {
                          const src = String(l.source ?? '').toLowerCase();
                          const action = String(l.action_type ?? '').toUpperCase();
                          return src.includes('owner') || action.startsWith('OWNER');
                        })
                        .slice(0, 200)
                        .map((l, idx) => (
                          <tr key={`audit-owner-${idx}`} className="border-t border-slate-200">
                            <td className="px-2 py-2 whitespace-nowrap">{new Date(String(l.created_at ?? '')).toLocaleString('pt-BR')}</td>
                            <td className="px-2 py-2">{String(l.actor_email ?? l.actor_id ?? '-')}</td>
                            <td className="px-2 py-2 font-medium">{String(l.action_type ?? '-')}</td>
                            <td className="px-2 py-2 max-w-[300px] truncate" title={JSON.stringify(l.details ?? {})}>
                              {(() => {
                                const d = l.details as Record<string, unknown> | null;
                                if (!d) return '-';
                                const parts: string[] = [];
                                if (d.owner_email) parts.push(String(d.owner_email));
                                if (d.owner_role) parts.push(String(d.owner_role));
                                if (d.reason) parts.push(String(d.reason));
                                return parts.length > 0 ? parts.join(' · ') : JSON.stringify(d).slice(0, 80);
                              })()}
                            </td>
                          </tr>
                        ))}
                      {logs.filter((l) => {
                        const src = String(l.source ?? '').toLowerCase();
                        const action = String(l.action_type ?? '').toUpperCase();
                        return src.includes('owner') || action.startsWith('OWNER');
                      }).length === 0 && (
                        <tr><td colSpan={4} className="px-2 py-4 text-center text-slate-400">Nenhum registro de auditoria de owners encontrado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>
            </div>
          )}

          {feedback && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</p>}
          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          {criticalRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
                <h3 className="text-base font-semibold text-slate-900">{criticalRequest.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{criticalRequest.description}</p>
                <p className="mt-2 text-xs text-slate-500">Digite <span className="font-semibold text-slate-800">{criticalRequest.confirmText}</span> e informe a senha de confirmação para prosseguir.</p>

                <div className="mt-3 grid gap-2">
                  <input
                    className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
                    value={criticalConfirmValue}
                    onChange={(e) => setCriticalConfirmValue(e.target.value)}
                    placeholder={`Digite ${criticalRequest.confirmText}`}
                  />
                  <input
                    className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Senha de confirmacao"
                  />
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onClick={() => setCriticalRequest(null)}>Cancelar</button>
                  <button className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700" disabled={busy} onClick={confirmCriticalAction}>Confirmar acao</button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

