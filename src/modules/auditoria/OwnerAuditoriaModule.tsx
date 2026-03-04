import { useState } from 'react'
import { useOwnerAuditLogs } from '@/hooks/useOwnerPortal'

type Audit = {
  id: string
  actor_email?: string
  action?: string
  action_type?: string
  table_name?: string
  source?: string
  empresa_id?: string
  severity?: string
  created_at?: string
}

export function OwnerAuditoriaModule() {
  const [filters, setFilters] = useState({
    empresa_id: '',
    user_id: '',
    module: '',
    from: '',
    to: '',
  })

  const [appliedFilters, setAppliedFilters] = useState<typeof filters>({
    empresa_id: '',
    user_id: '',
    module: '',
    from: '',
    to: '',
  })

  const { data, isLoading, isFetching } = useOwnerAuditLogs({
    empresa_id: appliedFilters.empresa_id || undefined,
    user_id: appliedFilters.user_id || undefined,
    module: appliedFilters.module || undefined,
    from: appliedFilters.from || undefined,
    to: appliedFilters.to || undefined,
  })

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando auditoria...</div>
  }

  const logs = ((data as Audit[] | undefined) ?? []).slice(0, 50)

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold">Auditoria global</h2>

      <div className="mb-3 grid gap-2 md:grid-cols-3 xl:grid-cols-5">
        <input
          className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
          placeholder="Empresa ID"
          value={filters.empresa_id}
          onChange={(e) => setFilters((prev) => ({ ...prev, empresa_id: e.target.value }))}
        />
        <input
          className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
          placeholder="Usuário ID"
          value={filters.user_id}
          onChange={(e) => setFilters((prev) => ({ ...prev, user_id: e.target.value }))}
        />
        <input
          className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
          placeholder="Módulo/Fonte"
          value={filters.module}
          onChange={(e) => setFilters((prev) => ({ ...prev, module: e.target.value }))}
        />
        <input
          type="date"
          className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
          value={filters.from}
          onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
        />
        <input
          type="date"
          className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
          value={filters.to}
          onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
        />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => setAppliedFilters(filters)}
          className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-900"
        >
          Aplicar filtros
        </button>
        <button
          onClick={() => {
            const empty = { empresa_id: '', user_id: '', module: '', from: '', to: '' }
            setFilters(empty)
            setAppliedFilters(empty)
          }}
          className="rounded-md border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800"
        >
          Limpar
        </button>
        {isFetching && <span className="text-xs text-slate-400">Atualizando consulta...</span>}
      </div>

      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="grid grid-cols-6 items-center rounded-md border border-slate-800 p-3 text-xs">
            <span className="truncate">{log.actor_email ?? '-'}</span>
            <span className="truncate">{log.action_type ?? log.action ?? '-'}</span>
            <span className="truncate text-slate-400">{log.table_name ?? '-'}</span>
            <span className="truncate text-slate-500">{log.source ?? '-'}</span>
            <span className="truncate text-slate-400">{log.severity ?? '-'}</span>
            <span className="text-slate-400">{log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '-'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
