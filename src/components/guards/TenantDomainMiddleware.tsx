import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { isOwnerDomain } from '@/lib/security'
import { getSessionTransferFromUrl } from '@/lib/sessionTransfer'
import { supabase } from '@/integrations/supabase/client'
import { getTenantBaseDomain, isTenantSubdomainHost, resolveTenantHostSlug } from '@/lib/tenantLoginFlow'

const TENANT_BASE_DOMAIN = getTenantBaseDomain()

function resolveHostContext(hostname: string) {
  const host = hostname.toLowerCase()
  const isTenantSubdomain = isTenantSubdomainHost(host)
  const isBaseDomain = !isTenantSubdomain
  const slug = resolveTenantHostSlug(host) || ''
  return {
    isBaseDomain,
    isTenantSubdomain,
    slug,
  }
}

function hasSessionTransferHash() {
  return Boolean(getSessionTransferFromUrl().token)
}

export function TenantDomainMiddleware({ children }: { children: React.ReactNode }) {
  const { tenant, isLoading, error } = useTenant()
  const { isAuthenticated, authStatus, isHydrating, tenantId, isLoading: isAuthLoading } = useAuth()
  const location = useLocation()
  const mismatchTimerRef = useRef<number | null>(null)

  const hostname = window.location.hostname.toLowerCase()
  const isOwnerHost = isOwnerDomain(hostname)
  const hostContext = resolveHostContext(hostname)
  const isLoginRoute = location.pathname === '/login'

  const forceTenantLocalReauth = async (reason: string) => {
    try {
      await supabase.auth.signOut({ scope: 'local' })
      await supabase.auth.signOut().catch(() => null)
    } catch {
      // noop
    }

    if (window.location.pathname !== '/login') {
      const next = encodeURIComponent(`${location.pathname}${location.search}` || '/dashboard')
      window.location.assign(`/login?reason=${encodeURIComponent(reason)}&next=${next}`)
    }
  }

  useEffect(() => {
    if (!hostContext.isTenantSubdomain || isLoading || isAuthLoading || isHydrating) return
    if (authStatus === 'loading' || authStatus === 'hydrating') return
    if (!error || !isAuthenticated) return
    if (isLoginRoute || hasSessionTransferHash()) return
    void forceTenantLocalReauth('tenant_error')
  }, [authStatus, error, hostContext.isTenantSubdomain, isAuthenticated, isHydrating, isLoading, isAuthLoading, isLoginRoute, location.pathname, location.search])

  useEffect(() => {
    if (mismatchTimerRef.current !== null) {
      window.clearTimeout(mismatchTimerRef.current)
      mismatchTimerRef.current = null
    }

    if (!hostContext.isTenantSubdomain || isLoading || isAuthLoading || isHydrating) return
    if (authStatus !== 'authenticated') return
    if (!isAuthenticated) return
    if (isLoginRoute || hasSessionTransferHash()) return
    if (!tenant?.id || !tenantId) return

    if (tenant.id !== tenantId) {
      mismatchTimerRef.current = window.setTimeout(() => {
        void forceTenantLocalReauth('tenant_mismatch')
      }, 1200)
    }
    return () => {
      if (mismatchTimerRef.current !== null) {
        window.clearTimeout(mismatchTimerRef.current)
        mismatchTimerRef.current = null
      }
    }
  }, [authStatus, hostContext.isTenantSubdomain, isAuthenticated, isHydrating, isLoading, isAuthLoading, isLoginRoute, tenant?.id, tenantId, location.pathname, location.search])

  if (isOwnerHost) return <>{children}</>

  // Never block the login screen on tenant subdomains.
  // This avoids race conditions around session transfer and auth hydration on first access.
  if (hostContext.isTenantSubdomain && isLoginRoute) {
    return <>{children}</>
  }

  if (hostContext.isTenantSubdomain && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Allow unauthenticated visitors to reach tenant routes (Index will route to /login).
  // Blocking here causes false "Tenant inválido" on first direct access to subdomains.
  if (
    hostContext.isTenantSubdomain
    && !isAuthenticated
    && !isHydrating
    && !isAuthLoading
    && authStatus === 'unauthenticated'
  ) {
    return <>{children}</>
  }

  if (hostContext.isTenantSubdomain && isAuthenticated && (!tenant || error)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-lg rounded-lg border border-destructive/40 bg-card p-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
          <h1 className="text-xl font-semibold">Tenant inválido</h1>
          <p className="text-sm text-muted-foreground">
            O subdomínio atual não está autorizado. Faça login pelo domínio principal para identificar sua empresa.
          </p>
          <a
            href={`https://${TENANT_BASE_DOMAIN}/login?next=${encodeURIComponent(`${location.pathname}${location.search}` || '/dashboard')}`}
            className="inline-flex rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Ir para login principal
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
