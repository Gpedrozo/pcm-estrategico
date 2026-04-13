import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OSImpressaoRow {
  id: string;
  os_id: string;
  empresa_id: string;
  impresso_por: string;
  impresso_por_nome: string | null;
  impresso_em: string;
}

// Busca todas as impressões de um conjunto de OS ids (para a tabela do histórico)
export function useOSImpressoesMap(osIds: string[]) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['os_impressoes_map', tenantId, osIds.join(',')],
    enabled: !!tenantId && osIds.length > 0,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_impressoes' as any)
        .select('id, os_id, impresso_por_nome, impresso_em')
        .eq('empresa_id', tenantId!)
        .in('os_id', osIds)
        .order('impresso_em', { ascending: false }) as any;

      if (error) throw error;

      // Mapa: os_id → impressão mais recente
      const map = new Map<string, OSImpressaoRow>();
      for (const row of (data ?? []) as OSImpressaoRow[]) {
        if (!map.has(row.os_id)) {
          map.set(row.os_id, row);
        }
      }
      return map;
    },
  });
}

// Busca o histórico completo de impressões de uma única OS
export function useOSImpressoes(osId: string | undefined) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['os_impressoes', tenantId, osId],
    enabled: !!tenantId && !!osId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_impressoes' as any)
        .select('id, os_id, impresso_por, impresso_por_nome, impresso_em')
        .eq('empresa_id', tenantId!)
        .eq('os_id', osId!)
        .order('impresso_em', { ascending: false }) as any;

      if (error) throw error;
      return (data ?? []) as OSImpressaoRow[];
    },
  });
}

// Registra uma nova impressão
export function useRegistrarImpressao() {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ osId }: { osId: string }) => {
      if (!tenantId || !user?.id) return;

      // Busca nome do usuário para desnormalizar
      const nome = user.email ?? 'Desconhecido';

      const { error } = await supabase
        .from('os_impressoes' as any)
        .insert({
          os_id: osId,
          empresa_id: tenantId,
          impresso_por: user.id,
          impresso_por_nome: nome,
          impresso_em: new Date().toISOString(),
        }) as any;

      if (error) {
        // Falha silenciosa — não interrompe o fluxo de impressão
        console.warn('[useRegistrarImpressao] falha ao registrar impressão:', error.message);
      }
    },
    onSuccess: (_data, { osId }) => {
      void queryClient.invalidateQueries({ queryKey: ['os_impressoes', tenantId, osId] });
      void queryClient.invalidateQueries({ queryKey: ['os_impressoes_map', tenantId] });
    },
  });
}
