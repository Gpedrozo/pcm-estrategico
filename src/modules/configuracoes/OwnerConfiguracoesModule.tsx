import { useEffect, useMemo, useState } from 'react'
import { useOwnerCompanies, useOwnerCompanyActions, useOwnerCompanySettings } from '@/hooks/useOwnerPortal'

type Company = { id: string; nome?: string }

function safeParseObject(input: string) {
  const value = JSON.parse(input || '{}')
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Use um objeto JSON válido.')
  }
  return value as Record<string, unknown>
}

export function OwnerConfiguracoesModule() {
  const { data: companiesData, isLoading: isLoadingCompanies, error: companiesError } = useOwnerCompanies()
  const { updateCompanySettingsMutation } = useOwnerCompanyActions()

  const companies = useMemo(() => (Array.isArray(companiesData?.companies) ? (companiesData.companies as Company[]) : []).slice(0, 500), [companiesData])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')

  const { data: settingsData, isLoading: isLoadingSettings, error: settingsError } = useOwnerCompanySettings(selectedCompanyId || null)

  const [modulesJson, setModulesJson] = useState('{}')
  const [limitsJson, setLimitsJson] = useState('{}')
  const [featuresJson, setFeaturesJson] = useState('{}')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const map = new Map<string, unknown>()
    const rows = Array.isArray(settingsData?.settings) ? settingsData.settings : []
    for (const row of rows) {
      map.set(row.chave, row.valor ?? {})
    }

    setModulesJson(JSON.stringify(map.get('owner.modules') ?? {}, null, 2))
    setLimitsJson(JSON.stringify(map.get('owner.limits') ?? {}, null, 2))
    setFeaturesJson(JSON.stringify(map.get('owner.features') ?? {}, null, 2))
  }, [settingsData])

  const saveSettings = () => {
    if (!selectedCompanyId) {
      setError('Selecione uma empresa antes de salvar as configurações.')
      return
    }

    try {
      const modules = safeParseObject(modulesJson)
      const limits = safeParseObject(limitsJson)
      const features = safeParseObject(featuresJson)

      setMessage(null)
      setError(null)

      updateCompanySettingsMutation.mutate({
        empresaId: selectedCompanyId,
        settings: { modules, limits, features },
      }, {
        onSuccess: () => setMessage('Configurações salvas com sucesso.'),
        onError: (err: any) => setError(err?.message ?? 'Falha ao salvar configurações.'),
      })
    } catch (err: any) {
      setError(err?.message ?? 'JSON inválido nas configurações.')
    }
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold">Configurações por empresa</h2>

      {(companiesError || settingsError) && (
        <div className="mb-3 rounded border border-rose-700/50 bg-rose-950/20 p-3 text-sm text-rose-200">
          Falha ao carregar configurações: {String((settingsError as any)?.message ?? (companiesError as any)?.message ?? 'erro desconhecido')}
        </div>
      )}

      {isLoadingCompanies ? (
        <p className="text-sm text-slate-400">Carregando empresas...</p>
      ) : (
        <select
          className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          value={selectedCompanyId}
          onChange={(e) => {
            setSelectedCompanyId(e.target.value)
            setMessage(null)
            setError(null)
          }}
        >
          <option value="">Selecione uma empresa</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>{company.nome ?? company.id}</option>
          ))}
        </select>
      )}

      {selectedCompanyId && isLoadingSettings ? (
        <p className="text-sm text-slate-400">Carregando settings da empresa...</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          <div>
            <p className="mb-1 text-xs text-slate-400">owner.modules</p>
            <textarea className="h-56 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs" value={modulesJson} onChange={(e) => setModulesJson(e.target.value)} />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-400">owner.limits</p>
            <textarea className="h-56 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs" value={limitsJson} onChange={(e) => setLimitsJson(e.target.value)} />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-400">owner.features</p>
            <textarea className="h-56 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs" value={featuresJson} onChange={(e) => setFeaturesJson(e.target.value)} />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={saveSettings}
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
          disabled={!selectedCompanyId || updateCompanySettingsMutation.isPending}
        >
          Salvar configurações
        </button>
      </div>

      {message && <p className="mt-2 text-sm text-emerald-300">{message}</p>}
      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
    </div>
  )
}
