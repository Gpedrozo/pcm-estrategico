import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyContract, signMyContract } from '@/services/platformContracts.service'
import { useAuth } from '@/contexts/AuthContext'

export function usePlatformContract() {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: ['platform-contract', tenantId],
    queryFn: getMyContract,
    enabled: Boolean(tenantId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSignContract() {
  const queryClient = useQueryClient()
  const { tenantId } = useAuth()

  return useMutation({
    mutationFn: (contractId: string) => signMyContract(contractId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-contract', tenantId] })
    },
  })
}
