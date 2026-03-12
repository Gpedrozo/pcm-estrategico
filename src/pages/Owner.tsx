import { useMemo, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { OwnerPortalLayout } from '@/layouts/OwnerPortalLayout'
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

const OWNER_MASTER_EMAIL = (import.meta.env.VITE_OWNER_MASTER_EMAIL || 'pedrozo@gppis.com.br').toLowerCase()

const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

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
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isOwnerMaster = (user?.email || '').toLowerCase() === OWNER_MASTER_EMAIL

  const { data: statsData } = useOwnerStats()
  const { data: backendHealth, error: backendHealthError } = useOwnerBackendHealth()
  const { data: companiesData, isLoading: isLoadingCompanies } = useOwnerCompanies()
  const { data: usersData, isLoading: isLoadingUsers } = useOwnerUsers()
  const { data: plansData, isLoading: isLoadingPlans } = useOwnerPlans()
  const { data: subscriptionsData, isLoading: isLoadingSubscriptions } = useOwnerSubscriptions()
  const { data: contractsData, isLoading: isLoadingContracts } = useOwnerContracts()
  const { data: auditData, isLoading: isLoadingAudit } = useOwnerAuditLogs()
  const { data: supportData, isLoading: isLoadingSupport } = useOwnerSupportTickets()
  const { data: ownersData, isLoading: isLoadingOwners } = useOwnerMasterOwners()
  const monitoringLive = active === 'monitoramento'
  const supportsTables = Boolean(backendHealth?.supported_actions?.includes('list_database_tables' as any))
  const {
    data: tablesData,
    isLoading: isLoadingTables,
    isFetching: isFetchingTables,
    error: tablesError,
    dataUpdatedAt: tablesUpdatedAt,
  } = useOwnerDatabaseTables(supportsTables && monitoringLive, monitoringLive ? 250 : false)

  const companies = useMemo(
    () => toArray<{ id: string; nome?: string; slug?: string; status?: string }>((companiesData as any)?.companies),
    [companiesData],
  )
  const users = useMemo(() => toArray<{ id: string; nome?: string; email?: string; status?: string }>(usersData), [usersData])
  const plans = useMemo(() => toArray<{ id: string; name?: string; code?: string; price_month?: number }>(plansData), [plansData])
  const subscriptions = useMemo(
    () => toArray<{ id: string; empresa_id?: string; plan_id?: string; status?: string; amount?: number }>(subscriptionsData),
    [subscriptionsData],
  )
  const contracts = useMemo(() => toArray<{ id: string; empresa_id?: string; status?: string; updated_at?: string }>(contractsData), [contractsData])
  const logs = useMemo(() => toArray<{ id: string; action_type?: string; source?: string; created_at?: string }>(auditData), [auditData])
  const tickets = useMemo(() => toArray<{ id: string; subject?: string; status?: string; priority?: string }>(supportData), [supportData])
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
        status: table.total_rows >= 0 ? 'online' : 'indisponivel',
      })),
    [tables],
  )

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
    createSystemAdminMutation,
    createPlatformOwnerMutation,
    cleanupCompanyDataMutation,
    purgeTableDataMutation,
    deleteCompanyByOwnerMutation,
  } = useOwnerCompanyActions()

  const [createCompanyForm, setCreateCompanyForm] = useState({ nome: '', slug: '', admin_nome: '', admin_email: '' })
  const [updateCompanyForm, setUpdateCompanyForm] = useState({ empresa_id: '', nome: '', status: 'active' })
  const [createUserForm, setCreateUserForm] = useState({ nome: '', email: '', password: '', role: 'ADMIN', empresa_id: '' })
  const [userStatusForm, setUserStatusForm] = useState({ user_id: '', status: 'ativo' })
  const [createPlanForm, setCreatePlanForm] = useState({ code: '', name: '', price_month: '' })
  const [updatePlanForm, setUpdatePlanForm] = useState({ id: '', code: '', name: '', price_month: '' })
  const [changePlanForm, setChangePlanForm] = useState({ empresa_id: '', plano_codigo: '' })
  const [createSubscriptionForm, setCreateSubscriptionForm] = useState({ empresa_id: '', plan_id: '', amount: '', status: 'ativa' })
  const [subscriptionStatusForm, setSubscriptionStatusForm] = useState({ empresa_id: '', status: 'ativa' })
  const [billingForm, setBillingForm] = useState({ subscription_id: '', amount: '', payment_status: 'paid' })
  const [contractForm, setContractForm] = useState({ contract_id: '', content: '', summary: '', status: 'ativo' })
  const [contractOnlyId, setContractOnlyId] = useState('')
  const [supportForm, setSupportForm] = useState({ ticket_id: '', response: '', status: 'resolvido' })
  const [settingsForm, setSettingsForm] = useState({ empresa_id: '', modules: '{}', limits: '{}', features: '{}' })
  const [systemForm, setSystemForm] = useState({ user_id: '', empresa_id: '', table_name: '', auth_password: '', keep_core: false, keep_billing: false, include_auth_users: false })
  const [ownerMasterForm, setOwnerMasterForm] = useState({ nome: '', email: '', password: '' })

  const selectedSettingsQuery = useOwnerCompanySettings(settingsForm.empresa_id || null)
  const selectedSettings = toArray<{ chave: string; valor: Record<string, unknown> }>((selectedSettingsQuery.data as any)?.settings)

  const clearFeedback = () => {
    setFeedback(null)
    setError(null)
  }

  const runAction = async (fn: () => Promise<unknown>, success: string) => {
    clearFeedback()
    try {
      await fn()
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

      if (normalized.includes('forbidden: owner master only') || normalized.includes('owner master only')) {
        setError('Operacao restrita ao owner master (pedrozo@gppis.com.br).')
        return
      }

      setError(rawMessage)
    }
  }

  const runOwnerMasterAction = async (fn: () => Promise<unknown>, success: string) => {
    if (!isOwnerMaster) {
      setFeedback(null)
      setError('Operacao restrita ao owner master (pedrozo@gppis.com.br).')
      return
    }

    await runAction(fn, success)
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
      { key: 'suporte', label: 'Suporte' },
      { key: 'financeiro', label: 'Financeiro' },
      { key: 'feature-flags', label: 'Feature Flags' },
      { key: 'monitoramento', label: 'Monitoramento' },
      { key: 'logs', label: 'Logs' },
      { key: 'configuracoes', label: 'Configuracoes' },
      ...(isOwnerMaster ? [{ key: 'owner-master', label: 'Owner Master' }] : []),
    ],
    [isOwnerMaster],
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
    >
      {active === 'dashboard' && (
        <Card title="Dashboard" subtitle="Visao geral da plataforma">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Empresas" value={Number((statsData as any)?.total_companies ?? companies.length)} />
            <Metric label="Usuarios" value={Number((statsData as any)?.total_users ?? users.length)} />
            <Metric label="Assinaturas ativas" value={Number((statsData as any)?.active_subscriptions ?? subscriptions.filter((s) => s.status === 'ativa').length)} />
            <Metric label="MRR" value={Number((statsData as any)?.mrr ?? 0)} />
          </div>
        </Card>
      )}

      {active === 'empresas' && (
        <div className="space-y-4">
          <Card title="Criar empresa">
            <div className="grid gap-2 md:grid-cols-4">
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome" value={createCompanyForm.nome} onChange={(e) => setCreateCompanyForm((s) => ({ ...s, nome: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Slug" value={createCompanyForm.slug} onChange={(e) => setCreateCompanyForm((s) => ({ ...s, slug: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome admin" value={createCompanyForm.admin_nome} onChange={(e) => setCreateCompanyForm((s) => ({ ...s, admin_nome: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Email admin" value={createCompanyForm.admin_email} onChange={(e) => setCreateCompanyForm((s) => ({ ...s, admin_email: e.target.value }))} />
            </div>
            <button
              className="mt-3 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              disabled={createCompanyMutation.isPending || !createCompanyForm.nome || !createCompanyForm.admin_email}
              onClick={() =>
                runAction(
                  () =>
                    createCompanyMutation.mutateAsync({
                      company: { nome: createCompanyForm.nome, slug: createCompanyForm.slug || undefined },
                      user: { nome: createCompanyForm.admin_nome || 'Administrador', email: createCompanyForm.admin_email, role: 'ADMIN' },
                    }),
                  'Empresa criada com sucesso.',
                )
              }
            >
              Criar empresa
            </button>
          </Card>

          <Card title="Atualizar empresa">
            <div className="grid gap-2 md:grid-cols-3">
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={updateCompanyForm.empresa_id} onChange={(e) => setUpdateCompanyForm((s) => ({ ...s, empresa_id: e.target.value }))}>
                <option value="">Selecione empresa</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome || c.slug || c.id}
                  </option>
                ))}
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Novo nome" value={updateCompanyForm.nome} onChange={(e) => setUpdateCompanyForm((s) => ({ ...s, nome: e.target.value }))} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={updateCompanyForm.status} onChange={(e) => setUpdateCompanyForm((s) => ({ ...s, status: e.target.value }))}>
                <option value="active">Ativa</option>
                <option value="blocked">Bloqueada</option>
                <option value="suspended">Suspensa</option>
              </select>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!updateCompanyForm.empresa_id || updateCompanyMutation.isPending} onClick={() => runAction(() => updateCompanyMutation.mutateAsync({ empresaId: updateCompanyForm.empresa_id, company: { nome: updateCompanyForm.nome || undefined } }), 'Empresa atualizada.')}>Salvar</button>
              <button className="rounded border border-amber-500 px-3 py-2 text-sm text-amber-300" disabled={!updateCompanyForm.empresa_id || setCompanyLifecycle.isPending} onClick={() => runAction(() => setCompanyLifecycle.mutateAsync({ empresaId: updateCompanyForm.empresa_id, status: updateCompanyForm.status }), 'Status da empresa atualizado.')}>Aplicar status</button>
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
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id} className="border-t border-slate-800">
                      <td className="px-3 py-2">{c.nome || c.id}</td>
                      <td className="px-3 py-2">{c.slug || '-'}</td>
                      <td className="px-3 py-2">{c.status || '-'}</td>
                    </tr>
                  ))}
                  {isLoadingCompanies && (
                    <tr>
                      <td className="px-3 py-3 text-slate-400" colSpan={3}>Carregando empresas...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {active === 'usuarios' && (
        <div className="space-y-4">
          <Card title="Criar usuario">
            <div className="grid gap-2 md:grid-cols-5">
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome" value={createUserForm.nome} onChange={(e) => setCreateUserForm((s) => ({ ...s, nome: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Email" value={createUserForm.email} onChange={(e) => setCreateUserForm((s) => ({ ...s, email: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" type="password" placeholder="Senha" value={createUserForm.password} onChange={(e) => setCreateUserForm((s) => ({ ...s, password: e.target.value }))} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={createUserForm.role} onChange={(e) => setCreateUserForm((s) => ({ ...s, role: e.target.value }))}>
                <option value="ADMIN">ADMIN</option>
                <option value="GESTOR">GESTOR</option>
                <option value="TECNICO">TECNICO</option>
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
              disabled={createUserMutation.isPending || !createUserForm.email}
              onClick={() =>
                runAction(
                  () =>
                    createUserMutation.mutateAsync({
                      nome: createUserForm.nome || 'Usuario',
                      email: createUserForm.email,
                      password: createUserForm.password || undefined,
                      role: createUserForm.role,
                      empresa_id: createUserForm.empresa_id || undefined,
                    }),
                  'Usuario criado com sucesso.',
                )
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
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
              <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!userStatusForm.user_id || setUserStatusMutation.isPending} onClick={() => runAction(() => setUserStatusMutation.mutateAsync({ userId: userStatusForm.user_id, status: userStatusForm.status }), 'Status do usuario atualizado.')}>Aplicar</button>
            </div>
          </Card>

          <Card title="Usuarios globais">
            <div className="max-h-72 overflow-auto rounded border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-950">
                  <tr>
                    <th className="px-3 py-2 text-left">Nome</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-slate-800">
                      <td className="px-3 py-2">{u.nome || '-'}</td>
                      <td className="px-3 py-2">{u.email || '-'}</td>
                      <td className="px-3 py-2">{u.status || '-'}</td>
                    </tr>
                  ))}
                  {isLoadingUsers && (
                    <tr>
                      <td className="px-3 py-3 text-slate-400" colSpan={3}>Carregando usuarios...</td>
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
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Preco mensal" value={createPlanForm.price_month} onChange={(e) => setCreatePlanForm((s) => ({ ...s, price_month: e.target.value }))} />
              <button className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" disabled={createPlanMutation.isPending || !createPlanForm.name} onClick={() => runAction(() => createPlanMutation.mutateAsync({ code: createPlanForm.code || undefined, name: createPlanForm.name, price_month: createPlanForm.price_month ? Number(createPlanForm.price_month) : undefined }), 'Plano criado com sucesso.')}>Criar plano</button>
            </div>
          </Card>

          <Card title="Atualizar plano">
            <div className="grid gap-2 md:grid-cols-4">
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={updatePlanForm.id} onChange={(e) => setUpdatePlanForm((s) => ({ ...s, id: e.target.value }))}>
                <option value="">Selecione plano</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.code || p.id}
                  </option>
                ))}
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Novo codigo" value={updatePlanForm.code} onChange={(e) => setUpdatePlanForm((s) => ({ ...s, code: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Novo nome" value={updatePlanForm.name} onChange={(e) => setUpdatePlanForm((s) => ({ ...s, name: e.target.value }))} />
              <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!updatePlanForm.id || updatePlanMutation.isPending} onClick={() => runAction(() => updatePlanMutation.mutateAsync({ id: updatePlanForm.id, code: updatePlanForm.code || undefined, name: updatePlanForm.name || undefined, price_month: updatePlanForm.price_month ? Number(updatePlanForm.price_month) : undefined }), 'Plano atualizado com sucesso.')}>Salvar</button>
            </div>
          </Card>

          <Card title="Planos cadastrados">
            <div className="max-h-72 overflow-auto rounded border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-950">
                  <tr>
                    <th className="px-3 py-2 text-left">Plano</th>
                    <th className="px-3 py-2 text-left">Codigo</th>
                    <th className="px-3 py-2 text-right">Preco</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id} className="border-t border-slate-800">
                      <td className="px-3 py-2">{p.name || '-'}</td>
                      <td className="px-3 py-2">{p.code || '-'}</td>
                      <td className="px-3 py-2 text-right">{Number(p.price_month || 0)}</td>
                    </tr>
                  ))}
                  {isLoadingPlans && (
                    <tr>
                      <td className="px-3 py-3 text-slate-400" colSpan={3}>Carregando planos...</td>
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
              <button className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" disabled={!createSubscriptionForm.empresa_id || !createSubscriptionForm.plan_id || createSubscriptionMutation.isPending} onClick={() => runAction(() => createSubscriptionMutation.mutateAsync({ empresa_id: createSubscriptionForm.empresa_id, plan_id: createSubscriptionForm.plan_id, amount: createSubscriptionForm.amount ? Number(createSubscriptionForm.amount) : undefined, status: createSubscriptionForm.status }), 'Assinatura criada com sucesso.')}>Criar assinatura</button>
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
                <option value="ativa">Ativa</option>
                <option value="atrasada">Atrasada</option>
                <option value="cancelada">Cancelada</option>
                <option value="teste">Teste</option>
              </select>
              <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!subscriptionStatusForm.empresa_id || setSubscriptionStatusMutation.isPending} onClick={() => runAction(() => setSubscriptionStatusMutation.mutateAsync({ empresaId: subscriptionStatusForm.empresa_id, status: subscriptionStatusForm.status }), 'Status da assinatura atualizado.')}>Aplicar status</button>
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
        <Card title="Financeiro" subtitle="Atualizacao de cobranca da assinatura">
          <div className="grid gap-2 md:grid-cols-4">
            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Subscription ID" value={billingForm.subscription_id} onChange={(e) => setBillingForm((s) => ({ ...s, subscription_id: e.target.value }))} />
            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Novo valor" value={billingForm.amount} onChange={(e) => setBillingForm((s) => ({ ...s, amount: e.target.value }))} />
            <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={billingForm.payment_status} onChange={(e) => setBillingForm((s) => ({ ...s, payment_status: e.target.value }))}>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
              <option value="late">Atrasado</option>
            </select>
            <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!billingForm.subscription_id || updateSubscriptionBillingMutation.isPending} onClick={() => runAction(() => updateSubscriptionBillingMutation.mutateAsync({ subscriptionId: billingForm.subscription_id, billing: { amount: billingForm.amount ? Number(billingForm.amount) : undefined, payment_status: billingForm.payment_status } }), 'Cobranca atualizada com sucesso.')}>Atualizar cobranca</button>
          </div>
        </Card>
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
                <option value="resolvido">Resolvido</option>
                <option value="em_andamento">Em andamento</option>
                <option value="aberto">Aberto</option>
              </select>
              <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!supportForm.ticket_id || !supportForm.response || respondSupportMutation.isPending} onClick={() => runAction(() => respondSupportMutation.mutateAsync({ ticketId: supportForm.ticket_id, response: supportForm.response, status: supportForm.status }), 'Ticket respondido com sucesso.')}>Responder</button>
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
                      <td className="px-3 py-2">{t.status || '-'}</td>
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
          <div className="max-h-80 overflow-auto rounded border border-slate-800">
            <table className="w-full text-xs">
              <thead className="bg-slate-950">
                <tr>
                  <th className="px-3 py-2 text-left">Acao</th>
                  <th className="px-3 py-2 text-left">Origem</th>
                  <th className="px-3 py-2 text-left">Data</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-slate-800">
                    <td className="px-3 py-2">{l.action_type || '-'}</td>
                    <td className="px-3 py-2">{l.source || '-'}</td>
                    <td className="px-3 py-2">{l.created_at || '-'}</td>
                  </tr>
                ))}
                {isLoadingAudit && (
                  <tr>
                    <td className="px-3 py-3 text-slate-400" colSpan={3}>Carregando eventos...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(active === 'configuracoes' || active === 'feature-flags') && (
        <div className="space-y-4">
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
          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="Service" value={backendHealth?.service || 'owner-portal-admin'} />
            <Metric label="Status" value={backendHealth?.status || 'desconhecido'} />
            <Metric label="Versao" value={backendHealth?.version || 'n/a'} />
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

            {!supportsTables && (
              <p className="mt-3 text-xs text-amber-300">Backend atual nao suporta listagem de bases/tabelas (acao list_database_tables indisponivel).</p>
            )}

            {supportsTables && (
              <div className="mt-3 max-h-80 overflow-auto rounded border border-slate-800">
                <table className="w-full text-xs">
                  <thead className="bg-slate-900">
                    <tr>
                      <th className="px-3 py-2 text-left">Base/Tabela</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">Registros</th>
                      <th className="px-3 py-2 text-center">Escopo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monitoredDatabases.map((db) => (
                      <tr key={db.table_name} className="border-t border-slate-800">
                        <td className="px-3 py-2">{db.table_name}</td>
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
                        <td className="px-3 py-3 text-slate-400" colSpan={4}>Carregando status das bases/tabelas...</td>
                      </tr>
                    )}
                    {!isLoadingTables && monitoredDatabases.length === 0 && (
                      <tr>
                        <td className="px-3 py-3 text-slate-400" colSpan={4}>Nenhuma base/tabela retornada pelo backend.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

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

          <Card title="Data Control (Owner Master)" subtitle="Limpeza de dados por empresa e por tabela">
            <div className="grid gap-2 md:grid-cols-2">
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={systemForm.empresa_id} onChange={(e) => setSystemForm((s) => ({ ...s, empresa_id: e.target.value }))}>
                <option value="">Empresa alvo</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome || c.id}
                  </option>
                ))}
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Tabela (manual)" value={systemForm.table_name} onChange={(e) => setSystemForm((s) => ({ ...s, table_name: e.target.value }))} />
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
                Incluir usuarios auth
              </label>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <button className="rounded border border-amber-500 px-3 py-2 text-sm text-amber-300" disabled={!isOwnerMaster || !systemForm.empresa_id || !systemForm.auth_password || cleanupCompanyDataMutation.isPending} onClick={() => runOwnerMasterAction(() => cleanupCompanyDataMutation.mutateAsync({ empresa_id: systemForm.empresa_id, keep_company_core: systemForm.keep_core, keep_billing_data: systemForm.keep_billing, include_auth_users: systemForm.include_auth_users, auth_password: systemForm.auth_password }), 'Limpeza da empresa concluida com sucesso.')}>Limpar empresa</button>
              <button className="rounded border border-amber-500 px-3 py-2 text-sm text-amber-300" disabled={!isOwnerMaster || !systemForm.table_name || !systemForm.auth_password || purgeTableDataMutation.isPending} onClick={() => runOwnerMasterAction(() => purgeTableDataMutation.mutateAsync({ table_name: systemForm.table_name, empresa_id: systemForm.empresa_id || undefined, auth_password: systemForm.auth_password }), 'Limpeza da tabela concluida com sucesso.')}>Limpar tabela</button>
              <button className="rounded border border-rose-600 px-3 py-2 text-sm text-rose-300" disabled={!isOwnerMaster || !systemForm.empresa_id || !systemForm.auth_password || deleteCompanyByOwnerMutation.isPending} onClick={() => runOwnerMasterAction(() => deleteCompanyByOwnerMutation.mutateAsync({ empresa_id: systemForm.empresa_id, include_auth_users: systemForm.include_auth_users, auth_password: systemForm.auth_password }), 'Empresa excluida definitivamente com sucesso.')}>Excluir empresa</button>
            </div>

            {!isOwnerMaster && (
              <p className="mt-3 text-xs text-rose-300">Acoes destrutivas liberadas somente para pedrozo@gppis.com.br (owner master).</p>
            )}

            {!supportsTables && (
              <p className="mt-3 text-xs text-amber-300">Backend legado: listagem de tabelas indisponivel nesta versao. Use o campo de tabela manual.</p>
            )}

            <div className="mt-4 max-h-72 overflow-auto rounded border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-950">
                  <tr>
                    <th className="px-3 py-2 text-left">Tabela</th>
                    <th className="px-3 py-2 text-right">Registros</th>
                    <th className="px-3 py-2 text-center">empresa_id</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map((t) => (
                    <tr key={t.table_name} className="border-t border-slate-800">
                      <td className="px-3 py-2">{t.table_name}</td>
                      <td className="px-3 py-2 text-right">{t.total_rows}</td>
                      <td className="px-3 py-2 text-center">{t.has_empresa_id ? 'sim' : 'nao'}</td>
                    </tr>
                  ))}
                  {isLoadingTables && (
                    <tr>
                      <td className="px-3 py-3 text-slate-400" colSpan={3}>Carregando tabelas...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {active === 'owner-master' && isOwnerMaster && (
        <div className="space-y-4">
          <Card title="Criar owner/admin da plataforma">
            <div className="grid gap-2 md:grid-cols-4">
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome" value={ownerMasterForm.nome} onChange={(e) => setOwnerMasterForm((s) => ({ ...s, nome: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Email" value={ownerMasterForm.email} onChange={(e) => setOwnerMasterForm((s) => ({ ...s, email: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" type="password" placeholder="Senha (opcional)" value={ownerMasterForm.password} onChange={(e) => setOwnerMasterForm((s) => ({ ...s, password: e.target.value }))} />
              <button className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" disabled={!ownerMasterForm.nome || !ownerMasterForm.email || createPlatformOwnerMutation.isPending} onClick={() => runAction(() => createPlatformOwnerMutation.mutateAsync({ nome: ownerMasterForm.nome, email: ownerMasterForm.email, password: ownerMasterForm.password || undefined }), 'Conta de plataforma criada com sucesso.')}>Criar conta</button>
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

      {feedback && <p className="rounded border border-emerald-500/40 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-300">{feedback}</p>}
      {error && <p className="rounded border border-rose-500/40 bg-rose-950/20 px-3 py-2 text-sm text-rose-300">{error}</p>}
    </OwnerPortalLayout>
  )
}
