import { Navigate, useLocation } from 'react-router-dom'
import { useModuleAccess } from '@/hooks/useModuleAccess'

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

  // While loading, render nothing to avoid flash
  if (isLoading) return null

  if (!isRouteEnabled(pathname)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
