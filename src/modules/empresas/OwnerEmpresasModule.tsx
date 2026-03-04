import { useMemo, useState } from 'react'
import { useOwnerCompanies, useOwnerCompanyActions, useOwnerPlans } from '@/hooks/useOwnerPortal'

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
}

export function OwnerEmpresasModule() {
  const { data, isLoading } = useOwnerCompanies()
  const { data: plansData } = useOwnerPlans()
  const {
    createCompanyMutation,
    updateCompanyMutation,
    setCompanyLifecycle,
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
  })

  const [editCompanyId, setEditCompanyId] = useState<string | null>(null)

  const plans = useMemo(() => (plansData as Array<{ id: string; name?: string; code?: string; price_month?: number }> | undefined) ?? [], [plansData])

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando empresas...</div>
  }

  const companies = ((data?.companies as Company[] | undefined) ?? []).slice(0, 20)

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
    })
  }

  const handleCreate = () => {
    if (!companyForm.nome || !companyForm.master_nome || !companyForm.master_email) return

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
      onSuccess: () => {
        resetForm()
      },
    })
  }

  const populateForEdit = (company: Company) => {
    const dataRow = company.dados_empresa?.[0]
    setEditCompanyId(company.id)
    setCompanyForm((prev) => ({
      ...prev,
      nome: company.nome ?? '',
      slug: company.slug ?? '',
      razao_social: dataRow?.razao_social ?? '',
      nome_fantasia: dataRow?.nome_fantasia ?? '',
      cnpj: dataRow?.cnpj ?? '',
      status: company.status ?? 'active',
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
      },
    }, {
      onSuccess: () => {
        setEditCompanyId(null)
        resetForm()
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold">Cadastro de Empresa + MASTER</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome da empresa" value={companyForm.nome} onChange={(e) => setCompanyForm((prev) => ({ ...prev, nome: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Slug" value={companyForm.slug} onChange={(e) => setCompanyForm((prev) => ({ ...prev, slug: e.target.value }))} />
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
        </div>
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
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold">Empresas globais</h2>
        <div className="space-y-2">
          {companies.map((company) => {
            const companyData = company.dados_empresa?.[0]

            return (
              <div key={company.id} className="space-y-2 rounded-md border border-slate-800 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{companyData?.nome_fantasia ?? companyData?.razao_social ?? company.nome ?? company.id}</p>
                    <p className="text-xs text-slate-400">CNPJ: {companyData?.cnpj ?? '-'} • Status: {company.status ?? 'active'}</p>
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
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
