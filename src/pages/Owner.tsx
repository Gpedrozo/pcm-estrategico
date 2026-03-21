import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle, Clock, Database, Gauge, Loader2, ShieldCheck } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { OwnerPortalLayout } from '@/layouts/OwnerPortalLayout'
import { resolveOrRepairTenantHost } from '@/lib/tenantDomain'
import {
  useOwnerAuditLogs,
  useOwnerBackendHealth,
  useOwnerCompanies,
  useOwnerCompanyActions,
  useOwnerCompanySettings,
  useOwnerContracts,
  useOwnerDatabaseTables,
  useOwnerMasterOwners,
  useOwnerPlans,
  useOwnerStats,
  useOwnerSubscriptions,
  useOwnerSupportTickets,
  useOwnerUsers,
} from '@/hooks/useOwnerPortal'

const KNOWN_OWNER_MASTER_EMAILS = ['pedrozo@gppis.com.br', 'pedrozo@gppis.cm.br'] as const
const getOwnerMasterEmail = () => {
  const configured = String(import.meta.env.VITE_OWNER_MASTER_EMAIL ?? '').trim().toLowerCase()
  if (configured) return configured
  return KNOWN_OWNER_MASTER_EMAILS[0]
}
const TENANT_BASE_DOMAIN = (import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gppis.com.br').toLowerCase()
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])
const normalizeEmail = (value: string) => value.trim().toLowerCase()
const isValidEmail = (value: string) => EMAIL_REGEX.test(normalizeEmail(value))

const emptySystemForm = () => ({ user_id: '', empresa_id: '', table_name: '', auth_password: '', keep_core: false, keep_billing: false, include_auth_users: true })
const emptyAuditFilters = () => ({ empresa_id: '', user_id: '', module: '', from: '', to: '', action_type: '', severity: '' })
const emptyCreateCompanyForm = () => ({
  nome: '',
  slug: '',
  admin_nome: '',
  admin_email: '',
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  endereco: '',
  telefone: '',
  email: '',
  responsavel: '',
  segmento: '',
})
const emptyUpdateCompanyForm = () => ({ empresa_id: '', nome: '', status: '' })
const emptyCreateUserForm = () => ({ nome: '', email: '', password: '', role: '', empresa_id: '' })
const emptyUserStatusForm = () => ({ user_id: '', status: '' })
const emptyCreatePlanForm = () => ({
  code: '',
  name: '',
  description: '',
  price_month: '',
  user_limit: '10',
  data_limit_mb: '2048',
  company_limit: '',
  module_flags_json: '{\n  "dashboard": true\n}',
  premium_features_json: '[]',
  active: true,
})
const emptyUpdatePlanForm = () => ({
  id: '',
  code: '',
  name: '',
  description: '',
  price_month: '',
  user_limit: '',
  data_limit_mb: '',
  company_limit: '',
  module_flags_json: '{\n}',
  premium_features_json: '[]',
  active: true,
})
const emptyChangePlanForm = () => ({ empresa_id: '', plano_codigo: '' })
const emptyCreateSubscriptionForm = () => ({ empresa_id: '', plan_id: '', amount: '', status: '' })
const emptySubscriptionStatusForm = () => ({ empresa_id: '', status: '' })
const emptyBillingForm = () => ({ subscription_id: '', amount: '', payment_status: '' })
const emptyContractForm = () => ({ contract_id: '', content: '', summary: '', status: '' })
const emptySupportForm = () => ({ ticket_id: '', response: '', status: '' })
const emptySettingsForm = () => ({ empresa_id: '', modules: '', limits: '', features: '' })
const emptyUserInactivityTimeoutForm = () => ({ user_id: '', inactivity_timeout_minutes: '10' })
const emptyOwnerMasterForm = () => ({ nome: '', email: '', password: '' })

type OwnerTab =
  | 'dashboard'
  | 'empresas'
  | 'usuarios'
  | 'planos'
  | 'assinaturas'
  | 'contratos'
  | 'auditoria'
  | 'sistema'
  | 'suporte'
  | 'financeiro'
  | 'feature-flags'
  | 'monitoramento'
  | 'logs'
  | 'configuracoes'
  | 'owner-master'

type CompanyCredentialNote = {
  companyName: string
  companySlug: string
  masterEmail: string
  initialPassword: string
  loginUrl: string
  noteText: string
}

const DELETE_COMPANY_STAGES = [
  'Validando permissao de owner master',
  'Removendo dados vinculados da empresa',
  'Executando exclusao definitiva da empresa',
  'Finalizando operacao e atualizando painel',
]

const CREATE_COMPANY_STAGES = [
  'Validando dados de onboarding da empresa',
  'Criando empresa e estrutura inicial',
  'Provisionando administrador inicial',
  'Finalizando credenciais e acesso',
]

const MONITOR_TABLE_LABELS: Record<string, string> = {
  ordens_servico: 'Ordens de Servico',
  equipamentos: 'Equipamentos',
  planos_preventivos: 'Planos Preventivos',
  planos_lubrificacao: 'Planos Lubrificacao',
  medicoes_preditivas: 'Medicoes Preditivas',
  inspecoes: 'Inspecoes',
  fmea: 'FMEA',
  analise_causa_raiz: 'Causa Raiz (RCA)',
  melhorias: 'Melhorias',
  materiais: 'Materiais',
  mecanicos: 'Mecanicos',
  fornecedores: 'Fornecedores',
  contratos: 'Contratos',
  documentos_tecnicos: 'Documentos Tecnicos',
  solicitacoes_manutencao: 'Solicitacoes',
  incidentes_ssma: 'SSMA/Incidentes',
  componentes_equipamento: 'Componentes',
  execucoes_os: 'Execucoes OS',
  profiles: 'Usuarios',
  audit_logs: 'Auditoria',
  security_logs: 'Security Logs',
  notificacoes: 'Notificacoes',
  permissoes_granulares: 'Permissoes Granulares',
  configuracoes_sistema: 'Configuracoes',
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
    </div>
  )
}

export default function Owner() {
  const { isSystemOwner, isLoading, user } = useAuth()
  const [active, setActive] = useState<OwnerTab>('dashboard')
  const [isDocumentVisible, setIsDocumentVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden',
  )
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [companyCredentialNote, setCompanyCredentialNote] = useState<CompanyCredentialNote | null>(null)
  const [systemActionOutput, setSystemActionOutput] = useState<unknown>(null)
  const [systemForm, setSystemForm] = useState(emptySystemForm)
  const [monitoringEmpresaId, setMonitoringEmpresaId] = useState('')
  const [selectedTenantTables, setSelectedTenantTables] = useState<string[]>([])
  const [auditFilters, setAuditFilters] = useState(emptyAuditFilters)
  const [isDeleteCompanyOverlayVisible, setIsDeleteCompanyOverlayVisible] = useState(false)
  const [deleteCompanyStageIndex, setDeleteCompanyStageIndex] = useState(0)
  const [deleteCompanyElapsedSeconds, setDeleteCompanyElapsedSeconds] = useState(0)
  const [deleteCompanyTargetEmpresaId, setDeleteCompanyTargetEmpresaId] = useState('')
  const [deleteCompanyDialogCompanyId, setDeleteCompanyDialogCompanyId] = useState('')
  const [deleteCompanyDialogCompanyLabel, setDeleteCompanyDialogCompanyLabel] = useState('')
  const [deleteCompanyDialogConfirmText, setDeleteCompanyDialogConfirmText] = useState('')
  const [deleteCompanyDialogPassword, setDeleteCompanyDialogPassword] = useState('')
  const [isCreateCompanyDialogVisible, setIsCreateCompanyDialogVisible] = useState(false)
  const [createCompanyDialogConfirmText, setCreateCompanyDialogConfirmText] = useState('')
  const [createCompanyDialogPassword, setCreateCompanyDialogPassword] = useState('')
  const [isCreateCompanyOverlayVisible, setIsCreateCompanyOverlayVisible] = useState(false)
  const [createCompanyStageIndex, setCreateCompanyStageIndex] = useState(0)
  const [createCompanyElapsedSeconds, setCreateCompanyElapsedSeconds] = useState(0)
  const [createCompanyTargetName, setCreateCompanyTargetName] = useState('')

  const isDeleteCompanyDialogVisible = !!deleteCompanyDialogCompanyId
  const deleteCompanyExpectedPhrase = deleteCompanyDialogCompanyLabel ? `EXCLUIR ${deleteCompanyDialogCompanyLabel}` : ''

  const deleteCompanyCurrentStage = DELETE_COMPANY_STAGES[Math.min(deleteCompanyStageIndex, DELETE_COMPANY_STAGES.length - 1)]
  const deleteCompanyProgressPercent = Math.round(((Math.min(deleteCompanyStageIndex, DELETE_COMPANY_STAGES.length - 1) + 1) / DELETE_COMPANY_STAGES.length) * 100)
  const deleteCompanyElapsedLabel = `${String(Math.floor(deleteCompanyElapsedSeconds / 60)).padStart(2, '0')}:${String(deleteCompanyElapsedSeconds % 60).padStart(2, '0')}`
  const createCompanyCurrentStage = CREATE_COMPANY_STAGES[Math.min(createCompanyStageIndex, CREATE_COMPANY_STAGES.length - 1)]
  const createCompanyProgressPercent = Math.round(((Math.min(createCompanyStageIndex, CREATE_COMPANY_STAGES.length - 1) + 1) / CREATE_COMPANY_STAGES.length) * 100)
  const createCompanyElapsedLabel = `${String(Math.floor(createCompanyElapsedSeconds / 60)).padStart(2, '0')}:${String(createCompanyElapsedSeconds % 60).padStart(2, '0')}`

  const ownerMasterEmail = getOwnerMasterEmail()
  const isOwnerMaster = (() => {
    const currentEmail = normalizeEmail(user?.email || '')
    if (!currentEmail) return false
    if (currentEmail === ownerMasterEmail) return true
    return KNOWN_OWNER_MASTER_EMAILS.includes(currentEmail as (typeof KNOWN_OWNER_MASTER_EMAILS)[number])
  })()

  const dashboardActive = active === 'dashboard'
  const companiesActive = active === 'empresas'
  const usersActive = active === 'usuarios'
  const plansActive = active === 'planos'
  const subscriptionsActive = active === 'assinaturas'
  const contractsActive = active === 'contratos'
  const auditActive = active === 'auditoria' || active === 'logs'
  const supportActive = active === 'suporte'
  const financeActive = active === 'financeiro'
  const settingsActive = active === 'configuracoes' || active === 'feature-flags'
  const monitoringActive = active === 'monitoramento'
  const systemActive = active === 'sistema'
  const ownerMasterActive = active === 'owner-master'

  const shouldLoadCompanies = dashboardActive || companiesActive || usersActive || subscriptionsActive || auditActive || settingsActive || monitoringActive || systemActive || financeActive
  const shouldLoadUsers = dashboardActive || usersActive || auditActive
  const shouldLoadPlans = plansActive || subscriptionsActive
  const shouldLoadSubscriptions = dashboardActive || subscriptionsActive || financeActive
  const shouldLoadContracts = contractsActive
  const shouldLoadAudit = auditActive
  const shouldLoadSupport = supportActive || monitoringActive
  const shouldLoadOwners = ownerMasterActive

  const { data: statsData } = useOwnerStats(dashboardActive)
  const { data: backendHealth, error: backendHealthError } = useOwnerBackendHealth(monitoringActive || systemActive || dashboardActive)
  const { data: companiesData, isLoading: isLoadingCompanies } = useOwnerCompanies(shouldLoadCompanies)
  const { data: usersData, isLoading: isLoadingUsers } = useOwnerUsers(undefined, shouldLoadUsers)
  const { data: plansData, isLoading: isLoadingPlans } = useOwnerPlans(shouldLoadPlans)
  const { data: subscriptionsData, isLoading: isLoadingSubscriptions } = useOwnerSubscriptions(shouldLoadSubscriptions)
  const { data: contractsData, isLoading: isLoadingContracts } = useOwnerContracts(shouldLoadContracts)
  const { data: auditData, isLoading: isLoadingAudit } = useOwnerAuditLogs({
    empresa_id: auditFilters.empresa_id || undefined,
    user_id: auditFilters.user_id || undefined,
    module: auditFilters.module || undefined,
    from: auditFilters.from || undefined,
    to: auditFilters.to || undefined,
  }, shouldLoadAudit)
  const { data: supportData, isLoading: isLoadingSupport } = useOwnerSupportTickets(shouldLoadSupport)
  const { data: ownersData, isLoading: isLoadingOwners } = useOwnerMasterOwners(shouldLoadOwners)
  const monitoringLive = active === 'monitoramento' && isDocumentVisible
  const adminTablesLive = active === 'sistema' && isDocumentVisible
  const tablesLive = monitoringLive || adminTablesLive
  const tablesRefetchInterval = monitoringLive ? 5000 : adminTablesLive ? 10000 : false
  const databaseTablesEmpresaId = monitoringActive
    ? (monitoringEmpresaId || null)
    : (systemForm.empresa_id || null)
  const {
    data: tablesData,
    isLoading: isLoadingTables,
    isFetching: isFetchingTables,
    error: tablesError,
    dataUpdatedAt: tablesUpdatedAt,
  } = useOwnerDatabaseTables(tablesLive, tablesRefetchInterval, databaseTablesEmpresaId)
  const tablesErrorMessage = String((tablesError as any)?.message ?? '')
  const tablesUnsupported = /unsupported action|missing action/i.test(tablesErrorMessage)

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

  const companies = useMemo(
    () => toArray<{ id: string; nome?: string; slug?: string; status?: string }>((companiesData as any)?.companies),
    [companiesData],
  )
  const users = useMemo(() => toArray<{ id: string; nome?: string; email?: string; status?: string; empresa_id?: string; user_roles?: Array<{ role?: string; empresa_id?: string }> }>(usersData), [usersData])
  const plans = useMemo(
    () => toArray<{
      id: string
      name?: string
      code?: string
      description?: string
      user_limit?: number
      module_flags?: Record<string, unknown>
      data_limit_mb?: number
      premium_features?: unknown[]
      company_limit?: number | null
      price_month?: number
      active?: boolean
    }>(plansData),
    [plansData],
  )
  const subscriptions = useMemo(
    () => toArray<{ id: string; empresa_id?: string; plan_id?: string; status?: string; amount?: number; payment_status?: string; updated_at?: string }>(subscriptionsData),
    [subscriptionsData],
  )
  const contracts = useMemo(() => toArray<{ id: string; empresa_id?: string; status?: string; updated_at?: string }>(contractsData), [contractsData])
  const logs = useMemo(
    () => toArray<{ id: string; action_type?: string; source?: string; created_at?: string; severity?: string; actor_email?: string; actor_id?: string }>(auditData),
    [auditData],
  )
  const tickets = useMemo(
    () => toArray<{ id: string; empresa_id?: string; subject?: string; status?: string; priority?: string; unread_owner_messages?: number }>(supportData),
    [supportData],
  )
  const owners = useMemo(() => toArray<{ user_id: string; role?: string; profile?: { nome?: string; email?: string } }>(ownersData), [ownersData])
  const tables = useMemo(
    () =>
      toArray<{ table_name: string; total_rows: number; has_empresa_id: boolean }>(tablesData)
        .slice()
        .sort((a, b) => b.total_rows - a.total_rows),
    [tablesData],
  )

  const monitoredDatabases = useMemo(
    () =>
      tables.map((table) => ({
        ...table,
        module_name: MONITOR_TABLE_LABELS[table.table_name] || table.table_name,
        status: table.total_rows >= 0 ? 'online' : 'indisponivel',
      })),
    [tables],
  )

  const monitorSummary = useMemo(() => {
    const totalTables = monitoredDatabases.length
    const activeModules = monitoredDatabases.filter((item) => item.total_rows > 0).length
    const errorModules = monitoredDatabases.filter((item) => item.status !== 'online').length + (tablesError ? 1 : 0)
    const totalRecords = monitoredDatabases.reduce((acc, item) => acc + Number(item.total_rows || 0), 0)
    const responseMs = Number((backendHealth as any)?.duration_ms ?? 0)

    const availabilityPercent = totalTables > 0
      ? Math.max(0, Math.min(100, Math.round(((totalTables - errorModules) / totalTables) * 100)))
      : 0
    const coveragePercent = totalTables > 0
      ? Math.max(0, Math.min(100, Math.round((activeModules / totalTables) * 100)))
      : 0

    const status = errorModules > 0
      ? 'critical'
      : backendHealth?.status === 'ok'
        ? 'healthy'
        : 'warning'

    return {
      totalTables,
      activeModules,
      errorModules,
      totalRecords,
      responseMs,
      availabilityPercent,
      coveragePercent,
      status,
    }
  }, [backendHealth, monitoredDatabases, tablesError])

  const monitorAvgModuleResponseMs = useMemo(
    () => (monitorSummary.totalTables > 0 ? Math.max(1, Math.round((monitorSummary.responseMs || 300) / monitorSummary.totalTables)) : 0),
    [monitorSummary.responseMs, monitorSummary.totalTables],
  )

  const monitoredDatabasesWithTiming = useMemo(
    () => monitoredDatabases.map((db, index) => ({
      ...db,
      response_ms: monitorAvgModuleResponseMs > 0 ? monitorAvgModuleResponseMs + ((index % 5) * 3) : 0,
    })),
    [monitorAvgModuleResponseMs, monitoredDatabases],
  )

  const tenantScopedTables = useMemo(
    () => tables.filter((table) => table.has_empresa_id),
    [tables],
  )

  const toggleTenantTableSelection = (tableName: string) => {
    setSelectedTenantTables((current) =>
      current.includes(tableName) ? current.filter((name) => name !== tableName) : [...current, tableName],
    )
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (auditFilters.action_type && log.action_type !== auditFilters.action_type) return false
      if (auditFilters.severity && (log.severity || '') !== auditFilters.severity) return false
      return true
    })
  }, [logs, auditFilters.action_type, auditFilters.severity])

  const scopedSubscriptions = useMemo(
    () => (monitoringEmpresaId ? subscriptions.filter((sub) => sub.empresa_id === monitoringEmpresaId) : subscriptions),
    [monitoringEmpresaId, subscriptions],
  )

  const scopedTickets = useMemo(
    () => (monitoringEmpresaId ? tickets.filter((ticket) => ticket.empresa_id === monitoringEmpresaId) : tickets),
    [monitoringEmpresaId, tickets],
  )

  const financeiroResumo = useMemo(() => {
    const activeSubs = scopedSubscriptions.filter((sub) => sub.status === 'ativa')
    const paidSubs = scopedSubscriptions.filter((sub) => sub.payment_status === 'paid')
    const lateSubs = scopedSubscriptions.filter((sub) => sub.status === 'atrasada' || sub.payment_status === 'late')
    const mrr = activeSubs.reduce((acc, sub) => acc + Number(sub.amount ?? 0), 0)
    return {
      totalAssinaturas: scopedSubscriptions.length,
      ativas: activeSubs.length,
      pagas: paidSubs.length,
      atrasadas: lateSubs.length,
      mrr,
    }
  }, [scopedSubscriptions])

  const supportResumo = useMemo(() => {
    return {
      total: scopedTickets.length,
      aberto: scopedTickets.filter((ticket) => ticket.status === 'aberto').length,
      andamento: scopedTickets.filter((ticket) => ticket.status === 'em_andamento').length,
      resolvido: scopedTickets.filter((ticket) => ticket.status === 'resolvido').length,
      unreadOwnerMessages: scopedTickets.reduce((acc, ticket) => acc + Number(ticket.unread_owner_messages ?? 0), 0),
    }
  }, [scopedTickets])

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

  const {
    createCompanyMutation,
    updateCompanyMutation,
    setCompanyLifecycle,
    createUserMutation,
    setUserStatusMutation,
    createPlanMutation,
    updatePlanMutation,
    changePlan,
    createSubscriptionMutation,
    setSubscriptionStatusMutation,
    updateSubscriptionBillingMutation,
    updateContractMutation,
    regenerateContractMutation,
    deleteContractMutation,
    respondSupportMutation,
    updateCompanySettingsMutation,
    setUserInactivityTimeoutMutation,
    createSystemAdminMutation,
    createPlatformOwnerMutation,
    cleanupCompanyDataMutation,
    purgeTableDataMutation,
    deleteCompanyByOwnerMutation,
  } = useOwnerCompanyActions()

  const [createCompanyForm, setCreateCompanyForm] = useState(emptyCreateCompanyForm)
  const createCompanyNameLabel = createCompanyForm.nome.trim()
  const createCompanyExpectedPhrase = createCompanyNameLabel ? `CRIAR EMPRESA ${createCompanyNameLabel}` : ''
  const canCreateCompanySubmit = !createCompanyMutation.isPending
    && !!createCompanyForm.nome
    && !!createCompanyForm.admin_nome
    && isValidEmail(createCompanyForm.admin_email)
    && (!normalizeEmail(createCompanyForm.email) || isValidEmail(createCompanyForm.email))
  const [updateCompanyForm, setUpdateCompanyForm] = useState(emptyUpdateCompanyForm)
  const [createUserForm, setCreateUserForm] = useState(emptyCreateUserForm)
  const [userStatusForm, setUserStatusForm] = useState(emptyUserStatusForm)
  const [createPlanForm, setCreatePlanForm] = useState(emptyCreatePlanForm)
  const [updatePlanForm, setUpdatePlanForm] = useState(emptyUpdatePlanForm)
  const [changePlanForm, setChangePlanForm] = useState(emptyChangePlanForm)
  const [createSubscriptionForm, setCreateSubscriptionForm] = useState(emptyCreateSubscriptionForm)
  const [subscriptionStatusForm, setSubscriptionStatusForm] = useState(emptySubscriptionStatusForm)
  const [billingForm, setBillingForm] = useState(emptyBillingForm)
  const [contractForm, setContractForm] = useState(emptyContractForm)
  const [contractOnlyId, setContractOnlyId] = useState('')
  const [supportForm, setSupportForm] = useState(emptySupportForm)
  const [settingsForm, setSettingsForm] = useState(emptySettingsForm)
  const [userInactivityTimeoutForm, setUserInactivityTimeoutForm] = useState(emptyUserInactivityTimeoutForm)
  const [ownerMasterForm, setOwnerMasterForm] = useState(emptyOwnerMasterForm)

  const resolveCompanyStatus = (value?: string) => {
    const normalized = String(value || '').trim().toLowerCase()
    if (!normalized) return 'active'
    if (normalized === 'active' || normalized === 'blocked' || normalized === 'suspended') return normalized
    if (normalized === 'ativa') return 'active'
    if (normalized === 'bloqueada') return 'blocked'
    if (normalized === 'suspensa') return 'suspended'
    return 'active'
  }

  const selectedSettingsQuery = useOwnerCompanySettings(settingsForm.empresa_id || null, settingsActive)
  const selectedSettings = toArray<{ chave: string; valor: Record<string, unknown> }>((selectedSettingsQuery.data as any)?.settings)

  const usersWithCompany = useMemo(
    () => users.filter((item) => Boolean(item.empresa_id || item.user_roles?.some((role) => role?.empresa_id))),
    [users],
  )

  const selectedTimeoutUser = useMemo(
    () => usersWithCompany.find((item) => item.id === userInactivityTimeoutForm.user_id) ?? null,
    [userInactivityTimeoutForm.user_id, usersWithCompany],
  )

  const selectedSecurityPolicy = useMemo(() => {
    const row = selectedSettings.find((item) => item.chave === 'owner.security_policy')
    if (!row || !row.valor || typeof row.valor !== 'object' || Array.isArray(row.valor)) return {}
    return row.valor as Record<string, unknown>
  }, [selectedSettings])

  const selectedCompanyInactivityMinutes = useMemo(() => {
    const parsed = Number(selectedSecurityPolicy.inactivity_timeout_minutes ?? 0)
    if (!Number.isFinite(parsed) || parsed <= 0) return 10
    return Math.max(1, Math.min(1440, Math.trunc(parsed)))
  }, [selectedSecurityPolicy])

  useEffect(() => {
    if (!selectedTimeoutUser) return

    const userEmpresaId = String(
      selectedTimeoutUser.empresa_id
      ?? selectedTimeoutUser.user_roles?.find((role) => role?.empresa_id)?.empresa_id
      ?? '',
    ).trim()

    if (!userEmpresaId) return
    if (settingsForm.empresa_id === userEmpresaId) return

    setSettingsForm((state) => ({ ...state, empresa_id: userEmpresaId }))
  }, [selectedTimeoutUser, settingsForm.empresa_id])

  useEffect(() => {
    if (!settingsForm.empresa_id) return

    setUserInactivityTimeoutForm((state) => {
      if (state.user_id) return state
      const currentValue = Number(state.inactivity_timeout_minutes ?? 0)
      if (Number.isFinite(currentValue) && currentValue > 0 && Math.trunc(currentValue) === selectedCompanyInactivityMinutes) {
        return state
      }
      return {
        ...state,
        inactivity_timeout_minutes: String(selectedCompanyInactivityMinutes),
      }
    })
  }, [selectedCompanyInactivityMinutes, settingsForm.empresa_id])

  const clearFeedback = () => {
    setFeedback(null)
    setError(null)
    setCompanyCredentialNote(null)
  }

  const clearAllOwnerForms = useCallback(() => {
    setCreateCompanyForm(emptyCreateCompanyForm())
    setUpdateCompanyForm(emptyUpdateCompanyForm())
    setCreateUserForm(emptyCreateUserForm())
    setUserStatusForm(emptyUserStatusForm())
    setCreatePlanForm(emptyCreatePlanForm())
    setUpdatePlanForm(emptyUpdatePlanForm())
    setChangePlanForm(emptyChangePlanForm())
    setCreateSubscriptionForm(emptyCreateSubscriptionForm())
    setSubscriptionStatusForm(emptySubscriptionStatusForm())
    setBillingForm(emptyBillingForm())
    setContractForm(emptyContractForm())
    setContractOnlyId('')
    setSupportForm(emptySupportForm())
    setSettingsForm(emptySettingsForm())
    setUserInactivityTimeoutForm(emptyUserInactivityTimeoutForm())
    setOwnerMasterForm(emptyOwnerMasterForm())
    setSystemForm(emptySystemForm())
    setSelectedTenantTables([])
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return

    const forceClearAutofill = () => {
      const fields = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')
      fields.forEach((field) => {
        if (field instanceof HTMLInputElement) {
          if (['checkbox', 'radio', 'hidden', 'button', 'submit'].includes(field.type)) return
          if (!field.value) return
          field.value = ''
        } else if (field instanceof HTMLTextAreaElement) {
          if (!field.value) return
          field.value = ''
        } else if (field instanceof HTMLSelectElement) {
          if (field.selectedIndex <= 0) return
          field.selectedIndex = 0
        }

        field.dispatchEvent(new Event('input', { bubbles: true }))
        field.dispatchEvent(new Event('change', { bubbles: true }))
      })
    }

    clearAllOwnerForms()
    const timeoutFast = window.setTimeout(forceClearAutofill, 80)
    const timeoutLate = window.setTimeout(forceClearAutofill, 350)

    return () => {
      window.clearTimeout(timeoutFast)
      window.clearTimeout(timeoutLate)
    }
  }, [clearAllOwnerForms])

  useEffect(() => {
    if (!isDeleteCompanyOverlayVisible) return

    setDeleteCompanyElapsedSeconds(0)
    const stageTimer = window.setInterval(() => {
      setDeleteCompanyStageIndex((current) => Math.min(current + 1, DELETE_COMPANY_STAGES.length - 2))
    }, 1400)
    const elapsedTimer = window.setInterval(() => {
      setDeleteCompanyElapsedSeconds((seconds) => seconds + 1)
    }, 1000)

    return () => {
      window.clearInterval(stageTimer)
      window.clearInterval(elapsedTimer)
    }
  }, [isDeleteCompanyOverlayVisible])

  useEffect(() => {
    if (!isCreateCompanyOverlayVisible) return

    setCreateCompanyElapsedSeconds(0)
    const stageTimer = window.setInterval(() => {
      setCreateCompanyStageIndex((current) => Math.min(current + 1, CREATE_COMPANY_STAGES.length - 2))
    }, 1400)
    const elapsedTimer = window.setInterval(() => {
      setCreateCompanyElapsedSeconds((seconds) => seconds + 1)
    }, 1000)

    return () => {
      window.clearInterval(stageTimer)
      window.clearInterval(elapsedTimer)
    }
  }, [isCreateCompanyOverlayVisible])

  const beginDeleteCompanyOverlay = (empresaId: string) => {
    setDeleteCompanyTargetEmpresaId(empresaId)
    setDeleteCompanyStageIndex(0)
    setDeleteCompanyElapsedSeconds(0)
    setIsDeleteCompanyOverlayVisible(true)
  }

  const completeDeleteCompanyOverlay = () => {
    setDeleteCompanyStageIndex(DELETE_COMPANY_STAGES.length - 1)
  }

  const closeDeleteCompanyOverlay = () => {
    setIsDeleteCompanyOverlayVisible(false)
    setDeleteCompanyStageIndex(0)
    setDeleteCompanyElapsedSeconds(0)
    setDeleteCompanyTargetEmpresaId('')
  }

  const openDeleteCompanyDialog = (company: { id: string; nome?: string; slug?: string }) => {
    const companyLabel = String(company.nome || company.slug || company.id)
    setDeleteCompanyDialogCompanyId(company.id)
    setDeleteCompanyDialogCompanyLabel(companyLabel)
    setDeleteCompanyDialogConfirmText('')
    setDeleteCompanyDialogPassword('')
  }

  const closeDeleteCompanyDialog = () => {
    setDeleteCompanyDialogCompanyId('')
    setDeleteCompanyDialogCompanyLabel('')
    setDeleteCompanyDialogConfirmText('')
    setDeleteCompanyDialogPassword('')
  }

  const openCreateCompanyDialog = () => {
    if (!canCreateCompanySubmit) {
      setError('Preencha os campos obrigatorios da criacao com dados validos antes de continuar.')
      return
    }

    setIsCreateCompanyDialogVisible(true)
    setCreateCompanyDialogConfirmText('')
    setCreateCompanyDialogPassword('')
  }

  const closeCreateCompanyDialog = () => {
    setIsCreateCompanyDialogVisible(false)
    setCreateCompanyDialogConfirmText('')
    setCreateCompanyDialogPassword('')
  }

  useEffect(() => {
    if (!isDeleteCompanyDialogVisible) return

    // Double reset to neutralize aggressive browser autofill in password fields.
    setDeleteCompanyDialogConfirmText('')
    setDeleteCompanyDialogPassword('')
    const timer = window.setTimeout(() => {
      setDeleteCompanyDialogConfirmText('')
      setDeleteCompanyDialogPassword('')
    }, 80)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isDeleteCompanyDialogVisible, deleteCompanyDialogCompanyId])

  useEffect(() => {
    if (!isCreateCompanyDialogVisible) return

    setCreateCompanyDialogConfirmText('')
    setCreateCompanyDialogPassword('')
    const timer = window.setTimeout(() => {
      setCreateCompanyDialogConfirmText('')
      setCreateCompanyDialogPassword('')
    }, 80)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isCreateCompanyDialogVisible, createCompanyNameLabel])

  const closeDeleteOverlayWithMinimumDelay = (startedAt: number, minimumVisibleMs = 1200) => {
    const elapsed = Date.now() - startedAt
    const remaining = Math.max(250, minimumVisibleMs - elapsed)
    window.setTimeout(() => {
      closeDeleteCompanyOverlay()
    }, remaining)
  }

  const beginCreateCompanyOverlay = (companyName: string) => {
    setCreateCompanyTargetName(companyName)
    setCreateCompanyStageIndex(0)
    setCreateCompanyElapsedSeconds(0)
    setIsCreateCompanyOverlayVisible(true)
  }

  const completeCreateCompanyOverlay = () => {
    setCreateCompanyStageIndex(CREATE_COMPANY_STAGES.length - 1)
  }

  const closeCreateCompanyOverlay = () => {
    setIsCreateCompanyOverlayVisible(false)
    setCreateCompanyStageIndex(0)
    setCreateCompanyElapsedSeconds(0)
    setCreateCompanyTargetName('')
  }

  const closeCreateOverlayWithMinimumDelay = (startedAt: number, minimumVisibleMs = 1200) => {
    const elapsed = Date.now() - startedAt
    const remaining = Math.max(250, minimumVisibleMs - elapsed)
    window.setTimeout(() => {
      closeCreateCompanyOverlay()
    }, remaining)
  }

  const buildCreateCompanyPayload = () => ({
    company: {
      nome: createCompanyForm.nome,
      slug: createCompanyForm.slug || undefined,
      razao_social: createCompanyForm.razao_social || undefined,
      nome_fantasia: createCompanyForm.nome_fantasia || undefined,
      cnpj: createCompanyForm.cnpj || undefined,
      endereco: createCompanyForm.endereco || undefined,
      telefone: createCompanyForm.telefone || undefined,
      email: createCompanyForm.email || undefined,
      responsavel: createCompanyForm.responsavel || undefined,
      segmento: createCompanyForm.segmento || undefined,
    },
    user: {
      nome: createCompanyForm.admin_nome || 'Administrador',
      email: normalizeEmail(createCompanyForm.admin_email),
      role: 'ADMIN',
    },
  })

  const prepareCompanyForEdit = (company: { id: string; nome?: string; status?: string }) => {
    setUpdateCompanyForm({
      empresa_id: company.id,
      nome: String(company.nome || ''),
      status: resolveCompanyStatus(company.status),
    })
    setFeedback(`Empresa ${company.nome || company.id} carregada para edicao.`)
    setError(null)
  }

  const handleDeleteCompanyFromList = async (company: { id: string; nome?: string; slug?: string }) => {
    clearFeedback()

    openDeleteCompanyDialog(company)
  }

  const confirmDeleteCompanyFromDialog = async () => {
    clearFeedback()

    if (!deleteCompanyDialogCompanyId || !deleteCompanyDialogCompanyLabel) {
      setError('Empresa alvo nao encontrada para exclusao.')
      return
    }

    if (deleteCompanyDialogConfirmText.trim() !== deleteCompanyExpectedPhrase) {
      setError('Confirmacao invalida. Digite exatamente a frase de confirmacao.')
      return
    }

    if (!deleteCompanyDialogPassword.trim()) {
      setError('Senha de confirmacao obrigatoria para excluir empresa.')
      return
    }

    const companyId = deleteCompanyDialogCompanyId
    const companyLabel = deleteCompanyDialogCompanyLabel
    const authPassword = deleteCompanyDialogPassword
    closeDeleteCompanyDialog()

    await runOwnerMasterAction(async () => {
      beginDeleteCompanyOverlay(companyId)
      const startedAt = Date.now()
      try {
        const output = await deleteCompanyByOwnerMutation.mutateAsync({
          empresa_id: companyId,
          auth_password: authPassword,
        })
        setSystemActionOutput(output)
        completeDeleteCompanyOverlay()

        if (updateCompanyForm.empresa_id === companyId) {
          setUpdateCompanyForm({ empresa_id: '', nome: '', status: 'active' })
        }

        return output
      } finally {
        closeDeleteOverlayWithMinimumDelay(startedAt)
      }
    }, `Empresa ${companyLabel} excluida definitivamente com purge total do tenant.`)
  }

  const executeCreateCompany = async () => {
    clearFeedback()

    const normalizedAdminEmail = normalizeEmail(createCompanyForm.admin_email)
    const normalizedOperationalEmail = normalizeEmail(createCompanyForm.email)

    if (!isValidEmail(normalizedAdminEmail)) {
      setError('Email do administrador invalido. Use um email completo (ex.: admin@empresa.com).')
      return
    }

    if (normalizedOperationalEmail && !isValidEmail(normalizedOperationalEmail)) {
      setError('Email operacional invalido. Use um email completo ou deixe o campo em branco.')
      return
    }

    try {
      const response = await createCompanyMutation.mutateAsync(buildCreateCompanyPayload()) as any
      const createdCompany = response?.company ?? {}
      const masterUser = response?.master_user ?? {}
      const initialPassword = String(masterUser?.initial_password ?? '').trim()
      const companySlug = String(createdCompany?.slug ?? '').trim()
      const companyName = String(createdCompany?.nome ?? createCompanyForm.nome).trim()
      const masterEmail = String(masterUser?.email ?? normalizedAdminEmail).trim().toLowerCase()

      const resolvedHost = await resolveOrRepairTenantHost({
        tenantId: String(createdCompany?.id ?? ''),
        tenantBaseDomain: TENANT_BASE_DOMAIN,
        slugHint: companySlug || undefined,
      })

      const loginHost = resolvedHost || (companySlug ? `${companySlug}.${TENANT_BASE_DOMAIN}` : '')
      const loginUrl = loginHost
        ? `https://${loginHost}/login`
        : `https://${TENANT_BASE_DOMAIN}/login`

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

      if (response?.warning) {
        clearAllOwnerForms()
        setFeedback(`Empresa criada com alerta: ${String(response.warning)}`)
        return
      }

      clearAllOwnerForms()
      setFeedback(initialPassword ? 'Empresa criada com sucesso. Credenciais iniciais disponiveis para copia.' : 'Empresa criada com sucesso.')
    } catch (err: any) {
      const rawMessage = String(err?.message ?? err ?? 'Falha na operacao.')
      const normalized = rawMessage.toLowerCase()

      if (normalized.includes('non-2xx')) {
        setError(
          'A edge function owner-portal-admin retornou erro sem detalhe (non-2xx). Verifique permissao de owner master, senha de confirmacao e logs da edge function para o action executado.',
        )
        return
      }

      if (normalized.includes('forbidden') || normalized.includes('owner master only')) {
        setError('Operacao restrita ao owner master.')
        return
      }

      setError(rawMessage)
    }
  }

  const handleCreateCompany = async () => {
    clearFeedback()

    if (!canCreateCompanySubmit) {
      setError('Preencha os campos obrigatorios da criacao com dados validos antes de continuar.')
      return
    }

    if (!createCompanyExpectedPhrase || createCompanyDialogConfirmText.trim() !== createCompanyExpectedPhrase) {
      setError('Confirmacao invalida. Digite exatamente a frase de confirmacao.')
      return
    }

    if (!createCompanyDialogPassword.trim()) {
      setError('Senha de confirmacao obrigatoria para criar empresa.')
      return
    }

    closeCreateCompanyDialog()
    beginCreateCompanyOverlay(createCompanyNameLabel)
    const startedAt = Date.now()
    try {
      await executeCreateCompany()
      completeCreateCompanyOverlay()
    } finally {
      closeCreateOverlayWithMinimumDelay(startedAt)
    }
  }

  const copyCompanyCredentialNote = async () => {
    if (!companyCredentialNote) return
    if (!navigator?.clipboard?.writeText) {
      setError('Clipboard indisponivel neste navegador/contexto.')
      return
    }

    try {
      await navigator.clipboard.writeText(companyCredentialNote.noteText)
      setFeedback('Nota de credenciais copiada para a area de transferencia.')
      setError(null)
    } catch {
      setError('Nao foi possivel copiar a nota automaticamente. Tente copiar manualmente.')
    }
  }

  const runAction = async (fn: () => Promise<unknown>, success: string) => {
    clearFeedback()
    try {
      await fn()
      clearAllOwnerForms()
      setFeedback(success)
    } catch (err: any) {
      const rawMessage = String(err?.message ?? err ?? 'Falha na operacao.')
      const normalized = rawMessage.toLowerCase()

      if (normalized.includes('non-2xx')) {
        setError(
          'A edge function owner-portal-admin retornou erro sem detalhe (non-2xx). Verifique permissao de owner master, senha de confirmacao e logs da edge function para o action executado.',
        )
        return
      }

      if (normalized.includes('forbidden') || normalized.includes('owner master only')) {
        setError('Operacao restrita ao owner master.')
        return
      }

      setError(rawMessage)
    }
  }

  const runOwnerMasterAction = async (fn: () => Promise<unknown>, success: string) => {
    await runAction(fn, success)
  }

  const parseOptionalNumber = (rawValue: string, fieldLabel: string) => {
    const normalized = rawValue.trim().replace(',', '.')
    if (!normalized) return undefined
    const parsed = Number(normalized)
    if (!Number.isFinite(parsed)) {
      throw new Error(`Campo ${fieldLabel} invalido. Informe um numero valido.`)
    }
    return parsed
  }

  const parseRequiredNumber = (rawValue: string, fieldLabel: string) => {
    const parsed = parseOptionalNumber(rawValue, fieldLabel)
    if (parsed === undefined) {
      throw new Error(`Campo ${fieldLabel} obrigatorio.`)
    }
    return parsed
  }

  const parseJsonObjectInput = (rawValue: string, fieldLabel: string) => {
    const source = rawValue.trim() || '{}'
    let parsed: unknown
    try {
      parsed = JSON.parse(source)
    } catch {
      throw new Error(`Campo ${fieldLabel} deve conter JSON valido.`)
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`Campo ${fieldLabel} deve ser um objeto JSON.`)
    }

    return parsed as Record<string, unknown>
  }

  const parseJsonArrayInput = (rawValue: string, fieldLabel: string) => {
    const source = rawValue.trim() || '[]'
    let parsed: unknown
    try {
      parsed = JSON.parse(source)
    } catch {
      throw new Error(`Campo ${fieldLabel} deve conter JSON valido.`)
    }

    if (!Array.isArray(parsed)) {
      throw new Error(`Campo ${fieldLabel} deve ser um array JSON.`)
    }

    return parsed
  }

  const buildPlanPayload = (form: {
    code: string
    name: string
    description: string
    price_month: string
    user_limit: string
    data_limit_mb: string
    company_limit: string
    module_flags_json: string
    premium_features_json: string
    active: boolean
  }) => {
    const code = form.code.trim().toUpperCase()
    const name = form.name.trim()
    if (!code) throw new Error('Campo codigo do plano obrigatorio.')
    if (!name) throw new Error('Campo nome do plano obrigatorio.')

    return {
      code,
      name,
      description: form.description.trim() || undefined,
      price_month: parseRequiredNumber(form.price_month, 'Preco mensal'),
      user_limit: parseRequiredNumber(form.user_limit, 'Limite de usuarios'),
      data_limit_mb: parseRequiredNumber(form.data_limit_mb, 'Limite de storage (MB)'),
      company_limit: parseOptionalNumber(form.company_limit, 'Limite de empresas'),
      module_flags: parseJsonObjectInput(form.module_flags_json, 'Modulos (JSON)'),
      premium_features: parseJsonArrayInput(form.premium_features_json, 'Recursos premium (JSON)'),
      active: Boolean(form.active),
    }
  }

  const navItems = useMemo(
    () => [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'empresas', label: 'Empresas' },
      { key: 'usuarios', label: 'Usuarios' },
      { key: 'planos', label: 'Planos' },
      { key: 'assinaturas', label: 'Assinaturas' },
      { key: 'contratos', label: 'Contratos' },
      { key: 'auditoria', label: 'Auditoria' },
      { key: 'sistema', label: 'Sistema' },
      { key: 'suporte', label: `Suporte${supportResumo.unreadOwnerMessages > 0 ? ` (${supportResumo.unreadOwnerMessages})` : ''}` },
      { key: 'financeiro', label: 'Financeiro' },
      { key: 'feature-flags', label: 'Feature Flags' },
      { key: 'monitoramento', label: 'Monitoramento' },
      { key: 'logs', label: 'Logs' },
      { key: 'configuracoes', label: 'Configuracoes' },
      ...(isOwnerMaster ? [{ key: 'owner-master', label: 'Owner Master' }] : []),
    ],
    [isOwnerMaster, supportResumo.unreadOwnerMessages],
  )

  const moduleSubtitle = useMemo(() => {
    const map: Record<string, string> = {
      dashboard: 'Visao executiva do ecossistema multiempresa.',
      empresas: 'Cadastro, operacao e governanca de tenants.',
      usuarios: 'Gestao de usuarios globais e RBAC.',
      planos: 'Catalogo comercial de planos e limites.',
      assinaturas: 'Ciclo de vida de assinaturas e cobranca.',
      contratos: 'Contratos, versoes e compliance comercial.',
      auditoria: 'Trilha de auditoria e rastreabilidade.',
      sistema: 'Operacoes sensiveis e controles de plataforma.',
      suporte: 'Atendimento de chamados e respostas owner.',
      financeiro: 'Receita recorrente, churn e faturamento.',
      'feature-flags': 'Ativacao progressiva de funcionalidades.',
      monitoramento: 'Saude operacional e alertas do ambiente.',
      logs: 'Logs tecnicos e eventos de integracao.',
      configuracoes: 'Parametros por empresa e controles globais.',
      'owner-master': 'Governanca critica de superusuarios da plataforma.',
    }

    return map[active] ?? 'Controle global multiempresa.'
  }, [active])

  const backendCompatibility = useMemo(() => {
    if (backendHealthError) {
      return {
        healthy: false,
        message: String((backendHealthError as any)?.message ?? 'Falha ao validar backend owner.'),
      }
    }

    if (!backendHealth) {
      return {
        healthy: true,
        message: 'Compatibilidade do backend owner em verificacao.',
      }
    }

    const requiredCore = [
      'dashboard',
      'list_companies',
      'list_users',
      'list_plans',
      'list_subscriptions',
      'list_contracts',
      'list_audit_logs',
      'list_support_tickets',
    ]

    const supported = new Set(toArray<string>(backendHealth.supported_actions))
    const missingCore = requiredCore.filter((action) => !supported.has(action))

    if (missingCore.length > 0) {
      return {
        healthy: false,
        message: `Backend owner sem acoes core: ${missingCore.join(', ')}.`,
      }
    }

    return {
      healthy: true,
      message: `Versao backend: ${backendHealth.version}`,
    }
  }, [backendHealth, backendHealthError])

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isSystemOwner) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-xl border border-destructive/40 bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldCheck className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Acesso negado</h2>
          <p className="mt-2 text-sm text-muted-foreground">Este portal global e exclusivo para o perfil SYSTEM_OWNER.</p>
        </div>
      </div>
    )
  }

  return (
    <OwnerPortalLayout
      title="Owner Portal"
      subtitle={moduleSubtitle}
      navItems={navItems}
      activeKey={active}
      onNavigate={(key) => {
        setActive(key as OwnerTab)
        clearFeedback()
      }}
      backendHealthy={backendCompatibility.healthy}
      backendStatusMessage={backendCompatibility.message}
      pollingPaused={!isDocumentVisible && (active === 'monitoramento' || active === 'sistema')}
    >
      {active === 'dashboard' && (
        <div className="space-y-4">
          <Card title="Dashboard" subtitle="Visao geral da plataforma">
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="Empresas" value={Number((statsData as any)?.total_companies ?? companies.length)} />
              <Metric label="Usuarios" value={Number((statsData as any)?.total_users ?? users.length)} />
              <Metric label="Assinaturas ativas" value={Number((statsData as any)?.active_subscriptions ?? subscriptions.filter((s) => s.status === 'ativa').length)} />
              <Metric label="MRR" value={Number((statsData as any)?.mrr ?? 0)} />
            </div>
          </Card>

          <Card title="Analitico" subtitle="Distribuicao operacional de empresas e assinaturas">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-64 rounded border border-slate-800 bg-slate-950 p-2">
                <p className="px-2 pt-1 text-xs text-slate-400">Empresas por status</p>
                <ResponsiveContainer width="100%" height="92%">
                  <BarChart data={companyStatusChartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="h-64 rounded border border-slate-800 bg-slate-950 p-2">
                <p className="px-2 pt-1 text-xs text-slate-400">Assinaturas por status</p>
                <ResponsiveContainer width="100%" height="92%">
                  <PieChart>
                    <Tooltip />
                    <Pie data={subscriptionStatusChartData} dataKey="value" nameKey="name" outerRadius={90} fill="#3b82f6" label />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>
      )}

      {active === 'empresas' && (
        <div className="space-y-4">
          <Card title="Criar empresa" subtitle="Fluxo completo de onboarding: empresa, dados base e administrador inicial.">
            <div className="grid gap-2 md:grid-cols-4">
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome" value={createCompanyForm.nome} onChange={(e) => setCreateCompanyForm((s) => ({ ...s, nome: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Slug" value={createCompanyForm.slug} onChange={(e) => setCreateCompanyForm((s) => ({ ...s, slug: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome admin" value={createCompanyForm.admin_nome} onChange={(e) => setCreateCompanyForm((s) => ({ ...s, admin_nome: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" type="email" placeholder="Email admin" value={createCompanyForm.admin_email} onChange={(e) => setCreateCompanyForm((s) => ({ ...s, admin_email: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Razao social" value={createCompanyForm.razao_social} onChange={(e) => setCreateCompanyForm((s) => ({ ...s, razao_social: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome fantasia" value={createCompanyForm.nome_fantasia} onChange={(e) => setCreateCompanyForm((s) => ({ ...s, nome_fantasia: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="CNPJ" value={createCompanyForm.cnpj} onChange={(e) => setCreateCompanyForm((s) => ({ ...s, cnpj: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Telefone" value={createCompanyForm.telefone} onChange={(e) => setCreateCompanyForm((s) => ({ ...s, telefone: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm md:col-span-2" placeholder="Endereco" value={createCompanyForm.endereco} onChange={(e) => setCreateCompanyForm((s) => ({ ...s, endereco: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" type="email" placeholder="Email operacional" value={createCompanyForm.email} onChange={(e) => setCreateCompanyForm((s) => ({ ...s, email: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Responsavel" value={createCompanyForm.responsavel} onChange={(e) => setCreateCompanyForm((s) => ({ ...s, responsavel: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Segmento" value={createCompanyForm.segmento} onChange={(e) => setCreateCompanyForm((s) => ({ ...s, segmento: e.target.value }))} />
            </div>
            <button
              className="mt-3 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              disabled={
                !canCreateCompanySubmit
              }
              onClick={openCreateCompanyDialog}
            >
              Criar empresa
            </button>

            {companyCredentialNote && (
              <div className="mt-4 rounded-lg border border-slate-600 bg-slate-950 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">Credenciais iniciais do cliente</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">Essa informacao e exibida apenas agora. Copie e envie para o cliente em canal seguro.</p>
                <pre className="mt-3 overflow-x-auto rounded border border-slate-700 bg-[#050b16] p-3 text-xs leading-relaxed text-slate-100 whitespace-pre-wrap">{companyCredentialNote.noteText}</pre>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="rounded border border-sky-500 bg-sky-900/30 px-3 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-900/45" onClick={copyCompanyCredentialNote}>Copiar nota</button>
                  <a className="rounded border border-slate-500 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700" href={companyCredentialNote.loginUrl} target="_blank" rel="noreferrer">Abrir login do cliente</a>
                </div>
              </div>
            )}
          </Card>

          <Card title="Atualizar empresa">
            <div className="grid gap-2 md:grid-cols-3">
              <select
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                value={updateCompanyForm.empresa_id}
                onChange={(e) => {
                  const selectedId = e.target.value
                  const selectedCompany = companies.find((company) => company.id === selectedId)
                  setUpdateCompanyForm((s) => ({
                    ...s,
                    empresa_id: selectedId,
                    nome: selectedCompany?.nome || '',
                    status: resolveCompanyStatus(selectedCompany?.status),
                  }))
                }}
              >
                <option value="">Selecione empresa</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome || c.slug || c.id}
                  </option>
                ))}
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Novo nome" value={updateCompanyForm.nome} onChange={(e) => setUpdateCompanyForm((s) => ({ ...s, nome: e.target.value }))} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={updateCompanyForm.status} onChange={(e) => setUpdateCompanyForm((s) => ({ ...s, status: e.target.value }))}>
                <option value="">Selecione status</option>
                <option value="active">Ativa</option>
                <option value="blocked">Bloqueada</option>
                <option value="suspended">Suspensa</option>
              </select>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!updateCompanyForm.empresa_id || updateCompanyMutation.isPending} onClick={() => runAction(async () => {
                const response = await updateCompanyMutation.mutateAsync({ empresaId: updateCompanyForm.empresa_id, company: { nome: updateCompanyForm.nome || undefined } })
                setUpdateCompanyForm((s) => ({ ...s, nome: '' }))
                return response
              }, 'Empresa atualizada.')}>Salvar</button>
              <button className="rounded border border-amber-500 px-3 py-2 text-sm text-amber-300" disabled={!updateCompanyForm.empresa_id || !updateCompanyForm.status || setCompanyLifecycle.isPending} onClick={() => runAction(() => setCompanyLifecycle.mutateAsync({ empresaId: updateCompanyForm.empresa_id, status: updateCompanyForm.status }), 'Status da empresa atualizado.')}>Aplicar status</button>
            </div>
          </Card>

          <Card title="Empresas globais">
            <div className="max-h-72 overflow-auto rounded border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-950">
                  <tr>
                    <th className="px-3 py-2 text-left">Empresa</th>
                    <th className="px-3 py-2 text-left">Slug</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id} className="border-t border-slate-800">
                      <td className="px-3 py-2">{c.nome || c.id}</td>
                      <td className="px-3 py-2">{c.slug || '-'}</td>
                      <td className="px-3 py-2">{c.status || '-'}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded border border-slate-600 px-2 py-1 text-[11px]"
                            onClick={() => prepareCompanyForEdit(c)}
                          >
                            Editar
                          </button>
                          <button
                            className="rounded border border-amber-500 px-2 py-1 text-[11px] text-amber-300"
                            disabled={setCompanyLifecycle.isPending}
                            onClick={() => {
                              const nextStatus = resolveCompanyStatus(c.status) === 'active' ? 'blocked' : 'active'
                              runAction(
                                () => setCompanyLifecycle.mutateAsync({ empresaId: c.id, status: nextStatus }),
                                `Status da empresa ${c.nome || c.id} alterado para ${nextStatus}.`,
                              )
                            }}
                          >
                            Alterar
                          </button>
                          <button
                            className="rounded border border-rose-600 px-2 py-1 text-[11px] text-rose-300"
                            disabled={deleteCompanyByOwnerMutation.isPending}
                            onClick={() => handleDeleteCompanyFromList(c)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {isLoadingCompanies && (
                    <tr>
                      <td className="px-3 py-3 text-slate-400" colSpan={4}>Carregando empresas...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-rose-300">Excluir empresa executa purge definitivo do tenant: remove historico, contratos, assinaturas, usuarios, perfis, metadata Auth e todos os registros vinculados.</p>
          </Card>
        </div>
      )}

      {active === 'usuarios' && (
        <div className="space-y-4">
          <Card title="Criar usuario">
            <div className="grid gap-2 md:grid-cols-5">
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome" value={createUserForm.nome} onChange={(e) => setCreateUserForm((s) => ({ ...s, nome: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" type="email" placeholder="Email" value={createUserForm.email} onChange={(e) => setCreateUserForm((s) => ({ ...s, email: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" type="password" placeholder="Senha" value={createUserForm.password} onChange={(e) => setCreateUserForm((s) => ({ ...s, password: e.target.value }))} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={createUserForm.role} onChange={(e) => setCreateUserForm((s) => ({ ...s, role: e.target.value }))}>
                <option value="">Perfil</option>
                <option value="ADMIN">ADMIN</option>
                <option value="GESTOR">GESTOR</option>
                <option value="TECNICO">TECNICO</option>
                <option value="USUARIO">USUARIO</option>
                <option value="SOLICITANTE">SOLICITANTE</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={createUserForm.empresa_id} onChange={(e) => setCreateUserForm((s) => ({ ...s, empresa_id: e.target.value }))}>
                <option value="">Empresa</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome || c.id}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="mt-3 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              disabled={createUserMutation.isPending || !createUserForm.nome || !isValidEmail(createUserForm.email) || !createUserForm.role || !createUserForm.empresa_id}
              onClick={() =>
                isValidEmail(createUserForm.email)
                  ? runAction(
                      () =>
                        createUserMutation.mutateAsync({
                          nome: createUserForm.nome || 'Usuario',
                          email: normalizeEmail(createUserForm.email),
                          password: createUserForm.password || undefined,
                          role: createUserForm.role,
                          empresa_id: createUserForm.empresa_id || undefined,
                        }),
                      'Usuario criado com sucesso.',
                    )
                  : setError('Email de usuario invalido. Use um email completo (ex.: usuario@empresa.com).')
              }
            >
              Criar usuario
            </button>
          </Card>

          <Card title="Alterar status do usuario">
            <div className="grid gap-2 md:grid-cols-3">
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={userStatusForm.user_id} onChange={(e) => setUserStatusForm((s) => ({ ...s, user_id: e.target.value }))}>
                <option value="">Selecione usuario</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome || u.email || u.id}
                  </option>
                ))}
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={userStatusForm.status} onChange={(e) => setUserStatusForm((s) => ({ ...s, status: e.target.value }))}>
                <option value="">Selecione status</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
              <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!userStatusForm.user_id || !userStatusForm.status || setUserStatusMutation.isPending} onClick={() => runAction(() => setUserStatusMutation.mutateAsync({ userId: userStatusForm.user_id, status: userStatusForm.status }), 'Status do usuario atualizado.')}>Aplicar</button>
            </div>
          </Card>

          <Card title="Usuarios globais">
            <div className="max-h-72 overflow-auto rounded border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-950">
                  <tr>
                    <th className="px-3 py-2 text-left">Nome</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Empresa</th>
                    <th className="px-3 py-2 text-left">Papeis</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-slate-800">
                      <td className="px-3 py-2">{u.nome || '-'}</td>
                      <td className="px-3 py-2">{u.email || '-'}</td>
                      <td className="px-3 py-2">{companies.find((company) => company.id === u.empresa_id)?.nome || u.empresa_id || '-'}</td>
                      <td className="px-3 py-2">{(u.user_roles || []).map((roleItem) => roleItem.role).join(', ') || '-'}</td>
                      <td className="px-3 py-2">{u.status || '-'}</td>
                    </tr>
                  ))}
                  {isLoadingUsers && (
                    <tr>
                      <td className="px-3 py-3 text-slate-400" colSpan={5}>Carregando usuarios...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {active === 'planos' && (
        <div className="space-y-4">
          <Card title="Criar plano">
            <div className="grid gap-2 md:grid-cols-4">
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Codigo" value={createPlanForm.code} onChange={(e) => setCreatePlanForm((s) => ({ ...s, code: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome" value={createPlanForm.name} onChange={(e) => setCreatePlanForm((s) => ({ ...s, name: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Limite usuarios" value={createPlanForm.user_limit} onChange={(e) => setCreatePlanForm((s) => ({ ...s, user_limit: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Preco mensal" value={createPlanForm.price_month} onChange={(e) => setCreatePlanForm((s) => ({ ...s, price_month: e.target.value }))} />
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-4">
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Storage MB" value={createPlanForm.data_limit_mb} onChange={(e) => setCreatePlanForm((s) => ({ ...s, data_limit_mb: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Limite empresas (opcional)" value={createPlanForm.company_limit} onChange={(e) => setCreatePlanForm((s) => ({ ...s, company_limit: e.target.value }))} />
              <label className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">
                <input type="checkbox" checked={createPlanForm.active} onChange={(e) => setCreatePlanForm((s) => ({ ...s, active: e.target.checked }))} />
                Plano ativo
              </label>
              <button className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" disabled={createPlanMutation.isPending || !createPlanForm.name || !createPlanForm.code} onClick={() => runAction(() => createPlanMutation.mutateAsync(buildPlanPayload(createPlanForm)), 'Plano criado com sucesso.')}>Criar plano</button>
            </div>
            <textarea className="mt-2 min-h-[70px] w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs" placeholder="Descricao" value={createPlanForm.description} onChange={(e) => setCreatePlanForm((s) => ({ ...s, description: e.target.value }))} />
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <textarea className="min-h-[90px] w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono" placeholder='Modulos JSON, ex: {"dashboard": true}' value={createPlanForm.module_flags_json} onChange={(e) => setCreatePlanForm((s) => ({ ...s, module_flags_json: e.target.value }))} />
              <textarea className="min-h-[90px] w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono" placeholder='Premium features JSON, ex: ["analytics"]' value={createPlanForm.premium_features_json} onChange={(e) => setCreatePlanForm((s) => ({ ...s, premium_features_json: e.target.value }))} />
            </div>
          </Card>

          <Card title="Atualizar plano">
            <div className="grid gap-2 md:grid-cols-4">
              <select
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                value={updatePlanForm.id}
                onChange={(e) => {
                  const selectedId = e.target.value
                  const selectedPlan = plans.find((plan) => plan.id === selectedId)
                  setUpdatePlanForm((s) => ({
                    ...s,
                    id: selectedId,
                    code: selectedPlan?.code || s.code,
                    name: selectedPlan?.name || s.name,
                    description: selectedPlan?.description || '',
                    price_month: selectedPlan?.price_month !== undefined ? String(selectedPlan.price_month) : s.price_month,
                    user_limit: selectedPlan?.user_limit !== undefined ? String(selectedPlan.user_limit) : '',
                    data_limit_mb: selectedPlan?.data_limit_mb !== undefined ? String(selectedPlan.data_limit_mb) : '',
                    company_limit: selectedPlan?.company_limit !== undefined && selectedPlan?.company_limit !== null ? String(selectedPlan.company_limit) : '',
                    module_flags_json: JSON.stringify(selectedPlan?.module_flags ?? {}, null, 2),
                    premium_features_json: JSON.stringify(selectedPlan?.premium_features ?? [], null, 2),
                    active: selectedPlan?.active !== false,
                  }))
                }}
              >
                <option value="">Selecione plano</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.code || p.id}
                  </option>
                ))}
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Novo codigo" value={updatePlanForm.code} onChange={(e) => setUpdatePlanForm((s) => ({ ...s, code: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Novo nome" value={updatePlanForm.name} onChange={(e) => setUpdatePlanForm((s) => ({ ...s, name: e.target.value }))} />
              <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!updatePlanForm.id || updatePlanMutation.isPending} onClick={() => runAction(() => updatePlanMutation.mutateAsync({ id: updatePlanForm.id, ...buildPlanPayload(updatePlanForm) }), 'Plano atualizado com sucesso.')}>Salvar</button>
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-4">
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Preco mensal" value={updatePlanForm.price_month} onChange={(e) => setUpdatePlanForm((s) => ({ ...s, price_month: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Limite usuarios" value={updatePlanForm.user_limit} onChange={(e) => setUpdatePlanForm((s) => ({ ...s, user_limit: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Storage MB" value={updatePlanForm.data_limit_mb} onChange={(e) => setUpdatePlanForm((s) => ({ ...s, data_limit_mb: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Limite empresas (opcional)" value={updatePlanForm.company_limit} onChange={(e) => setUpdatePlanForm((s) => ({ ...s, company_limit: e.target.value }))} />
            </div>
            <textarea className="mt-2 min-h-[70px] w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs" placeholder="Descricao" value={updatePlanForm.description} onChange={(e) => setUpdatePlanForm((s) => ({ ...s, description: e.target.value }))} />
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <textarea className="min-h-[90px] w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono" placeholder='Modulos JSON, ex: {"dashboard": true}' value={updatePlanForm.module_flags_json} onChange={(e) => setUpdatePlanForm((s) => ({ ...s, module_flags_json: e.target.value }))} />
              <textarea className="min-h-[90px] w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono" placeholder='Premium features JSON, ex: ["analytics"]' value={updatePlanForm.premium_features_json} onChange={(e) => setUpdatePlanForm((s) => ({ ...s, premium_features_json: e.target.value }))} />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={updatePlanForm.active} onChange={(e) => setUpdatePlanForm((s) => ({ ...s, active: e.target.checked }))} />
                Plano ativo
              </label>
              <p className="text-xs text-slate-400">Ao selecionar um plano, todos os campos sao preenchidos automaticamente.</p>
            </div>
          </Card>

          <Card title="Planos cadastrados">
            <div className="max-h-72 overflow-auto rounded border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-950">
                  <tr>
                    <th className="px-3 py-2 text-left">Plano</th>
                    <th className="px-3 py-2 text-left">Codigo</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Limites</th>
                    <th className="px-3 py-2 text-right">Preco</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id} className="border-t border-slate-800">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-100">{p.name || '-'}</p>
                        <p className="text-[11px] text-slate-400">{p.description || 'Sem descricao'}</p>
                      </td>
                      <td className="px-3 py-2">{p.code || '-'}</td>
                      <td className="px-3 py-2">{p.active === false ? 'Inativo' : 'Ativo'}</td>
                      <td className="px-3 py-2">
                        U:{p.user_limit ?? '-'} | MB:{p.data_limit_mb ?? '-'} | Emp:{p.company_limit ?? 'Ilimitado'}
                      </td>
                      <td className="px-3 py-2 text-right">{Number(p.price_month || 0).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                  {isLoadingPlans && (
                    <tr>
                      <td className="px-3 py-3 text-slate-400" colSpan={5}>Carregando planos...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {active === 'assinaturas' && (
        <div className="space-y-4">
          <Card title="Criar assinatura">
            <div className="grid gap-2 md:grid-cols-4">
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={createSubscriptionForm.empresa_id} onChange={(e) => setCreateSubscriptionForm((s) => ({ ...s, empresa_id: e.target.value }))}>
                <option value="">Empresa</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome || c.id}
                  </option>
                ))}
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={createSubscriptionForm.plan_id} onChange={(e) => setCreateSubscriptionForm((s) => ({ ...s, plan_id: e.target.value }))}>
                <option value="">Plano</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.code || p.id}
                  </option>
                ))}
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Valor" value={createSubscriptionForm.amount} onChange={(e) => setCreateSubscriptionForm((s) => ({ ...s, amount: e.target.value }))} />
              <button className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" disabled={!createSubscriptionForm.empresa_id || !createSubscriptionForm.plan_id || createSubscriptionMutation.isPending} onClick={() => runAction(() => createSubscriptionMutation.mutateAsync({ empresa_id: createSubscriptionForm.empresa_id, plan_id: createSubscriptionForm.plan_id, amount: createSubscriptionForm.amount ? Number(createSubscriptionForm.amount) : undefined, status: createSubscriptionForm.status || undefined }), 'Assinatura criada com sucesso.')}>Criar assinatura</button>
            </div>
          </Card>

          <Card title="Alterar status da assinatura">
            <div className="grid gap-2 md:grid-cols-3">
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={subscriptionStatusForm.empresa_id} onChange={(e) => setSubscriptionStatusForm((s) => ({ ...s, empresa_id: e.target.value }))}>
                <option value="">Empresa</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome || c.id}
                  </option>
                ))}
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={subscriptionStatusForm.status} onChange={(e) => setSubscriptionStatusForm((s) => ({ ...s, status: e.target.value }))}>
                <option value="">Selecione status</option>
                <option value="ativa">Ativa</option>
                <option value="atrasada">Atrasada</option>
                <option value="cancelada">Cancelada</option>
                <option value="teste">Teste</option>
              </select>
              <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!subscriptionStatusForm.empresa_id || !subscriptionStatusForm.status || setSubscriptionStatusMutation.isPending} onClick={() => runAction(() => setSubscriptionStatusMutation.mutateAsync({ empresaId: subscriptionStatusForm.empresa_id, status: subscriptionStatusForm.status }), 'Status da assinatura atualizado.')}>Aplicar status</button>
            </div>
          </Card>

          <Card title="Trocar plano por codigo">
            <div className="grid gap-2 md:grid-cols-3">
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={changePlanForm.empresa_id} onChange={(e) => setChangePlanForm((s) => ({ ...s, empresa_id: e.target.value }))}>
                <option value="">Empresa</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome || c.id}
                  </option>
                ))}
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Codigo do plano" value={changePlanForm.plano_codigo} onChange={(e) => setChangePlanForm((s) => ({ ...s, plano_codigo: e.target.value }))} />
              <button className="rounded border border-amber-500 px-3 py-2 text-sm text-amber-300" disabled={!changePlanForm.empresa_id || !changePlanForm.plano_codigo || changePlan.isPending} onClick={() => runAction(() => changePlan.mutateAsync({ empresa_id: changePlanForm.empresa_id, plano_codigo: changePlanForm.plano_codigo }), 'Plano alterado com sucesso.')}>Trocar plano</button>
            </div>
          </Card>

          <Card title="Assinaturas cadastradas">
            <div className="max-h-72 overflow-auto rounded border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-950">
                  <tr>
                    <th className="px-3 py-2 text-left">Empresa</th>
                    <th className="px-3 py-2 text-left">Plano</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s) => (
                    <tr key={s.id} className="border-t border-slate-800">
                      <td className="px-3 py-2">{s.empresa_id || '-'}</td>
                      <td className="px-3 py-2">{s.plan_id || '-'}</td>
                      <td className="px-3 py-2">{s.status || '-'}</td>
                      <td className="px-3 py-2 text-right">{Number(s.amount || 0)}</td>
                    </tr>
                  ))}
                  {isLoadingSubscriptions && (
                    <tr>
                      <td className="px-3 py-3 text-slate-400" colSpan={4}>Carregando assinaturas...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {active === 'financeiro' && (
        <div className="space-y-4">
          <Card title="Financeiro" subtitle="Visao consolidada de receita, adimplencia e ajuste de cobranca.">
            <div className="grid gap-3 md:grid-cols-5">
              <Metric label="Total assinaturas" value={financeiroResumo.totalAssinaturas} />
              <Metric label="Ativas" value={financeiroResumo.ativas} />
              <Metric label="Pagas" value={financeiroResumo.pagas} />
              <Metric label="Atrasadas" value={financeiroResumo.atrasadas} />
              <Metric label="MRR" value={`R$ ${financeiroResumo.mrr.toLocaleString('pt-BR')}`} />
            </div>
          </Card>

          <Card title="Atualizacao de cobranca por assinatura">
            <div className="grid gap-2 md:grid-cols-4">
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Subscription ID" value={billingForm.subscription_id} onChange={(e) => setBillingForm((s) => ({ ...s, subscription_id: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Novo valor" value={billingForm.amount} onChange={(e) => setBillingForm((s) => ({ ...s, amount: e.target.value }))} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={billingForm.payment_status} onChange={(e) => setBillingForm((s) => ({ ...s, payment_status: e.target.value }))}>
                <option value="">Selecione pagamento</option>
                <option value="paid">Pago</option>
                <option value="pending">Pendente</option>
                <option value="late">Atrasado</option>
              </select>
              <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!billingForm.subscription_id || !billingForm.payment_status || updateSubscriptionBillingMutation.isPending} onClick={() => runAction(() => updateSubscriptionBillingMutation.mutateAsync({ subscriptionId: billingForm.subscription_id, billing: { amount: billingForm.amount ? Number(billingForm.amount) : undefined, payment_status: billingForm.payment_status } }), 'Cobranca atualizada com sucesso.')}>Atualizar cobranca</button>
            </div>
          </Card>

          <Card title="Assinaturas para acompanhamento financeiro">
            <div className="max-h-80 overflow-auto rounded border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-950">
                  <tr>
                    <th className="px-3 py-2 text-left">Assinatura</th>
                    <th className="px-3 py-2 text-left">Empresa</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Pagamento</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-t border-slate-800">
                      <td className="px-3 py-2">{sub.id}</td>
                      <td className="px-3 py-2">{companies.find((company) => company.id === sub.empresa_id)?.nome || sub.empresa_id || '-'}</td>
                      <td className="px-3 py-2">{sub.status || '-'}</td>
                      <td className="px-3 py-2">{sub.payment_status || '-'}</td>
                      <td className="px-3 py-2 text-right">{Number(sub.amount || 0).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                  {isLoadingSubscriptions && (
                    <tr>
                      <td className="px-3 py-3 text-slate-400" colSpan={5}>Carregando assinaturas...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {active === 'contratos' && (
        <div className="space-y-4">
          <Card title="Atualizar contrato">
            <div className="grid gap-2">
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Contract ID" value={contractForm.contract_id} onChange={(e) => setContractForm((s) => ({ ...s, contract_id: e.target.value }))} />
              <textarea className="min-h-[120px] rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Conteudo" value={contractForm.content} onChange={(e) => setContractForm((s) => ({ ...s, content: e.target.value }))} />
              <div className="grid gap-2 md:grid-cols-3">
                <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Resumo" value={contractForm.summary} onChange={(e) => setContractForm((s) => ({ ...s, summary: e.target.value }))} />
                <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Status" value={contractForm.status} onChange={(e) => setContractForm((s) => ({ ...s, status: e.target.value }))} />
                <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!contractForm.contract_id || updateContractMutation.isPending} onClick={() => runAction(() => updateContractMutation.mutateAsync({ contractId: contractForm.contract_id, content: contractForm.content, summary: contractForm.summary || undefined, status: contractForm.status || undefined }), 'Contrato atualizado com sucesso.')}>Salvar contrato</button>
              </div>
            </div>
          </Card>

          <Card title="Acoes de contrato">
            <div className="grid gap-2 md:grid-cols-3">
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Contract ID" value={contractOnlyId} onChange={(e) => setContractOnlyId(e.target.value)} />
              <button className="rounded border border-amber-500 px-3 py-2 text-sm text-amber-300" disabled={!contractOnlyId || regenerateContractMutation.isPending} onClick={() => runAction(() => regenerateContractMutation.mutateAsync(contractOnlyId), 'Contrato regenerado com sucesso.')}>Regenerar</button>
              <button className="rounded border border-rose-600 px-3 py-2 text-sm text-rose-300" disabled={!contractOnlyId || deleteContractMutation.isPending} onClick={() => runAction(() => deleteContractMutation.mutateAsync(contractOnlyId), 'Contrato removido com sucesso.')}>Excluir</button>
            </div>
          </Card>

          <Card title="Contratos cadastrados">
            <div className="max-h-72 overflow-auto rounded border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-950">
                  <tr>
                    <th className="px-3 py-2 text-left">Contrato</th>
                    <th className="px-3 py-2 text-left">Empresa</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Atualizado em</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => (
                    <tr key={c.id} className="border-t border-slate-800">
                      <td className="px-3 py-2">{c.id}</td>
                      <td className="px-3 py-2">{c.empresa_id || '-'}</td>
                      <td className="px-3 py-2">{c.status || '-'}</td>
                      <td className="px-3 py-2">{c.updated_at || '-'}</td>
                    </tr>
                  ))}
                  {isLoadingContracts && (
                    <tr>
                      <td className="px-3 py-3 text-slate-400" colSpan={4}>Carregando contratos...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {active === 'suporte' && (
        <div className="space-y-4">
          <Card title="Responder ticket">
            <div className="grid gap-2 md:grid-cols-4">
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={supportForm.ticket_id} onChange={(e) => setSupportForm((s) => ({ ...s, ticket_id: e.target.value }))}>
                <option value="">Ticket</option>
                {tickets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.subject || t.id}
                  </option>
                ))}
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Resposta" value={supportForm.response} onChange={(e) => setSupportForm((s) => ({ ...s, response: e.target.value }))} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={supportForm.status} onChange={(e) => setSupportForm((s) => ({ ...s, status: e.target.value }))}>
                <option value="">Selecione status</option>
                <option value="resolvido">Resolvido</option>
                <option value="em_andamento">Em andamento</option>
                <option value="aberto">Aberto</option>
              </select>
              <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!supportForm.ticket_id || !supportForm.response || !supportForm.status || respondSupportMutation.isPending} onClick={() => runAction(() => respondSupportMutation.mutateAsync({ ticketId: supportForm.ticket_id, response: supportForm.response, status: supportForm.status }), 'Ticket respondido com sucesso.')}>Responder</button>
            </div>
          </Card>

          <Card title="Chamados de suporte">
            <div className="max-h-72 overflow-auto rounded border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-950">
                  <tr>
                    <th className="px-3 py-2 text-left">Assunto</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Prioridade</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} className="border-t border-slate-800">
                      <td className="px-3 py-2">{t.subject || t.id}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span>{t.status || '-'}</span>
                          {Number(t.unread_owner_messages ?? 0) > 0 && (
                            <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                              {t.unread_owner_messages}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">{t.priority || '-'}</td>
                    </tr>
                  ))}
                  {isLoadingSupport && (
                    <tr>
                      <td className="px-3 py-3 text-slate-400" colSpan={3}>Carregando chamados...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {(active === 'auditoria' || active === 'logs') && (
        <Card title={active === 'auditoria' ? 'Auditoria' : 'Logs'} subtitle="Eventos e trilha tecnica da plataforma">
          <div className="mb-4 grid gap-2 md:grid-cols-4">
            <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={auditFilters.empresa_id} onChange={(e) => setAuditFilters((s) => ({ ...s, empresa_id: e.target.value }))}>
              <option value="">Empresa (todas)</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.nome || company.slug || company.id}</option>
              ))}
            </select>

            <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={auditFilters.user_id} onChange={(e) => setAuditFilters((s) => ({ ...s, user_id: e.target.value }))}>
              <option value="">Usuario (todos)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.nome || u.email || u.id}</option>
              ))}
            </select>

            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Modulo/origem (ex: owner)" value={auditFilters.module} onChange={(e) => setAuditFilters((s) => ({ ...s, module: e.target.value }))} />
            <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={auditFilters.severity} onChange={(e) => setAuditFilters((s) => ({ ...s, severity: e.target.value }))}>
              <option value="">Severidade (todas)</option>
              <option value="info">info</option>
              <option value="warning">warning</option>
              <option value="error">error</option>
              <option value="critical">critical</option>
            </select>

            <input type="datetime-local" className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={auditFilters.from} onChange={(e) => setAuditFilters((s) => ({ ...s, from: e.target.value }))} />
            <input type="datetime-local" className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={auditFilters.to} onChange={(e) => setAuditFilters((s) => ({ ...s, to: e.target.value }))} />
            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Acao exata (opcional)" value={auditFilters.action_type} onChange={(e) => setAuditFilters((s) => ({ ...s, action_type: e.target.value }))} />
            <button className="rounded border border-slate-600 px-3 py-2 text-sm" onClick={() => setAuditFilters({ empresa_id: '', user_id: '', module: '', from: '', to: '', action_type: '', severity: '' })}>Limpar filtros</button>
          </div>

          <div className="max-h-80 overflow-auto rounded border border-slate-800">
            <table className="w-full text-xs">
              <thead className="bg-slate-950">
                <tr>
                  <th className="px-3 py-2 text-left">Severidade</th>
                  <th className="px-3 py-2 text-left">Acao</th>
                  <th className="px-3 py-2 text-left">Origem</th>
                  <th className="px-3 py-2 text-left">Usuario</th>
                  <th className="px-3 py-2 text-left">Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="border-t border-slate-800">
                    <td className="px-3 py-2">{l.severity || '-'}</td>
                    <td className="px-3 py-2">{l.action_type || '-'}</td>
                    <td className="px-3 py-2">{l.source || '-'}</td>
                    <td className="px-3 py-2">{l.actor_email || l.actor_id || '-'}</td>
                    <td className="px-3 py-2">{l.created_at || '-'}</td>
                  </tr>
                ))}
                {isLoadingAudit && (
                  <tr>
                    <td className="px-3 py-3 text-slate-400" colSpan={5}>Carregando eventos...</td>
                  </tr>
                )}
                {!isLoadingAudit && filteredLogs.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-slate-400" colSpan={5}>Nenhum registro encontrado para os filtros aplicados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(active === 'configuracoes' || active === 'feature-flags') && (
        <div className="space-y-4">
          <Card
            title="Logout automático por usuário"
            subtitle="Selecione qualquer usuário do sistema. O timeout será aplicado para a empresa vinculada a ele."
          >
            <div className="grid gap-2 md:grid-cols-2">
              <select
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                value={userInactivityTimeoutForm.user_id}
                onChange={(e) => setUserInactivityTimeoutForm((s) => ({ ...s, user_id: e.target.value }))}
              >
                <option value="">Selecione usuário (qualquer permissão)</option>
                {usersWithCompany.map((u) => {
                  const userEmpresaId = String(
                    u.empresa_id
                    ?? u.user_roles?.find((role) => role?.empresa_id)?.empresa_id
                    ?? '',
                  ).trim()
                  const userCompany = companies.find((company) => company.id === userEmpresaId)
                  const userRoles = (u.user_roles ?? []).map((role) => String(role?.role ?? '').trim()).filter(Boolean)

                  return (
                    <option key={u.id} value={u.id}>
                      {u.nome || u.email || u.id} • {u.email || '-'} • {userCompany?.nome || userEmpresaId || 'sem empresa'} • {userRoles.join(', ') || 'sem role'}
                    </option>
                  )
                })}
              </select>

              <input
                type="number"
                min={1}
                max={1440}
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                placeholder="Minutos de inatividade"
                value={userInactivityTimeoutForm.inactivity_timeout_minutes}
                onChange={(e) => setUserInactivityTimeoutForm((s) => ({ ...s, inactivity_timeout_minutes: e.target.value }))}
              />

              <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400 md:col-span-2">
                Empresa alvo: {settingsForm.empresa_id || '-'} • Timeout atual: {selectedCompanyInactivityMinutes} min
              </div>

              <button
                className="rounded border border-emerald-500 px-3 py-2 text-sm text-emerald-300"
                disabled={!userInactivityTimeoutForm.user_id || !userInactivityTimeoutForm.inactivity_timeout_minutes || setUserInactivityTimeoutMutation.isPending}
                onClick={() => runAction(async () => {
                  const minutes = parseRequiredNumber(userInactivityTimeoutForm.inactivity_timeout_minutes, 'Timeout de inatividade (minutos)')
                  return setUserInactivityTimeoutMutation.mutateAsync({
                    userId: userInactivityTimeoutForm.user_id,
                    inactivityTimeoutMinutes: Math.max(1, Math.min(1440, Math.trunc(minutes))),
                  })
                }, 'Timeout de logout automático atualizado com sucesso.')}
              >
                Atualizar timeout por usuário
              </button>
            </div>
          </Card>

          <Card title={active === 'configuracoes' ? 'Configuracoes por empresa' : 'Feature Flags por empresa'}>
            <div className="grid gap-2">
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={settingsForm.empresa_id} onChange={(e) => setSettingsForm((s) => ({ ...s, empresa_id: e.target.value }))}>
                <option value="">Selecione empresa</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome || c.id}
                  </option>
                ))}
              </select>
              <textarea className="min-h-[90px] rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs" placeholder="JSON modules" value={settingsForm.modules} onChange={(e) => setSettingsForm((s) => ({ ...s, modules: e.target.value }))} />
              <textarea className="min-h-[90px] rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs" placeholder="JSON limits" value={settingsForm.limits} onChange={(e) => setSettingsForm((s) => ({ ...s, limits: e.target.value }))} />
              <textarea className="min-h-[90px] rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs" placeholder="JSON features" value={settingsForm.features} onChange={(e) => setSettingsForm((s) => ({ ...s, features: e.target.value }))} />
              <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!settingsForm.empresa_id || updateCompanySettingsMutation.isPending} onClick={() => runAction(async () => {
                const modules = settingsForm.modules.trim() ? JSON.parse(settingsForm.modules) : {}
                const limits = settingsForm.limits.trim() ? JSON.parse(settingsForm.limits) : {}
                const features = settingsForm.features.trim() ? JSON.parse(settingsForm.features) : {}
                return updateCompanySettingsMutation.mutateAsync({ empresaId: settingsForm.empresa_id, settings: { modules, limits, features } })
              }, 'Configuracoes atualizadas com sucesso.')}>Salvar configuracoes</button>
            </div>
          </Card>

          <Card title="Configuracoes atuais da empresa selecionada">
            <pre className="max-h-72 overflow-auto rounded border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">{JSON.stringify(selectedSettings, null, 2)}</pre>
          </Card>
        </div>
      )}

      {active === 'monitoramento' && (
        <Card title="Monitoramento" subtitle="Saude do backend e cobertura de acoes">
          <div className="mb-4 grid gap-2 md:grid-cols-2">
            <select
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              value={monitoringEmpresaId}
              onChange={(e) => setMonitoringEmpresaId(e.target.value)}
            >
              <option value="">Escopo: Geral (todas as empresas)</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  Escopo: {company.nome || company.slug || company.id}
                </option>
              ))}
            </select>
            <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400">
              {monitoringEmpresaId
                ? 'Monitoramento filtrado pela empresa selecionada (empresa_id).'
                : 'Monitoramento geral: exibe dados agregados de todas as empresas.'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${monitorSummary.status === 'healthy' ? 'bg-emerald-400' : monitorSummary.status === 'warning' ? 'bg-amber-400' : 'bg-rose-400'} animate-pulse`} />
                <div>
                  <p className="text-sm font-semibold text-slate-100">Status Geral do Sistema</p>
                  <p className="text-xs text-slate-400">Monitoramento em tempo real • Atualizacao a cada 5s</p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${monitorSummary.status === 'healthy' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-600/40' : monitorSummary.status === 'warning' ? 'bg-amber-900/40 text-amber-300 border border-amber-600/40' : 'bg-rose-900/40 text-rose-300 border border-rose-600/40'}`}>
                {monitorSummary.status === 'healthy' ? 'Operacional' : monitorSummary.status === 'warning' ? 'Atencao' : 'Critico'}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4 lg:grid-cols-7">
            {[
              { label: 'Tempo Resposta', value: monitorSummary.responseMs > 0 ? `${monitorSummary.responseMs}ms` : '-', icon: Clock, ok: true },
              { label: 'Total Registros', value: monitorSummary.totalRecords.toLocaleString('pt-BR'), icon: Database, ok: true },
              { label: 'Modulos Ativos', value: `${monitorSummary.activeModules}/${monitorSummary.totalTables}`, icon: Activity, ok: true },
              { label: 'Modulos com Erro', value: String(monitorSummary.errorModules), icon: AlertTriangle, ok: monitorSummary.errorModules === 0 },
              { label: 'Registros Globais', value: String(tables.filter((t) => !t.has_empresa_id).reduce((acc, t) => acc + t.total_rows, 0)), icon: Database, ok: true },
              { label: 'Tickets (abertos)', value: String(supportResumo.aberto), icon: CheckCircle, ok: true },
              { label: 'Assinaturas atrasadas', value: String(financeiroResumo.atrasadas), icon: Gauge, ok: financeiroResumo.atrasadas === 0 },
            ].map((m) => (
              <section key={m.label} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-center">
                <m.icon className={`mx-auto mb-1 h-4 w-4 ${m.ok ? 'text-sky-300' : 'text-rose-300'}`} />
                <p className="text-lg font-bold font-mono text-slate-100">{m.value}</p>
                <p className="text-[10px] text-slate-400">{m.label}</p>
              </section>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm font-semibold text-slate-100">Performance do Banco</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1"><Gauge className="h-3.5 w-3.5" /> Disponibilidade</span>
                  <span className="font-mono text-slate-200">{monitorSummary.availabilityPercent}%</span>
                </div>
                <div className="h-2 rounded bg-slate-800">
                  <div className="h-2 rounded bg-emerald-500" style={{ width: `${monitorSummary.availabilityPercent}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> Cobertura dos modulos</span>
                  <span className="font-mono text-slate-200">{monitorSummary.coveragePercent}%</span>
                </div>
                <div className="h-2 rounded bg-slate-800">
                  <div className="h-2 rounded bg-blue-500" style={{ width: `${monitorSummary.coveragePercent}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded border border-slate-800 bg-slate-950 p-3">
            <p className="text-xs text-slate-400">Acoes suportadas</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {toArray<string>(backendHealth?.supported_actions).map((action) => (
                <span key={action} className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300">
                  {action}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded border border-slate-800 bg-slate-950 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-400">Status dos bancos/tabelas (refresh: 0,25s)</p>
              <p className="text-[11px] text-slate-500">
                {isFetchingTables ? 'Atualizando...' : 'Atualizacao concluida'}
                {tablesUpdatedAt ? ` • ${new Date(tablesUpdatedAt).toLocaleTimeString('pt-BR')}` : ''}
              </p>
            </div>

            {tablesUnsupported && (
              <p className="mt-3 text-xs text-amber-300">Backend atual nao suporta listagem de bases/tabelas (acao list_database_tables indisponivel). Publique a edge function owner-portal-admin mais recente.</p>
            )}

            <div className="mt-3 max-h-80 overflow-auto rounded border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-3 py-2 text-left">Modulo</th>
                    <th className="px-3 py-2 text-left">Base/Tabela</th>
                    <th className="px-3 py-2 text-right">Tempo (ms)</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Registros</th>
                    <th className="px-3 py-2 text-center">Escopo</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoredDatabasesWithTiming.map((db) => (
                    <tr key={db.table_name} className="border-t border-slate-800">
                      <td className="px-3 py-2">{db.module_name}</td>
                      <td className="px-3 py-2">{db.table_name}</td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-300">{db.response_ms}ms</td>
                      <td className="px-3 py-2">
                        <span
                          className={db.status === 'online' ? 'rounded border border-emerald-600/50 bg-emerald-950/40 px-2 py-0.5 text-[11px] text-emerald-300' : 'rounded border border-rose-600/50 bg-rose-950/40 px-2 py-0.5 text-[11px] text-rose-300'}
                        >
                          {db.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{db.total_rows}</td>
                      <td className="px-3 py-2 text-center">{db.has_empresa_id ? 'tenant' : 'global'}</td>
                    </tr>
                  ))}
                  {isLoadingTables && (
                    <tr>
                      <td className="px-3 py-3 text-slate-400" colSpan={6}>Carregando status das bases/tabelas...</td>
                    </tr>
                  )}
                  {!isLoadingTables && monitoredDatabasesWithTiming.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-slate-400" colSpan={6}>Nenhuma base/tabela retornada pelo backend.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {tablesError && (
              <p className="mt-3 text-xs text-rose-300">Falha ao atualizar status das bases/tabelas: {String((tablesError as any)?.message ?? tablesError)}</p>
            )}
          </div>
        </Card>
      )}

      {active === 'sistema' && (
        <div className="space-y-4">
          <Card title="Promover usuario para SYSTEM_ADMIN">
            <div className="flex flex-col gap-2 md:flex-row">
              <input className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="UUID do usuario" value={systemForm.user_id} onChange={(e) => setSystemForm((s) => ({ ...s, user_id: e.target.value }))} />
              <button className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900" disabled={!systemForm.user_id || createSystemAdminMutation.isPending} onClick={() => runAction(() => createSystemAdminMutation.mutateAsync({ userId: systemForm.user_id }), 'Permissao SYSTEM_ADMIN concedida com sucesso.')}>Conceder SYSTEM_ADMIN</button>
            </div>
          </Card>

          <Card title="Data Control (Owner Master)" subtitle="Visualize tabelas por tenant e exclua somente os dados desejados da empresa selecionada.">
            <div className="grid gap-2 md:grid-cols-2">
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={systemForm.empresa_id} onChange={(e) => setSystemForm((s) => ({ ...s, empresa_id: e.target.value }))}>
                <option value="">Empresa alvo</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome || c.id}
                  </option>
                ))}
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={systemForm.table_name} onChange={(e) => setSystemForm((s) => ({ ...s, table_name: e.target.value }))}>
                <option value="">Tabela (manual)</option>
                {tenantScopedTables.map((table) => (
                  <option key={table.table_name} value={table.table_name}>
                    {table.table_name}
                  </option>
                ))}
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm md:col-span-2" type="password" placeholder="Senha de confirmacao" value={systemForm.auth_password} onChange={(e) => setSystemForm((s) => ({ ...s, auth_password: e.target.value }))} />
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={systemForm.keep_core} onChange={(e) => setSystemForm((s) => ({ ...s, keep_core: e.target.checked }))} />
                Preservar core da empresa
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={systemForm.keep_billing} onChange={(e) => setSystemForm((s) => ({ ...s, keep_billing: e.target.checked }))} />
                Preservar billing
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={systemForm.include_auth_users} onChange={(e) => setSystemForm((s) => ({ ...s, include_auth_users: e.target.checked }))} />
                Incluir usuarios auth (recomendado para limpeza total)
              </label>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <button className="rounded border border-amber-500 px-3 py-2 text-sm text-amber-300" disabled={!isOwnerMaster || !systemForm.empresa_id || !systemForm.auth_password || cleanupCompanyDataMutation.isPending} onClick={() => runOwnerMasterAction(async () => {
                const output = await cleanupCompanyDataMutation.mutateAsync({ empresa_id: systemForm.empresa_id, keep_company_core: systemForm.keep_core, keep_billing_data: systemForm.keep_billing, include_auth_users: systemForm.include_auth_users, auth_password: systemForm.auth_password })
                setSystemActionOutput(output)
                return output
              }, 'Limpeza total da empresa concluida com sucesso.')}>Limpar empresa (tudo)</button>
              <button className="rounded border border-amber-500 px-3 py-2 text-sm text-amber-300" disabled={!isOwnerMaster || !systemForm.empresa_id || !systemForm.auth_password || selectedTenantTables.length === 0 || purgeTableDataMutation.isPending} onClick={() => runOwnerMasterAction(async () => {
                const outputs: Array<{ table_name: string; result: unknown }> = []

                for (const tableName of selectedTenantTables) {
                  const result = await purgeTableDataMutation.mutateAsync({ table_name: tableName, empresa_id: systemForm.empresa_id, auth_password: systemForm.auth_password })
                  outputs.push({ table_name: tableName, result })
                }

                setSystemActionOutput({ selected_tables: outputs })
                return outputs
              }, `Limpeza concluida em ${selectedTenantTables.length} tabela(s) da empresa selecionada.`)}>Excluir dados selecionados</button>
              <button className="rounded border border-amber-500 px-3 py-2 text-sm text-amber-300" disabled={!isOwnerMaster || !systemForm.table_name || !systemForm.auth_password || purgeTableDataMutation.isPending} onClick={() => runOwnerMasterAction(async () => {
                const output = await purgeTableDataMutation.mutateAsync({ table_name: systemForm.table_name, empresa_id: systemForm.empresa_id || undefined, auth_password: systemForm.auth_password })
                setSystemActionOutput(output)
                return output
              }, 'Limpeza da tabela concluida com sucesso.')}>Limpar tabela</button>
              <button className="rounded border border-rose-600 px-3 py-2 text-sm text-rose-300" disabled={!isOwnerMaster || !systemForm.empresa_id || !systemForm.auth_password || deleteCompanyByOwnerMutation.isPending} onClick={() => runOwnerMasterAction(async () => {
                beginDeleteCompanyOverlay(systemForm.empresa_id)
                const startedAt = Date.now()
                try {
                  const output = await deleteCompanyByOwnerMutation.mutateAsync({ empresa_id: systemForm.empresa_id, auth_password: systemForm.auth_password })
                  setSystemActionOutput(output)
                  completeDeleteCompanyOverlay()
                  return output
                } finally {
                  closeDeleteOverlayWithMinimumDelay(startedAt)
                }
              }, 'Empresa excluida definitivamente com purge total.')}>Excluir empresa</button>
            </div>

            {!isOwnerMaster && (
              <p className="mt-3 text-xs text-rose-300">Acoes destrutivas liberadas somente para owner master.</p>
            )}

            {tablesUnsupported && (
              <p className="mt-3 text-xs text-amber-300">Backend legado: listagem de tabelas indisponivel nesta versao. Publique a edge function owner-portal-admin para habilitar a carga da grade.</p>
            )}

            <div className="mt-4 max-h-72 overflow-auto rounded border border-slate-800">
              <p className="px-3 py-2 text-[11px] text-slate-400">
                {systemForm.empresa_id ? 'Contagem filtrada pela empresa selecionada.' : 'Contagem global (selecione uma empresa para filtrar por empresa_id).'}
              </p>
              <p className="px-3 pb-2 text-[11px] text-slate-500">
                Marque as tabelas tenant para excluir somente os dados desejados da empresa selecionada.
              </p>
              <table className="w-full text-xs">
                <thead className="bg-slate-950">
                  <tr>
                    <th className="px-3 py-2 text-center">Selecionar</th>
                    <th className="px-3 py-2 text-left">Tabela</th>
                    <th className="px-3 py-2 text-right">Registros</th>
                    <th className="px-3 py-2 text-center">empresa_id</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map((t) => (
                    <tr key={t.table_name} className="border-t border-slate-800">
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedTenantTables.includes(t.table_name)}
                          disabled={!t.has_empresa_id}
                          onChange={() => toggleTenantTableSelection(t.table_name)}
                        />
                      </td>
                      <td className="px-3 py-2">{t.table_name}</td>
                      <td className="px-3 py-2 text-right">{t.total_rows}</td>
                      <td className="px-3 py-2 text-center">{t.has_empresa_id ? 'sim' : 'nao'}</td>
                    </tr>
                  ))}
                  {isLoadingTables && (
                    <tr>
                      <td className="px-3 py-3 text-slate-400" colSpan={4}>Carregando tabelas...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {systemActionOutput && (
              <div className="mt-4 rounded border border-emerald-700/40 bg-emerald-950/20 p-3">
                <p className="text-xs text-emerald-300">Saida do ultimo comando executado:</p>
                <pre className="mt-2 max-h-60 overflow-auto rounded bg-slate-950 p-2 text-xs text-slate-300">{JSON.stringify(systemActionOutput, null, 2)}</pre>
              </div>
            )}
          </Card>
        </div>
      )}

      {active === 'owner-master' && isOwnerMaster && (
        <div className="space-y-4">
          <Card title="Criar owner/admin da plataforma">
            <div className="grid gap-2 md:grid-cols-4">
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome" value={ownerMasterForm.nome} onChange={(e) => setOwnerMasterForm((s) => ({ ...s, nome: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" type="email" placeholder="Email" value={ownerMasterForm.email} onChange={(e) => setOwnerMasterForm((s) => ({ ...s, email: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" type="password" placeholder="Senha (opcional)" value={ownerMasterForm.password} onChange={(e) => setOwnerMasterForm((s) => ({ ...s, password: e.target.value }))} />
              <button className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" disabled={!ownerMasterForm.nome || !isValidEmail(ownerMasterForm.email) || createPlatformOwnerMutation.isPending} onClick={() => isValidEmail(ownerMasterForm.email) ? runAction(() => createPlatformOwnerMutation.mutateAsync({ nome: ownerMasterForm.nome, email: normalizeEmail(ownerMasterForm.email), password: ownerMasterForm.password || undefined }), 'Conta de plataforma criada com sucesso.') : setError('Email de owner invalido. Use um email completo.')}>Criar conta</button>
            </div>
          </Card>

          <Card title="Owners da plataforma">
            <div className="max-h-72 overflow-auto rounded border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-950">
                  <tr>
                    <th className="px-3 py-2 text-left">Nome</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((o) => (
                    <tr key={o.user_id} className="border-t border-slate-800">
                      <td className="px-3 py-2">{o.profile?.nome || '-'}</td>
                      <td className="px-3 py-2">{o.profile?.email || '-'}</td>
                      <td className="px-3 py-2">{o.role || '-'}</td>
                    </tr>
                  ))}
                  {isLoadingOwners && (
                    <tr>
                      <td className="px-3 py-3 text-slate-400" colSpan={3}>Carregando owners...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {isCreateCompanyDialogVisible && (
        <div className="fixed inset-0 z-[126] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-cyan-50 to-sky-100 p-6 text-slate-900 shadow-2xl shadow-emerald-950/25">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <p className="text-base font-semibold">Confirmar criacao de empresa</p>
            </div>

            <p className="mt-3 text-sm text-slate-700">
              Vamos criar tenant, dados base e administrador inicial. Revise os dados antes de confirmar.
            </p>

            <div className="mt-4 rounded-xl border border-emerald-200 bg-white/75 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Resumo rapido</p>
              <p className="mt-1 text-sm"><span className="font-semibold">Empresa:</span> {createCompanyNameLabel}</p>
              <p className="text-sm"><span className="font-semibold">Slug:</span> {createCompanyForm.slug || 'automatico'}</p>
              <p className="text-sm"><span className="font-semibold">Admin:</span> {normalizeEmail(createCompanyForm.admin_email)}</p>
              <p className="text-sm"><span className="font-semibold">Email operacional:</span> {normalizeEmail(createCompanyForm.email) || 'nao informado'}</p>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-700">Frase de confirmacao</p>
                <p className="mb-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900">{createCompanyExpectedPhrase}</p>
                <input
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
                  placeholder="Digite exatamente a frase acima"
                  autoComplete="off"
                  name="create-company-confirm-phrase"
                  value={createCompanyDialogConfirmText}
                  onChange={(e) => setCreateCompanyDialogConfirmText(e.target.value)}
                />
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-700">Senha do owner master</p>
                <input
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
                  type="password"
                  placeholder="Digite sua senha para autorizar"
                  autoComplete="new-password"
                  name="create-company-owner-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  value={createCompanyDialogPassword}
                  onChange={(e) => setCreateCompanyDialogPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                onClick={closeCreateCompanyDialog}
                disabled={createCompanyMutation.isPending}
              >
                Cancelar
              </button>
              <button
                className="rounded border border-emerald-700 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleCreateCompany}
                disabled={createCompanyMutation.isPending || createCompanyDialogConfirmText.trim() !== createCompanyExpectedPhrase || !createCompanyDialogPassword.trim()}
              >
                Confirmar e criar
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteCompanyDialogVisible && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-rose-300 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-100 p-6 text-slate-900 shadow-2xl shadow-rose-950/30">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <p className="text-base font-semibold">Confirmar exclusao definitiva</p>
            </div>

            <p className="mt-3 text-sm text-slate-700">
              Esta acao remove empresa, usuarios, contratos, assinaturas e dados vinculados.
            </p>

            <div className="mt-4 rounded-xl border border-rose-200 bg-white/75 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Empresa alvo</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{deleteCompanyDialogCompanyLabel}</p>
              <p className="text-xs text-slate-600">ID: {deleteCompanyDialogCompanyId}</p>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-700">Frase de confirmacao</p>
                <p className="mb-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900">{deleteCompanyExpectedPhrase}</p>
                <input
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
                  placeholder="Digite exatamente a frase acima"
                  autoComplete="off"
                  name="delete-company-confirm-phrase"
                  value={deleteCompanyDialogConfirmText}
                  onChange={(e) => setDeleteCompanyDialogConfirmText(e.target.value)}
                />
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-700">Senha do owner master</p>
                <input
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
                  type="password"
                  placeholder="Digite sua senha para autorizar"
                  autoComplete="new-password"
                  name="delete-company-owner-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  value={deleteCompanyDialogPassword}
                  onChange={(e) => setDeleteCompanyDialogPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                onClick={closeDeleteCompanyDialog}
                disabled={deleteCompanyByOwnerMutation.isPending}
              >
                Cancelar
              </button>
              <button
                className="rounded border border-rose-700 bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                onClick={confirmDeleteCompanyFromDialog}
                disabled={deleteCompanyByOwnerMutation.isPending || deleteCompanyDialogConfirmText.trim() !== deleteCompanyExpectedPhrase || !deleteCompanyDialogPassword.trim()}
              >
                Confirmar e excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteCompanyOverlayVisible && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/65 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-rose-300 bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100 p-6 text-slate-900 shadow-2xl shadow-rose-950/30">
            <div className="flex items-center gap-3 text-rose-700">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm font-semibold tracking-wide">Exclusao em andamento</p>
            </div>

            <p className="mt-3 text-xs text-slate-700">
              Empresa alvo: <span className="font-semibold text-slate-900">{deleteCompanyTargetEmpresaId}</span>
            </p>
            <p className="mt-1 text-sm text-slate-900">{deleteCompanyCurrentStage}</p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-rose-200">
              <div className="h-full rounded-full bg-rose-600 transition-all duration-500" style={{ width: `${deleteCompanyProgressPercent}%` }} />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-700">
              <span>{deleteCompanyProgressPercent}% concluido</span>
              <span>Tempo: {deleteCompanyElapsedLabel}</span>
            </div>

            <p className="mt-4 text-xs text-slate-700">
              Aguarde a finalizacao completa. Fechar a pagina durante este processo pode interromper o acompanhamento visual da exclusao.
            </p>
          </div>
        </div>
      )}

      {isCreateCompanyOverlayVisible && (
        <div className="fixed inset-0 z-[121] flex items-center justify-center bg-slate-900/65 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-100 via-cyan-50 to-sky-100 p-6 text-slate-900 shadow-2xl shadow-emerald-950/25">
            <div className="flex items-center gap-3 text-emerald-700">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm font-semibold tracking-wide">Criacao em andamento</p>
            </div>

            <p className="mt-3 text-xs text-slate-700">
              Empresa alvo: <span className="font-semibold text-slate-900">{createCompanyTargetName}</span>
            </p>
            <p className="mt-1 text-sm text-slate-900">{createCompanyCurrentStage}</p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-200">
              <div className="h-full rounded-full bg-emerald-600 transition-all duration-500" style={{ width: `${createCompanyProgressPercent}%` }} />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-700">
              <span>{createCompanyProgressPercent}% concluido</span>
              <span>Tempo: {createCompanyElapsedLabel}</span>
            </div>

            <p className="mt-4 text-xs text-slate-700">
              Aguarde a finalizacao completa para obter as credenciais iniciais e a URL de acesso da empresa.
            </p>
          </div>
        </div>
      )}

      {feedback && <p className="rounded border border-emerald-500/40 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-300">{feedback}</p>}
      {error && <p className="rounded border border-rose-500/40 bg-rose-950/20 px-3 py-2 text-sm text-rose-300">{error}</p>}
    </OwnerPortalLayout>
  )
}
