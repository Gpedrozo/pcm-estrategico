import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { DEFAULT_MODULES, getModuleForRoute, getModuleForSidebarPath } from '@/lib/moduleRegistry'

export interface ModuleAccessResult {
  /** Map of module_key -> enabled boolean */
  modules: Record<string, boolean>
  /** Whether the query is still loading */
  isLoading: boolean
  /** Check if a specific module is enabled */
  isModuleEnabled: (moduleKey: string) => boolean
  /** Check if a route should be accessible */
  isRouteEnabled: (routePath: string) => boolean
  /** Check if a sidebar item should be visible */
  isSidebarItemVisible: (sidebarPath: string) => boolean
}

/**
 * Hook that loads the enabled/disabled modules for the current tenant empresa.
 *
 * Reads from configuracoes_sistema where chave = 'modules'.
 * Falls back to DEFAULT_MODULES if no config exists yet.
 *
 * Owner/system contexts bypass all gating (everything enabled).
 */
export function useModuleAccess(): ModuleAccessResult {
  const { tenantId, isSystemOwner } = useAuth()

  const query = useQuery({
    queryKey: ['module-access', tenantId],
    queryFn: async () => {
      if (!tenantId) return DEFAULT_MODULES

      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('empresa_id', tenantId)
        .eq('chave', 'modules')
        .maybeSingle()

      if (error) {
        console.warn('[useModuleAccess] Failed to load modules config:', error.message)
        return DEFAULT_MODULES
      }

      if (!data?.valor || typeof data.valor !== 'object') {
        return DEFAULT_MODULES
      }

      // Merge with defaults: any module not in the stored config uses its default
      const stored = data.valor as Record<string, unknown>
      const merged: Record<string, boolean> = { ...DEFAULT_MODULES }
      for (const key of Object.keys(merged)) {
        if (typeof stored[key] === 'boolean') {
          merged[key] = stored[key] as boolean
        }
      }
      return merged
    },
    enabled: Boolean(tenantId) && !isSystemOwner,
    staleTime: 5 * 60 * 1000, // 5 min cache - modules don't change often
    gcTime: 10 * 60 * 1000,
  })

  // Owner sees everything
  if (isSystemOwner) {
    return {
      modules: Object.fromEntries(Object.keys(DEFAULT_MODULES).map((k) => [k, true])),
      isLoading: false,
      isModuleEnabled: () => true,
      isRouteEnabled: () => true,
      isSidebarItemVisible: () => true,
    }
  }

  const modules = query.data ?? DEFAULT_MODULES

  function isModuleEnabled(moduleKey: string): boolean {
    return modules[moduleKey] !== false
  }

  function isRouteEnabled(routePath: string): boolean {
    const moduleKey = getModuleForRoute(routePath)
    if (!moduleKey) return true // unregistered route = always allowed
    return isModuleEnabled(moduleKey)
  }

  function isSidebarItemVisible(sidebarPath: string): boolean {
    const moduleKey = getModuleForSidebarPath(sidebarPath)
    if (!moduleKey) return true // unregistered path = always visible
    return isModuleEnabled(moduleKey)
  }

  return {
    modules,
    isLoading: query.isLoading,
    isModuleEnabled,
    isRouteEnabled,
    isSidebarItemVisible,
  }
}
