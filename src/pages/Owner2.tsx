import { useMemo, useState } from 'react'
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
  useOwner2Subscriptions,
  useOwner2Tables,
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
  'auditoria',
  'configuracoes',
  'sistema',
  'owner-master',
] as const

type Owner2Tab = (typeof OWNER2_TABS)[number]

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export default function Owner2() {
  const { isSystemOwner, isLoading, user } = useAuth()
  const [activeTab, setActiveTab] = useState<Owner2Tab>('dashboard')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rawOutput, setRawOutput] = useState<unknown>(null)

  const [companyId, setCompanyId] = useState('')
  const [authPassword, setAuthPassword] = useState('')

  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanySlug, setNewCompanySlug] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')

  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState('ADMIN')

  const [planCode, setPlanCode] = useState('')
  const [planName, setPlanName] = useState('')
  const [planPrice, setPlanPrice] = useState('0')

  const [subscriptionPlanId, setSubscriptionPlanId] = useState('')
  const [subscriptionAmount, setSubscriptionAmount] = useState('0')

  const [contractId, setContractId] = useState('')
  const [contractContent, setContractContent] = useState('')
  const [contractSummary, setContractSummary] = useState('')

  const [ticketId, setTicketId] = useState('')
  const [ticketResponse, setTicketResponse] = useState('')

  const [settingsModulesJson, setSettingsModulesJson] = useState('{}')
  const [settingsLimitsJson, setSettingsLimitsJson] = useState('{}')
  const [settingsFeaturesJson, setSettingsFeaturesJson] = useState('{}')

  const [systemTableName, setSystemTableName] = useState('')
  const [systemUserId, setSystemUserId] = useState('')

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
  const tablesQuery = useOwner2Tables(companyId || undefined, activeTab === 'sistema')
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

  async function runAction(action: any, payload: Record<string, unknown>, successMessage: string) {
    setError(null)
    setFeedback(null)
    try {
      const output = await execute.mutateAsync({ action, payload })
      setRawOutput(output)
      setFeedback(successMessage)
    } catch (err: any) {
      setError(String(err?.message ?? err ?? 'Falha na operação do Owner2.'))
    }
  }

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
          <p className="mt-2 text-sm text-muted-foreground">O Owner2 é exclusivo para SYSTEM_OWNER.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Owner2</h1>
            <p className="text-xs text-slate-400">Módulo novo paralelo para operação global da plataforma</p>
          </div>
          <div className="text-xs text-slate-300">
            <p>Usuário: {user?.email}</p>
            <p>Health: {String((healthQuery.data as any)?.status ?? 'n/a')}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1600px] gap-4 p-4 lg:grid-cols-[220px,1fr]">
        <aside className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <nav className="space-y-1">
            {OWNER2_TABS.map((tab) => (
              <button
                key={tab}
                className={`w-full rounded px-3 py-2 text-left text-sm ${activeTab === tab ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>
        </aside>

        <section className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
            <div className="grid gap-2 md:grid-cols-3">
              <select className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="">Empresa (escopo opcional)</option>
                {companies.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>{String(c.nome ?? c.slug ?? c.id)}</option>
                ))}
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Senha de confirmação (ações críticas)" />
              <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={systemTableName} onChange={(e) => setSystemTableName(e.target.value)} placeholder="Tabela sistema (purge)" />
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h2 className="text-base font-semibold">Resumo operacional</h2>
              <pre className="mt-3 max-h-[520px] overflow-auto rounded bg-slate-950 p-3 text-xs">{JSON.stringify(dashboardQuery.data ?? {}, null, 2)}</pre>
            </div>
          )}

          {activeTab === 'empresas' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Criar empresa</h2>
                <div className="mt-3 grid gap-2">
                  <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Nome da empresa" />
                  <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={newCompanySlug} onChange={(e) => setNewCompanySlug(e.target.value)} placeholder="Slug" />
                  <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} placeholder="Nome admin" />
                  <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="Email admin" />
                  <button
                    className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold"
                    disabled={busy || !newCompanyName || !newAdminName || !newAdminEmail}
                    onClick={() => runAction('create_company', {
                      company: { nome: newCompanyName, slug: newCompanySlug || undefined },
                      user: { nome: newAdminName, email: newAdminEmail, role: 'ADMIN' },
                    }, 'Empresa criada no Owner2.')}
                  >
                    Criar empresa
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Operações de empresa</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={busy || !companyId} onClick={() => runAction('set_company_status', { empresa_id: companyId, status: 'active' }, 'Empresa ativada.')}>Ativar</button>
                  <button className="rounded border border-amber-600 px-3 py-2 text-sm text-amber-300" disabled={busy || !companyId} onClick={() => runAction('set_company_status', { empresa_id: companyId, status: 'blocked' }, 'Empresa bloqueada.')}>Bloquear</button>
                  <button className="rounded border border-amber-500 px-3 py-2 text-sm text-amber-300" disabled={busy || !companyId || !authPassword} onClick={() => runAction('cleanup_company_data', { empresa_id: companyId, auth_password: authPassword, keep_company_core: false, keep_billing_data: false, include_auth_users: true }, 'Limpeza completa executada.')}>Cleanup empresa</button>
                  <button className="rounded border border-rose-600 px-3 py-2 text-sm text-rose-300" disabled={busy || !companyId || !authPassword} onClick={() => runAction('delete_company', { empresa_id: companyId, auth_password: authPassword, include_auth_users: true }, 'Empresa excluída definitivamente.')}>Excluir empresa</button>
                </div>
              </div>

              <div className="xl:col-span-2 rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Empresas</h2>
                <div className="mt-3 max-h-[420px] overflow-auto rounded border border-slate-800">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-950">
                      <tr>
                        <th className="px-2 py-2 text-left">ID</th>
                        <th className="px-2 py-2 text-left">Nome</th>
                        <th className="px-2 py-2 text-left">Slug</th>
                        <th className="px-2 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map((c) => (
                        <tr key={String(c.id)} className="border-t border-slate-800">
                          <td className="px-2 py-2">{String(c.id ?? '-')}</td>
                          <td className="px-2 py-2">{String(c.nome ?? '-')}</td>
                          <td className="px-2 py-2">{String(c.slug ?? '-')}</td>
                          <td className="px-2 py-2">{String(c.status ?? '-')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usuarios' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Criar usuário</h2>
                <div className="mt-3 grid gap-2">
                  <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Nome" />
                  <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="Email" />
                  <select className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                    <option value="ADMIN">ADMIN</option>
                    <option value="GESTOR">GESTOR</option>
                    <option value="TECNICO">TECNICO</option>
                    <option value="USUARIO">USUARIO</option>
                    <option value="SOLICITANTE">SOLICITANTE</option>
                  </select>
                  <button className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold" disabled={busy || !companyId || !newUserName || !newUserEmail} onClick={() => runAction('create_user', { user: { nome: newUserName, email: newUserEmail, role: newUserRole, empresa_id: companyId } }, 'Usuário criado.')}>Criar usuário</button>
                  <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={busy || !systemUserId} onClick={() => runAction('set_user_status', { user_id: systemUserId, status: 'ativo' }, 'Usuário ativado.')}>Ativar usuário por ID</button>
                  <button className="rounded border border-amber-600 px-3 py-2 text-sm text-amber-300" disabled={busy || !systemUserId} onClick={() => runAction('set_user_status', { user_id: systemUserId, status: 'inativo' }, 'Usuário inativado.')}>Inativar usuário por ID</button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Usuários</h2>
                <div className="mt-3 max-h-[420px] overflow-auto rounded border border-slate-800">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-950">
                      <tr>
                        <th className="px-2 py-2 text-left">ID</th>
                        <th className="px-2 py-2 text-left">Nome</th>
                        <th className="px-2 py-2 text-left">Email</th>
                        <th className="px-2 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={String(u.id)} className="border-t border-slate-800">
                          <td className="px-2 py-2">{String(u.id ?? '-')}</td>
                          <td className="px-2 py-2">{String(u.nome ?? '-')}</td>
                          <td className="px-2 py-2">{String(u.email ?? '-')}</td>
                          <td className="px-2 py-2">{String(u.status ?? '-')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'planos' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Criar plano</h2>
                <div className="mt-3 grid gap-2">
                  <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={planCode} onChange={(e) => setPlanCode(e.target.value)} placeholder="Código" />
                  <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Nome" />
                  <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} placeholder="Preço mensal" />
                  <button className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold" disabled={busy || !planCode || !planName} onClick={() => runAction('create_plan', { plan: { code: planCode.toUpperCase(), name: planName, price_month: Number(planPrice || 0), user_limit: 10, data_limit_mb: 2048, active: true } }, 'Plano criado.')}>Criar plano</button>
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Planos</h2>
                <pre className="mt-3 max-h-[420px] overflow-auto rounded bg-slate-950 p-3 text-xs">{JSON.stringify(plans, null, 2)}</pre>
              </div>
            </div>
          )}

          {activeTab === 'assinaturas' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Ações de assinatura</h2>
                <div className="mt-3 grid gap-2">
                  <select className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={subscriptionPlanId} onChange={(e) => setSubscriptionPlanId(e.target.value)}>
                    <option value="">Plano para assinatura</option>
                    {plans.map((p) => <option key={String(p.id)} value={String(p.id)}>{String(p.name ?? p.code ?? p.id)}</option>)}
                  </select>
                  <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={subscriptionAmount} onChange={(e) => setSubscriptionAmount(e.target.value)} placeholder="Valor" />
                  <button className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold" disabled={busy || !companyId || !subscriptionPlanId} onClick={() => runAction('create_subscription', { subscription: { empresa_id: companyId, plan_id: subscriptionPlanId, amount: Number(subscriptionAmount || 0), status: 'ativa' } }, 'Assinatura criada.')}>Criar assinatura</button>
                  <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={busy || !companyId} onClick={() => runAction('set_subscription_status', { empresa_id: companyId, status: 'ativa' }, 'Assinatura ativada.')}>Status ativa</button>
                  <button className="rounded border border-amber-600 px-3 py-2 text-sm text-amber-300" disabled={busy || !companyId} onClick={() => runAction('change_plan', { empresa_id: companyId, plano_codigo: planCode.toUpperCase() }, 'Plano alterado por código.')}>Trocar plano por código</button>
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Assinaturas</h2>
                <pre className="mt-3 max-h-[420px] overflow-auto rounded bg-slate-950 p-3 text-xs">{JSON.stringify(subscriptions, null, 2)}</pre>
              </div>
            </div>
          )}

          {activeTab === 'contratos' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Ações de contrato</h2>
                <div className="mt-3 grid gap-2">
                  <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={contractId} onChange={(e) => setContractId(e.target.value)} placeholder="Contract ID" />
                  <textarea className="min-h-[120px] rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={contractContent} onChange={(e) => setContractContent(e.target.value)} placeholder="Conteúdo" />
                  <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={contractSummary} onChange={(e) => setContractSummary(e.target.value)} placeholder="Resumo" />
                  <button className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold" disabled={busy || !contractId} onClick={() => runAction('update_contract', { contract_id: contractId, content: contractContent, summary: contractSummary }, 'Contrato atualizado.')}>Atualizar contrato</button>
                  <button className="rounded border border-amber-600 px-3 py-2 text-sm text-amber-300" disabled={busy || !contractId} onClick={() => runAction('regenerate_contract', { contract_id: contractId }, 'Contrato regenerado.')}>Regenerar</button>
                  <button className="rounded border border-rose-600 px-3 py-2 text-sm text-rose-300" disabled={busy || !contractId} onClick={() => runAction('delete_contract', { contract_id: contractId }, 'Contrato excluído.')}>Excluir</button>
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Contratos</h2>
                <pre className="mt-3 max-h-[420px] overflow-auto rounded bg-slate-950 p-3 text-xs">{JSON.stringify(contracts, null, 2)}</pre>
              </div>
            </div>
          )}

          {activeTab === 'suporte' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Responder ticket</h2>
                <div className="mt-3 grid gap-2">
                  <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={ticketId} onChange={(e) => setTicketId(e.target.value)} placeholder="Ticket ID" />
                  <textarea className="min-h-[120px] rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={ticketResponse} onChange={(e) => setTicketResponse(e.target.value)} placeholder="Resposta" />
                  <button className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold" disabled={busy || !ticketId || !ticketResponse} onClick={() => runAction('respond_support_ticket', { ticket_id: ticketId, response: ticketResponse, status: 'resolvido' }, 'Ticket respondido.')}>Responder</button>
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Tickets</h2>
                <pre className="mt-3 max-h-[420px] overflow-auto rounded bg-slate-950 p-3 text-xs">{JSON.stringify(tickets, null, 2)}</pre>
              </div>
            </div>
          )}

          {activeTab === 'auditoria' && (
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h2 className="text-base font-semibold">Logs de auditoria</h2>
              <pre className="mt-3 max-h-[520px] overflow-auto rounded bg-slate-950 p-3 text-xs">{JSON.stringify(logs, null, 2)}</pre>
            </div>
          )}

          {activeTab === 'configuracoes' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Configurações da empresa</h2>
                <div className="mt-3 grid gap-2">
                  <textarea className="min-h-[80px] rounded border border-slate-700 bg-slate-950 px-2 py-2 text-xs" value={settingsModulesJson} onChange={(e) => setSettingsModulesJson(e.target.value)} placeholder="modules JSON" />
                  <textarea className="min-h-[80px] rounded border border-slate-700 bg-slate-950 px-2 py-2 text-xs" value={settingsLimitsJson} onChange={(e) => setSettingsLimitsJson(e.target.value)} placeholder="limits JSON" />
                  <textarea className="min-h-[80px] rounded border border-slate-700 bg-slate-950 px-2 py-2 text-xs" value={settingsFeaturesJson} onChange={(e) => setSettingsFeaturesJson(e.target.value)} placeholder="features JSON" />
                  <button className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold" disabled={busy || !companyId} onClick={() => runAction('update_company_settings', { empresa_id: companyId, settings: { modules: JSON.parse(settingsModulesJson || '{}'), limits: JSON.parse(settingsLimitsJson || '{}'), features: JSON.parse(settingsFeaturesJson || '{}') } }, 'Configurações atualizadas.')}>Salvar configurações</button>
                  <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={busy || !systemUserId} onClick={() => runAction('set_user_inactivity_timeout', { user_id: systemUserId, inactivity_timeout_minutes: 10 }, 'Timeout por usuário atualizado.')}>Timeout 10min por usuário ID</button>
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Settings atuais</h2>
                <pre className="mt-3 max-h-[420px] overflow-auto rounded bg-slate-950 p-3 text-xs">{JSON.stringify(settings, null, 2)}</pre>
              </div>
            </div>
          )}

          {activeTab === 'sistema' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Operações críticas</h2>
                <div className="mt-3 grid gap-2">
                  <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={systemUserId} onChange={(e) => setSystemUserId(e.target.value)} placeholder="User ID (promover SYSTEM_ADMIN)" />
                  <button className="rounded border border-slate-600 px-3 py-2 text-sm" disabled={busy || !systemUserId} onClick={() => runAction('create_system_admin', { user_id: systemUserId }, 'Permissão SYSTEM_ADMIN concedida.')}>Conceder SYSTEM_ADMIN</button>
                  <button className="rounded border border-amber-600 px-3 py-2 text-sm text-amber-300" disabled={busy || !systemTableName || !authPassword} onClick={() => runAction('purge_table_data', { table_name: systemTableName, empresa_id: companyId || undefined, auth_password: authPassword }, 'Purge de tabela concluído.')}>Purge tabela</button>
                  <button className="rounded border border-amber-500 px-3 py-2 text-sm text-amber-300" disabled={busy || !companyId || !authPassword} onClick={() => runAction('cleanup_company_data', { empresa_id: companyId, auth_password: authPassword, keep_company_core: false, keep_billing_data: false, include_auth_users: true }, 'Cleanup empresa concluído.')}>Cleanup empresa</button>
                  <button className="rounded border border-rose-600 px-3 py-2 text-sm text-rose-300" disabled={busy || !companyId || !authPassword || !isOwnerMaster} onClick={() => runAction('delete_company', { empresa_id: companyId, auth_password: authPassword, include_auth_users: true }, 'Empresa excluída com purge total.')}>Excluir empresa definitiva</button>
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Tabelas plataforma</h2>
                <pre className="mt-3 max-h-[420px] overflow-auto rounded bg-slate-950 p-3 text-xs">{JSON.stringify(tables, null, 2)}</pre>
              </div>
            </div>
          )}

          {activeTab === 'owner-master' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Criar owner da plataforma</h2>
                <div className="mt-3 grid gap-2">
                  <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Nome" />
                  <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="Email" />
                  <input className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm" type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="Senha opcional" />
                  <button className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold" disabled={busy || !isOwnerMaster || !ownerName || !ownerEmail} onClick={() => runAction('create_platform_owner', { owner_user: { nome: ownerName, email: ownerEmail, password: ownerPassword || undefined, role: 'SYSTEM_ADMIN' } }, 'Owner de plataforma criado.')}>Criar owner</button>
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-base font-semibold">Owners da plataforma</h2>
                <pre className="mt-3 max-h-[420px] overflow-auto rounded bg-slate-950 p-3 text-xs">{JSON.stringify(owners, null, 2)}</pre>
              </div>
            </div>
          )}

          {feedback && <p className="rounded border border-emerald-700/50 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-300">{feedback}</p>}
          {error && <p className="rounded border border-rose-700/50 bg-rose-900/20 px-3 py-2 text-sm text-rose-300">{error}</p>}

          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-base font-semibold">Saída da última ação</h2>
            <pre className="mt-3 max-h-[360px] overflow-auto rounded bg-slate-950 p-3 text-xs">{JSON.stringify(rawOutput, null, 2)}</pre>
          </div>
        </section>
      </main>
    </div>
  )
}
