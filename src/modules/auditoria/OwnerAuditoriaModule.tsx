import { useOwnerAuditLogs } from '@/hooks/useOwnerPortal'

type Audit = {
  id: string
  actor_email?: string
  action?: string
  table_name?: string
  severity?: string
  created_at?: string
}

export function OwnerAuditoriaModule() {
  const { data, isLoading } = useOwnerAuditLogs()

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando auditoria...</div>
  }

  const logs = ((data as Audit[] | undefined) ?? []).slice(0, 50)

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold">Auditoria global</h2>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="grid grid-cols-5 items-center rounded-md border border-slate-800 p-3 text-xs">
            <span className="truncate">{log.actor_email ?? '-'}</span>
            <span className="truncate">{log.action ?? '-'}</span>
            <span className="truncate text-slate-400">{log.table_name ?? '-'}</span>
            <span className="truncate text-slate-400">{log.severity ?? '-'}</span>
            <span className="text-slate-400">{log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '-'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
