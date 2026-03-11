import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { callOwnerAdmin } from '@/services/ownerPortal.service'
import { useOwnerCompanies, useOwnerCompanyActions, useOwnerDatabaseTables } from '@/hooks/useOwnerPortal'

export function OwnerSistemaModule() {
  const queryClient = useQueryClient()
  const { data: companiesData, isLoading: loadingCompanies } = useOwnerCompanies()
  const { data: databaseTables, isLoading: loadingTables } = useOwnerDatabaseTables()
  const {
    cleanupCompanyDataMutation,
    purgeTableDataMutation,
    deleteCompanyByOwnerMutation,
  } = useOwnerCompanyActions()

  const [userId, setUserId] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [tableName, setTableName] = useState('')
  const [cleanupPhrase, setCleanupPhrase] = useState('')
  const [purgePhrase, setPurgePhrase] = useState('')
  const [deleteCompanyName, setDeleteCompanyName] = useState('')
  const [keepCompanyCore, setKeepCompanyCore] = useState(false)
  const [keepBillingData, setKeepBillingData] = useState(false)
  const [includeAuthUsers, setIncludeAuthUsers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const companies = useMemo(() => (companiesData?.companies ?? []) as Array<{ id: string; nome?: string; slug?: string }>, [companiesData])
  const selectedCompany = companies.find((c) => c.id === empresaId)

  const sortedTables = useMemo(
    () => ((databaseTables ?? []) as Array<{ table_name: string; total_rows: number; has_empresa_id: boolean }>)
      .slice()
      .sort((a, b) => b.total_rows - a.total_rows),
    [databaseTables],
  )

  const handleCreateSystemAdmin = async () => {
    if (!userId.trim()) {
      setError('Informe o ID do usuário para promover para SYSTEM_ADMIN.')
      return
    }

    setIsSubmitting(true)
    setMessage(null)
    setError(null)

    try {
      await callOwnerAdmin({ action: 'create_system_admin', user_id: userId.trim() })
      setMessage('Permissão SYSTEM_ADMIN concedida com sucesso.')
      setUserId('')
      queryClient.invalidateQueries({ queryKey: ['owner', 'users'] })
    } catch (err: any) {
      setError(err?.message ?? 'Falha ao promover usuário para SYSTEM_ADMIN.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCleanupCompanyData = async () => {
    if (!empresaId) {
      setError('Selecione a empresa que deseja limpar.')
      return
    }

    if (cleanupPhrase.trim().toUpperCase() !== 'LIMPAR EMPRESA') {
      setError('Confirmação inválida. Digite exatamente LIMPAR EMPRESA.')
      return
    }

    setMessage(null)
    setError(null)

    cleanupCompanyDataMutation.mutate(
      {
        empresa_id: empresaId,
        keep_company_core: keepCompanyCore,
        keep_billing_data: keepBillingData,
        include_auth_users: includeAuthUsers,
        confirmation_phrase: cleanupPhrase.trim(),
      },
      {
        onSuccess: (result: any) => {
          const totalDeleted = Number(result?.summary?.total_deleted ?? 0)
          setMessage(`Limpeza da empresa concluída. Registros removidos: ${totalDeleted}.`)
          setCleanupPhrase('')
        },
        onError: (err: any) => setError(err?.message ?? 'Falha ao limpar dados da empresa.'),
      },
    )
  }

  const handlePurgeTable = async () => {
    if (!tableName.trim()) {
      setError('Selecione uma tabela para limpeza.')
      return
    }

    if (purgePhrase.trim().toUpperCase() !== 'LIMPAR TABELA') {
      setError('Confirmação inválida. Digite exatamente LIMPAR TABELA.')
      return
    }

    setMessage(null)
    setError(null)

    purgeTableDataMutation.mutate(
      {
        table_name: tableName,
        empresa_id: empresaId || undefined,
        confirmation_phrase: purgePhrase.trim(),
      },
      {
        onSuccess: (result: any) => {
          const deleted = Number(result?.summary?.deleted_rows ?? 0)
          setMessage(`Tabela ${tableName} limpa com sucesso. Registros removidos: ${deleted}.`)
          setPurgePhrase('')
        },
        onError: (err: any) => setError(err?.message ?? 'Falha ao limpar tabela.'),
      },
    )
  }

  const handleDeleteCompany = async () => {
    if (!empresaId || !selectedCompany) {
      setError('Selecione a empresa que deseja excluir.')
      return
    }

    if (deleteCompanyName.trim() !== (selectedCompany.nome || selectedCompany.slug || '')) {
      setError('Confirmação inválida. Digite exatamente o nome da empresa selecionada.')
      return
    }

    setMessage(null)
    setError(null)

    deleteCompanyByOwnerMutation.mutate(
      {
        empresa_id: empresaId,
        confirmation_name: deleteCompanyName.trim(),
        include_auth_users: includeAuthUsers,
      },
      {
        onSuccess: () => {
          setMessage('Empresa excluída com sucesso (banco mantido; dados removidos).')
          setEmpresaId('')
          setDeleteCompanyName('')
        },
        onError: (err: any) => setError(err?.message ?? 'Falha ao excluir empresa.'),
      },
    )
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-sm font-semibold">Sistema</h2>
      <p className="mt-2 text-sm text-slate-400">Operações globais sensíveis do ambiente multiempresa.</p>

      <div className="mt-4 rounded-md border border-slate-800 p-3">
        <h3 className="text-sm font-medium">Promover usuário para SYSTEM_ADMIN</h3>
        <p className="mt-1 text-xs text-slate-400">Informe o ID do usuário existente para conceder privilégio administrativo global.</p>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <input
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="UUID do usuário"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <button
            onClick={handleCreateSystemAdmin}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
            disabled={isSubmitting}
          >
            Conceder SYSTEM_ADMIN
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-amber-700/40 bg-amber-950/20 p-3">
        <h3 className="text-sm font-medium text-amber-300">Data Control (Owner Master)</h3>
        <p className="mt-1 text-xs text-amber-200/80">
          Acesso direto para limpar dados de tenant e tabelas da plataforma. O banco nunca e apagado, apenas os registros.
        </p>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="text-xs text-slate-300">Empresa alvo</label>
          <select
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
            disabled={loadingCompanies}
          >
            <option value="">Selecione empresa</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {(company.nome || company.slug || company.id)}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={keepCompanyCore} onChange={(e) => setKeepCompanyCore(e.target.checked)} />
            Preservar dados core da empresa
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={keepBillingData} onChange={(e) => setKeepBillingData(e.target.checked)} />
            Preservar billing/assinatura
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={includeAuthUsers} onChange={(e) => setIncludeAuthUsers(e.target.checked)} />
            Incluir usuários auth da empresa
          </label>
        </div>

        <div className="mt-4 rounded border border-slate-800 p-3">
          <h4 className="text-xs font-semibold text-slate-200">Limpar dados da empresa (sem excluir banco)</h4>
          <div className="mt-2 flex flex-col gap-2 md:flex-row">
            <input
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder="Digite LIMPAR EMPRESA"
              value={cleanupPhrase}
              onChange={(e) => setCleanupPhrase(e.target.value)}
            />
            <button
              onClick={handleCleanupCompanyData}
              className="rounded-md border border-amber-500 px-4 py-2 text-sm font-semibold text-amber-200"
              disabled={cleanupCompanyDataMutation.isPending}
            >
              Limpar empresa
            </button>
          </div>
        </div>

        <div className="mt-3 rounded border border-slate-800 p-3">
          <h4 className="text-xs font-semibold text-slate-200">Limpar tabela específica</h4>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <select
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              disabled={loadingTables}
            >
              <option value="">Selecione tabela</option>
              {sortedTables.map((table) => (
                <option key={table.table_name} value={table.table_name}>
                  {table.table_name} ({table.total_rows})
                </option>
              ))}
            </select>
            <input
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder="Digite LIMPAR TABELA"
              value={purgePhrase}
              onChange={(e) => setPurgePhrase(e.target.value)}
            />
            <button
              onClick={handlePurgeTable}
              className="rounded-md border border-amber-500 px-4 py-2 text-sm font-semibold text-amber-200"
              disabled={purgeTableDataMutation.isPending}
            >
              Limpar tabela
            </button>
          </div>
        </div>

        <div className="mt-3 rounded border border-rose-700/60 bg-rose-950/30 p-3">
          <h4 className="text-xs font-semibold text-rose-200">Excluir empresa (remoção completa dos dados do tenant)</h4>
          <p className="mt-1 text-xs text-rose-200/80">Não apaga banco físico, mas remove empresa e dados relacionados do tenant.</p>
          <div className="mt-2 flex flex-col gap-2 md:flex-row">
            <input
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder={`Digite exatamente: ${selectedCompany?.nome || selectedCompany?.slug || 'nome da empresa'}`}
              value={deleteCompanyName}
              onChange={(e) => setDeleteCompanyName(e.target.value)}
            />
            <button
              onClick={handleDeleteCompany}
              className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
              disabled={deleteCompanyByOwnerMutation.isPending}
            >
              Excluir empresa
            </button>
          </div>
        </div>

        <div className="mt-4 max-h-72 overflow-auto rounded border border-slate-800">
          <table className="w-full text-xs">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="px-3 py-2 text-left">Tabela</th>
                <th className="px-3 py-2 text-right">Registros</th>
                <th className="px-3 py-2 text-center">empresa_id</th>
              </tr>
            </thead>
            <tbody>
              {sortedTables.map((table) => (
                <tr key={table.table_name} className="border-t border-slate-800">
                  <td className="px-3 py-2 font-mono">{table.table_name}</td>
                  <td className="px-3 py-2 text-right">{table.total_rows}</td>
                  <td className="px-3 py-2 text-center">{table.has_empresa_id ? 'sim' : 'nao'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </div>
  )
}
