import { LogOut, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { stopImpersonation } from '@/services/ownerPortal.service'

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
  const [isStoppingImpersonation, setIsStoppingImpersonation] = useState(false)

  const handleStopImpersonation = async () => {
    if (!impersonation?.empresaId) {
      stopImpersonationSession()
      return
    }

    setIsStoppingImpersonation(true)

    try {
      await stopImpersonation({
        empresa_id: impersonation.empresaId,
        empresa_nome: impersonation.empresaNome ?? undefined,
        reason: 'manual_owner_header',
      })
    } finally {
      stopImpersonationSession()
      setIsStoppingImpersonation(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 text-foreground">
      <header className="border-b border-border/80 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 border border-primary/30">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{title}</h1>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {impersonation?.empresaId && (
              <div className="rounded-md border border-amber-300/60 bg-amber-100 px-3 py-2 text-xs text-amber-900">
                <p>
                  Modo cliente ativo: {impersonation.empresaNome ?? impersonation.empresaId}
                </p>
                <button
                  onClick={handleStopImpersonation}
                  disabled={isStoppingImpersonation}
                  className="mt-1 rounded border border-amber-500 px-2 py-1 text-[11px] hover:bg-amber-200 disabled:opacity-60"
                >
                  Encerrar modo cliente
                </button>
              </div>
            )}
            <div className="text-right">
              <p className="text-sm font-medium">{user?.nome}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
            >
              <LogOut className="mr-2 inline-block h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  item.key === activeKey
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'hover:bg-muted text-foreground'
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
