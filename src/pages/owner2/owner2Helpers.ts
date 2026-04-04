export const KNOWN_OWNER_MASTER_EMAILS = ['pedrozo@gppis.com.br', 'pedrozo@gppis.cm.br'] as const

export const TENANT_BASE_DOMAIN = (import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gppis.com.br').toLowerCase()

export function normalizeEmail(value: string): string {
  return String(value || '').trim().toLowerCase()
}

export function resolveOwnerMasterEmail(): string {
  const configured = normalizeEmail(String(import.meta.env.VITE_OWNER_MASTER_EMAIL ?? ''))
  if (configured) return configured
  return KNOWN_OWNER_MASTER_EMAILS[0]
}

export function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1' || normalized === 'sim') return true
    if (normalized === 'false' || normalized === '0' || normalized === 'nao' || normalized === 'não') return false
  }
  return fallback
}

export function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function statusColor(status: string): string {
  const normalized = status.toLowerCase()
  if (normalized === 'excluido') {
    return 'bg-slate-200 text-slate-500 border-slate-300'
  }
  if (normalized.includes('ativo') || normalized.includes('active') || normalized.includes('resolvido')) {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  }
  if (normalized.includes('bloq') || normalized.includes('block') || normalized.includes('inativo') || normalized.includes('cancel')) {
    return 'bg-rose-100 text-rose-700 border-rose-200'
  }
  return 'bg-amber-100 text-amber-700 border-amber-200'
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>): void {
  const escapeCell = (value: string | number) => {
    const content = String(value ?? '')
    return `"${content.replace(/"/g, '""')}"`
  }

  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(';'))
    .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(href)
}
