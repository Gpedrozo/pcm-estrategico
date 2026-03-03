import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuthOptional } from '@/contexts/AuthContext'

export function usePermission(permissionCode: string, empresaId?: string | null) {
  const auth = useAuthOptional()
  const effectiveRole = auth?.effectiveRole
  const hasGlobalAccess =
    effectiveRole === 'SYSTEM_OWNER' ||
    effectiveRole === 'SYSTEM_ADMIN' ||
    effectiveRole === 'MASTER_TI'

  return useQuery({
    queryKey: ['permission', permissionCode, empresaId ?? null],
    queryFn: async () => {
      if (hasGlobalAccess) return true

      const { data, error } = await supabase.rpc('has_permission', {
        p_permission_code: permissionCode,
        p_empresa_id: empresaId ?? null,
      })

      if (error) throw error
      return Boolean(data)
    },
    staleTime: 60_000,
  })
}
