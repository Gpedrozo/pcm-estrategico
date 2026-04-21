import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useModuleAccess } from '@/hooks/useModuleAccess'
import { logger } from '@/lib/logger'

const MODULE_GATE_TIMEOUT_MS = 8_000

/**
 * Route guard that silently redirects to /dashboard when the current route
 * belongs to a disabled module.
 *
 * Usage in App.tsx: wrap route elements with <ModuleGate>
 *   <Route path="/preditiva" element={<ModuleGate><Preditiva /></ModuleGate>} />
 */
export function ModuleGate({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { isRouteEnabled, isLoading } = useModuleAccess()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false)
      return
    }

    const timer = window.setTimeout(() => {
      setTimedOut(true)
      logger.warn('module_gate_timeout_fallback', { pathname })
    }, MODULE_GATE_TIMEOUT_MS)

    return () => window.clearTimeout(timer)
  }, [isLoading, pathname])

  if (isLoading && !timedOut) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Fail-open fallback: avoid blocking the app in a blank state when permission query hangs.
  if (isLoading && timedOut) return <>{children}</>

  if (!isRouteEnabled(pathname)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
