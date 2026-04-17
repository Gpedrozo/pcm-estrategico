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
  Moon,
  Pencil,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sun,
  Users,
  XCircle,
} from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { resolveOrRepairTenantHost } from '@/lib/tenantDomain'
import type { OwnerAction } from '@/services/ownerPortal.service'
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
import { normalizeEmail, resolveOwnerMasterEmail, safeArray, asObject, asBool, asNumber, statusColor, downloadCsv, TENANT_BASE_DOMAIN } from './owner2/owner2Helpers'
import { SurfaceCard, MetricTile } from './owner2/owner2Components'
import OwnerDispositivosTab from '@/components/owner/OwnerDispositivosTab'
import OwnerShadowAudit from '@/components/owner/OwnerShadowAudit'
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

  // Dark/light mode — sincronizado com a chave pcm-theme do sistema
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem('pcm-theme')
      if (stored) return stored === 'dark'
      return document.documentElement.classList.contains('dark')
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', isDark)
      localStorage.setItem('pcm-theme', isDark ? 'dark' : 'light')
    } catch { /* jsdom/SSR fallback */ }
  }, [isDark])

  // Estado do modal de edição de empresa
  type EditEmpresaState = {
    id: string
    nome: string
    slug: string
    tipo_pessoa: 'PJ' | 'PF'
    cpf_cnpj: string
    razao_social: string
    nome_fantasia: string
    endereco: string
    telefone: string
    email: string
    responsavel: string
    segmento: string
    status: string
  }
  const [editEmpresaOpen, setEditEmpresaOpen] = useState(false)
  const [editEmpresa, setEditEmpresa] = useState<EditEmpresaState | null>(null)
  const [editEmpresaBusy, setEditEmpresaBusy] = useState(false)

  function openEditEmpresa(c: Record<string, unknown>) {
    setEditEmpresa({
      id: String(c.id ?? ''),
      nome: String(c.nome ?? ''),
      slug: String(c.slug ?? ''),
      tipo_pessoa: (String(c.tipo_pessoa ?? 'PJ') as 'PJ' | 'PF'),
      cpf_cnpj: String(c.cpf_cnpj ?? c.document ?? ''),
      razao_social: String(c.razao_social ?? ''),
      nome_fantasia: String(c.nome_fantasia ?? ''),
      endereco: String(c.endereco ?? ''),
      telefone: String(c.telefone ?? ''),
      email: String(c.email ?? ''),
      responsavel: String(c.responsavel ?? ''),
      segmento: String(c.segmento ?? ''),
      status: String(c.status ?? 'ativo'),
    })
    setEditEmpresaOpen(true)
    setError(null)
    setFeedback(null)
  }

  async function handleSaveEditEmpresa() {
    if (!editEmpresa?.id) return
    setEditEmpresaBusy(true)
    setError(null)
    setFeedback(null)
    try {
      await execute.mutateAsync({
        action: 'update_company',
        payload: {
          empresa_id: editEmpresa.id,
          company: {
            nome: editEmpresa.nome,
            slug: editEmpresa.slug || undefined,
            tipo_pessoa: editEmpresa.tipo_pessoa,
            cpf_cnpj: editEmpresa.cpf_cnpj || undefined,
            razao_social: editEmpresa.razao_social || editEmpresa.nome,
            nome_fantasia: editEmpresa.nome_fantasia || editEmpresa.nome,
            endereco: editEmpresa.endereco || undefined,
            telefone: editEmpresa.telefone || undefined,
            email: editEmpresa.email || undefined,
            responsavel: editEmpresa.responsavel || undefined,
            segmento: editEmpresa.segmento || undefined,
            status: editEmpresa.status,
          },
        },
      })
      setFeedback(`Empresa "${editEmpresa.nome}" atualizada com sucesso.`)
      setEditEmpresaOpen(false)
      setEditEmpresa(null)
    } catch (err: any) {
      setError(String(err?.message ?? err ?? 'Falha ao atualizar empresa.'))
    } finally {
      setEditEmpresaBusy(false)
    }
  }
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
  const [cadastroPaymentMethod, setCadastroPaymentMethod] = useState('')
  const [cadastroStartsAt, setCadastroStartsAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [cadastroEndsAt, setCadastroEndsAt] = useState('')

  const [planCode, setPlanCode] = useState('')
  const [planName, setPlanName] = useState('')
  const [planPrice, setPlanPrice] = useState('0')
  const [planDefaultPeriod, setPlanDefaultPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [planUserLimit, setPlanUserLimit] = useState('10')
  const [planDataLimitMb, setPlanDataLimitMb] = useState('2048')

  const [subscriptionPlanId, setSubscriptionPlanId] = useState('')
  const [subscriptionAmount, setSubscriptionAmount] = useState('0')
  const [subscriptionPeriod, setSubscriptionPeriod] = useState<'monthly' | 'quarterly' | 'yearly' | 'custom'>('monthly')
  const [subscriptionStatus, setSubscriptionStatus] = useState<'ativa' | 'atrasada' | 'cancelada' | 'teste'>('teste')
  const [subscriptionPaymentMethod, setSubscriptionPaymentMethod] = useState('pix')
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
  const [billingRenewalAt, setBillingRenewalAt] = useState('')
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
  const [logSeverityFilter, setLogSeverityFilter] = useState<'todos' | 'info' | 'warning' | 'error' | 'critical'>('todos')
  const [logModuleFilter, setLogModuleFilter] = useState('todos')
  const [logActorFilter, setLogActorFilter] = useState('')
  const [logDateFrom, setLogDateFrom] = useState('')
  const [logDateTo, setLogDateTo] = useState('')

  const [auditSearch, setAuditSearch] = useState('')
  const [auditResultadoFilter, setAuditResultadoFilter] = useState<'todos' | 'sucesso' | 'erro' | 'rejeitado'>('todos')
  const [auditUsuarioFilter, setAuditUsuarioFilter] = useState('todos')
  const [auditTableFilter, setAuditTableFilter] = useState('todos')
  const [auditActionFilter, setAuditActionFilter] = useState('todos')
  const [auditDateFrom, setAuditDateFrom] = useState('')
  const [auditDateTo, setAuditDateTo] = useState('')

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
    // Se env var VITE_OWNER_MASTER_EMAIL não configurada → todos os SYSTEM_OWNER têm acesso ao tab.
    // Se configurada → apenas o e-mail exato tem acesso.
    if (!ownerMasterEmail) return isSystemOwner
    const currentEmail = normalizeEmail(String(user?.email ?? ''))
    if (!currentEmail) return false
    return currentEmail === ownerMasterEmail
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
    activeTab === 'usuarios' || activeTab === 'configuracoes' || activeTab === 'dashboard' || activeTab === 'sistema',
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
      execute.mutateAsync({ action: 'list_subscription_payments', payload: {} })
        .then((res: Record<string, unknown>) => {
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
      execute.mutateAsync({ action: 'health_check', payload: {} })
        .then((res: Record<string, unknown>) => {
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
    return String(healthQuery.data?.status ?? 'n/a')
  }, [healthQuery.data, healthQuery.error, healthQuery.isError])

  const companies = useMemo(() => safeArray<Record<string, unknown>>(companiesQuery.data?.companies), [companiesQuery.data])
  const users = useMemo(() => safeArray<Record<string, unknown>>(usersQuery.data?.users), [usersQuery.data])
  const isDeviceUser = (u: Record<string, unknown>) => {
    const nome = String(u.nome ?? '').toLowerCase()
    const email = String(u.email ?? '').toLowerCase()
    return nome.startsWith('dispositivo ') || email.endsWith('@mecanico.pcm.local')
  }
  const deviceUsers = useMemo(() => users.filter(isDeviceUser), [users])
  const humanUsers = useMemo(() => users.filter((u) => !isDeviceUser(u)), [users])
  const activeHumanUsers = useMemo(() => humanUsers.filter((u) => {
    return String(u.status ?? '').toLowerCase() === 'ativo'
  }), [humanUsers])
  const plans = useMemo(() => safeArray<Record<string, unknown>>(plansQuery.data?.plans), [plansQuery.data])
  const subscriptions = useMemo(() => safeArray<Record<string, unknown>>(subscriptionsQuery.data?.subscriptions), [subscriptionsQuery.data])
  const contracts = useMemo(() => safeArray<Record<string, unknown>>(contractsQuery.data?.contracts), [contractsQuery.data])
  const tickets = useMemo(() => safeArray<Record<string, unknown>>(ticketsQuery.data?.tickets), [ticketsQuery.data])
  const unreadOwnerCount = useMemo(
    () => tickets.reduce((sum, t) => sum + Number(t.unread_owner_messages ?? 0), 0),
    [tickets],
  )
  const logs = useMemo(() => safeArray<Record<string, unknown>>(auditsQuery.data?.logs), [auditsQuery.data])
  const owners = useMemo(() => safeArray<Record<string, unknown>>(ownersQuery.data?.owners), [ownersQuery.data])
  const tables = useMemo(() => safeArray<Record<string, unknown>>(tablesQuery.data?.tables), [tablesQuery.data])
  const settings = useMemo(() => safeArray<Record<string, unknown>>(settingsQuery.data?.settings), [settingsQuery.data])

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
    if (!selectedContractId && contracts.length > 0) setSelectedContractId(String(contracts[0]?.id ?? ''))
  }, [contracts, selectedContractId])

  useEffect(() => {
    const c = contracts.find((ct) => String(ct.id) === selectedContractId)
    if (c) {
      setContractContent(String(c.content ?? ''))
      setContractSummary(String(c.change_summary ?? c.summary ?? ''))
    } else {
      setContractContent('')
      setContractSummary('')
    }
  }, [selectedContractId, contracts])

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
    const responseMs = asNumber(healthQuery.data?.duration_ms, 0)
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
      const moduleName = String(log.tabela ?? '').trim()
      if (moduleName) modules.add(moduleName)
    })
    return Array.from(modules).sort((a, b) => a.localeCompare(b))
  }, [logs])

  const availableAuditUsuarios = useMemo(() => {
    const emails = new Set<string>()
    logs.forEach((log) => {
      const email = String(log.usuario_email ?? '').trim()
      if (email) emails.add(email)
    })
    return Array.from(emails).sort((a, b) => a.localeCompare(b))
  }, [logs])

  const availableAuditTables = useMemo(() => {
    const tbls = new Set<string>()
    logs.forEach((log) => {
      const tbl = String(log.tabela ?? '').trim()
      if (tbl) tbls.add(tbl)
    })
    return Array.from(tbls).sort((a, b) => a.localeCompare(b))
  }, [logs])

  const availableAuditActions = useMemo(() => {
    const actions = new Set<string>()
    logs.forEach((log) => {
      const act = String(log.acao ?? '').trim()
      if (act) actions.add(act)
    })
    return Array.from(actions).sort((a, b) => a.localeCompare(b))
  }, [logs])

  const auditFiltered = useMemo(() => {
    const q = auditSearch.trim().toLowerCase()
    const fromDate = auditDateFrom ? new Date(`${auditDateFrom}T00:00:00`) : null
    const toDate = auditDateTo ? new Date(`${auditDateTo}T23:59:59`) : null

    return logs.filter((log) => {
      const acao = String(log.acao ?? '').toLowerCase()
      const tabela = String(log.tabela ?? '').toLowerCase()
      const resultado = String(log.resultado ?? '').toLowerCase()
      const registroId = String(log.registro_id ?? '').toLowerCase()
      const usuarioEmail = String(log.usuario_email ?? '').toLowerCase()
      const usuarioId = String(log.usuario_id ?? '').toLowerCase()
      const dadosStr = JSON.stringify(log.dados_depois ?? {}).toLowerCase()
      const logDateRaw = String(log.created_at ?? '')
      const logDate = logDateRaw ? new Date(logDateRaw) : null

      const textOk = !q || acao.includes(q) || tabela.includes(q) || usuarioEmail.includes(q) || registroId.includes(q) || usuarioId.includes(q) || dadosStr.includes(q)
      const resultadoOk = auditResultadoFilter === 'todos' || resultado === auditResultadoFilter
      const usuarioOk = auditUsuarioFilter === 'todos' || String(log.usuario_email ?? '') === auditUsuarioFilter
      const tableOk = auditTableFilter === 'todos' || String(log.tabela ?? '') === auditTableFilter
      const actionOk = auditActionFilter === 'todos' || String(log.acao ?? '') === auditActionFilter
      const fromOk = !fromDate || (logDate && !Number.isNaN(logDate.getTime()) && logDate >= fromDate)
      const toOk = !toDate || (logDate && !Number.isNaN(logDate.getTime()) && logDate <= toDate)

      return textOk && resultadoOk && usuarioOk && tableOk && actionOk && Boolean(fromOk) && Boolean(toOk)
    })
  }, [auditActionFilter, auditDateFrom, auditDateTo, auditSearch, auditResultadoFilter, auditUsuarioFilter, auditTableFilter, logs])

  function exportAuditCsv() {
    const rows = auditFiltered.map((l) => [
      String(l.id ?? ''),
      String(l.acao ?? ''),
      String(l.tabela ?? ''),
      String(l.registro_id ?? ''),
      String(l.usuario_email ?? ''),
      String(l.usuario_id ?? ''),
      String(l.resultado ?? 'sucesso'),
      String(l.empresa_id ?? ''),
      JSON.stringify(l.dados_depois ?? {}),
      JSON.stringify(l.dados_antes ?? {}),
      String(l.created_at ?? ''),
    ])
    downloadCsv('owner-auditoria.csv', ['id', 'acao', 'tabela', 'registro_id', 'usuario_email', 'usuario_id', 'resultado', 'empresa_id', 'dados_depois', 'dados_antes', 'data'], rows)
    setFeedback('Exportação de auditoria gerada em CSV.')
  }

  const volumePorEmpresa = useMemo(() => {
    const map: Record<string, { name: string; total: number; erros: number }> = {}
    logs.forEach((log) => {
      const eid = String(log.empresa_id ?? 'desconhecido')
      if (!map[eid]) {
        const empresa = companies.find((c) => String(c.id) === eid)
        map[eid] = { name: empresa ? String(empresa.nome ?? eid.slice(0, 8)) : eid.slice(0, 8), total: 0, erros: 0 }
      }
      map[eid].total++
      const res = String(log.resultado ?? '').toLowerCase()
      if (res === 'erro' || res === 'rejeitado') map[eid].erros++
    })
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10)
  }, [logs, companies])

  const auditKpis = useMemo(() => {
    const total = auditFiltered.length
    const erros = auditFiltered.filter((l) => String(l.resultado ?? '').toLowerCase() === 'erro').length
    const tenants = new Set(auditFiltered.map((l) => String(l.empresa_id ?? ''))).size
    const usuarios = new Set(auditFiltered.map((l) => String(l.usuario_email ?? ''))).size
    return { total, erros, tenants, usuarios }
  }, [auditFiltered])

  const logsFiltered = useMemo(() => {
    const q = logSearch.trim().toLowerCase()
    const actorQ = logActorFilter.trim().toLowerCase()
    const fromDate = logDateFrom ? new Date(`${logDateFrom}T00:00:00`) : null
    const toDate = logDateTo ? new Date(`${logDateTo}T23:59:59`) : null

    return logs.filter((log) => {
      const action = String(log.acao ?? '').toLowerCase()
      const actor = String(log.usuario_email ?? '').toLowerCase()
      const resultado = String(log.resultado ?? '').toLowerCase()
      const moduleName = String(log.tabela ?? '')
      const logDateRaw = String(log.created_at ?? '')
      const logDate = logDateRaw ? new Date(logDateRaw) : null

      const textOk = !q || action.includes(q) || actor.includes(q)
      const severityOk = logSeverityFilter === 'todos' || resultado === logSeverityFilter
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
      String(l.acao ?? ''),
      String(l.resultado ?? 'sucesso'),
      String(l.tabela ?? ''),
      String(l.usuario_email ?? ''),
      String(l.created_at ?? ''),
    ])
    downloadCsv('owner-logs.csv', ['id', 'acao', 'resultado', 'tabela', 'usuario', 'data'], rows)
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
    setAuthPassword('')
  }

  const selectedCompanyLoginUrl = useMemo(() => {
    if (!selectedCompany) return ''
    const slug = String(selectedCompany.slug ?? '').trim()
    return slug ? `https://${slug}.${TENANT_BASE_DOMAIN}/login` : ''
  }, [selectedCompany])

  async function runAction(action: OwnerAction, payload: Record<string, unknown>, successMessage: string) {
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
      setCadastroPaymentMethod('')
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
            payment_method: cadastroPaymentMethod || undefined,
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
      <div className="flex h-[60vh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isSystemOwner) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-background">
        <div className="max-w-md rounded-xl border border-destructive/30 bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldCheck className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-card-foreground">Acesso negado</h2>
          <p className="mt-2 text-sm text-muted-foreground">O Owner é exclusivo para SYSTEM_OWNER.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/90 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <ShieldCheck className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight leading-none">Owner Portal</h1>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Visão executiva · multiempresa</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground gap-3">
              <span>{user?.email}</span>
              <span className={healthStatus.startsWith('erro') ? 'text-rose-500' : 'text-emerald-500'}>● {healthStatus}</span>
            </div>
            <button
              className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsDark((d) => !d)}
              title={isDark ? 'Tema claro' : 'Tema escuro'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              onClick={() => void logout({ reason: 'manual' })}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1600px] gap-4 p-4 lg:grid-cols-[230px,1fr]">
        <aside className="rounded-2xl border border-border bg-card/95 p-3 shadow-sm lg:sticky lg:top-[60px] lg:self-start lg:max-h-[calc(100vh-76px)] lg:overflow-y-auto">
          <nav className="space-y-0.5">
            {visibleTabs.map((tab) => (
              <button
                key={tab}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${activeTab === tab ? 'bg-primary font-semibold text-primary-foreground shadow-sm' : 'text-foreground hover:bg-muted'}`}
                onClick={() => setActiveTab(tab)}
              >
                <span className="flex items-center justify-between">
                  {OWNER_TAB_LABELS[tab]}
                  {tab === 'suporte' && unreadOwnerCount > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold leading-none text-destructive-foreground">
                      {unreadOwnerCount > 99 ? '99+' : unreadOwnerCount}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-foreground">
                Contexto ativo: <span className="font-semibold">{selectedCompany ? String(selectedCompany.nome ?? selectedCompany.slug ?? selectedCompany.id) : 'Global (todas as empresas)'}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedCompanyLoginUrl && (
                  <a className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-card px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors" href={selectedCompanyLoginUrl} target="_blank" rel="noopener noreferrer">
                    <LogIn className="h-3.5 w-3.5" /> Abrir login tenant
                  </a>
                )}
                <button
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
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

          <div className="rounded-2xl border border-border bg-card/95 p-3 shadow-sm">
            <div className="grid gap-2 md:grid-cols-2">
              <select className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="">Empresa (escopo)</option>
                {companies.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>{String(c.nome ?? c.slug ?? c.id)}</option>
                ))}
              </select>
              <input className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Senha de confirmação para ações críticas" />
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary to-primary/70 p-5 text-primary-foreground shadow-lg">
                <p className="text-xs uppercase tracking-wider opacity-80">Painel executivo</p>
                <h2 className="mt-1 text-xl font-semibold">Visão geral da operação global</h2>
                <p className="mt-1 text-sm opacity-80">{String(dashboardQuery.data?.message ?? 'Acompanhe indicadores e entre nas áreas operacionais com um clique.')}</p>
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
                  <div className="h-64 rounded-xl border border-border bg-card p-2">
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
                  <div className="h-64 rounded-xl border border-border bg-card p-2">
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
                    <p className="text-sm text-foreground">{monitorSummary.healthy ? 'Operacional' : 'Atenção'} • atualização contínua</p>
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

                <div className="mt-3 rounded-xl border border-border bg-muted/40 p-2.5">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Disponibilidade</span>
                    <span className="font-semibold text-foreground">{monitorSummary.availabilityPercent}%</span>
                  </div>
                  <div className="h-2 rounded bg-muted">
                    <div className="h-2 rounded bg-primary" style={{ width: `${monitorSummary.availabilityPercent}%` }} />
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard title="Disponibilidade por horário" subtitle="Picos e vales das últimas 24 horas">
                <div className="rounded-xl border border-border bg-card p-2.5">
                  <div className="mb-2 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800/50 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-400">
                      <p className="font-semibold">Pico</p>
                      <p>{availabilityTimeline.peak.hour} • {availabilityTimeline.peak.availability}%</p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 px-3 py-2 text-xs text-amber-800 dark:text-amber-400">
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
                <div className="max-h-[240px] overflow-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-2 py-2 text-left">Tabela</th>
                        <th className="px-2 py-2 text-left">Registros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tables.map((table, idx) => (
                        <tr key={`${String(table.table_name ?? table.name ?? 'tb')}-${idx}`} className="border-t border-border">
                          <td className="px-2 py-2">{String(table.table_name ?? table.name ?? '-')}</td>
                          <td className="px-2 py-2">{asNumber(table.total_rows, 0).toLocaleString('pt-BR')}</td>
                        </tr>
                      ))}
                      {tables.length === 0 && (
                        <tr>
                          <td className="px-2 py-3 text-muted-foreground" colSpan={2}>Sem tabelas para o escopo selecionado.</td>
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados da empresa</p>
                  <select className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={newCompanyPersonType} onChange={(e) => setNewCompanyPersonType(e.target.value as 'PF' | 'PJ')}>
                    <option value="PJ">Pessoa jurídica (PJ)</option>
                    <option value="PF">Pessoa física (PF)</option>
                  </select>
                  <input className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Nome da empresa *" />
                  <input className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={newCompanySlug} onChange={(e) => setNewCompanySlug(e.target.value)} placeholder="Slug (opcional)" />
                  <input className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={newCompanyDocument} onChange={(e) => setNewCompanyDocument(e.target.value)} placeholder={newCompanyPersonType === 'PF' ? 'CPF *' : 'CNPJ *'} />
                  <input className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={newCompanyRazaoSocial} onChange={(e) => setNewCompanyRazaoSocial(e.target.value)} placeholder={newCompanyPersonType === 'PF' ? 'Nome completo' : 'Razão social'} />
                  <input className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={newCompanyNomeFantasia} onChange={(e) => setNewCompanyNomeFantasia(e.target.value)} placeholder={newCompanyPersonType === 'PF' ? 'Nome de exibição' : 'Nome fantasia'} />
                  <input className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={newCompanyAddress} onChange={(e) => setNewCompanyAddress(e.target.value)} placeholder="Endereço" />
                  <input className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={newCompanyPhone} onChange={(e) => setNewCompanyPhone(e.target.value)} placeholder="Telefone" />
                  <input className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={newCompanyEmail} onChange={(e) => setNewCompanyEmail(e.target.value)} placeholder="Email comercial" />
                  <input className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={newCompanyResponsible} onChange={(e) => setNewCompanyResponsible(e.target.value)} placeholder="Responsável" />
                  <input className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={newCompanySegment} onChange={(e) => setNewCompanySegment(e.target.value)} placeholder="Segmento" />

                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Administrador master</p>
                  <input className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} placeholder="Nome do administrador *" />
                  <input className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="Email do administrador *" />

                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plano e cobrança</p>
                  <select className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={cadastroPlanId} onChange={(e) => setCadastroPlanId(e.target.value)}>
                    <option value="">Selecione o plano *</option>
                    {plans.map((p) => (
                      <option key={String(p.id)} value={String(p.id)}>
                        {String(p.name ?? p.code ?? 'Plano')} — R$ {Number(p.price_month ?? 0).toFixed(2)}/mês
                      </option>
                    ))}
                  </select>
                  <select className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={cadastroPeriod} onChange={(e) => setCadastroPeriod(e.target.value)}>
                    <option value="monthly">Mensal</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="yearly">Anual</option>
                  </select>
                  <select className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={cadastroPaymentMethod} onChange={(e) => setCadastroPaymentMethod(e.target.value)}>
                    <option value="">Forma de pagamento (ASAAS)</option>
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="CREDIT_CARD">Cartão de crédito</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Início</label>
                      <input type="date" className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={cadastroStartsAt} onChange={(e) => setCadastroStartsAt(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Término (opcional)</label>
                      <input type="date" className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={cadastroEndsAt} onChange={(e) => setCadastroEndsAt(e.target.value)} />
                    </div>
                  </div>

                  <button
                    className="mt-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    disabled={busy || !newCompanyName || !newCompanyDocument || !newAdminName || !newAdminEmail || !cadastroPlanId}
                    onClick={handleCreateCompanyFromCadastro}
                  >
                    Cadastrar empresa
                  </button>
                </div>

              </SurfaceCard>

              <div className="space-y-4">
                {plans.length > 0 && (
                  <SurfaceCard title="Planos disponíveis" subtitle="Referência rápida">
                    <div className="max-h-[360px] overflow-auto rounded-xl border border-border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/70">
                          <tr>
                            <th className="px-2 py-2 text-left text-muted-foreground">Plano</th>
                            <th className="px-2 py-2 text-left text-muted-foreground">Preço/mês</th>
                            <th className="px-2 py-2 text-left text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plans.map((p) => (
                            <tr key={String(p.id)} className="border-t border-border">
                              <td className="px-2 py-2 font-medium text-foreground">{String(p.name ?? p.code ?? '-')}</td>
                              <td className="px-2 py-2 text-foreground">R$ {Number(p.price_month ?? 0).toFixed(2)}</td>
                              <td className="px-2 py-2 text-muted-foreground">{String(p.status ?? '-')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SurfaceCard>
                )}

                <SurfaceCard title="Ações rápidas da empresa selecionada">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors" disabled={busy || !companyId} onClick={() => runAction('set_company_status', { empresa_id: companyId, status: 'active' }, 'Empresa ativada.')} title="Altera apenas o status da empresa para ativo (não altera assinatura)">Ativar</button>
                    <button className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 px-3 py-2 text-sm text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors" disabled={busy || !companyId} onClick={() => runAction('set_company_status', { empresa_id: companyId, status: 'blocked' }, 'Empresa bloqueada.')}>Bloquear</button>
                    <button
                      className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 px-3 py-2 text-sm text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
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
                      className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive hover:bg-destructive/20 transition-colors"
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

                {companyCredentialNote && (
                  <SurfaceCard title="Credenciais iniciais do cliente">
                    <p className="text-xs text-sky-700">Informação exibida somente agora. Compartilhe com segurança.</p>
                    <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-foreground">{companyCredentialNote.noteText}</pre>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="rounded-lg border border-sky-300 bg-background px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100" onClick={copyCompanyCredentialNote}>Copiar nota</button>
                      <a className="rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted" href={companyCredentialNote.loginUrl} target="_blank" rel="noopener noreferrer">Abrir login do cliente</a>
                    </div>
                  </SurfaceCard>
                )}
              </div>

              <div className="xl:col-span-2">
                <SurfaceCard title="Empresas cadastradas">
                  <div className="max-h-[420px] overflow-auto rounded-xl border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/70 sticky top-0">
                        <tr>
                          <th className="px-2 py-2 text-left text-muted-foreground">ID</th>
                          <th className="px-2 py-2 text-left text-muted-foreground">Nome</th>
                          <th className="px-2 py-2 text-left text-muted-foreground">Slug</th>
                          <th className="px-2 py-2 text-left text-muted-foreground">Status</th>
                          <th className="px-2 py-2 text-left text-muted-foreground">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies.map((c) => {
                          const st = String(c.status ?? '-')
                          return (
                            <tr key={String(c.id)} className="border-t border-border hover:bg-muted/40 cursor-pointer" onClick={() => setCompanyId(String(c.id ?? ''))}>
                              <td className="px-2 py-2 text-muted-foreground font-mono text-[10px]">{String(c.id ?? '-').slice(0, 8)}…</td>
                              <td className="px-2 py-2 font-medium text-foreground">{String(c.nome ?? '-')}</td>
                              <td className="px-2 py-2 text-muted-foreground">{String(c.slug ?? '-')}</td>
                              <td className="px-2 py-2"><span className={`rounded border px-2 py-0.5 ${statusColor(st)}`}>{st}</span></td>
                              <td className="px-2 py-2">
                                <button
                                  className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[11px] text-foreground hover:bg-muted transition-colors"
                                  onClick={(e) => { e.stopPropagation(); openEditEmpresa(c) }}
                                  title="Editar empresa"
                                >
                                  <Pencil className="h-3 w-3" /> Editar
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                        {companies.length === 0 && (
                          <tr><td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">Nenhuma empresa cadastrada.</td></tr>
                        )}
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
                  <button className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => { setShowPlanForm(!showPlanForm); setEditingPlanId(''); setPlanCode(''); setPlanName(''); setPlanPrice('0'); setPlanDefaultPeriod('monthly'); setPlanUserLimit('10'); setPlanDataLimitMb('2048'); }}>{showPlanForm && !editingPlanId ? 'Cancelar' : '+ Cadastrar Novo Plano'}</button>
                </div>
                {(showPlanForm || editingPlanId) && (
                  <div className="mb-4 grid gap-2 rounded-lg border border-border bg-muted/50 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">{editingPlanId ? 'Editar Plano' : 'Novo Plano'}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={planCode} onChange={(e) => setPlanCode(e.target.value)} placeholder="Código" />
                      <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Nome" />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} placeholder="Preço mensal" />
                      <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={planDefaultPeriod} onChange={(e) => setPlanDefaultPeriod(e.target.value as 'monthly' | 'quarterly' | 'yearly')}>
                        <option value="monthly">Mensal</option>
                        <option value="quarterly">Trimestral</option>
                        <option value="yearly">Anual</option>
                      </select>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" type="number" min="1" value={planUserLimit} onChange={(e) => setPlanUserLimit(e.target.value)} placeholder="Limite de usuários" />
                      <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" type="number" min="256" value={planDataLimitMb} onChange={(e) => setPlanDataLimitMb(e.target.value)} placeholder="Limite dados (MB)" />
                    </div>
                    {editingPlanId ? (
                      <div className="flex gap-2">
                        <button className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !planCode || !planName} onClick={() => { runAction('update_plan', { plan: { id: editingPlanId, code: planCode.toUpperCase(), name: planName, description: `Periodicidade padrão: ${planDefaultPeriod}`, price_month: Number(planPrice || 0), module_flags: { default_periodicity: planDefaultPeriod } } }, 'Plano atualizado com sucesso.'); setEditingPlanId(''); setPlanCode(''); setPlanName(''); setPlanPrice('0'); setPlanDefaultPeriod('monthly'); setPlanUserLimit('10'); setPlanDataLimitMb('2048'); }}>Alterar plano</button>
                        <button className="rounded-lg border border-input px-3 py-2 text-sm" onClick={() => { setEditingPlanId(''); setPlanCode(''); setPlanName(''); setPlanPrice('0'); setPlanDefaultPeriod('monthly'); setPlanUserLimit('10'); setPlanDataLimitMb('2048'); }}>Cancelar edição</button>
                      </div>
                    ) : (
                      <button className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !planCode || !planName} onClick={() => { runAction('create_plan', { plan: { code: planCode.toUpperCase(), name: planName, description: `Periodicidade padrão: ${planDefaultPeriod}`, price_month: Number(planPrice || 0), user_limit: Number(planUserLimit) || 10, data_limit_mb: Number(planDataLimitMb) || 2048, module_flags: { default_periodicity: planDefaultPeriod }, active: true } }, 'Plano criado com sucesso.'); setShowPlanForm(false); }}>Criar plano</button>
                    )}
                  </div>
                )}
                <div className="max-h-[420px] overflow-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
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

              {/* Assinaturas */}
              <SurfaceCard title="Assinaturas" subtitle="Cada empresa com plano, valor e periodicidade próprios">
                <div className="mb-4 grid gap-2 rounded-lg border border-border bg-muted/50 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Nova assinatura (empresa selecionada: {companyId || 'nenhuma'})</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={subscriptionPlanId} onChange={(e) => setSubscriptionPlanId(e.target.value)}>
                      <option value="">Plano</option>
                      {plans.map((p) => <option key={String(p.id)} value={String(p.id)}>{String(p.name ?? p.code ?? p.id)}</option>)}
                    </select>
                    <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={subscriptionAmount} onChange={(e) => setSubscriptionAmount(e.target.value)} placeholder="Valor" />
                    <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={subscriptionPeriod} onChange={(e) => setSubscriptionPeriod(e.target.value as 'monthly' | 'quarterly' | 'yearly' | 'custom')}>
                      <option value="monthly">Mensal</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="yearly">Anual</option>
                      <option value="custom">Customizada</option>
                    </select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5">
                    <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={subscriptionStatus} onChange={(e) => setSubscriptionStatus(e.target.value as 'ativa' | 'atrasada' | 'cancelada' | 'teste')}>
                      <option value="teste">TESTE</option>
                      <option value="ativa">Ativa</option>
                      <option value="atrasada">Atrasada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                    <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={subscriptionPaymentMethod} onChange={(e) => setSubscriptionPaymentMethod(e.target.value)}>
                      <option value="pix">PIX</option>
                      <option value="boleto">Boleto</option>
                      <option value="credit_card">Cartao de credito</option>
                    </select>
                    <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" type="date" value={subscriptionStartsAt} onChange={(e) => setSubscriptionStartsAt(e.target.value)} title="Inicio" />
                    <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" type="date" value={subscriptionRenewalAt} onChange={(e) => setSubscriptionRenewalAt(e.target.value)} title="Proximo vencimento" />
                    <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" type="date" value={subscriptionEndsAt} onChange={(e) => setSubscriptionEndsAt(e.target.value)} title="Fim (opcional)" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !companyId || !subscriptionPlanId} onClick={() => runAction('create_subscription', { subscription: { empresa_id: companyId, plan_id: subscriptionPlanId, amount: Number(subscriptionAmount || 0), period: subscriptionPeriod, payment_method: subscriptionPaymentMethod, starts_at: subscriptionStartsAt || undefined, renewal_at: subscriptionRenewalAt || undefined, ends_at: subscriptionEndsAt || undefined, status: subscriptionStatus } }, 'Assinatura criada com sucesso.')}>Criar assinatura</button>
                    <button className="rounded-lg border border-input px-3 py-2 text-sm" disabled={busy || !companyId} onClick={() => runAction('set_subscription_status', { empresa_id: companyId, status: 'ativa' }, 'Assinatura ativada.')} title="Ativa apenas a assinatura (não altera status da empresa)">Ativar assinatura</button>
                                      <button onClick={() => companyId && runAction('reactivate_company', { empresa_id: companyId }, 'Empresa reativada com sucesso!')} disabled={busy || !companyId} className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50" title="Reativa subscription + desbloqueia empresa atomicamente">Reativar empresa</button>
<button className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !isOwnerMaster} onClick={() => runAction('enforce_subscription_expiry', {}, 'Vencimentos processados.')}>Processar vencimentos</button>
                    <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={planCodeToChange} onChange={(e) => setPlanCodeToChange(e.target.value)} placeholder="Código novo plano" />
                    <button className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !companyId || !planCodeToChange} onClick={() => runAction('change_plan', { empresa_id: companyId, plano_codigo: planCodeToChange.toUpperCase() }, 'Plano alterado.')}>Trocar plano</button>
                  </div>
                </div>
                <div className="max-h-[420px] overflow-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
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
                          <tr key={`${String(s.id ?? 'sub')}-${idx}`} className="border-t border-border">
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
                      {subscriptions.length === 0 && <tr><td colSpan={5} className="px-2 py-3 text-muted-foreground">Nenhuma assinatura.</td></tr>}
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
                  <div className="mt-3 rounded-xl border border-border bg-card p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Status de pagamento</p>
                      <button className="inline-flex items-center gap-1 rounded-lg border border-input bg-background px-2 py-1 text-[11px] font-semibold text-foreground" onClick={exportFinanceCsv}>
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
                    <div className="flex items-center gap-3 rounded-xl border p-3 ${asaasHealthOk ? 'border-emerald-200 bg-emerald-50' : asaasHealthOk === false ? 'border-rose-200 bg-rose-50' : 'border-border bg-muted/50'}">
                      {asaasHealthOk === null ? (
                        <><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><div><p className="text-sm font-semibold text-foreground">Verificando...</p><p className="text-xs text-muted-foreground">Checando API key do ASAAS</p></div></>
                      ) : asaasHealthOk ? (
                        <><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="text-sm font-semibold text-emerald-700">ASAAS conectado</p><p className="text-xs text-emerald-600">API key configurada. Webhooks e sync prontos.</p></div></>
                      ) : (
                        <><XCircle className="h-5 w-5 text-rose-600" /><div><p className="text-sm font-semibold text-rose-700">ASAAS nao configurado</p><p className="text-xs text-rose-600">Defina ASAAS_API_KEY nos secrets do Supabase.</p></div></>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">Para configurar: <code className="rounded bg-muted px-1">supabase secrets set ASAAS_API_KEY=seu_token</code></p>
                  </SurfaceCard>

                  {/* Atualizar cobranca */}
                  <SurfaceCard title="Atualizar cobranca" subtitle="Alterar valor ou status de pagamento">
                    <div className="grid gap-2">
                      <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={billingSubscriptionId} onChange={(e) => setBillingSubscriptionId(e.target.value)}>
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
                      <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" placeholder="Novo valor (opcional)" value={billingAmount} onChange={(e) => setBillingAmount(e.target.value)} />
                      <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={billingPaymentStatus} onChange={(e) => setBillingPaymentStatus(e.target.value)}>
                        <option value="paid">Pago</option>
                        <option value="late">Atrasado</option>
                        <option value="pending">Pendente</option>
                        <option value="failed">Falhou</option>
                      </select>
                      <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" type="date" value={billingRenewalAt} onChange={(e) => setBillingRenewalAt(e.target.value)} title="Próx. renovação (opcional)" placeholder="Próx. renovação" />
                      <button
                        className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white"
                        disabled={busy || !billingSubscriptionId || !billingPaymentStatus}
                        onClick={() => runAction('update_subscription_billing', {
                          subscription_id: billingSubscriptionId,
                          amount: billingAmount ? Number(billingAmount) : undefined,
                          payment_status: billingPaymentStatus,
                          renewal_at: billingRenewalAt || undefined,
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
                <div className="max-h-[350px] overflow-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted">
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
                            : 'bg-muted text-muted-foreground border-border'
                        const empresa = companies.find((c) => String(c.id) === String(s.empresa_id))
                        const empresaLabel = empresa ? String(empresa.nome ?? empresa.slug ?? '') : String(s.empresa_id ?? '-').slice(0, 8)
                        return (
                          <tr key={`fs-${String(s.id ?? idx)}`} className="border-t border-border hover:bg-muted/50">
                            <td className="px-2 py-2 font-medium">{empresaLabel}</td>
                            <td className="px-2 py-2">
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${providerBadge}`}>
                                {provider.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-2 py-2">R$ {asNumber(s.amount, 0).toLocaleString('pt-BR')}</td>
                            <td className="px-2 py-2"><span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor(String(s.status ?? ''))}`}>{String(s.status ?? '-')}</span></td>
                            <td className="px-2 py-2"><span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor(String(s.payment_status ?? ''))}`}>{String(s.payment_status ?? '-')}</span></td>
                            <td className="px-2 py-2 text-muted-foreground">{s.renewal_at ? new Date(String(s.renewal_at)).toLocaleDateString('pt-BR') : '-'}</td>
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
                      {subscriptions.length === 0 && <tr><td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">Nenhuma assinatura.</td></tr>}
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
                      <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={billingSubscriptionId} onChange={(e) => setBillingSubscriptionId(e.target.value)}>
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
                      <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" placeholder="Asaas customer ID (cus_xxx)" value={asaasCustomerId} onChange={(e) => setAsaasCustomerId(e.target.value)} />
                      <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" placeholder="Asaas subscription ID (sub_xxx)" value={asaasSubscriptionId} onChange={(e) => setAsaasSubscriptionId(e.target.value)} />
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
                      <p className="text-[11px] text-muted-foreground">Ao vincular, o webhook do ASAAS vai atualizar status e pagamentos automaticamente.</p>
                    </div>
                  </SurfaceCard>
                ) : (
                  <SurfaceCard title="Integracao ASAAS" subtitle="Area restrita">
                    <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
                      <p className="text-sm text-muted-foreground">Vinculacao e sincronizacao ASAAS disponivel apenas para OWNER_MASTER.</p>
                    </div>
                  </SurfaceCard>
                )}

                {/* Historico de pagamentos */}
                <SurfaceCard title="Historico de pagamentos" subtitle={`${payments.length} pagamento(s) registrado(s)`}>
                  {paymentsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Carregando pagamentos...</span>
                    </div>
                  ) : (
                    <div className="max-h-[320px] overflow-auto rounded-xl border border-border">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted">
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
                                  : 'bg-muted text-muted-foreground border-border'
                            const pProvider = String(p.provider ?? 'manual')
                            const pProviderBadge = pProvider === 'asaas'
                              ? 'bg-violet-100 text-violet-700 border-violet-200'
                              : pProvider === 'stripe'
                                ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                : 'bg-muted text-muted-foreground border-border'
                            return (
                              <tr key={`pay-${String(p.id ?? idx)}`} className="border-t border-border hover:bg-muted/50">
                                <td className="px-2 py-2 text-muted-foreground">
                                  {p.paid_at ? new Date(String(p.paid_at)).toLocaleDateString('pt-BR') : p.due_at ? new Date(String(p.due_at)).toLocaleDateString('pt-BR') : '-'}
                                </td>
                                <td className="px-2 py-2 font-medium">R$ {asNumber(p.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="px-2 py-2"><span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pStatusBadge}`}>{String(p.status ?? '-')}</span></td>
                                <td className="px-2 py-2"><span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pProviderBadge}`}>{pProvider.toUpperCase()}</span></td>
                                <td className="px-2 py-2 text-muted-foreground">{String(p.method ?? '-')}</td>
                              </tr>
                            )
                          })}
                          {payments.length === 0 && <tr><td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">Nenhum pagamento registrado.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <button
                    className="mt-2 inline-flex items-center gap-1 rounded-lg border border-input bg-background px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted/50"
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
                  <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={selectedContractId} onChange={(e) => setSelectedContractId(e.target.value)}>
                    <option value="">Selecione o contrato</option>
                    {contracts.map((c) => {
                      const empNome = String(c.empresas?.nome ?? c.empresa_id ?? '-')
                      const ver = String(c.version ?? '1')
                      const st = String(c.status ?? '-')
                      return <option key={String(c.id)} value={String(c.id)}>{empNome} — v{ver} ({st})</option>
                    })}
                  </select>
                  <textarea className="min-h-[300px] rounded-lg border border-input bg-background px-3 py-3 text-xs font-mono leading-relaxed" value={contractContent} onChange={(e) => setContractContent(e.target.value)} placeholder="Conteúdo do contrato" />
                  <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={contractSummary} onChange={(e) => setContractSummary(e.target.value)} placeholder="Resumo da alteração" />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800" disabled={busy || !selectedContractId} onClick={() => { runAction('update_contract', { contract_id: selectedContractId, content: contractContent, summary: contractSummary }, 'Contrato atualizado.'); contractsQuery.refetch() }}>Salvar alterações</button>
                    <button className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !selectedContractId} onClick={() => { runAction('regenerate_contract', { contract_id: selectedContractId }, 'Contrato regenerado.'); contractsQuery.refetch() }}>Regenerar contrato</button>
                    <button className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700" disabled={busy || !selectedContractId} onClick={() => { runAction('delete_contract', { contract_id: selectedContractId }, 'Contrato excluído.'); setSelectedContractId(''); contractsQuery.refetch() }}>Excluir contrato</button>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard title="Contratos cadastrados">
                <div className="max-h-[520px] overflow-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left">Empresa</th>
                        <th className="px-2 py-2 text-left">Plano</th>
                        <th className="px-2 py-2 text-left">Valor</th>
                        <th className="px-2 py-2 text-left">Versão</th>
                        <th className="px-2 py-2 text-left">Status</th>
                        <th className="px-2 py-2 text-left">Assinado em</th>
                        <th className="px-2 py-2 text-left">Gerado em</th>
                        <th className="px-2 py-2 text-left">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.length === 0 && (
                        <tr><td colSpan={8} className="px-2 py-4 text-center text-muted-foreground">Nenhum contrato encontrado</td></tr>
                      )}
                      {contracts.map((c) => {
                        const empNome = String(c.empresas?.nome ?? c.empresa_id ?? '-')
                        const planName = String(c.plans?.name ?? c.plans?.code ?? '-')
                        const valor = c.amount != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(c.amount)) : '-'
                        const st = String(c.status ?? '-')
                        const signedAt = c.signed_at ? new Date(String(c.signed_at)).toLocaleDateString('pt-BR') : null
                        const isSelected = String(c.id) === selectedContractId
                        return (
                          <tr key={String(c.id)} className={`border-t border-border cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-sky-50 dark:bg-sky-900/20' : ''}`} onClick={() => setSelectedContractId(String(c.id ?? ''))}>
                            <td className="px-2 py-2 font-medium">{empNome}</td>
                            <td className="px-2 py-2 text-muted-foreground">{planName}</td>
                            <td className="px-2 py-2">{valor}</td>
                            <td className="px-2 py-2">v{String(c.version ?? '1')}</td>
                            <td className="px-2 py-2"><span className={`rounded border px-2 py-0.5 ${statusColor(st)}`}>{st}</span></td>
                            <td className="px-2 py-2">
                              {signedAt
                                ? <span className="text-green-700 dark:text-green-400">✓ {signedAt}</span>
                                : <span className="text-amber-600 dark:text-amber-400">Pendente</span>}
                            </td>
                            <td className="px-2 py-2">{c.generated_at ? new Date(String(c.generated_at)).toLocaleDateString('pt-BR') : '-'}</td>
                            <td className="px-2 py-2">
                              <button className="rounded border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700" onClick={(e) => { e.stopPropagation(); setSelectedContractId(String(c.id ?? '')) }}>Editar</button>
                            </td>
                          </tr>
                        )
                      })}
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
              return 'bg-muted text-muted-foreground border-border'
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
                ticketsQuery.refetch()
              } catch { /* handled by runAction */ } finally { setTicketUploading(false) }
            }

            const handleSelectTicket = async (tid: string) => {
              setSelectedTicketId(tid)
              const ticket = tickets.find((t) => String(t.id) === tid)
              if (ticket && Number(ticket.unread_owner_messages ?? 0) > 0) {
                try { await execute.mutateAsync({ action: 'mark_ticket_read_owner', payload: { ticket_id: tid } }); ticketsQuery.refetch() } catch { /* non-critical */ }
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
                        {tickets.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum ticket</p>}
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
                            <button key={tid} type="button" onClick={() => void handleSelectTicket(tid)} className={`w-full text-left p-3 rounded-lg border transition-all ${isSel ? 'border-sky-400 bg-sky-50' : 'border-border hover:border-input hover:bg-muted/50'}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm font-medium truncate ${isSel ? 'text-sky-800' : ''}`}>{String(t.subject ?? 'Sem assunto')}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{req.nome}</p>
                                  {empNome && <p className="text-[10px] text-muted-foreground">{empNome}</p>}
                                </div>
                                {unread > 0 && <span className="shrink-0 rounded-full bg-sky-600 text-white text-[10px] font-bold px-1.5 py-0.5">{unread}</span>}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${statusColor(st)}`}>{st}</span>
                                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${priBadge(pri)}`}>{pri}</span>
                                <span className="text-[10px] text-muted-foreground ml-auto">{created}</span>
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
                            <div><span className="text-muted-foreground">Status:</span> <span className={`rounded border px-1.5 py-0.5 font-medium ${statusColor(String(selectedTicket.status ?? ''))}`}>{String(selectedTicket.status ?? '—')}</span></div>
                            <div><span className="text-muted-foreground">Prioridade:</span> <span className={`rounded border px-1.5 py-0.5 font-medium ${priBadge(String(selectedTicket.priority ?? 'baixa'))}`}>{String(selectedTicket.priority ?? '—')}</span></div>
                            <div><span className="text-muted-foreground">Criado:</span> {selectedTicket.created_at ? new Date(String(selectedTicket.created_at)).toLocaleString('pt-BR') : '—'}</div>
                            <div><span className="text-muted-foreground">Empresa:</span> {(() => { const emp = selectedTicket.empresas as Record<string, unknown> | null; return emp ? String(emp.nome ?? emp.slug ?? String(selectedTicket.empresa_id ?? '—').slice(0, 8)) : String(selectedTicket.empresa_id ?? '—').slice(0, 8) })()}</div>
                          </div>
                          <div className="flex items-center gap-3 text-xs mb-3 p-2 rounded-lg bg-muted/50 border border-border">
                            <span className="text-muted-foreground">Solicitante:</span>
                            <span className="font-medium">{getRequesterInfo(selectedTicket).nome}</span>
                            {getRequesterInfo(selectedTicket).email && <span className="text-muted-foreground">({getRequesterInfo(selectedTicket).email})</span>}
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
                            {ticketMessages.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma mensagem ainda</p>}
                            {ticketMessages.map((msg, idx) => {
                              const sender = String(msg.sender ?? 'client')
                              const isOwnerMsg = sender === 'owner' || sender === 'system'
                              const content = String(msg.message ?? msg.content ?? '')
                              const time = msg.created_at ? new Date(String(msg.created_at)).toLocaleString('pt-BR') : ''
                              const atts = Array.isArray(msg.attachments) ? msg.attachments as string[] : []
                              return (
                                <div key={String(msg.id ?? idx)} className={`p-3 rounded-lg text-sm ${isOwnerMsg ? 'bg-sky-50 border border-sky-200 ml-8' : 'bg-muted/50 border border-border mr-8'}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-bold uppercase ${isOwnerMsg ? 'text-sky-600' : 'text-muted-foreground'}`}>{isOwnerMsg ? 'Suporte (Owner)' : 'Cliente'}</span>
                                    {time && <span className="text-[10px] text-muted-foreground">{time}</span>}
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
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="block"><img src={url} alt="Anexo" loading="lazy" className="max-h-40 rounded-md border border-border object-contain hover:opacity-90 transition-opacity" /></a>
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
                            <textarea className="min-h-[100px] rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none" value={ticketResponse} onChange={(e) => setTicketResponse(e.target.value)} placeholder="Digite sua resposta ao cliente..." />
                            <div className="space-y-2">
                              <label className="block text-xs text-muted-foreground">Anexar imagens (opcional)</label>
                              <input type="file" accept="image/*" multiple className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-input file:text-sm file:bg-background file:text-foreground hover:file:bg-muted/50" onChange={(e) => setTicketAttachments(Array.from(e.target.files ?? []))} />
                              {ticketAttachments.length > 0 && <p className="text-xs text-muted-foreground">{ticketAttachments.length} arquivo(s) selecionado(s)</p>}
                            </div>
                            <div className="flex items-center gap-3">
                              <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={ticketResponseStatus} onChange={(e) => setTicketResponseStatus(e.target.value)}>
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
                        <p className="text-sm text-muted-foreground py-8 text-center">Selecione um ticket na lista para visualizar</p>
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
                  <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={limitUsers} onChange={(e) => setLimitUsers(e.target.value)} placeholder="Limite usuários" />
                  <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={limitAssets} onChange={(e) => setLimitAssets(e.target.value)} placeholder="Limite equipamentos" />
                  <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={limitStorageMb} onChange={(e) => setLimitStorageMb(e.target.value)} placeholder="Armazenamento MB" />
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
                    <label className="text-xs font-medium text-muted-foreground">Nome do contato</label>
                    <input className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-2 text-sm" value={platformContactName} onChange={(e) => setPlatformContactName(e.target.value)} placeholder="Ex: Suporte PCM" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">E-mail comercial</label>
                    <input className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-2 text-sm" type="email" value={platformContactEmail} onChange={(e) => setPlatformContactEmail(e.target.value)} placeholder="comercial@empresa.com" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">WhatsApp</label>
                    <input className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-2 text-sm" value={platformContactWhatsapp} onChange={(e) => setPlatformContactWhatsapp(e.target.value)} placeholder="+55 11 99999-9999" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Mensagem personalizada (vencimento)</label>
                    <textarea className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-2 text-sm" rows={2} value={platformExpiryMessage} onChange={(e) => setPlatformExpiryMessage(e.target.value)} placeholder="Exibida no banner de carência" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Dias de alerta antes do vencimento</label>
                      <input className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-2 text-sm" type="number" min="1" max="30" value={platformAlertDays} onChange={(e) => setPlatformAlertDays(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Dias de carência após vencimento</label>
                      <input className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-2 text-sm" type="number" min="0" max="90" value={platformGraceDays} onChange={(e) => setPlatformGraceDays(e.target.value)} />
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
                <SurfaceCard title="Integracao ASAAS" subtitle="Cole sua chave API e clique salvar. Pronto.">
                  <div className="space-y-3">
                    <div className={`flex items-center gap-3 rounded-xl border p-3 ${asaasHealthOk ? 'border-emerald-200 bg-emerald-50' : asaasHealthOk === false ? 'border-amber-200 bg-amber-50' : 'border-border bg-muted/50'}`}>
                      {asaasHealthOk === null ? (
                        <><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><div><p className="text-sm font-semibold text-foreground">Verificando...</p></div></>
                      ) : asaasHealthOk ? (
                        <><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="text-sm font-semibold text-emerald-700">ASAAS conectado</p><p className="text-xs text-emerald-600">{asaasBaseUrl?.includes('sandbox') ? 'Ambiente: SANDBOX (testes)' : 'Ambiente: PRODUCAO'}</p></div></>
                      ) : (
                        <><AlertTriangle className="h-5 w-5 text-amber-600" /><div><p className="text-sm font-semibold text-amber-700">ASAAS nao configurado</p><p className="text-xs text-amber-600">Cole a chave abaixo para ativar.</p></div></>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Chave API do ASAAS</label>
                      <input
                        className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-2 font-mono text-sm"
                        type="password"
                        value={asaasApiKeyInput}
                        onChange={(e) => { setAsaasApiKeyInput(e.target.value); setAsaasApiKeySaved(false) }}
                        placeholder="$aact_YTU5YTE0M2M2MWM2..."
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">ASAAS &gt; Minha Conta &gt; Integracao &gt; Gerar nova chave API</p>
                    </div>

                    <button
                      className="w-full rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      disabled={busy || !asaasApiKeyInput.trim()}
                      onClick={async () => {
                        setError(null)
                        setFeedback(null)
                        try {
                          const res = await execute.mutateAsync({ action: 'set_asaas_api_key', payload: { asaas_api_key: asaasApiKeyInput.trim() } }) as Record<string, unknown>
                          if (res?.success) {
                            setAsaasHealthOk(true)
                            setAsaasApiKeySaved(true)
                            setAsaasBaseUrl(res?.environment === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3')
                            setFeedback('Chave ASAAS salva e validada com sucesso!')
                          } else {
                            setError(String(res?.error ?? 'Falha ao salvar chave.'))
                          }
                        } catch (err: any) {
                          setError(String(err?.message ?? 'Erro ao salvar chave ASAAS.'))
                        }
                      }}
                    >
                      {busy ? 'Salvando...' : asaasApiKeySaved ? 'Salvo com sucesso!' : 'Salvar chave ASAAS'}
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
                <div className="rounded-xl border border-border bg-muted/50 p-3 text-xs text-foreground">
                  <p>Empresa selecionada: {companyId || 'Nenhuma'}</p>
                  <p className="mt-1">Recursos atuais: AI {featureAi ? 'ON' : 'OFF'} • API {featureApi ? 'ON' : 'OFF'} • SSO {featureSso ? 'ON' : 'OFF'}</p>
                </div>
              </SurfaceCard>
            </div>
          )}

          {activeTab === 'auditoria' && (
            <div className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricTile icon={Activity} label="Total Registros" value={auditKpis.total} color="#0ea5e9" />
                <MetricTile icon={AlertTriangle} label="Erros / Rejeições" value={auditKpis.erros} color="#ef4444" />
                <MetricTile icon={Building2} label="Empresas" value={auditKpis.tenants} color="#8b5cf6" />
                <MetricTile icon={Users} label="Usuários Distintos" value={auditKpis.usuarios} color="#22c55e" />
              </div>

              {/* Volume por Empresa Chart */}
              {volumePorEmpresa.length > 0 && (
                <SurfaceCard title="Volume por Empresa" subtitle="Top 10 empresas com mais eventos">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={volumePorEmpresa} margin={{ left: 5, right: 20 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number, name: string) => [v, name === 'total' ? 'Total' : 'Erros']} />
                      <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="total" />
                      <Bar dataKey="erros" fill="#ef4444" radius={[4, 4, 0, 0]} name="erros" />
                    </BarChart>
                  </ResponsiveContainer>
                </SurfaceCard>
              )}

              {/* Tabela de Auditoria */}
              <SurfaceCard title="Auditoria" subtitle={`${auditFiltered.length} registro(s) encontrado(s)`}>
                <div className="mb-3 flex justify-end">
                  <button className="inline-flex items-center gap-1 rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground" onClick={exportAuditCsv}>
                    <Download className="h-3.5 w-3.5" /> Exportar CSV
                  </button>
                </div>

                <div className="mb-3 grid gap-2 sm:grid-cols-3">
                  <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" placeholder="Buscar ação, tabela, usuário..." value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} />
                  <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={auditResultadoFilter} onChange={(e) => setAuditResultadoFilter(e.target.value as typeof auditResultadoFilter)}>
                    <option value="todos">Resultado: Todos</option>
                    <option value="sucesso">Sucesso</option>
                    <option value="erro">Erro</option>
                    <option value="rejeitado">Rejeitado</option>
                  </select>
                  <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={auditActionFilter} onChange={(e) => setAuditActionFilter(e.target.value)}>
                    <option value="todos">Ação: Todas</option>
                    {availableAuditActions.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3 grid gap-2 sm:grid-cols-5">
                  <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={auditUsuarioFilter} onChange={(e) => setAuditUsuarioFilter(e.target.value)}>
                    <option value="todos">Usuário: Todos</option>
                    {availableAuditUsuarios.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={auditTableFilter} onChange={(e) => setAuditTableFilter(e.target.value)}>
                    <option value="todos">Tabela: Todas</option>
                    {availableAuditTables.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" type="date" value={auditDateFrom} onChange={(e) => setAuditDateFrom(e.target.value)} title="Data inicial" />
                  <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" type="date" value={auditDateTo} onChange={(e) => setAuditDateTo(e.target.value)} title="Data final" />
                  <button className="rounded-lg border border-input px-3 py-2 text-sm" onClick={() => { setAuditSearch(''); setAuditResultadoFilter('todos'); setAuditUsuarioFilter('todos'); setAuditTableFilter('todos'); setAuditActionFilter('todos'); setAuditDateFrom(''); setAuditDateTo('') }}>Limpar filtros</button>
                </div>

                <div className="max-h-[520px] overflow-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left">Ação</th>
                        <th className="px-2 py-2 text-left">Tabela</th>
                        <th className="px-2 py-2 text-left">Resultado</th>
                        <th className="px-2 py-2 text-left">Usuário</th>
                        <th className="px-2 py-2 text-left">Registro ID</th>
                        <th className="px-2 py-2 text-left">Empresa</th>
                        <th className="px-2 py-2 text-left">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditFiltered.map((l, idx) => {
                        const resultado = String(l.resultado ?? 'sucesso').toLowerCase()
                        const empresaNome = companies.find((c) => String(c.id) === String(l.empresa_id))?.nome
                        const createdAt = String(l.created_at ?? '')
                        const formatted = createdAt ? new Date(createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }) : '-'

                        return (
                          <tr key={`${String(l.id ?? 'audit')}-${idx}`} className="border-t border-border hover:bg-muted/50">
                            <td className="px-2 py-2 font-medium">{String(l.acao ?? '-')}</td>
                            <td className="px-2 py-2">{String(l.tabela ?? '-')}</td>
                            <td className="px-2 py-2">
                              <span className={`text-xs font-semibold ${
                                resultado === 'erro' ? 'text-red-600' :
                                resultado === 'rejeitado' ? 'text-amber-700' :
                                'text-emerald-600'
                              }`}>{resultado}</span>
                            </td>
                            <td className="px-2 py-2">{String(l.usuario_email ?? '-')}</td>
                            <td className="px-2 py-2 font-mono text-[10px]">{String(l.registro_id ?? '-').slice(0, 8)}</td>
                            <td className="px-2 py-2">{empresaNome ? String(empresaNome) : String(l.empresa_id ?? '-').slice(0, 8)}</td>
                            <td className="px-2 py-2 whitespace-nowrap">{formatted}</td>
                          </tr>
                        )
                      })}
                      {auditFiltered.length === 0 && (
                        <tr>
                          <td className="px-2 py-3 text-muted-foreground" colSpan={7}>Nenhum registro de auditoria encontrado com os filtros atuais.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>
            </div>
          )}

          {activeTab === 'logs' && (
            <SurfaceCard title="Logs" subtitle="Busca por ação/usuário e filtro de resultado">
              <div className="mb-3 flex justify-end">
                <button className="inline-flex items-center gap-1 rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground" onClick={exportLogsCsv}>
                  <Download className="h-3.5 w-3.5" /> Exportar CSV
                </button>
              </div>

              <div className="mb-3 grid gap-2 sm:grid-cols-3">
                <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" placeholder="Buscar ação ou usuário" value={logSearch} onChange={(e) => setLogSearch(e.target.value)} />
                <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={logSeverityFilter} onChange={(e) => setLogSeverityFilter(e.target.value as typeof logSeverityFilter)}>
                  <option value="todos">Resultado: Todos</option>
                  <option value="sucesso">Sucesso</option>
                  <option value="erro">Erro</option>
                  <option value="rejeitado">Rejeitado</option>
                </select>
                <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" placeholder="Filtrar por usuário (email)" value={logActorFilter} onChange={(e) => setLogActorFilter(e.target.value)} />
              </div>

              <div className="mb-3 grid gap-2 sm:grid-cols-4">
                <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={logModuleFilter} onChange={(e) => setLogModuleFilter(e.target.value)}>
                  <option value="todos">Tabela: Todas</option>
                  {availableLogModules.map((moduleName) => (
                    <option key={moduleName} value={moduleName}>{moduleName}</option>
                  ))}
                </select>
                <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" type="date" value={logDateFrom} onChange={(e) => setLogDateFrom(e.target.value)} />
                <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" type="date" value={logDateTo} onChange={(e) => setLogDateTo(e.target.value)} />
                <button className="rounded-lg border border-input px-3 py-2 text-sm" onClick={() => { setLogSearch(''); setLogSeverityFilter('todos'); setLogActorFilter(''); setLogModuleFilter('todos'); setLogDateFrom(''); setLogDateTo('') }}>Limpar filtros</button>
              </div>

              <div className="max-h-[520px] overflow-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-2 py-2 text-left">Ação</th>
                      <th className="px-2 py-2 text-left">Tabela</th>
                      <th className="px-2 py-2 text-left">Resultado</th>
                      <th className="px-2 py-2 text-left">Usuário</th>
                      <th className="px-2 py-2 text-left">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsFiltered.map((l, idx) => {
                      const createdAt = String(l.created_at ?? '')
                      const formatted = createdAt ? new Date(createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }) : '-'
                      return (
                        <tr key={`${String(l.id ?? 'log')}-${idx}`} className="border-t border-border">
                          <td className="px-2 py-2 font-medium">{String(l.acao ?? '-')}</td>
                          <td className="px-2 py-2">{String(l.tabela ?? '-')}</td>
                          <td className="px-2 py-2">{String(l.resultado ?? 'sucesso')}</td>
                          <td className="px-2 py-2">{String(l.usuario_email ?? '-')}</td>
                          <td className="px-2 py-2 whitespace-nowrap">{formatted}</td>
                        </tr>
                      )
                    })}
                    {logsFiltered.length === 0 && (
                      <tr>
                        <td className="px-2 py-3 text-muted-foreground" colSpan={5}>Nenhum log encontrado com os filtros atuais.</td>
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
                  <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={systemUserId} onChange={(e) => setSystemUserId(e.target.value)}>
                    <option value="">Usuário para promoção/timeout</option>
                    {humanUsers.map((u) => (
                      <option key={String(u.id)} value={String(u.id)}>{String(u.nome ?? u.email ?? u.id)}</option>
                    ))}
                  </select>

                  <button
                    className="rounded-lg border border-input px-3 py-2 text-sm"
                    disabled={busy || !systemUserId}
                    onClick={() => openCriticalAction({
                      title: 'Conceder SYSTEM_ADMIN',
                      description: `Promover o usuário selecionado a SYSTEM_ADMIN. Esta é uma operação de alta criticidade.`,
                      confirmText: 'SYSTEM_ADMIN',
                      action: 'create_system_admin',
                      payload: { user_id: systemUserId },
                      successMessage: 'Permissão SYSTEM_ADMIN concedida.',
                    })}
                  >
                    Conceder SYSTEM_ADMIN
                  </button>

                  <p className="text-xs text-muted-foreground">Timeout de inatividade ocultado do Owner para simplificar a operação.</p>

                  <select className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={selectedTableName} onChange={(e) => setSelectedTableName(e.target.value)}>
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

                  <div className="mt-3 border-t border-border pt-3">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">Dispositivos (conexões QR Code)</p>
                    <p className="mb-2 text-xs text-muted-foreground">{deviceUsers.length} dispositivo(s) registrado(s) no banco.</p>
                    <button
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                      disabled={busy || deviceUsers.length === 0}
                      onClick={() => openCriticalAction({
                        title: 'Purge de dispositivos',
                        description: `Remover ${deviceUsers.length} registro(s) de dispositivo (QR Code) do banco de dados. Isso apaga os usuários fake criados por conexões de app mecânico. Dispositivos poderão reconectar via novo QR code.`,
                        confirmText: 'PURGE_DEVICES',
                        action: 'purge_device_users',
                        payload: { empresa_id: companyId || undefined },
                        successMessage: `${deviceUsers.length} dispositivo(s) removido(s) com sucesso.`,
                      })}
                    >
                      Purgar dispositivos expirados ({deviceUsers.length})
                    </button>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard title="Resumo operacional do sistema" subtitle="Visão rápida de segurança e manutenção">
                <div className="grid gap-2 sm:grid-cols-2">
                  <MetricTile label="Tabelas detectadas" value={tables.length} icon={Database} tone="sky" />
                  <MetricTile label="Usuários reais" value={humanUsers.length} icon={Users} tone="emerald" />
                  <MetricTile label="Dispositivos QR" value={deviceUsers.length} icon={Settings2} tone="rose" />
                  <MetricTile label="Empresa em escopo" value={companyId ? 'Selecionada' : 'Global'} icon={Building2} tone="amber" />
                </div>

                <div className="mt-3 rounded-xl border border-border bg-muted/50 p-3 text-xs text-foreground">
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
                  <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Nome" />
                  <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="Email" />
                  <input className="rounded-lg border border-input bg-background px-2 py-2 text-sm" type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="Senha (opcional)" />
                  <button className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !isOwnerMaster || !ownerName || !ownerEmail} onClick={() => runAction('create_platform_owner', { owner_user: { nome: ownerName, email: ownerEmail, password: ownerPassword || undefined, role: 'SYSTEM_ADMIN' } }, 'Owner de plataforma criado com sucesso.')}>Criar owner</button>
                </div>
              </SurfaceCard>

              <SurfaceCard title="Owners da plataforma">
                <div className="max-h-[420px] overflow-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
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
                          <tr key={`${String(o.user_id ?? o.id ?? 'owner')}-${idx}`} className="border-t border-border">
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

              <OwnerShadowAudit logs={logs} />
            </div>
          )}

          {feedback && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">{feedback}</p>}
          {error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          {criticalRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl">
                <h3 className="text-base font-semibold text-card-foreground">{criticalRequest.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{criticalRequest.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">Digite <span className="font-semibold text-foreground">{criticalRequest.confirmText}</span> e informe a senha de confirmação para prosseguir.</p>

                <div className="mt-3 grid gap-2">
                  <input
                    className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
                    value={criticalConfirmValue}
                    onChange={(e) => setCriticalConfirmValue(e.target.value)}
                    placeholder={`Digite ${criticalRequest.confirmText}`}
                  />
                  <input
                    className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Senha de confirmacao"
                  />
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-muted" onClick={() => setCriticalRequest(null)}>Cancelar</button>
                  <button className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/20" disabled={busy} onClick={confirmCriticalAction}>Confirmar acao</button>
                </div>
              </div>
            </div>
          )}

          {editEmpresaOpen && editEmpresa && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
              <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div>
                    <h3 className="text-base font-semibold text-card-foreground">Editar empresa</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{editEmpresa.nome}</p>
                  </div>
                  <button className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted transition-colors" onClick={() => { setEditEmpresaOpen(false); setEditEmpresa(null) }}>
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-5 grid gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados da empresa</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Tipo pessoa</label>
                      <select className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={editEmpresa.tipo_pessoa} onChange={(e) => setEditEmpresa({ ...editEmpresa, tipo_pessoa: e.target.value as 'PJ' | 'PF' })}>
                        <option value="PJ">Pessoa jurídica (PJ)</option>
                        <option value="PF">Pessoa física (PF)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Status</label>
                      <select className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={editEmpresa.status} onChange={(e) => setEditEmpresa({ ...editEmpresa, status: e.target.value })}>
                        <option value="ativo">Ativo</option>
                        <option value="bloqueado">Bloqueado</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="teste">Teste</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Nome da empresa *</label>
                    <input className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={editEmpresa.nome} onChange={(e) => setEditEmpresa({ ...editEmpresa, nome: e.target.value })} placeholder="Nome da empresa" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Slug</label>
                      <input className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={editEmpresa.slug} onChange={(e) => setEditEmpresa({ ...editEmpresa, slug: e.target.value })} placeholder="Slug (subdomínio)" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">{editEmpresa.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ'}</label>
                      <input className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={editEmpresa.cpf_cnpj} onChange={(e) => setEditEmpresa({ ...editEmpresa, cpf_cnpj: e.target.value })} placeholder={editEmpresa.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ'} />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">{editEmpresa.tipo_pessoa === 'PF' ? 'Nome completo' : 'Razão social'}</label>
                      <input className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={editEmpresa.razao_social} onChange={(e) => setEditEmpresa({ ...editEmpresa, razao_social: e.target.value })} placeholder={editEmpresa.tipo_pessoa === 'PF' ? 'Nome completo' : 'Razão social'} />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">{editEmpresa.tipo_pessoa === 'PF' ? 'Nome de exibição' : 'Nome fantasia'}</label>
                      <input className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={editEmpresa.nome_fantasia} onChange={(e) => setEditEmpresa({ ...editEmpresa, nome_fantasia: e.target.value })} placeholder={editEmpresa.tipo_pessoa === 'PF' ? 'Nome de exibição' : 'Nome fantasia'} />
                    </div>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-1">Contato</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Telefone</label>
                      <input className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={editEmpresa.telefone} onChange={(e) => setEditEmpresa({ ...editEmpresa, telefone: e.target.value })} placeholder="Telefone" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Email comercial</label>
                      <input className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" type="email" value={editEmpresa.email} onChange={(e) => setEditEmpresa({ ...editEmpresa, email: e.target.value })} placeholder="Email comercial" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Endereço</label>
                    <input className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={editEmpresa.endereco} onChange={(e) => setEditEmpresa({ ...editEmpresa, endereco: e.target.value })} placeholder="Endereço" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Responsável</label>
                      <input className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={editEmpresa.responsavel} onChange={(e) => setEditEmpresa({ ...editEmpresa, responsavel: e.target.value })} placeholder="Responsável" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Segmento</label>
                      <input className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" value={editEmpresa.segmento} onChange={(e) => setEditEmpresa({ ...editEmpresa, segmento: e.target.value })} placeholder="Segmento" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
                  <button className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors" onClick={() => { setEditEmpresaOpen(false); setEditEmpresa(null) }}>Cancelar</button>
                  <button
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    disabled={editEmpresaBusy || !editEmpresa.nome}
                    onClick={handleSaveEditEmpresa}
                  >
                    {editEmpresaBusy ? 'Salvando…' : 'Salvar alterações'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

