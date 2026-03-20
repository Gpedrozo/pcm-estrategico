import { useEffect, useMemo, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
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
  useOwner2Tables,
  useOwner2Subscriptions,
  useOwner2Tickets,
  useOwner2Users,
} from '@/hooks/useOwner2Portal'

const OWNER2_TABS = [
  'dashboard',
  'empresas',
  'usuarios',
  'planos',
  'assinaturas',
  'contratos',
  'suporte',
  'configuracoes',
  'auditoria',
  'owner-master',
] as const

type Owner2Tab = (typeof OWNER2_TABS)[number]

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

export default function Owner2() {
  const { isSystemOwner, isLoading, user } = useAuth()
  const [activeTab, setActiveTab] = useState<Owner2Tab>('dashboard')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const [planCode, setPlanCode] = useState('')
  const [planName, setPlanName] = useState('')
  const [planPrice, setPlanPrice] = useState('0')

  const [subscriptionPlanId, setSubscriptionPlanId] = useState('')
  const [subscriptionAmount, setSubscriptionAmount] = useState('0')
  const [planCodeToChange, setPlanCodeToChange] = useState('')

  const [selectedContractId, setSelectedContractId] = useState('')
  const [contractContent, setContractContent] = useState('')
  const [contractSummary, setContractSummary] = useState('')

  const [selectedTicketId, setSelectedTicketId] = useState('')
  const [ticketResponse, setTicketResponse] = useState('')

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
  const usersQuery = useOwner2Users(activeTab === 'usuarios' || activeTab === 'configuracoes' || activeTab === 'empresas')
  const plansQuery = useOwner2Plans(activeTab === 'planos' || activeTab === 'assinaturas')
  const subscriptionsQuery = useOwner2Subscriptions(activeTab === 'assinaturas' || activeTab === 'dashboard')
  const contractsQuery = useOwner2Contracts(activeTab === 'contratos')
  const ticketsQuery = useOwner2Tickets(activeTab === 'suporte')
  const auditsQuery = useOwner2Audits(activeTab === 'auditoria')
  const ownersQuery = useOwner2PlatformOwners(activeTab === 'owner-master')
  const tablesQuery = useOwner2Tables(companyId || undefined, activeTab === 'dashboard')
  const settingsQuery = useOwner2Settings(companyId || undefined, activeTab === 'configuracoes')
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
    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(String(users[0]?.id ?? ''))
    }
  }, [selectedUserId, users])

  useEffect(() => {
    if (!selectedContractId && contracts.length > 0) {
      setSelectedContractId(String(contracts[0]?.id ?? ''))
    }
  }, [contracts, selectedContractId])

  useEffect(() => {
    if (!selectedTicketId && tickets.length > 0) {
      setSelectedTicketId(String(tickets[0]?.id ?? ''))
    }
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

  function renderConnectionBadge(label: string, ok: boolean, qtd: number | string) {
    return (
      <div className={`rounded-lg border px-3 py-2 text-xs ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
        <p className="font-medium">{label}</p>
        <p>{ok ? 'Conectado' : 'Sem dados'} · {qtd}</p>
      </div>
    )
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Owner2</h1>
            <p className="text-xs text-slate-600">Painel operacional da plataforma (modo simplificado)</p>
          </div>
          <div className="text-xs text-slate-600">
            <p>Usuário: {user?.email}</p>
            <p>Health: {String((healthQuery.data as any)?.status ?? 'n/a')}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1600px] gap-4 p-4 lg:grid-cols-[220px,1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-3">
          <nav className="space-y-1">
            {OWNER2_TABS.map((tab) => (
              <button
                key={tab}
                className={`w-full rounded px-3 py-2 text-left text-sm ${activeTab === tab ? 'bg-sky-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>
        </aside>

        <section className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <select className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="">Empresa (escopo)</option>
                {companies.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>{String(c.nome ?? c.slug ?? c.id)}</option>
                ))}
              </select>
              <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Senha de confirmação para ações críticas" />
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Empresas</p>
                  <p className="mt-1 text-2xl font-semibold">{companies.length}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Usuários</p>
                  <p className="mt-1 text-2xl font-semibold">{users.length}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Assinaturas</p>
                  <p className="mt-1 text-2xl font-semibold">{subscriptions.length}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Tickets</p>
                  <p className="mt-1 text-2xl font-semibold">{tickets.length}</p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Conectividade das áreas</h2>
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {renderConnectionBadge('Empresas', !companiesQuery.isError, companies.length)}
                  {renderConnectionBadge('Usuários', !usersQuery.isError, users.length)}
                  {renderConnectionBadge('Planos', !plansQuery.isError, plans.length)}
                  {renderConnectionBadge('Assinaturas', !subscriptionsQuery.isError, subscriptions.length)}
                  {renderConnectionBadge('Contratos', !contractsQuery.isError, contracts.length)}
                  {renderConnectionBadge('Suporte', !ticketsQuery.isError, tickets.length)}
                  {renderConnectionBadge('Auditoria', !auditsQuery.isError, logs.length)}
                  {renderConnectionBadge('Tabelas', !tablesQuery.isError, tables.length)}
                  {renderConnectionBadge('Settings', !settingsQuery.isError, settings.length)}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Tabelas conectadas (somente leitura)</h2>
                <p className="mt-1 text-xs text-slate-600">Visibilidade operacional sem comandos SQL na tela.</p>
                <div className="mt-3 max-h-[220px] overflow-auto rounded border border-slate-200 p-2">
                  <div className="flex flex-wrap gap-2">
                    {tables.length === 0 && <span className="text-xs text-slate-500">Sem tabelas para o escopo atual.</span>}
                    {tables.map((t, idx) => (
                      <span key={`${String(t.table_name ?? t.name ?? 'tbl')}-${idx}`} className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {String(t.table_name ?? t.name ?? '-')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Resumo executivo</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {String((dashboardQuery.data as any)?.message ?? 'Painel operacional pronto. Use as abas para ações diretas sem edição técnica.')}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'empresas' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Nova empresa</h2>
                <div className="mt-3 grid gap-2">
                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Nome da empresa" />
                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={newCompanySlug} onChange={(e) => setNewCompanySlug(e.target.value)} placeholder="Slug (opcional)" />
                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} placeholder="Nome do administrador" />
                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="Email do administrador" />
                  <button
                    className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold text-white"
                    disabled={busy || !newCompanyName || !newAdminName || !newAdminEmail}
                    onClick={() => runAction('create_company', {
                      company: { nome: newCompanyName, slug: newCompanySlug || undefined },
                      user: { nome: newAdminName, email: newAdminEmail, role: 'ADMIN' },
                    }, 'Empresa criada com sucesso.')}
                  >
                    Criar empresa
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Ações rápidas da empresa selecionada</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button className="rounded border border-slate-300 px-3 py-2 text-sm" disabled={busy || !companyId} onClick={() => runAction('set_company_status', { empresa_id: companyId, status: 'active' }, 'Empresa ativada.')}>Ativar</button>
                  <button className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !companyId} onClick={() => runAction('set_company_status', { empresa_id: companyId, status: 'blocked' }, 'Empresa bloqueada.')}>Bloquear</button>
                  <button className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !companyId || !authPassword} onClick={() => runAction('cleanup_company_data', { empresa_id: companyId, auth_password: authPassword, keep_company_core: false, keep_billing_data: false, include_auth_users: true }, 'Limpeza completa executada.')}>Limpeza completa</button>
                  <button className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700" disabled={busy || !companyId || !authPassword || !isOwnerMaster} onClick={() => runAction('delete_company', { empresa_id: companyId, auth_password: authPassword, include_auth_users: true }, 'Empresa excluída definitivamente.')}>Excluir empresa</button>
                </div>
              </div>

              <div className="xl:col-span-2 rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Empresas</h2>
                <div className="mt-3 max-h-[420px] overflow-auto rounded border border-slate-200">
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
                            <td className="px-2 py-2">
                              <span className={`rounded border px-2 py-0.5 ${statusColor(st)}`}>{st}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usuarios' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Novo usuário</h2>
                <div className="mt-3 grid gap-2">
                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Nome" />
                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="Email" />
                  <select className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                    <option value="ADMIN">ADMIN</option>
                    <option value="GESTOR">GESTOR</option>
                    <option value="TECNICO">TECNICO</option>
                    <option value="USUARIO">USUARIO</option>
                    <option value="SOLICITANTE">SOLICITANTE</option>
                  </select>
                  <button className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !companyId || !newUserName || !newUserEmail} onClick={() => runAction('create_user', { user: { nome: newUserName, email: newUserEmail, role: newUserRole, empresa_id: companyId } }, 'Usuário criado com sucesso.')}>Criar usuário</button>
                </div>

                <div className="mt-5 grid gap-2">
                  <h3 className="text-sm font-semibold">Status do usuário</h3>
                  <select className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                    <option value="">Selecione um usuário</option>
                    {users.map((u) => (
                      <option key={String(u.id)} value={String(u.id)}>{String(u.nome ?? u.email ?? u.id)}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="rounded border border-slate-300 px-3 py-2 text-sm" disabled={busy || !selectedUserId} onClick={() => runAction('set_user_status', { user_id: selectedUserId, status: 'ativo' }, 'Usuário ativado.')}>Ativar</button>
                    <button className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !selectedUserId} onClick={() => runAction('set_user_status', { user_id: selectedUserId, status: 'inativo' }, 'Usuário inativado.')}>Inativar</button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Usuários</h2>
                <div className="mt-3 max-h-[420px] overflow-auto rounded border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-2 py-2 text-left">Nome</th>
                        <th className="px-2 py-2 text-left">Email</th>
                        <th className="px-2 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const st = String(u.status ?? '-')
                        return (
                          <tr key={String(u.id)} className="border-t border-slate-200">
                            <td className="px-2 py-2">{String(u.nome ?? '-')}</td>
                            <td className="px-2 py-2">{String(u.email ?? '-')}</td>
                            <td className="px-2 py-2"><span className={`rounded border px-2 py-0.5 ${statusColor(st)}`}>{st}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'planos' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Novo plano</h2>
                <div className="mt-3 grid gap-2">
                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={planCode} onChange={(e) => setPlanCode(e.target.value)} placeholder="Código" />
                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Nome" />
                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} placeholder="Preço mensal" />
                  <button className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !planCode || !planName} onClick={() => runAction('create_plan', { plan: { code: planCode.toUpperCase(), name: planName, price_month: Number(planPrice || 0), user_limit: 10, data_limit_mb: 2048, active: true } }, 'Plano criado com sucesso.')}>Criar plano</button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Planos</h2>
                <div className="mt-3 max-h-[420px] overflow-auto rounded border border-slate-200">
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
              </div>
            </div>
          )}

          {activeTab === 'assinaturas' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Assinaturas</h2>
                <div className="mt-3 grid gap-2">
                  <select className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={subscriptionPlanId} onChange={(e) => setSubscriptionPlanId(e.target.value)}>
                    <option value="">Plano</option>
                    {plans.map((p) => <option key={String(p.id)} value={String(p.id)}>{String(p.name ?? p.code ?? p.id)}</option>)}
                  </select>
                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={subscriptionAmount} onChange={(e) => setSubscriptionAmount(e.target.value)} placeholder="Valor" />
                  <button className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !companyId || !subscriptionPlanId} onClick={() => runAction('create_subscription', { subscription: { empresa_id: companyId, plan_id: subscriptionPlanId, amount: Number(subscriptionAmount || 0), status: 'ativa' } }, 'Assinatura criada com sucesso.')}>Criar assinatura</button>

                  <button className="rounded border border-slate-300 px-3 py-2 text-sm" disabled={busy || !companyId} onClick={() => runAction('set_subscription_status', { empresa_id: companyId, status: 'ativa' }, 'Assinatura ativada.')}>Ativar assinatura da empresa</button>

                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={planCodeToChange} onChange={(e) => setPlanCodeToChange(e.target.value)} placeholder="Código do novo plano" />
                  <button className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !companyId || !planCodeToChange} onClick={() => runAction('change_plan', { empresa_id: companyId, plano_codigo: planCodeToChange.toUpperCase() }, 'Plano da empresa alterado.')}>Trocar plano</button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Assinaturas ativas</h2>
                <div className="mt-3 max-h-[420px] overflow-auto rounded border border-slate-200">
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
              </div>
            </div>
          )}

          {activeTab === 'contratos' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Gerenciar contrato</h2>
                <div className="mt-3 grid gap-2">
                  <select className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={selectedContractId} onChange={(e) => setSelectedContractId(e.target.value)}>
                    <option value="">Selecione o contrato</option>
                    {contracts.map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.summary ?? c.id)}</option>)}
                  </select>
                  <textarea className="min-h-[120px] rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={contractContent} onChange={(e) => setContractContent(e.target.value)} placeholder="Conteúdo do contrato" />
                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={contractSummary} onChange={(e) => setContractSummary(e.target.value)} placeholder="Resumo" />
                  <button className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !selectedContractId} onClick={() => runAction('update_contract', { contract_id: selectedContractId, content: contractContent, summary: contractSummary }, 'Contrato atualizado.')}>Salvar alterações</button>
                  <button className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !selectedContractId} onClick={() => runAction('regenerate_contract', { contract_id: selectedContractId }, 'Contrato regenerado.')}>Regenerar contrato</button>
                  <button className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700" disabled={busy || !selectedContractId} onClick={() => runAction('delete_contract', { contract_id: selectedContractId }, 'Contrato excluído.')}>Excluir contrato</button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Contratos</h2>
                <div className="mt-3 max-h-[420px] overflow-auto rounded border border-slate-200">
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
              </div>
            </div>
          )}

          {activeTab === 'suporte' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Responder ticket</h2>
                <div className="mt-3 grid gap-2">
                  <select className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={selectedTicketId} onChange={(e) => setSelectedTicketId(e.target.value)}>
                    <option value="">Selecione o ticket</option>
                    {tickets.map((t) => <option key={String(t.id)} value={String(t.id)}>{String(t.subject ?? t.id)}</option>)}
                  </select>
                  <textarea className="min-h-[120px] rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={ticketResponse} onChange={(e) => setTicketResponse(e.target.value)} placeholder="Resposta para o cliente" />
                  <button className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !selectedTicketId || !ticketResponse} onClick={() => runAction('respond_support_ticket', { ticket_id: selectedTicketId, response: ticketResponse, status: 'resolvido' }, 'Ticket respondido.')}>Enviar resposta</button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Tickets</h2>
                <div className="mt-3 max-h-[420px] overflow-auto rounded border border-slate-200">
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
              </div>
            </div>
          )}

          {activeTab === 'configuracoes' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Configurações operacionais</h2>
                <p className="mt-1 text-xs text-slate-600">Sem JSON/SQL. Ajustes por chave liga/desliga e limites simples.</p>

                <div className="mt-4 space-y-3">
                  <h3 className="text-sm font-semibold">Módulos</h3>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={moduleOs} onChange={(e) => setModuleOs(e.target.checked)} /> Ordens de serviço</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={modulePreventiva} onChange={(e) => setModulePreventiva(e.target.checked)} /> Preventiva</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={modulePreditiva} onChange={(e) => setModulePreditiva(e.target.checked)} /> Preditiva</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={moduleMateriais} onChange={(e) => setModuleMateriais(e.target.checked)} /> Materiais</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={moduleAuditoria} onChange={(e) => setModuleAuditoria(e.target.checked)} /> Auditoria</label>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={limitUsers} onChange={(e) => setLimitUsers(e.target.value)} placeholder="Limite usuários" />
                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={limitAssets} onChange={(e) => setLimitAssets(e.target.value)} placeholder="Limite equipamentos" />
                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={limitStorageMb} onChange={(e) => setLimitStorageMb(e.target.value)} placeholder="Armazenamento MB" />
                </div>

                <div className="mt-4 space-y-3">
                  <h3 className="text-sm font-semibold">Recursos</h3>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featureAi} onChange={(e) => setFeatureAi(e.target.checked)} /> IA</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featureApi} onChange={(e) => setFeatureApi(e.target.checked)} /> API</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featureSso} onChange={(e) => setFeatureSso(e.target.checked)} /> SSO</label>
                </div>

                <button
                  className="mt-4 rounded bg-sky-700 px-3 py-2 text-sm font-semibold text-white"
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
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Ações de segurança</h2>
                <p className="mt-1 text-xs text-slate-600">Ações sensíveis exigem senha de confirmação.</p>
                <div className="mt-3 grid gap-2">
                  <button className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700" disabled={busy || !companyId || !authPassword} onClick={() => runAction('cleanup_company_data', { empresa_id: companyId, auth_password: authPassword, keep_company_core: false, keep_billing_data: false, include_auth_users: true }, 'Limpeza de dados executada com sucesso.')}>Executar limpeza completa</button>
                  <button className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700" disabled={busy || !companyId || !authPassword || !isOwnerMaster} onClick={() => runAction('delete_company', { empresa_id: companyId, auth_password: authPassword, include_auth_users: true }, 'Empresa excluída definitivamente.')}>Excluir empresa definitiva</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'auditoria' && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-base font-semibold">Auditoria</h2>
              <div className="mt-3 max-h-[520px] overflow-auto rounded border border-slate-200">
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
            </div>
          )}

          {activeTab === 'owner-master' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Novo owner da plataforma</h2>
                <div className="mt-3 grid gap-2">
                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Nome" />
                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="Email" />
                  <input className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="Senha (opcional)" />
                  <button className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold text-white" disabled={busy || !isOwnerMaster || !ownerName || !ownerEmail} onClick={() => runAction('create_platform_owner', { owner_user: { nome: ownerName, email: ownerEmail, password: ownerPassword || undefined, role: 'SYSTEM_ADMIN' } }, 'Owner de plataforma criado com sucesso.')}>Criar owner</button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold">Owners da plataforma</h2>
                <div className="mt-3 max-h-[420px] overflow-auto rounded border border-slate-200">
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
              </div>
            </div>
          )}

          {feedback && <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</p>}
          {error && <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        </section>
      </main>
    </div>
  )
}
