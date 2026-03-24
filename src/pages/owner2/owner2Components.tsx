import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export function SurfaceCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card/95 p-4 shadow-sm" aria-label={title}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function MetricTile({ label, value, icon: Icon, tone = 'sky' }: { label: string; value: string | number; icon: LucideIcon; tone?: 'sky' | 'emerald' | 'amber' | 'rose' }) {
  const toneClass = {
    sky: 'from-sky-50 to-cyan-50 border-sky-200 text-sky-800',
    emerald: 'from-emerald-50 to-teal-50 border-emerald-200 text-emerald-800',
    amber: 'from-amber-50 to-orange-50 border-amber-200 text-amber-800',
    rose: 'from-rose-50 to-pink-50 border-rose-200 text-rose-800',
  }[tone]

  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${toneClass}`} role="status" aria-label={`${label}: ${value}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium opacity-80">{label}</p>
        <Icon className="h-4 w-4 opacity-80" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}
