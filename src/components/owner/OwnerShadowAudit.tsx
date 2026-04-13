import { useMemo, useState } from 'react'
import { AlertTriangle, Eye, EyeOff, Shield } from 'lucide-react'

type AuditEntry = Record<string, unknown>

interface OwnerShadowAuditProps {
  logs: AuditEntry[]
}

const SEVERITY_MAP: Record<string, { label: string; color: string }> = {
  OWNER_SHADOW_ACTION:   { label: 'Ação monitorada',   color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50' },
  OWNER_CREATE_COMPANY:  { label: 'Criou empresa',      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50' },
  OWNER_DELETE_COMPANY:  { label: 'Excluiu empresa',    color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50' },
  OWNER_SUSPEND_COMPANY: { label: 'Suspendeu empresa',  color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50' },
  OWNER_UPDATE_SETTINGS: { label: 'Alterou config',     color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50' },
  OWNER_CREATE_USER:     { label: 'Criou usuário',      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50' },
  OWNER_DELETE_USER:     { label: 'Removeu usuário',    color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50' },
  OWNER_RESET_PASSWORD:  { label: 'Reset senha',        color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50' },
}

function isShadowEntry(entry: AuditEntry): boolean {
  const dados = entry.dados_depois as Record<string, unknown> | null
  if (dados?.source === 'owner-master-shadow') return true
  const source = String(entry.source ?? '').toLowerCase()
  if (source === 'owner-master-shadow') return true
  return false
}

function extractDetail(entry: AuditEntry): string {
  const dados = (entry.dados_depois ?? entry.details ?? {}) as Record<string, unknown>
  const parts: string[] = []
  if (dados.action) parts.push(String(dados.action))
  if (dados.owner_email) parts.push(String(dados.owner_email))
  if (dados.empresa_id) parts.push(`empresa: ${String(dados.empresa_id).slice(0, 8)}…`)
  if (dados.reason) parts.push(String(dados.reason))
  if (parts.length === 0) {
    const raw = JSON.stringify(dados)
    return raw.length > 100 ? raw.slice(0, 100) + '…' : raw
  }
  return parts.join(' · ')
}

function classifyAction(entry: AuditEntry): { label: string; color: string } {
  const acao = String(entry.acao ?? entry.action_type ?? '').toUpperCase()
  if (SEVERITY_MAP[acao]) return SEVERITY_MAP[acao]
  if (acao.includes('DELETE') || acao.includes('REMOVE')) return { label: acao, color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50' }
  if (acao.includes('CREATE') || acao.includes('INSERT')) return { label: acao, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50' }
  if (acao.includes('UPDATE') || acao.includes('SETTING')) return { label: acao, color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50' }
  return { label: acao || 'Ação', color: 'text-muted-foreground bg-muted' }
}

export default function OwnerShadowAudit({ logs }: OwnerShadowAuditProps) {
  const [showAll, setShowAll] = useState(false)

  const shadowLogs = useMemo(
    () => logs.filter(isShadowEntry).slice(0, 500),
    [logs],
  )

  const displayed = showAll ? shadowLogs : shadowLogs.slice(0, 50)
  const hasMore = shadowLogs.length > 50 && !showAll

  if (shadowLogs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-sm font-semibold text-card-foreground">Auditoria Silenciosa</h3>
        </div>
        <p className="text-sm text-muted-foreground">Nenhuma ação de owners secundários registrada ainda.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <EyeOff className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-sm font-semibold text-card-foreground">Auditoria Silenciosa</h3>
          <span className="rounded-full bg-sky-100 dark:bg-sky-900/50 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
            {shadowLogs.length} registro{shadowLogs.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          Invisível para owners secundários
        </div>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        Registro automático de todas as ações realizadas por owners que não são Owner Master.
        Estes dados são invisíveis para eles.
      </p>

      <div className="max-h-[520px] overflow-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left w-[140px]">Data/Hora</th>
              <th className="px-2 py-2 text-left">Ator</th>
              <th className="px-2 py-2 text-left">Classificação</th>
              <th className="px-2 py-2 text-left">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((entry, idx) => {
              const classification = classifyAction(entry)
              const detail = extractDetail(entry)
              const dateStr = entry.created_at ?? entry.ocorreu_em
              return (
                <tr key={`shadow-${idx}`} className="border-t border-border/50 hover:bg-muted/50">
                  <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">
                    {dateStr ? new Date(String(dateStr)).toLocaleString('pt-BR') : '-'}
                  </td>
                  <td className="px-2 py-2 font-medium text-foreground">
                    {String(entry.usuario_email ?? entry.actor_email ?? entry.usuario_id ?? '-')}
                  </td>
                  <td className="px-2 py-2">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${classification.color}`}>
                      {classification.label}
                    </span>
                  </td>
                  <td className="px-2 py-2 max-w-[300px] truncate text-muted-foreground" title={detail}>
                    {detail}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button
          className="mt-2 text-xs text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-medium"
          onClick={() => setShowAll(true)}
        >
          Mostrar todos ({shadowLogs.length} registros)
        </button>
      )}

      {shadowLogs.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Estes registros são gerados automaticamente pelo sistema. Owners secundários não têm
            visibilidade sobre esta auditoria.
          </p>
        </div>
      )}
    </div>
  )
}
