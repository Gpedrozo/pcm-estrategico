import { useOwnerCompanies, useOwnerCompanyActions } from '@/hooks/useOwnerPortal'

type Company = {
  id: string
  nome_fantasia?: string
  razao_social?: string
  status?: string
}

export function OwnerEmpresasModule() {
  const { data, isLoading } = useOwnerCompanies()
  const { blockCompany } = useOwnerCompanyActions()

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando empresas...</div>
  }

  const companies = ((data?.companies as Company[] | undefined) ?? []).slice(0, 20)

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold">Empresas globais</h2>
      <div className="space-y-2">
        {companies.map((company) => (
          <div key={company.id} className="flex items-center justify-between rounded-md border border-slate-800 p-3">
            <div>
              <p className="text-sm font-medium">{company.nome_fantasia ?? company.razao_social ?? company.id}</p>
              <p className="text-xs text-slate-400">Status: {company.status ?? 'ativo'}</p>
            </div>
            <button
              onClick={() => blockCompany.mutate({ empresa_id: company.id, reason: 'Suspensão via owner portal' })}
              className="rounded-md border border-rose-800 px-3 py-1 text-xs text-rose-300 hover:bg-rose-950"
              disabled={blockCompany.isPending}
            >
              Suspender
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
