import { useMemo, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
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

type OwnerTabKey =
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

const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
    </div>
  )
}

export default function Owner() {
  const { isSystemOwner, isLoading, user, logout } = useAuth()
  const [tab, setTab] = useState<OwnerTabKey>('dashboard')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isOwnerMaster = (user?.email || '').toLowerCase() === OWNER_MASTER_EMAIL

  const { data: statsData } = useOwnerStats()
  const { data: healthData, isFetching: checkingHealth } = useOwnerBackendHealth()
  const { data: companiesData, isLoading: loadingCompanies } = useOwnerCompanies()
  const { data: usersData, isLoading: loadingUsers } = useOwnerUsers()
  const { data: plansData, isLoading: loadingPlans } = useOwnerPlans()
  const { data: subscriptionsData, isLoading: loadingSubscriptions } = useOwnerSubscriptions()
  const { data: contractsData, isLoading: loadingContracts } = useOwnerContracts()
  const { data: supportData, isLoading: loadingSupport } = useOwnerSupportTickets()
  const { data: auditData, isLoading: loadingAudit } = useOwnerAuditLogs()
  const { data: ownersData, isLoading: loadingOwners } = useOwnerMasterOwners()
  const { data: databaseTablesData, isLoading: loadingDatabaseTables } = useOwnerDatabaseTables(tab === 'sistema')

  const companies = useMemo(() => toArray<{ id: string; nome?: string; slug?: string; status?: string }>((companiesData as any)?.companies), [companiesData])
  const users = useMemo(() => toArray<{ id: string; nome?: string; email?: string; status?: string; empresa_id?: string }>(usersData), [usersData])
  const plans = useMemo(() => toArray<{ id: string; code?: string; name?: string; price_month?: number; active?: boolean }>(plansData), [plansData])
  const subscriptions = useMemo(() => toArray<{ id: string; empresa_id?: string; plan_id?: string; amount?: number; status?: string; payment_status?: string }>(subscriptionsData), [subscriptionsData])
  const contracts = useMemo(() => toArray<{ id: string; empresa_id?: string; status?: string; updated_at?: string; summary?: string }>(contractsData), [contractsData])
  const tickets = useMemo(() => toArray<{ id: string; subject?: string; status?: string; priority?: string; owner_response?: string }>(supportData), [supportData])
  const audit = useMemo(() => toArray<{ id: string; action_type?: string; source?: string; severity?: string; created_at?: string }>(auditData), [auditData])
  const platformOwners = useMemo(() => toArray<{ user_id: string; role?: string; profile?: { nome?: string; email?: string } }>(ownersData), [ownersData])
  const databaseTables = useMemo(
    () => toArray<{ table_name: string; total_rows: number; has_empresa_id: boolean }>(databaseTablesData).sort((a, b) => b.total_rows - a.total_rows),
    [databaseTablesData],
  )

  const supportedActions = useMemo(() => new Set(toArray<string>(healthData?.supported_actions)), [healthData])

  const {
    createCompanyMutation,
    updateCompanyMutation,
    setCompanyLifecycle,
    createUserMutation,
    setUserStatusMutation,
    createPlanMutation,
    updatePlanMutation,
    createSubscriptionMutation,
    setSubscriptionStatusMutation,
    updateSubscriptionBillingMutation,
    updateContractMutation,
    regenerateContractMutation,
    deleteContractMutation,
    respondSupportMutation,
    updateCompanySettingsMutation,
    createPlatformOwnerMutation,
    createSystemAdminMutation,
    cleanupCompanyDataMutation,
    purgeTableDataMutation,
    deleteCompanyByOwnerMutation,
  } = useOwnerCompanyActions()

  const [companyForm, setCompanyForm] = useState({ nome: '', slug: '', adminNome: '', adminEmail: '' })
  const [companyUpdate, setCompanyUpdate] = useState({ empresaId: '', nome: '', status: 'active' })
  const [userForm, setUserForm] = useState({ nome: '', email: '', password: '', role: 'TECNICO', empresa_id: '' })
  const [userStatusForm, setUserStatusForm] = useState({ userId: '', status: 'ativo' })
  const [planForm, setPlanForm] = useState({ code: '', name: '', price_month: '' })
  const [planUpdateForm, setPlanUpdateForm] = useState({ id: '', code: '', name: '', price_month: '' })
  const [subscriptionForm, setSubscriptionForm] = useState({ empresa_id: '', plan_id: '', amount: '', status: 'ativa' })
  const [subscriptionStatusForm, setSubscriptionStatusForm] = useState({ empresaId: '', status: 'ativa' })
  const [subscriptionBillingForm, setSubscriptionBillingForm] = useState({ subscriptionId: '', amount: '', payment_status: 'paid' })
  const [contractForm, setContractForm] = useState({ contractId: '', content: '', summary: '', status: 'ativo' })
  const [contractIdOnly, setContractIdOnly] = useState('')
  const [supportResponseForm, setSupportResponseForm] = useState({ ticketId: '', response: '', status: 'resolvido' })
  const [settingsForm, setSettingsForm] = useState({ empresaId: '', modules: '{}', limits: '{}', features: '{}' })
  const [createOwnerForm, setCreateOwnerForm] = useState({ nome: '', email: '', password: '' })
  const [systemAdminUserId, setSystemAdminUserId] = useState('')
  const [dataControlForm, setDataControlForm] = useState({ empresa_id: '', table_name: '', auth_password: '', keep_company_core: false, keep_billing_data: false, include_auth_users: false })

  const resetFeedback = () => {
    setMessage(null)
    setError(null)
  }

  const runAction = async (fn: () => Promise<unknown>, successText: string) => {
    resetFeedback()
    try {
      await fn()
      setMessage(successText)
    } catch (err: any) {
      setError(String(err?.message ?? err ?? 'Falha na operação.'))
    }
  }

  const activeSummary = useMemo(() => {
    const map: Record<OwnerTabKey, string> = {
      dashboard: 'Visao executiva do ecossistema.',
      empresas: 'Cadastro e governanca de empresas.',
      usuarios: 'Gestao de usuarios globais.',
      planos: 'Catalogo de planos comerciais.',
      assinaturas: 'Operacao de assinaturas.',
      contratos: 'Gestao de contratos e versões.',
      auditoria: 'Trilha de auditoria da plataforma.',
      sistema: 'Operacoes sensiveis Owner Master.',
      suporte: 'Atendimento de chamados.',
      financeiro: 'Receita recorrente e cobranca.',
      'feature-flags': 'Controle de features por empresa.',
      monitoramento: 'Saude operacional do Owner.',
      logs: 'Logs e eventos do sistema.',
      configuracoes: 'Configuracoes por tenant.',
      'owner-master': 'Gestao de contas de plataforma.',
    }
    return map[tab]
  }, [tab])

  const tabs: Array<{ key: OwnerTabKey; label: string }> = [
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
    ...(isOwnerMaster ? [{ key: 'owner-master' as OwnerTabKey, label: 'Owner Master' }] : []),
  ]

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-200" />
      </div>
    )
  }

  if (!isSystemOwner) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-xl border border-rose-500/40 bg-slate-900 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-900/30">
            <ShieldCheck className="h-6 w-6 text-rose-400" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-100">Acesso negado</h2>
          <p className="mt-2 text-sm text-slate-400">Este portal e exclusivo para SYSTEM_OWNER.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">Owner Portal v1.0</h1>
            <p className="text-xs text-slate-400">{activeSummary}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-300">
              Backend: {healthData?.version ?? 'desconhecido'} {checkingHealth ? '(atualizando)' : ''}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{user?.nome}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <button onClick={logout} className="rounded border border-slate-700 px-3 py-2 text-xs hover:bg-slate-800">Sair</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          <nav className="space-y-1">
            {tabs.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setTab(item.key)
                  resetFeedback()
                }}
                className={`w-full rounded px-3 py-2 text-left text-sm ${tab === item.key ? 'bg-sky-600 text-white' : 'text-slate-200 hover:bg-slate-800'}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="space-y-4">
          {tab === 'dashboard' && (
            <Panel title="Dashboard" description="Visao geral da plataforma">
              <div className="grid gap-3 md:grid-cols-4">
                <Stat label="Empresas" value={Number((statsData as any)?.total_companies ?? companies.length)} />
                <Stat label="Usuarios" value={Number((statsData as any)?.total_users ?? users.length)} />
                <Stat label="Assinaturas ativas" value={Number((statsData as any)?.active_subscriptions ?? subscriptions.filter((s) => s.status === 'ativa').length)} />
                <Stat label="MRR" value={Number((statsData as any)?.mrr ?? 0)} />
              </div>
            </Panel>
          )}

          {tab === 'empresas' && (
            <Panel title="Empresas" description="Cadastro e gerenciamento de tenants">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded border border-slate-800 p-3">
                  <h3 className="text-xs font-semibold">Criar empresa</h3>
                  <div className="mt-2 grid gap-2">
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome" value={companyForm.nome} onChange={(e) => setCompanyForm((s) => ({ ...s, nome: e.target.value }))} />
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Slug" value={companyForm.slug} onChange={(e) => setCompanyForm((s) => ({ ...s, slug: e.target.value }))} />
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome admin" value={companyForm.adminNome} onChange={(e) => setCompanyForm((s) => ({ ...s, adminNome: e.target.value }))} />
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Email admin" value={companyForm.adminEmail} onChange={(e) => setCompanyForm((s) => ({ ...s, adminEmail: e.target.value }))} />
                    <button
                      className="rounded bg-sky-600 px-3 py-2 text-sm font-semibold"
                      disabled={createCompanyMutation.isPending || !companyForm.nome || !companyForm.adminEmail}
                      onClick={() => runAction(() => createCompanyMutation.mutateAsync({
                        company: { nome: companyForm.nome, slug: companyForm.slug || undefined },
                        user: { nome: companyForm.adminNome || 'Administrador', email: companyForm.adminEmail, role: 'ADMIN' },
                      }), 'Empresa criada com sucesso.')}
                    >Criar empresa</button>
                  </div>
                </div>

                <div className="rounded border border-slate-800 p-3">
                  <h3 className="text-xs font-semibold">Atualizar empresa</h3>
                  <div className="mt-2 grid gap-2">
                    <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={companyUpdate.empresaId} onChange={(e) => setCompanyUpdate((s) => ({ ...s, empresaId: e.target.value }))}>
                      <option value="">Selecione empresa</option>
                      {companies.map((c) => <option key={c.id} value={c.id}>{c.nome || c.slug || c.id}</option>)}
                    </select>
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Novo nome" value={companyUpdate.nome} onChange={(e) => setCompanyUpdate((s) => ({ ...s, nome: e.target.value }))} />
                    <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={companyUpdate.status} onChange={(e) => setCompanyUpdate((s) => ({ ...s, status: e.target.value }))}>
                      <option value="active">Ativa</option>
                      <option value="blocked">Bloqueada</option>
                      <option value="suspended">Suspensa</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        className="rounded border border-slate-600 px-3 py-2 text-sm"
                        disabled={!companyUpdate.empresaId || updateCompanyMutation.isPending}
                        onClick={() => runAction(() => updateCompanyMutation.mutateAsync({ empresaId: companyUpdate.empresaId, company: { nome: companyUpdate.nome || undefined } }), 'Empresa atualizada.')}
                      >Salvar</button>
                      <button
                        className="rounded border border-amber-600 px-3 py-2 text-sm text-amber-300"
                        disabled={!companyUpdate.empresaId || setCompanyLifecycle.isPending}
                        onClick={() => runAction(() => setCompanyLifecycle.mutateAsync({ empresaId: companyUpdate.empresaId, status: companyUpdate.status }), 'Status da empresa atualizado.')}
                      >Aplicar status</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 max-h-80 overflow-auto rounded border border-slate-800">
                <table className="w-full text-xs">
                  <thead className="bg-slate-950"><tr><th className="px-3 py-2 text-left">Empresa</th><th className="px-3 py-2 text-left">Slug</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
                  <tbody>
                    {companies.map((c) => <tr key={c.id} className="border-t border-slate-800"><td className="px-3 py-2">{c.nome || c.id}</td><td className="px-3 py-2">{c.slug || '-'}</td><td className="px-3 py-2">{c.status || '-'}</td></tr>)}
                    {loadingCompanies && <tr><td className="px-3 py-3 text-slate-400" colSpan={3}>Carregando...</td></tr>}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {tab === 'usuarios' && (
            <Panel title="Usuarios" description="Gestao de usuarios globais e por empresa">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded border border-slate-800 p-3">
                  <h3 className="text-xs font-semibold">Criar usuario</h3>
                  <div className="mt-2 grid gap-2">
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome" value={userForm.nome} onChange={(e) => setUserForm((s) => ({ ...s, nome: e.target.value }))} />
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm((s) => ({ ...s, email: e.target.value }))} />
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" type="password" placeholder="Senha" value={userForm.password} onChange={(e) => setUserForm((s) => ({ ...s, password: e.target.value }))} />
                    <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={userForm.role} onChange={(e) => setUserForm((s) => ({ ...s, role: e.target.value }))}>
                      <option value="ADMIN">ADMIN</option><option value="GESTOR">GESTOR</option><option value="TECNICO">TECNICO</option>
                    </select>
                    <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={userForm.empresa_id} onChange={(e) => setUserForm((s) => ({ ...s, empresa_id: e.target.value }))}>
                      <option value="">Selecione empresa</option>
                      {companies.map((c) => <option key={c.id} value={c.id}>{c.nome || c.id}</option>)}
                    </select>
                    <button className="rounded bg-sky-600 px-3 py-2 text-sm font-semibold" disabled={createUserMutation.isPending || !userForm.email || !userForm.role} onClick={() => runAction(() => createUserMutation.mutateAsync({
                      nome: userForm.nome || 'Usuario',
                      email: userForm.email,
                      password: userForm.password || undefined,
                      role: userForm.role,
                      empresa_id: userForm.empresa_id || undefined,
                    }), 'Usuario criado com sucesso.')}>Criar usuario</button>
                  </div>
                </div>

                <div className="rounded border border-slate-800 p-3">
                  <h3 className="text-xs font-semibold">Alterar status</h3>
                  <div className="mt-2 grid gap-2">
                    <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={userStatusForm.userId} onChange={(e) => setUserStatusForm((s) => ({ ...s, userId: e.target.value }))}>
                      <option value="">Selecione usuario</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.nome || u.email || u.id}</option>)}
                    </select>
                    <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={userStatusForm.status} onChange={(e) => setUserStatusForm((s) => ({ ...s, status: e.target.value }))}>
                      <option value="ativo">Ativo</option><option value="inativo">Inativo</option>
                    </select>
                    <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!userStatusForm.userId || setUserStatusMutation.isPending} onClick={() => runAction(() => setUserStatusMutation.mutateAsync({ userId: userStatusForm.userId, status: userStatusForm.status }), 'Status do usuario atualizado.')}>Aplicar</button>
                  </div>
                </div>
              </div>

              <div className="mt-4 max-h-80 overflow-auto rounded border border-slate-800">
                <table className="w-full text-xs"><thead className="bg-slate-950"><tr><th className="px-3 py-2 text-left">Nome</th><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Status</th></tr></thead><tbody>
                  {users.map((u) => <tr key={u.id} className="border-t border-slate-800"><td className="px-3 py-2">{u.nome || '-'}</td><td className="px-3 py-2">{u.email || '-'}</td><td className="px-3 py-2">{u.status || '-'}</td></tr>)}
                  {loadingUsers && <tr><td className="px-3 py-3 text-slate-400" colSpan={3}>Carregando...</td></tr>}
                </tbody></table>
              </div>
            </Panel>
          )}

          {tab === 'planos' && (
            <Panel title="Planos" description="Criacao e manutencao de planos">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded border border-slate-800 p-3">
                  <h3 className="text-xs font-semibold">Criar plano</h3>
                  <div className="mt-2 grid gap-2">
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Codigo" value={planForm.code} onChange={(e) => setPlanForm((s) => ({ ...s, code: e.target.value }))} />
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome" value={planForm.name} onChange={(e) => setPlanForm((s) => ({ ...s, name: e.target.value }))} />
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Preco mensal" value={planForm.price_month} onChange={(e) => setPlanForm((s) => ({ ...s, price_month: e.target.value }))} />
                    <button className="rounded bg-sky-600 px-3 py-2 text-sm font-semibold" disabled={createPlanMutation.isPending || !planForm.name} onClick={() => runAction(() => createPlanMutation.mutateAsync({
                      code: planForm.code,
                      name: planForm.name,
                      price_month: planForm.price_month ? Number(planForm.price_month) : undefined,
                    }), 'Plano criado com sucesso.')}>Criar plano</button>
                  </div>
                </div>

                <div className="rounded border border-slate-800 p-3">
                  <h3 className="text-xs font-semibold">Atualizar plano</h3>
                  <div className="mt-2 grid gap-2">
                    <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={planUpdateForm.id} onChange={(e) => setPlanUpdateForm((s) => ({ ...s, id: e.target.value }))}>
                      <option value="">Selecione plano</option>
                      {plans.map((p) => <option key={p.id} value={p.id}>{p.name || p.code || p.id}</option>)}
                    </select>
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Novo codigo" value={planUpdateForm.code} onChange={(e) => setPlanUpdateForm((s) => ({ ...s, code: e.target.value }))} />
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Novo nome" value={planUpdateForm.name} onChange={(e) => setPlanUpdateForm((s) => ({ ...s, name: e.target.value }))} />
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Novo preco" value={planUpdateForm.price_month} onChange={(e) => setPlanUpdateForm((s) => ({ ...s, price_month: e.target.value }))} />
                    <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={updatePlanMutation.isPending || !planUpdateForm.id} onClick={() => runAction(() => updatePlanMutation.mutateAsync({
                      id: planUpdateForm.id,
                      code: planUpdateForm.code || undefined,
                      name: planUpdateForm.name || undefined,
                      price_month: planUpdateForm.price_month ? Number(planUpdateForm.price_month) : undefined,
                    }), 'Plano atualizado.')}>Salvar</button>
                  </div>
                </div>
              </div>

              <div className="mt-4 max-h-80 overflow-auto rounded border border-slate-800"><table className="w-full text-xs"><thead className="bg-slate-950"><tr><th className="px-3 py-2 text-left">Plano</th><th className="px-3 py-2 text-left">Codigo</th><th className="px-3 py-2 text-right">Preco</th></tr></thead><tbody>
                {plans.map((p) => <tr key={p.id} className="border-t border-slate-800"><td className="px-3 py-2">{p.name || '-'}</td><td className="px-3 py-2">{p.code || '-'}</td><td className="px-3 py-2 text-right">{Number(p.price_month || 0)}</td></tr>)}
                {loadingPlans && <tr><td className="px-3 py-3 text-slate-400" colSpan={3}>Carregando...</td></tr>}
              </tbody></table></div>
            </Panel>
          )}

          {tab === 'assinaturas' && (
            <Panel title="Assinaturas" description="Criacao e status das assinaturas">
              <div className="grid gap-3 md:grid-cols-3">
                <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={subscriptionForm.empresa_id} onChange={(e) => setSubscriptionForm((s) => ({ ...s, empresa_id: e.target.value }))}>
                  <option value="">Empresa</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.nome || c.id}</option>)}
                </select>
                <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={subscriptionForm.plan_id} onChange={(e) => setSubscriptionForm((s) => ({ ...s, plan_id: e.target.value }))}>
                  <option value="">Plano</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name || p.code || p.id}</option>)}
                </select>
                <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Valor" value={subscriptionForm.amount} onChange={(e) => setSubscriptionForm((s) => ({ ...s, amount: e.target.value }))} />
                <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={subscriptionForm.status} onChange={(e) => setSubscriptionForm((s) => ({ ...s, status: e.target.value }))}>
                  <option value="ativa">Ativa</option><option value="atrasada">Atrasada</option><option value="cancelada">Cancelada</option><option value="teste">Teste</option>
                </select>
                <button className="rounded bg-sky-600 px-3 py-2 text-sm font-semibold" disabled={createSubscriptionMutation.isPending || !subscriptionForm.empresa_id || !subscriptionForm.plan_id} onClick={() => runAction(() => createSubscriptionMutation.mutateAsync({
                  empresa_id: subscriptionForm.empresa_id,
                  plan_id: subscriptionForm.plan_id,
                  amount: subscriptionForm.amount ? Number(subscriptionForm.amount) : undefined,
                  status: subscriptionForm.status,
                }), 'Assinatura criada com sucesso.')}>Criar assinatura</button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={subscriptionStatusForm.empresaId} onChange={(e) => setSubscriptionStatusForm((s) => ({ ...s, empresaId: e.target.value }))}>
                  <option value="">Empresa para status</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.nome || c.id}</option>)}
                </select>
                <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={subscriptionStatusForm.status} onChange={(e) => setSubscriptionStatusForm((s) => ({ ...s, status: e.target.value }))}>
                  <option value="ativa">Ativa</option><option value="atrasada">Atrasada</option><option value="cancelada">Cancelada</option><option value="teste">Teste</option>
                </select>
                <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!subscriptionStatusForm.empresaId || setSubscriptionStatusMutation.isPending} onClick={() => runAction(() => setSubscriptionStatusMutation.mutateAsync({ empresaId: subscriptionStatusForm.empresaId, status: subscriptionStatusForm.status }), 'Status de assinatura atualizado.')}>Aplicar status</button>
              </div>

              <div className="mt-4 max-h-80 overflow-auto rounded border border-slate-800"><table className="w-full text-xs"><thead className="bg-slate-950"><tr><th className="px-3 py-2 text-left">Empresa</th><th className="px-3 py-2 text-left">Plano</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Valor</th></tr></thead><tbody>
                {subscriptions.map((s) => <tr key={s.id} className="border-t border-slate-800"><td className="px-3 py-2">{s.empresa_id || '-'}</td><td className="px-3 py-2">{s.plan_id || '-'}</td><td className="px-3 py-2">{s.status || '-'}</td><td className="px-3 py-2 text-right">{Number(s.amount || 0)}</td></tr>)}
                {loadingSubscriptions && <tr><td className="px-3 py-3 text-slate-400" colSpan={4}>Carregando...</td></tr>}
              </tbody></table></div>
            </Panel>
          )}

          {tab === 'contratos' && (
            <Panel title="Contratos" description="Gestao de documentos contratuais">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-2 rounded border border-slate-800 p-3">
                  <h3 className="text-xs font-semibold">Atualizar contrato</h3>
                  <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Contract ID" value={contractForm.contractId} onChange={(e) => setContractForm((s) => ({ ...s, contractId: e.target.value }))} />
                  <textarea className="min-h-[100px] rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Conteudo" value={contractForm.content} onChange={(e) => setContractForm((s) => ({ ...s, content: e.target.value }))} />
                  <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Resumo" value={contractForm.summary} onChange={(e) => setContractForm((s) => ({ ...s, summary: e.target.value }))} />
                  <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Status" value={contractForm.status} onChange={(e) => setContractForm((s) => ({ ...s, status: e.target.value }))} />
                  <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={updateContractMutation.isPending || !contractForm.contractId} onClick={() => runAction(() => updateContractMutation.mutateAsync({
                    contractId: contractForm.contractId,
                    content: contractForm.content,
                    summary: contractForm.summary || undefined,
                    status: contractForm.status || undefined,
                  }), 'Contrato atualizado com sucesso.')}>Salvar contrato</button>
                </div>

                <div className="grid gap-2 rounded border border-slate-800 p-3">
                  <h3 className="text-xs font-semibold">Acoes de contrato</h3>
                  <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Contract ID" value={contractIdOnly} onChange={(e) => setContractIdOnly(e.target.value)} />
                  <button className="rounded border border-amber-600 px-3 py-2 text-sm text-amber-300" disabled={!contractIdOnly || regenerateContractMutation.isPending} onClick={() => runAction(() => regenerateContractMutation.mutateAsync(contractIdOnly), 'Contrato regenerado com sucesso.')}>Regenerar contrato</button>
                  <button className="rounded border border-rose-600 px-3 py-2 text-sm text-rose-300" disabled={!contractIdOnly || deleteContractMutation.isPending} onClick={() => runAction(() => deleteContractMutation.mutateAsync(contractIdOnly), 'Contrato removido com sucesso.')}>Excluir contrato</button>
                </div>
              </div>

              <div className="mt-4 max-h-80 overflow-auto rounded border border-slate-800"><table className="w-full text-xs"><thead className="bg-slate-950"><tr><th className="px-3 py-2 text-left">Contrato</th><th className="px-3 py-2 text-left">Empresa</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Atualizado em</th></tr></thead><tbody>
                {contracts.map((c) => <tr key={c.id} className="border-t border-slate-800"><td className="px-3 py-2">{c.id}</td><td className="px-3 py-2">{c.empresa_id || '-'}</td><td className="px-3 py-2">{c.status || '-'}</td><td className="px-3 py-2">{c.updated_at || '-'}</td></tr>)}
                {loadingContracts && <tr><td className="px-3 py-3 text-slate-400" colSpan={4}>Carregando...</td></tr>}
              </tbody></table></div>
            </Panel>
          )}

          {tab === 'suporte' && (
            <Panel title="Suporte" description="Gestao de chamados">
              <div className="grid gap-3 md:grid-cols-3">
                <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={supportResponseForm.ticketId} onChange={(e) => setSupportResponseForm((s) => ({ ...s, ticketId: e.target.value }))}>
                  <option value="">Selecione ticket</option>
                  {tickets.map((t) => <option key={t.id} value={t.id}>{t.subject || t.id}</option>)}
                </select>
                <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Resposta" value={supportResponseForm.response} onChange={(e) => setSupportResponseForm((s) => ({ ...s, response: e.target.value }))} />
                <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={supportResponseForm.status} onChange={(e) => setSupportResponseForm((s) => ({ ...s, status: e.target.value }))}>
                  <option value="resolvido">Resolvido</option><option value="em_andamento">Em andamento</option><option value="aberto">Aberto</option>
                </select>
                <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!supportResponseForm.ticketId || !supportResponseForm.response || respondSupportMutation.isPending} onClick={() => runAction(() => respondSupportMutation.mutateAsync({ ticketId: supportResponseForm.ticketId, response: supportResponseForm.response, status: supportResponseForm.status }), 'Ticket respondido com sucesso.')}>Responder ticket</button>
              </div>

              <div className="mt-4 max-h-80 overflow-auto rounded border border-slate-800"><table className="w-full text-xs"><thead className="bg-slate-950"><tr><th className="px-3 py-2 text-left">Assunto</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Prioridade</th></tr></thead><tbody>
                {tickets.map((t) => <tr key={t.id} className="border-t border-slate-800"><td className="px-3 py-2">{t.subject || t.id}</td><td className="px-3 py-2">{t.status || '-'}</td><td className="px-3 py-2">{t.priority || '-'}</td></tr>)}
                {loadingSupport && <tr><td className="px-3 py-3 text-slate-400" colSpan={3}>Carregando...</td></tr>}
              </tbody></table></div>
            </Panel>
          )}

          {tab === 'auditoria' && (
            <Panel title="Auditoria" description="Rastreabilidade de operacoes Owner">
              <div className="max-h-96 overflow-auto rounded border border-slate-800"><table className="w-full text-xs"><thead className="bg-slate-950"><tr><th className="px-3 py-2 text-left">Acao</th><th className="px-3 py-2 text-left">Origem</th><th className="px-3 py-2 text-left">Severidade</th><th className="px-3 py-2 text-left">Data</th></tr></thead><tbody>
                {audit.map((a) => <tr key={a.id} className="border-t border-slate-800"><td className="px-3 py-2">{a.action_type || '-'}</td><td className="px-3 py-2">{a.source || '-'}</td><td className="px-3 py-2">{a.severity || '-'}</td><td className="px-3 py-2">{a.created_at || '-'}</td></tr>)}
                {loadingAudit && <tr><td className="px-3 py-3 text-slate-400" colSpan={4}>Carregando...</td></tr>}
              </tbody></table></div>
            </Panel>
          )}

          {tab === 'logs' && (
            <Panel title="Logs" description="Mesmo feed de auditoria para leitura tecnica">
              <div className="max-h-96 overflow-auto rounded border border-slate-800"><table className="w-full text-xs"><thead className="bg-slate-950"><tr><th className="px-3 py-2 text-left">ID</th><th className="px-3 py-2 text-left">Acao</th><th className="px-3 py-2 text-left">Fonte</th></tr></thead><tbody>
                {audit.map((a) => <tr key={a.id} className="border-t border-slate-800"><td className="px-3 py-2">{a.id}</td><td className="px-3 py-2">{a.action_type || '-'}</td><td className="px-3 py-2">{a.source || '-'}</td></tr>)}
              </tbody></table></div>
            </Panel>
          )}

          {tab === 'financeiro' && (
            <Panel title="Financeiro" description="Ajustes de cobranca e metricas">
              <div className="grid gap-3 md:grid-cols-3">
                <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Subscription ID" value={subscriptionBillingForm.subscriptionId} onChange={(e) => setSubscriptionBillingForm((s) => ({ ...s, subscriptionId: e.target.value }))} />
                <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Novo valor" value={subscriptionBillingForm.amount} onChange={(e) => setSubscriptionBillingForm((s) => ({ ...s, amount: e.target.value }))} />
                <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={subscriptionBillingForm.payment_status} onChange={(e) => setSubscriptionBillingForm((s) => ({ ...s, payment_status: e.target.value }))}>
                  <option value="paid">Pago</option><option value="pending">Pendente</option><option value="late">Atrasado</option>
                </select>
                <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!subscriptionBillingForm.subscriptionId || updateSubscriptionBillingMutation.isPending} onClick={() => runAction(() => updateSubscriptionBillingMutation.mutateAsync({
                  subscriptionId: subscriptionBillingForm.subscriptionId,
                  billing: {
                    amount: subscriptionBillingForm.amount ? Number(subscriptionBillingForm.amount) : undefined,
                    payment_status: subscriptionBillingForm.payment_status,
                  },
                }), 'Cobranca atualizada com sucesso.')}>Atualizar cobranca</button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <Stat label="MRR" value={Number((statsData as any)?.mrr ?? 0)} />
                <Stat label="ARR" value={Number((statsData as any)?.arr ?? 0)} />
                <Stat label="Churn" value={Number((statsData as any)?.churn ?? 0)} />
                <Stat label="Assinaturas" value={subscriptions.length} />
              </div>
            </Panel>
          )}

          {(tab === 'configuracoes' || tab === 'feature-flags') && (
            <Panel title={tab === 'configuracoes' ? 'Configuracoes' : 'Feature Flags'} description="Configuracoes por empresa em JSON">
              <OwnerSettingsEditor
                companies={companies}
                settingsForm={settingsForm}
                setSettingsForm={setSettingsForm}
                runAction={runAction}
                updateCompanySettingsMutation={updateCompanySettingsMutation}
                useOwnerCompanySettings={useOwnerCompanySettings}
              />
            </Panel>
          )}

          {tab === 'monitoramento' && (
            <Panel title="Monitoramento" description="Saude operacional e cobertura de acoes">
              <div className="grid gap-3 md:grid-cols-3">
                <Stat label="Service" value={healthData?.service || 'owner-portal-admin'} />
                <Stat label="Status" value={healthData?.status || 'desconhecido'} />
                <Stat label="Versao" value={healthData?.version || 'n/a'} />
              </div>
              <div className="mt-4 rounded border border-slate-800 p-3">
                <p className="text-xs text-slate-300">Acoes suportadas ({supportedActions.size})</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.from(supportedActions).map((action) => (
                    <span key={action} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-300">{action}</span>
                  ))}
                </div>
              </div>
            </Panel>
          )}

          {tab === 'sistema' && (
            <Panel title="Sistema" description="Operacoes sensiveis de controle de dados">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded border border-slate-800 p-3">
                  <h3 className="text-xs font-semibold">Promover SYSTEM_ADMIN</h3>
                  <div className="mt-2 flex gap-2">
                    <input className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="User ID" value={systemAdminUserId} onChange={(e) => setSystemAdminUserId(e.target.value)} />
                    <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={!systemAdminUserId || createSystemAdminMutation.isPending} onClick={() => runAction(() => createSystemAdminMutation.mutateAsync({ userId: systemAdminUserId }), 'SYSTEM_ADMIN concedido com sucesso.')}>Promover</button>
                  </div>
                </div>

                <div className="rounded border border-slate-800 p-3">
                  <h3 className="text-xs font-semibold">Data Control</h3>
                  <div className="mt-2 grid gap-2">
                    <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={dataControlForm.empresa_id} onChange={(e) => setDataControlForm((s) => ({ ...s, empresa_id: e.target.value }))}>
                      <option value="">Empresa alvo</option>
                      {companies.map((c) => <option key={c.id} value={c.id}>{c.nome || c.id}</option>)}
                    </select>
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome da tabela" value={dataControlForm.table_name} onChange={(e) => setDataControlForm((s) => ({ ...s, table_name: e.target.value }))} />
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" type="password" placeholder="Senha de confirmacao" value={dataControlForm.auth_password} onChange={(e) => setDataControlForm((s) => ({ ...s, auth_password: e.target.value }))} />
                    <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={dataControlForm.keep_company_core} onChange={(e) => setDataControlForm((s) => ({ ...s, keep_company_core: e.target.checked }))} />Preservar core da empresa</label>
                    <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={dataControlForm.keep_billing_data} onChange={(e) => setDataControlForm((s) => ({ ...s, keep_billing_data: e.target.checked }))} />Preservar dados de billing</label>
                    <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={dataControlForm.include_auth_users} onChange={(e) => setDataControlForm((s) => ({ ...s, include_auth_users: e.target.checked }))} />Incluir usuarios auth</label>
                    <div className="grid gap-2 md:grid-cols-3">
                      <button className="rounded border border-amber-600 px-3 py-2 text-xs text-amber-300" disabled={!dataControlForm.empresa_id || !dataControlForm.auth_password || cleanupCompanyDataMutation.isPending} onClick={() => runAction(() => cleanupCompanyDataMutation.mutateAsync({
                        empresa_id: dataControlForm.empresa_id,
                        keep_company_core: dataControlForm.keep_company_core,
                        keep_billing_data: dataControlForm.keep_billing_data,
                        include_auth_users: dataControlForm.include_auth_users,
                        auth_password: dataControlForm.auth_password,
                      }), 'Limpeza de empresa executada com sucesso.')}>Limpar empresa</button>
                      <button className="rounded border border-amber-600 px-3 py-2 text-xs text-amber-300" disabled={!dataControlForm.table_name || !dataControlForm.auth_password || purgeTableDataMutation.isPending} onClick={() => runAction(() => purgeTableDataMutation.mutateAsync({
                        table_name: dataControlForm.table_name,
                        empresa_id: dataControlForm.empresa_id || undefined,
                        auth_password: dataControlForm.auth_password,
                      }), 'Limpeza de tabela executada com sucesso.')}>Limpar tabela</button>
                      <button className="rounded border border-rose-600 px-3 py-2 text-xs text-rose-300" disabled={!dataControlForm.empresa_id || !dataControlForm.auth_password || deleteCompanyByOwnerMutation.isPending} onClick={() => runAction(() => deleteCompanyByOwnerMutation.mutateAsync({
                        empresa_id: dataControlForm.empresa_id,
                        include_auth_users: dataControlForm.include_auth_users,
                        auth_password: dataControlForm.auth_password,
                      }), 'Empresa removida com sucesso.')}>Excluir empresa</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 max-h-72 overflow-auto rounded border border-slate-800"><table className="w-full text-xs"><thead className="bg-slate-950"><tr><th className="px-3 py-2 text-left">Tabela</th><th className="px-3 py-2 text-right">Linhas</th><th className="px-3 py-2 text-center">empresa_id</th></tr></thead><tbody>
                {databaseTables.map((t) => <tr key={t.table_name} className="border-t border-slate-800"><td className="px-3 py-2">{t.table_name}</td><td className="px-3 py-2 text-right">{t.total_rows}</td><td className="px-3 py-2 text-center">{t.has_empresa_id ? 'sim' : 'nao'}</td></tr>)}
                {loadingDatabaseTables && <tr><td className="px-3 py-3 text-slate-400" colSpan={3}>Carregando tabelas...</td></tr>}
              </tbody></table></div>
            </Panel>
          )}

          {tab === 'owner-master' && isOwnerMaster && (
            <Panel title="Owner Master" description="Gestao de contas de plataforma">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded border border-slate-800 p-3">
                  <h3 className="text-xs font-semibold">Criar owner/admin de plataforma</h3>
                  <div className="mt-2 grid gap-2">
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome" value={createOwnerForm.nome} onChange={(e) => setCreateOwnerForm((s) => ({ ...s, nome: e.target.value }))} />
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Email" value={createOwnerForm.email} onChange={(e) => setCreateOwnerForm((s) => ({ ...s, email: e.target.value }))} />
                    <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" type="password" placeholder="Senha (opcional)" value={createOwnerForm.password} onChange={(e) => setCreateOwnerForm((s) => ({ ...s, password: e.target.value }))} />
                    <button className="rounded bg-sky-600 px-3 py-2 text-sm font-semibold" disabled={createPlatformOwnerMutation.isPending || !createOwnerForm.nome || !createOwnerForm.email} onClick={() => runAction(() => createPlatformOwnerMutation.mutateAsync({
                      nome: createOwnerForm.nome,
                      email: createOwnerForm.email,
                      password: createOwnerForm.password || undefined,
                    }), 'Conta de plataforma criada com sucesso.')}>Criar conta</button>
                  </div>
                </div>

                <div className="rounded border border-slate-800 p-3">
                  <h3 className="text-xs font-semibold">Owners da plataforma</h3>
                  <div className="mt-2 max-h-64 overflow-auto rounded border border-slate-800"><table className="w-full text-xs"><thead className="bg-slate-950"><tr><th className="px-3 py-2 text-left">Nome</th><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Role</th></tr></thead><tbody>
                    {platformOwners.map((o) => <tr key={o.user_id} className="border-t border-slate-800"><td className="px-3 py-2">{o.profile?.nome || '-'}</td><td className="px-3 py-2">{o.profile?.email || '-'}</td><td className="px-3 py-2">{o.role || '-'}</td></tr>)}
                    {loadingOwners && <tr><td className="px-3 py-3 text-slate-400" colSpan={3}>Carregando...</td></tr>}
                  </tbody></table></div>
                </div>
              </div>
            </Panel>
          )}

          {message && <p className="rounded border border-emerald-600/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">{message}</p>}
          {error && <p className="rounded border border-rose-600/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">{error}</p>}
        </main>
      </div>
    </div>
  )
}

function OwnerSettingsEditor({
  companies,
  settingsForm,
  setSettingsForm,
  runAction,
  updateCompanySettingsMutation,
  useOwnerCompanySettings,
}: {
  companies: Array<{ id: string; nome?: string }>
  settingsForm: { empresaId: string; modules: string; limits: string; features: string }
  setSettingsForm: React.Dispatch<React.SetStateAction<{ empresaId: string; modules: string; limits: string; features: string }>>
  runAction: (fn: () => Promise<unknown>, successText: string) => Promise<void>
  updateCompanySettingsMutation: { isPending: boolean; mutateAsync: (payload: { empresaId: string; settings: Record<string, unknown> }) => Promise<unknown> }
  useOwnerCompanySettings: (empresaId?: string | null) => { data?: { settings: Array<{ chave: string; valor: Record<string, unknown> }> }
}
}) {
  const selected = useOwnerCompanySettings(settingsForm.empresaId || null)
  const loadedSettings = toArray<{ chave: string; valor: Record<string, unknown> }>(selected.data?.settings)

  return (
    <div className="space-y-3">
      <select className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={settingsForm.empresaId} onChange={(e) => setSettingsForm((s) => ({ ...s, empresaId: e.target.value }))}>
        <option value="">Selecione empresa</option>
        {companies.map((c) => <option key={c.id} value={c.id}>{c.nome || c.id}</option>)}
      </select>
      <textarea className="min-h-[90px] w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs" placeholder="JSON modules" value={settingsForm.modules} onChange={(e) => setSettingsForm((s) => ({ ...s, modules: e.target.value }))} />
      <textarea className="min-h-[90px] w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs" placeholder="JSON limits" value={settingsForm.limits} onChange={(e) => setSettingsForm((s) => ({ ...s, limits: e.target.value }))} />
      <textarea className="min-h-[90px] w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs" placeholder="JSON features" value={settingsForm.features} onChange={(e) => setSettingsForm((s) => ({ ...s, features: e.target.value }))} />
      <button
        className="rounded border border-slate-600 px-3 py-2 text-sm"
        disabled={!settingsForm.empresaId || updateCompanySettingsMutation.isPending}
        onClick={() => runAction(async () => {
          const modules = settingsForm.modules.trim() ? JSON.parse(settingsForm.modules) : {}
          const limits = settingsForm.limits.trim() ? JSON.parse(settingsForm.limits) : {}
          const features = settingsForm.features.trim() ? JSON.parse(settingsForm.features) : {}
          return updateCompanySettingsMutation.mutateAsync({
            empresaId: settingsForm.empresaId,
            settings: { modules, limits, features },
          })
        }, 'Configuracoes atualizadas com sucesso.')}
      >
        Salvar configuracoes
      </button>

      <div className="rounded border border-slate-800 bg-slate-950 p-3">
        <p className="text-xs text-slate-400">Configuracoes atuais</p>
        <pre className="mt-2 overflow-auto text-xs text-slate-300">{JSON.stringify(loadedSettings, null, 2)}</pre>
      </div>
    </div>
  )
}
