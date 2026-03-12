import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { callOwnerAdmin } from '@/services/ownerPortal.service'
import { useOwnerBackendHealth, useOwnerCompanies, useOwnerCompanyActions, useOwnerDatabaseTables } from '@/hooks/useOwnerPortal'

export function OwnerSistemaModule() {
  const queryClient = useQueryClient()
  const { data: companiesData, isLoading: loadingCompanies, error: companiesError } = useOwnerCompanies()
  const { data: backendHealth, error: backendHealthError, isFetching: checkingBackendHealth } = useOwnerBackendHealth()

  const supportedActionSet = useMemo(
    () => new Set<unknown>(Array.isArray(backendHealth?.supported_actions) ? backendHealth.supported_actions : []),
    [backendHealth],
  )

  const canCreateSystemAdmin = supportedActionSet.has('create_system_admin')
  const canListDatabaseTables = supportedActionSet.has('list_database_tables')
  const canCleanupCompanyData = supportedActionSet.has('cleanup_company_data')
  const canPurgeTableData = supportedActionSet.has('purge_table_data')
  const canDeleteCompanyData = supportedActionSet.has('delete_company')
  const hasAnyDataControl = canCleanupCompanyData || canPurgeTableData || canDeleteCompanyData
  const missingDataControlActions = useMemo(() => {
    const missing: string[] = []
    if (!canListDatabaseTables) missing.push('list_database_tables')
    if (!canCleanupCompanyData) missing.push('cleanup_company_data')
    if (!canPurgeTableData) missing.push('purge_table_data')
    if (!canDeleteCompanyData) missing.push('delete_company')
    return missing
  }, [canCleanupCompanyData, canDeleteCompanyData, canListDatabaseTables, canPurgeTableData])

  const supportsListDatabaseTables = useMemo(
    () => canListDatabaseTables,
    [canListDatabaseTables],
  )

  const {
    data: databaseTables,
    isLoading: loadingTables,
    error: databaseTablesError,
  } = useOwnerDatabaseTables(supportsListDatabaseTables)
  const {
    cleanupCompanyDataMutation,
    purgeTableDataMutation,
    deleteCompanyByOwnerMutation,
  } = useOwnerCompanyActions()

  const [userId, setUserId] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [tableName, setTableName] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [keepCompanyCore, setKeepCompanyCore] = useState(false)
  const [keepBillingData, setKeepBillingData] = useState(false)
  const [includeAuthUsers, setIncludeAuthUsers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const normalizeOwnerError = (err: any) => {
    const msg = String(err?.message ?? err ?? 'Falha na operação.').trim()
    if (/unsupported action/i.test(msg)) {
      return 'Owner backend desatualizado para esta ação. Publique a versão mais recente da edge function owner-portal-admin.'
    }
    return msg
  }

  const applyOwnerActionError = (err: any, fallback: string) => {
    const normalized = normalizeOwnerError(err)
    if (/forbidden|owner master only/i.test(normalized)) {
      setError('Seu usuario nao possui permissao owner master para esta acao.')
      return
    }
    if (/desatualizado|unsupported action/i.test(normalized)) {
      setError(null)
      setMessage('Ação indisponível nesta publicação do backend owner. Publique a versão mais recente para liberar o Data Control.')
      return
    }
    setError(normalized || fallback)
  }

  useEffect(() => {
    if (companiesError) {
      setError(normalizeOwnerError(companiesError))
    }
  }, [companiesError])

  useEffect(() => {
    if (supportsListDatabaseTables && databaseTablesError) {
      setError(normalizeOwnerError(databaseTablesError))
    }
  }, [databaseTablesError, supportsListDatabaseTables])

  const companies = useMemo(
    () => (Array.isArray(companiesData?.companies) ? (companiesData.companies as Array<{ id: string; nome?: string; slug?: string }>) : []),
    [companiesData],
  )
  const selectedCompany = companies.find((c) => c.id === empresaId)

  const sortedTables = useMemo(
    () => (Array.isArray(databaseTables) ? (databaseTables as Array<{ table_name: string; total_rows: number; has_empresa_id: boolean }>) : [])
      .slice()
      .sort((a, b) => b.total_rows - a.total_rows),
    [databaseTables],
  )

  const handleCreateSystemAdmin = async () => {
    if (!canCreateSystemAdmin) {
      setError(null)
      setMessage('create_system_admin indisponivel nesta publicacao do backend owner.')
      return
    }

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
      setError(normalizeOwnerError(err) || 'Falha ao promover usuário para SYSTEM_ADMIN.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRefreshCompatibility = () => {
    queryClient.invalidateQueries({ queryKey: ['owner', 'backend-health'] })
    queryClient.invalidateQueries({ queryKey: ['owner', 'database', 'tables'] })
    setMessage('Compatibilidade do backend em atualizacao. Aguarde alguns segundos.')
    setError(null)
  }

  const handleCleanupCompanyData = async () => {
    if (!canCleanupCompanyData) {
      setError(null)
      setMessage('cleanup_company_data indisponivel nesta publicacao do backend owner.')
      return
    }

    if (!empresaId) {
      setError('Selecione a empresa que deseja limpar.')
      return
    }

    if (!authPassword.trim()) {
      setError('Informe sua senha para confirmar a operação.')
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
        auth_password: authPassword,
      },
      {
        onSuccess: (result: any) => {
          const totalDeleted = Number(result?.summary?.total_deleted ?? 0)
          setMessage(`Limpeza da empresa concluída. Registros removidos: ${totalDeleted}.`)
          setAuthPassword('')
        },
        onError: (err: any) => applyOwnerActionError(err, 'Falha ao limpar dados da empresa.'),
      },
    )
  }

  const handlePurgeTable = async () => {
    if (!canPurgeTableData) {
      setError(null)
      setMessage('purge_table_data indisponivel nesta publicacao do backend owner.')
      return
    }

    if (!tableName.trim()) {
      setError('Informe uma tabela para limpeza.')
      return
    }

    if (!authPassword.trim()) {
      setError('Informe sua senha para confirmar a operação.')
      return
    }

    setMessage(null)
    setError(null)

    purgeTableDataMutation.mutate(
      {
        table_name: tableName,
        empresa_id: empresaId || undefined,
        auth_password: authPassword,
      },
      {
        onSuccess: (result: any) => {
          const deleted = Number(result?.summary?.deleted_rows ?? 0)
          setMessage(`Tabela ${tableName} limpa com sucesso. Registros removidos: ${deleted}.`)
          setAuthPassword('')
        },
        onError: (err: any) => applyOwnerActionError(err, 'Falha ao limpar tabela.'),
      },
    )
  }

  const handleDeleteCompany = async () => {
    if (!canDeleteCompanyData) {
      setError(null)
      setMessage('delete_company indisponivel nesta publicacao do backend owner.')
      return
    }

    if (!empresaId || !selectedCompany) {
      setError('Selecione a empresa que deseja excluir.')
      return
    }

    if (!authPassword.trim()) {
      setError('Informe sua senha para confirmar a operação.')
      return
    }

    setMessage(null)
    setError(null)

    deleteCompanyByOwnerMutation.mutate(
      {
        empresa_id: empresaId,
        include_auth_users: includeAuthUsers,
        auth_password: authPassword,
      },
      {
        onSuccess: () => {
          setMessage('Empresa excluída com sucesso (banco mantido; dados removidos).')
          setEmpresaId('')
          setAuthPassword('')
        },
        onError: (err: any) => applyOwnerActionError(err, 'Falha ao excluir empresa.'),
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
            disabled={isSubmitting || !canCreateSystemAdmin}
          >
            Conceder SYSTEM_ADMIN
          </button>
        </div>
        {!canCreateSystemAdmin && (
          <p className="mt-2 text-xs text-amber-300">Acao create_system_admin indisponivel no backend atual.</p>
        )}
      </div>

      <div className="mt-4 rounded-md border border-amber-700/40 bg-amber-950/20 p-3">
        <h3 className="text-sm font-medium text-amber-300">Data Control (Owner Master)</h3>
        <p className="mt-1 text-xs text-amber-200/80">
          Acesso direto para limpar dados de tenant e tabelas da plataforma. O banco nunca e apagado, apenas os registros.
        </p>

        {backendHealthError && (
          <div className="mt-3 rounded border border-rose-600/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
            Falha ao validar compatibilidade do backend owner: {normalizeOwnerError(backendHealthError)}
          </div>
        )}

        {!backendHealthError && missingDataControlActions.length > 0 && (
          <div className="mt-3 rounded border border-amber-600/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
            Data Control parcial. Acoes indisponiveis: {missingDataControlActions.join(', ')}.
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-slate-300">
            Versao backend: {backendHealth?.version ?? 'desconhecida'}
          </p>
          <button
            onClick={handleRefreshCompatibility}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
            disabled={checkingBackendHealth}
          >
            {checkingBackendHealth ? 'Atualizando...' : 'Atualizar compatibilidade'}
          </button>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="text-xs text-slate-300">Empresa alvo</label>
          <select
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
            disabled={loadingCompanies || !hasAnyDataControl}
          >
            <option value="">Selecione empresa</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {(company.nome || company.slug || company.id)}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="text-xs text-slate-300">Senha do seu usuário (confirmação de segurança)</label>
          <input
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            type="password"
            placeholder="Informe sua senha"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            disabled={!hasAnyDataControl}
          />
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
            <button
              onClick={handleCleanupCompanyData}
              className="rounded-md border border-amber-500 px-4 py-2 text-sm font-semibold text-amber-200"
              disabled={cleanupCompanyDataMutation.isPending || !authPassword.trim() || !canCleanupCompanyData}
            >
              Limpar empresa
            </button>
          </div>
        </div>

        <div className="mt-3 rounded border border-slate-800 p-3">
          <h4 className="text-xs font-semibold text-slate-200">Limpar tabela específica</h4>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {supportsListDatabaseTables ? (
              <select
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                disabled={loadingTables || !canPurgeTableData}
              >
                <option value="">Selecione tabela</option>
                {sortedTables.map((table) => (
                  <option key={table.table_name} value={table.table_name}>
                    {table.table_name} ({table.total_rows})
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                placeholder="Digite o nome da tabela"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                disabled={!canPurgeTableData}
              />
            )}
            <button
              onClick={handlePurgeTable}
              className="rounded-md border border-amber-500 px-4 py-2 text-sm font-semibold text-amber-200"
              disabled={purgeTableDataMutation.isPending || !authPassword.trim() || !canPurgeTableData}
            >
              Limpar tabela
            </button>
          </div>
        </div>

        <div className="mt-3 rounded border border-rose-700/60 bg-rose-950/30 p-3">
          <h4 className="text-xs font-semibold text-rose-200">Excluir empresa (remoção completa dos dados do tenant)</h4>
          <p className="mt-1 text-xs text-rose-200/80">Não apaga banco físico, mas remove empresa e dados relacionados do tenant.</p>
          <div className="mt-2 flex flex-col gap-2 md:flex-row">
            <button
              onClick={handleDeleteCompany}
              className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
              disabled={deleteCompanyByOwnerMutation.isPending || !authPassword.trim() || !canDeleteCompanyData}
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
              {!supportsListDatabaseTables && (
                <tr className="border-t border-slate-800">
                  <td className="px-3 py-3 text-slate-400" colSpan={3}>
                    Listagem indisponivel nesta versao. Digite manualmente o nome da tabela para usar a limpeza.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </div>
  )
}
