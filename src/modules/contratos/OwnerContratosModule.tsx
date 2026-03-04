import { useMemo, useState } from 'react'
import { useOwnerContracts, useOwnerCompanyActions } from '@/hooks/useOwnerPortal'

type Contract = {
  id: string
  content?: string
  status?: string
  version?: number
  generated_at?: string
  empresas?: { nome?: string } | null
  plans?: { name?: string; code?: string } | null
}

export function OwnerContratosModule() {
  const { data, isLoading } = useOwnerContracts()
  const {
    updateContractMutation,
    regenerateContractMutation,
    deleteContractMutation,
  } = useOwnerCompanyActions()

  const contracts = useMemo(() => ((data as Contract[] | undefined) ?? []).slice(0, 80), [data])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [summary, setSummary] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selected = useMemo(() => contracts.find((contract) => contract.id === selectedId) ?? null, [contracts, selectedId])

  const handleSelect = (contract: Contract) => {
    setSelectedId(contract.id)
    setContent(contract.content ?? '')
    setSummary('')
    setMessage(null)
    setError(null)
  }

  const handleSave = () => {
    if (!selectedId || !content.trim()) {
      setError('Selecione um contrato e informe o conteúdo para salvar.')
      return
    }

    setMessage(null)
    setError(null)

    updateContractMutation.mutate({
      contractId: selectedId,
      content,
      summary: summary || undefined,
    }, {
      onSuccess: () => setMessage('Contrato atualizado com sucesso.'),
      onError: (err: any) => setError(err?.message ?? 'Falha ao atualizar contrato.'),
    })
  }

  const handleRegenerate = (contractId: string) => {
    setMessage(null)
    setError(null)
    regenerateContractMutation.mutate(contractId, {
      onSuccess: () => setMessage('Contrato regenerado com sucesso.'),
      onError: (err: any) => setError(err?.message ?? 'Falha ao regenerar contrato.'),
    })
  }

  const handleDelete = (contractId: string) => {
    setMessage(null)
    setError(null)
    deleteContractMutation.mutate(contractId, {
      onSuccess: () => {
        if (selectedId === contractId) {
          setSelectedId(null)
          setContent('')
        }
        setMessage('Contrato removido com sucesso.')
      },
      onError: (err: any) => setError(err?.message ?? 'Falha ao remover contrato.'),
    })
  }

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando contratos...</div>
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold">Contratos</h2>
        <div className="space-y-2">
          {contracts.map((contract) => (
            <div key={contract.id} className="rounded-md border border-slate-800 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{contract.empresas?.nome ?? 'Empresa sem nome'}</p>
                  <p className="text-xs text-slate-400">
                    Plano: {contract.plans?.name ?? contract.plans?.code ?? '-'} • v{contract.version ?? 1} • {contract.status ?? 'ativo'}
                  </p>
                  <p className="text-xs text-slate-500">{contract.generated_at ? new Date(contract.generated_at).toLocaleString('pt-BR') : '-'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleSelect(contract)} className="rounded-md border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800">Editar</button>
                  <button onClick={() => handleRegenerate(contract.id)} className="rounded-md border border-amber-800 px-3 py-1 text-xs text-amber-300 hover:bg-amber-950">Regenerar</button>
                  <button onClick={() => handleDelete(contract.id)} className="rounded-md border border-rose-800 px-3 py-1 text-xs text-rose-300 hover:bg-rose-950">Excluir</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold">Editor de contrato</h2>
        {!selected ? (
          <p className="text-sm text-slate-400">Selecione um contrato para editar conteúdo e resumo da mudança.</p>
        ) : (
          <>
            <textarea
              className="h-64 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <input
              className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder="Resumo da alteração (opcional)"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
            <button
              onClick={handleSave}
              className="mt-3 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              disabled={updateContractMutation.isPending}
            >
              Salvar contrato
            </button>
          </>
        )}

        {message && <p className="mt-2 text-sm text-emerald-300">{message}</p>}
        {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
      </div>
    </div>
  )
}
