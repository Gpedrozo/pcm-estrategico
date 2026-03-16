import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { isOwnerDomain } from '@/lib/security'

const TENANT_BASE_DOMAIN = (import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gppis.com.br').toLowerCase()

function resolveHostContext(hostname: string) {
  const host = hostname.toLowerCase()
  const isBaseDomain = host === TENANT_BASE_DOMAIN || host === `www.${TENANT_BASE_DOMAIN}`
  const isTenantSubdomain = !isBaseDomain && host.endsWith(`.${TENANT_BASE_DOMAIN}`)
  const slug = isTenantSubdomain ? host.replace(`.${TENANT_BASE_DOMAIN}`, '').split('.')[0]?.trim().toLowerCase() || '' : ''
  return {
    isBaseDomain,
    isTenantSubdomain,
    slug,
  }
}

function hasSessionTransferHash() {
  const rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
  if (!rawHash) return false
  const params = new URLSearchParams(rawHash)
  return Boolean(params.get('session_transfer'))
}

export function TenantDomainMiddleware({ children }: { children: React.ReactNode }) {
  const { tenant, isLoading, error } = useTenant()
  const { isAuthenticated, tenantId, logout } = useAuth()
  const location = useLocation()

  const hostname = window.location.hostname.toLowerCase()
  const isOwnerHost = isOwnerDomain(hostname)
  const hostContext = resolveHostContext(hostname)
  const isLoginRoute = location.pathname === '/login'

  useEffect(() => {
    if (!hostContext.isTenantSubdomain || isLoading || !error || !isAuthenticated) return
    if (isLoginRoute || hasSessionTransferHash()) return
    void logout()
  }, [error, hostContext.isTenantSubdomain, isAuthenticated, isLoading, isLoginRoute, logout])

  useEffect(() => {
    if (!hostContext.isTenantSubdomain || isLoading || !isAuthenticated) return
    if (isLoginRoute || hasSessionTransferHash()) return
    if (!tenant?.id || !tenantId) return
    if (tenant.id !== tenantId) {
      void logout()
    }
  }, [hostContext.isTenantSubdomain, isAuthenticated, isLoading, isLoginRoute, logout, tenant?.id, tenantId])

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

  if (hostContext.isTenantSubdomain && (!tenant || error)) {
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
