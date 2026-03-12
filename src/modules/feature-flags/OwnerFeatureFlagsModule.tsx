import { useEffect, useMemo, useState } from 'react'
import { useOwnerCompanies, useOwnerCompanyActions, useOwnerCompanySettings } from '@/hooks/useOwnerPortal'

type Company = { id: string; nome?: string }

type FeatureMap = Record<string, boolean>

export function OwnerFeatureFlagsModule() {
  const { data: companiesData, isLoading: isLoadingCompanies, error: companiesError } = useOwnerCompanies()
  const { updateCompanySettingsMutation } = useOwnerCompanyActions()
  const companies = useMemo(() => (Array.isArray(companiesData?.companies) ? (companiesData.companies as Company[]) : []).slice(0, 500), [companiesData])

  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const { data: settingsData, isLoading: isLoadingSettings, error: settingsError } = useOwnerCompanySettings(selectedCompanyId || null)

  const [features, setFeatures] = useState<FeatureMap>({})
  const [newFeatureName, setNewFeatureName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const rows = Array.isArray(settingsData?.settings) ? settingsData.settings : []
    const featureRow = rows.find((row) => row.chave === 'owner.features')
    const value = featureRow?.valor
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      setFeatures(value as FeatureMap)
    } else {
      setFeatures({})
    }
  }, [settingsData])

  const toggleFeature = (key: string) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const addFeature = () => {
    const key = newFeatureName.trim()
    if (!key) return
    setFeatures((prev) => ({ ...prev, [key]: false }))
    setNewFeatureName('')
  }

  const save = () => {
    if (!selectedCompanyId) {
      setError('Selecione uma empresa para salvar as feature flags.')
      return
    }

    setMessage(null)
    setError(null)

    updateCompanySettingsMutation.mutate(
      {
        empresaId: selectedCompanyId,
        settings: { features },
      },
      {
        onSuccess: () => setMessage('Feature flags atualizadas com sucesso.'),
        onError: (err: any) => setError(err?.message ?? 'Falha ao salvar feature flags.'),
      },
    )
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold">Feature Flags</h2>

      {(companiesError || settingsError) && (
        <div className="mb-3 rounded border border-rose-700/50 bg-rose-950/20 p-3 text-sm text-rose-200">
          Falha ao carregar feature flags: {String((settingsError as any)?.message ?? (companiesError as any)?.message ?? 'erro desconhecido')}
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
        <p className="text-sm text-slate-400">Carregando feature flags...</p>
      ) : (
        <>
          <div className="mb-3 flex gap-2">
            <input
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder="Nova feature (ex: ia_beta)"
              value={newFeatureName}
              onChange={(e) => setNewFeatureName(e.target.value)}
            />
            <button onClick={addFeature} className="rounded-md border border-slate-700 px-3 py-2 text-xs hover:bg-slate-800">
              Adicionar
            </button>
          </div>

          <div className="space-y-2">
            {Object.entries(features).length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma feature flag cadastrada para esta empresa.</p>
            ) : (
              Object.entries(features).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between rounded border border-slate-800 p-3 text-sm">
                  <span>{key}</span>
                  <button
                    onClick={() => toggleFeature(key)}
                    className={`rounded-md border px-3 py-1 text-xs ${enabled ? 'border-emerald-800 text-emerald-300' : 'border-slate-700 text-slate-300'}`}
                  >
                    {enabled ? 'Ativa' : 'Inativa'}
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <button
        onClick={save}
        className="mt-3 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
        disabled={!selectedCompanyId || updateCompanySettingsMutation.isPending}
      >
        Salvar flags
      </button>

      {message && <p className="mt-2 text-sm text-emerald-300">{message}</p>}
      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
    </div>
  )
}
