// [REMOVED] Orphan file — not imported by any production code. Safe to delete.
export {}

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
  backendHealthy?: boolean
  backendStatusMessage?: string | null
  pollingPaused?: boolean
  children: ReactNode
}

export function OwnerPortalLayout({
  title,
  subtitle,
  navItems,
  activeKey,
  onNavigate,
  backendHealthy,
  backendStatusMessage,
  pollingPaused,
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
    <div className="owner-modern-skin min-h-screen bg-gradient-to-b from-background via-background to-primary/5 text-foreground">
      <header className="border-b border-border/80 bg-gradient-to-r from-card via-card to-primary/5 backdrop-blur supports-[backdrop-filter]:bg-card/90">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/15">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{title}</h1>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {typeof backendHealthy === 'boolean' && (
              <div
                className={`hidden rounded-md border px-3 py-2 text-xs lg:block ${
                  backendHealthy
                    ? 'border-emerald-300/60 bg-emerald-100 text-emerald-900'
                    : 'border-rose-300/70 bg-rose-100 text-rose-900'
                }`}
                title={backendStatusMessage ?? undefined}
              >
                <p className="flex items-center gap-2">
                  {backendHealthy ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {backendHealthy ? 'Backend owner conectado' : 'Backend owner com incompatibilidade'}
                </p>
              </div>
            )}

            {pollingPaused && (
              <div className="hidden rounded-md border border-amber-300/70 bg-amber-100 px-3 py-2 text-xs text-amber-900 lg:block">
                Polling pausado: aba inativa
              </div>
            )}

            {impersonation?.empresaId && (
              <div className="rounded-md border border-amber-300/60 bg-amber-100 px-3 py-2 text-xs text-amber-900">
                <p>Modo cliente ativo: {impersonation.empresaNome ?? impersonation.empresaId}</p>
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
            <button onClick={logout} className="rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted">
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
                  item.key === activeKey ? 'bg-primary font-semibold text-primary-foreground' : 'text-foreground hover:bg-muted'
                }`}
                onClick={() => onNavigate(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="space-y-4 rounded-xl border border-border/70 bg-background p-4 shadow-industrial md:p-5">
          {children}
        </main>
      </div>
    </div>
  )
}
