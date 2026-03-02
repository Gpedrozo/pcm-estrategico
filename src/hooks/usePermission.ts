import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function usePermission(permissionCode: string, empresaId?: string | null) {
  return useQuery({
    queryKey: ['permission', permissionCode, empresaId ?? null],
    queryFn: async () => {
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
