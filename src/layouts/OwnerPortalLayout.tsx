import { LogOut, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { ReactNode } from 'react'

export interface OwnerNavItem {
  key: string
  label: string
}

interface OwnerPortalLayoutProps {
  title: string
  subtitle: string
  navItems: OwnerNavItem[]
  activeKey: string
  onNavigate: (key: string) => void
  children: ReactNode
}

export function OwnerPortalLayout({
  title,
  subtitle,
  navItems,
  activeKey,
  onNavigate,
  children,
}: OwnerPortalLayoutProps) {
  const { user, logout, impersonation, stopImpersonationSession } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
              <Shield className="h-5 w-5 text-slate-900" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{title}</h1>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {impersonation?.empresaId && (
              <div className="rounded-md border border-amber-800 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
                <p>
                  Modo cliente ativo: {impersonation.empresaNome ?? impersonation.empresaId}
                </p>
                <button
                  onClick={stopImpersonationSession}
                  className="mt-1 rounded border border-amber-700 px-2 py-1 text-[11px] hover:bg-amber-900/40"
                >
                  Encerrar modo cliente
                </button>
              </div>
            )}
            <div className="text-right">
              <p className="text-sm font-medium">{user?.nome}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-md border border-slate-700 px-3 py-2 text-xs font-medium hover:bg-slate-800"
            >
              <LogOut className="mr-2 inline-block h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  item.key === activeKey
                    ? 'bg-emerald-500 text-slate-900 font-semibold'
                    : 'hover:bg-slate-800 text-slate-200'
                }`}
                onClick={() => onNavigate(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="space-y-4">{children}</main>
      </div>
    </div>
  )
}
