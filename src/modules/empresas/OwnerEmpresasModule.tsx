import { useMemo, useState } from 'react'
import { useOwnerAuditLogs, useOwnerCompanies, useOwnerCompanyActions, useOwnerPlans, useOwnerSubscriptions } from '@/hooks/useOwnerPortal'
import { useAuth } from '@/contexts/AuthContext'

type Company = {
  id: string
  nome?: string
  slug?: string
  status?: string
  dados_empresa?: Array<{
    razao_social?: string
    nome_fantasia?: string
    cnpj?: string
  }>
  configuracoes_sistema?: Array<{
    chave?: string
    valor?: Record<string, unknown> | null
  }>
}

type Subscription = {
  empresa_id?: string
  status?: string
  plans?: { name?: string; code?: string } | null
  renewal_at?: string
}

type AuditLog = {
  id: string
  empresa_id?: string
  action_type?: string
  created_at?: string
  actor_email?: string
}

const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

export function OwnerEmpresasModule() {
  const { impersonation, startImpersonationSession, stopImpersonationSession } = useAuth()
  const { data, isLoading, error: companiesError } = useOwnerCompanies()
  const { data: plansData, error: plansError } = useOwnerPlans()
  const { data: subscriptionsData, error: subscriptionsError } = useOwnerSubscriptions()
  const { data: logsData, error: logsError } = useOwnerAuditLogs()
  const {
    createCompanyMutation,
    updateCompanyMutation,
    setCompanyLifecycle,
    changePlan,
    startImpersonationMutation,
    stopImpersonationMutation,
  } = useOwnerCompanyActions()

  const [companyForm, setCompanyForm] = useState({
    nome: '',
    slug: '',
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    endereco: '',
    telefone: '',
    email: '',
    responsavel: '',
    segmento: '',
    status: 'active',
    master_nome: '',
    master_email: '',
    master_password: '',
    plan_id: '',
    assinatura_valor: '',
    pagamento: 'boleto',
    periodo: 'monthly',
    inicio: '',
    fim: '',
    inactivity_timeout_minutes: '',
  })

  const [editCompanyId, setEditCompanyId] = useState<string | null>(null)
  const [historyCompanyId, setHistoryCompanyId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [formWarning, setFormWarning] = useState<string | null>(null)
  const [planCodeByCompany, setPlanCodeByCompany] = useState<Record<string, string>>({})

  const plans = useMemo(
    () => toArray<{ id: string; name?: string; code?: string; price_month?: number }>(plansData),
    [plansData],
  )
  const subscriptions = useMemo(() => toArray<Subscription>(subscriptionsData), [subscriptionsData])
  const auditLogs = useMemo(() => toArray<AuditLog>(logsData), [logsData])
  const companies = useMemo(
    () => toArray<Company>(data?.companies),
    [data],
  )

  const currentHistoryLogs = useMemo(
    () => auditLogs.filter((log) => log.empresa_id === historyCompanyId).slice(0, 12),
    [auditLogs, historyCompanyId],
  )

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando empresas...</div>
  }

  if (companiesError || plansError || subscriptionsError || logsError) {
    return (
      <div className="rounded-lg border border-rose-700/50 bg-rose-950/20 p-4 text-sm text-rose-200">
        Falha ao carregar dados de empresas: {String((companiesError as any)?.message ?? (plansError as any)?.message ?? (subscriptionsError as any)?.message ?? (logsError as any)?.message ?? 'erro desconhecido')}
      </div>
    )
  }

  const resetForm = () => {
    setCompanyForm({
      nome: '',
      slug: '',
      razao_social: '',
      nome_fantasia: '',
      cnpj: '',
      endereco: '',
      telefone: '',
      email: '',
      responsavel: '',
      segmento: '',
      status: 'active',
      master_nome: '',
      master_email: '',
      master_password: '',
      plan_id: '',
      assinatura_valor: '',
      pagamento: 'boleto',
      periodo: 'monthly',
      inicio: '',
      fim: '',
      inactivity_timeout_minutes: '',
    })
    setFormError(null)
    setFormSuccess(null)
    setFormWarning(null)
  }

  const handleCreate = () => {
    setFormError(null)
    setFormSuccess(null)
    setFormWarning(null)

    if (!companyForm.nome || !companyForm.master_nome || !companyForm.master_email) {
      setFormError('Preencha Nome da empresa, Nome MASTER e Email MASTER.')
      return
    }

    createCompanyMutation.mutate({
      company: {
        nome: companyForm.nome,
        slug: companyForm.slug || undefined,
        razao_social: companyForm.razao_social || undefined,
        nome_fantasia: companyForm.nome_fantasia || undefined,
        cnpj: companyForm.cnpj || undefined,
        endereco: companyForm.endereco || undefined,
        telefone: companyForm.telefone || undefined,
        email: companyForm.email || undefined,
        responsavel: companyForm.responsavel || undefined,
        segmento: companyForm.segmento || undefined,
        status: companyForm.status,
        inactivity_timeout_minutes: companyForm.inactivity_timeout_minutes
          ? Number(companyForm.inactivity_timeout_minutes)
          : null,
      },
      user: {
        nome: companyForm.master_nome,
        email: companyForm.master_email,
        password: companyForm.master_password || undefined,
        role: 'ADMIN',
      },
      subscription: companyForm.plan_id
        ? {
            plan_id: companyForm.plan_id,
            amount: Number(companyForm.assinatura_valor || 0),
            payment_method: companyForm.pagamento,
            period: companyForm.periodo as 'monthly' | 'quarterly' | 'yearly' | 'custom',
            starts_at: companyForm.inicio || undefined,
            ends_at: companyForm.fim || undefined,
            status: 'ativa',
          }
        : undefined,
    }, {
      onSuccess: (result: any) => {
        setFormSuccess('Empresa e usuário MASTER criados com sucesso.')
        if (result?.warning) {
          setFormWarning(`Aviso: ${result.warning}`)
        }
        resetForm()
      },
      onError: (error: any) => {
        setFormError(error?.message || 'Falha ao criar empresa + MASTER.')
      },
    })
  }

  const populateForEdit = (company: Company) => {
    const dataRows = toArray<NonNullable<Company['dados_empresa']>[number]>(company.dados_empresa)
    const settingsRows = toArray<NonNullable<Company['configuracoes_sistema']>[number]>(company.configuracoes_sistema)
    const dataRow = dataRows[0]
    const securityConfig = settingsRows.find((row) => row.chave === 'owner.security_policy')
    const inactivityTimeoutMinutes =
      typeof securityConfig?.valor?.inactivity_timeout_minutes === 'number'
        ? String(securityConfig.valor.inactivity_timeout_minutes)
        : ''
    setEditCompanyId(company.id)
    setCompanyForm((prev) => ({
      ...prev,
      nome: company.nome ?? '',
      slug: company.slug ?? '',
      razao_social: dataRow?.razao_social ?? '',
      nome_fantasia: dataRow?.nome_fantasia ?? '',
      cnpj: dataRow?.cnpj ?? '',
      status: company.status ?? 'active',
      inactivity_timeout_minutes: inactivityTimeoutMinutes,
    }))
  }

  const handleUpdate = () => {
    if (!editCompanyId) return
    updateCompanyMutation.mutate({
      empresaId: editCompanyId,
      company: {
        nome: companyForm.nome,
        slug: companyForm.slug,
        razao_social: companyForm.razao_social,
        nome_fantasia: companyForm.nome_fantasia,
        cnpj: companyForm.cnpj,
        endereco: companyForm.endereco,
        telefone: companyForm.telefone,
        email: companyForm.email,
        responsavel: companyForm.responsavel,
        segmento: companyForm.segmento,
        status: companyForm.status,
        inactivity_timeout_minutes: companyForm.inactivity_timeout_minutes
          ? Number(companyForm.inactivity_timeout_minutes)
          : null,
      },
    }, {
      onSuccess: () => {
        setEditCompanyId(null)
        resetForm()
      },
    })
  }

  const handleChangePlan = (empresaId: string) => {
    const plano_codigo = planCodeByCompany[empresaId]
    if (!plano_codigo) {
      setFormError('Selecione um plano antes de trocar.')
      return
    }

    setFormError(null)
    setFormSuccess(null)
    setFormWarning(null)

    changePlan.mutate(
      { empresa_id: empresaId, plano_codigo },
      {
        onSuccess: () => setFormSuccess('Plano da empresa atualizado com sucesso.'),
        onError: (err: any) => setFormError(err?.message ?? 'Falha ao trocar plano da empresa.'),
      },
    )
  }

  const handleStartImpersonation = (company: Company) => {
    const companyDataRows = toArray<NonNullable<Company['dados_empresa']>[number]>(company.dados_empresa)
    const companyData = companyDataRows[0]
    const companyName = companyData?.nome_fantasia ?? companyData?.razao_social ?? company.nome ?? company.id

    setFormError(null)
    setFormSuccess(null)
    setFormWarning(null)

    startImpersonationMutation.mutate(
      { empresaId: company.id },
      {
        onSuccess: (result: any) => {
          const payload = result?.impersonation
          startImpersonationSession({
            empresaId: payload?.empresa_id ?? company.id,
            empresaNome: payload?.empresa_nome ?? companyName,
            startedAt: payload?.issued_at ?? new Date().toISOString(),
            expiresAt: payload?.expires_at ?? null,
          })
          setFormSuccess(`Modo cliente ativo para ${companyName}.`)
        },
        onError: (err: any) => setFormError(err?.message ?? 'Falha ao iniciar modo cliente.'),
      },
    )
  }

  const handleStopImpersonation = () => {
    if (!impersonation?.empresaId) {
      stopImpersonationSession()
      return
    }

    setFormError(null)
    setFormSuccess(null)
    setFormWarning(null)

    stopImpersonationMutation.mutate(
      {
        empresaId: impersonation.empresaId,
        empresaNome: impersonation.empresaNome ?? undefined,
        reason: 'manual_exit',
      },
      {
        onSuccess: () => {
          stopImpersonationSession()
          setFormSuccess('Modo cliente encerrado com sucesso.')
        },
        onError: (err: any) => setFormError(err?.message ?? 'Falha ao encerrar modo cliente.'),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold">Cadastro de Empresa + MASTER</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome da empresa" value={companyForm.nome} onChange={(e) => setCompanyForm((prev) => ({ ...prev, nome: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Slug (opcional)" value={companyForm.slug} onChange={(e) => setCompanyForm((prev) => ({ ...prev, slug: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Razão social" value={companyForm.razao_social} onChange={(e) => setCompanyForm((prev) => ({ ...prev, razao_social: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome fantasia" value={companyForm.nome_fantasia} onChange={(e) => setCompanyForm((prev) => ({ ...prev, nome_fantasia: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="CNPJ" value={companyForm.cnpj} onChange={(e) => setCompanyForm((prev) => ({ ...prev, cnpj: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Responsável" value={companyForm.responsavel} onChange={(e) => setCompanyForm((prev) => ({ ...prev, responsavel: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Email empresa" value={companyForm.email} onChange={(e) => setCompanyForm((prev) => ({ ...prev, email: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Telefone" value={companyForm.telefone} onChange={(e) => setCompanyForm((prev) => ({ ...prev, telefone: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Endereço" value={companyForm.endereco} onChange={(e) => setCompanyForm((prev) => ({ ...prev, endereco: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Segmento" value={companyForm.segmento} onChange={(e) => setCompanyForm((prev) => ({ ...prev, segmento: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome MASTER" value={companyForm.master_nome} onChange={(e) => setCompanyForm((prev) => ({ ...prev, master_nome: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Email MASTER" value={companyForm.master_email} onChange={(e) => setCompanyForm((prev) => ({ ...prev, master_email: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Senha inicial (opcional)" value={companyForm.master_password} onChange={(e) => setCompanyForm((prev) => ({ ...prev, master_password: e.target.value }))} />
          <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={companyForm.plan_id} onChange={(e) => {
            const selected = plans.find((plan) => plan.id === e.target.value)
            setCompanyForm((prev) => ({
              ...prev,
              plan_id: e.target.value,
              assinatura_valor: selected?.price_month ? String(selected.price_month) : prev.assinatura_valor,
            }))
          }}>
            <option value="">Plano inicial (opcional)</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>{plan.name ?? plan.code}</option>
            ))}
          </select>
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Valor assinatura" value={companyForm.assinatura_valor} onChange={(e) => setCompanyForm((prev) => ({ ...prev, assinatura_valor: e.target.value }))} />
          <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={companyForm.pagamento} onChange={(e) => setCompanyForm((prev) => ({ ...prev, pagamento: e.target.value }))}>
            <option value="boleto">Boleto</option>
            <option value="pix">PIX</option>
            <option value="cartao">Cartão</option>
            <option value="transferencia">Transferência</option>
          </select>
          <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={companyForm.periodo} onChange={(e) => setCompanyForm((prev) => ({ ...prev, periodo: e.target.value }))}>
            <option value="monthly">Mensal</option>
            <option value="quarterly">Trimestral</option>
            <option value="yearly">Anual</option>
            <option value="custom">Customizado</option>
          </select>
          <input type="date" className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={companyForm.inicio} onChange={(e) => setCompanyForm((prev) => ({ ...prev, inicio: e.target.value }))} />
          <input type="date" className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={companyForm.fim} onChange={(e) => setCompanyForm((prev) => ({ ...prev, fim: e.target.value }))} />
          <input
            type="number"
            min={0}
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="Timeout inatividade (min)"
            value={companyForm.inactivity_timeout_minutes}
            onChange={(e) => setCompanyForm((prev) => ({ ...prev, inactivity_timeout_minutes: e.target.value }))}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Slug é um identificador curto da empresa (ex.: <span className="font-mono">codepa</span>) usado para URL/domínio e integrações. Se deixar em branco, o sistema gera automaticamente.
        </p>
        <div className="mt-3 flex gap-2">
          <button onClick={handleCreate} className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900" disabled={createCompanyMutation.isPending}>
            Criar empresa + MASTER
          </button>
          {editCompanyId && (
            <button onClick={handleUpdate} className="rounded-md border border-slate-700 px-4 py-2 text-sm" disabled={updateCompanyMutation.isPending}>
              Salvar edição da empresa
            </button>
          )}
        </div>
        {formError && (
          <p className="mt-2 text-sm text-rose-300">{formError}</p>
        )}
        {formSuccess && (
          <p className="mt-2 text-sm text-emerald-300">{formSuccess}</p>
        )}
        {formWarning && (
          <p className="mt-2 text-sm text-amber-300">{formWarning}</p>
        )}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold">Empresas globais</h2>
        <div className="space-y-2">
          {companies.slice(0, 20).map((company) => {
            const companyDataRows = toArray<NonNullable<Company['dados_empresa']>[number]>(company.dados_empresa)
            const settingsRows = toArray<NonNullable<Company['configuracoes_sistema']>[number]>(company.configuracoes_sistema)
            const companyData = companyDataRows[0]
            const sub = subscriptions.find((item) => item.empresa_id === company.id)
            const securityConfig = settingsRows.find((row) => row.chave === 'owner.security_policy')
            const inactivityTimeoutMinutes =
              typeof securityConfig?.valor?.inactivity_timeout_minutes === 'number'
                ? securityConfig.valor.inactivity_timeout_minutes
                : null

            return (
              <div key={company.id} className="space-y-2 rounded-md border border-slate-800 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{companyData?.nome_fantasia ?? companyData?.razao_social ?? company.nome ?? company.id}</p>
                    <p className="text-xs text-slate-400">CNPJ: {companyData?.cnpj ?? '-'} • Status: {company.status ?? 'active'}</p>
                    <p className="text-xs text-slate-500">
                      Assinatura: {sub?.plans?.name ?? sub?.plans?.code ?? '-'} • {sub?.status ?? '-'} • Renovação: {sub?.renewal_at ? new Date(sub.renewal_at).toLocaleDateString('pt-BR') : '-'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Logout automático por inatividade: {inactivityTimeoutMinutes && inactivityTimeoutMinutes > 0 ? `${inactivityTimeoutMinutes} min` : 'desativado'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => populateForEdit(company)}
                      className="rounded-md border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setCompanyLifecycle.mutate({ empresaId: company.id, status: 'active' })}
                      className="rounded-md border border-emerald-800 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-950"
                    >
                      Ativar
                    </button>
                    <button
                      onClick={() => setCompanyLifecycle.mutate({ empresaId: company.id, status: 'inactive' })}
                      className="rounded-md border border-amber-800 px-3 py-1 text-xs text-amber-300 hover:bg-amber-950"
                    >
                      Desativar
                    </button>
                    <button
                      onClick={() => setCompanyLifecycle.mutate({ empresaId: company.id, status: 'blocked', reason: 'Bloqueio por inadimplência/segurança' })}
                      className="rounded-md border border-rose-800 px-3 py-1 text-xs text-rose-300 hover:bg-rose-950"
                    >
                      Bloquear
                    </button>
                    <button
                      onClick={() => setHistoryCompanyId((prev) => (prev === company.id ? null : company.id))}
                      className="rounded-md border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800"
                    >
                      {historyCompanyId === company.id ? 'Ocultar histórico' : 'Ver histórico'}
                    </button>
                    {impersonation?.empresaId === company.id ? (
                      <button
                        onClick={handleStopImpersonation}
                        className="rounded-md border border-amber-700 px-3 py-1 text-xs text-amber-300 hover:bg-amber-950"
                        disabled={stopImpersonationMutation.isPending}
                      >
                        Encerrar acesso cliente
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartImpersonation(company)}
                        className="rounded-md border border-indigo-800 px-3 py-1 text-xs text-indigo-300 hover:bg-indigo-950"
                        disabled={startImpersonationMutation.isPending}
                      >
                        Entrar como cliente
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <select
                    className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                    value={planCodeByCompany[company.id] ?? ''}
                    onChange={(e) => setPlanCodeByCompany((prev) => ({ ...prev, [company.id]: e.target.value }))}
                  >
                    <option value="">Trocar plano</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.code ?? ''}>{plan.name ?? plan.code}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleChangePlan(company.id)}
                    className="rounded-md border border-amber-800 px-3 py-2 text-xs text-amber-300 hover:bg-amber-950"
                    disabled={changePlan.isPending}
                  >
                    Aplicar plano
                  </button>
                </div>

                {historyCompanyId === company.id && (
                  <div className="rounded border border-slate-800 bg-slate-950 p-2">
                    <p className="mb-2 text-xs text-slate-400">Histórico recente da empresa</p>
                    {currentHistoryLogs.length === 0 ? (
                      <p className="text-xs text-slate-500">Sem eventos recentes.</p>
                    ) : (
                      <div className="space-y-1">
                        {currentHistoryLogs.map((log) => (
                          <div key={log.id} className="text-xs text-slate-300">
                            {log.action_type ?? 'Evento'} • {log.actor_email ?? '-'} • {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '-'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
