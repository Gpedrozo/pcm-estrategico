import { useMemo, useState } from 'react'
import { useOwnerAuditLogs } from '@/hooks/useOwnerPortal'

type LogRow = {
  id: string
  actor_email?: string
  action_type?: string
  source?: string
  severity?: string
  created_at?: string
}

export function OwnerLogsModule() {
  const [sourceFilter, setSourceFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')

  const { data, isLoading } = useOwnerAuditLogs({ module: sourceFilter || undefined })

  const logs = useMemo(() => {
    const rows = ((data as LogRow[] | undefined) ?? []).slice(0, 250)
    if (severityFilter === 'all') return rows
    return rows.filter((row) => row.severity === severityFilter)
  }, [data, severityFilter])

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando logs...</div>
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold">Logs de integração / sistema</h2>

      <div className="mb-3 grid gap-2 md:grid-cols-2">
        <input
          className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
          placeholder="Filtro por source (api, webhook, integration...)"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        />
        <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="all">Todas severidades</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="grid grid-cols-5 items-center rounded-md border border-slate-800 p-3 text-xs">
            <span className="truncate">{log.actor_email ?? '-'}</span>
            <span className="truncate">{log.action_type ?? '-'}</span>
            <span className="truncate text-slate-400">{log.source ?? '-'}</span>
            <span className="truncate text-slate-400">{log.severity ?? '-'}</span>
            <span className="text-slate-500">{log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '-'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
