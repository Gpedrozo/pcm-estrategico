import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RotaPonto, RotaPontoInsert } from '@/types/lubrificacao';
import { writeAuditLog } from '@/lib/audit';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Fetch lubrication route points linked to a specific plan (plano_id).
 */
export function usePontosPlano(planoId: string | null | undefined) {
  return useQuery({
    queryKey: ['pontos_lubrificacao', 'plano', planoId],
    queryFn: async () => {
      if (!planoId) return [];
      const { data, error } = await supabase
        .from('rotas_lubrificacao_pontos')
        .select('*')
        .eq('plano_id', planoId)
        .is('rota_id', null)
        .order('ordem', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data || []) as RotaPonto[];
    },
    enabled: !!planoId,
  });
}

/**
 * Save (replace-all) lubrication points for a plan.
 * Deletes existing plan-linked points then inserts new ones.
 */
export function useSavePontosPlano() {
  const qc = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation({
    mutationFn: async ({ planoId, pontos }: { planoId: string; pontos: RotaPontoInsert[] }) => {
      // Delete existing points linked to this plan (only plan-linked, not route-linked)
      const { error: delErr } = await supabase
        .from('rotas_lubrificacao_pontos')
        .delete()
        .eq('plano_id', planoId)
        .is('rota_id', null);
      if (delErr) throw delErr;

      if (pontos.length === 0) return [];

      const rows = pontos.map((p, i) => ({
        ...p,
        plano_id: planoId,
        rota_id: null,
        ordem: i,
      }));

      const { data, error } = await supabase
        .from('rotas_lubrificacao_pontos')
        .insert(rows)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['pontos_lubrificacao', 'plano', vars.planoId] });
      writeAuditLog({ action: 'SAVE_PONTOS_PLANO', table: 'rotas_lubrificacao_pontos', recordId: vars.planoId, empresaId: tenantId, source: 'usePontosPlano' });
    },
  });
}
