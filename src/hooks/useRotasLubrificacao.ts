import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  RotaLubrificacao,
  RotaLubrificacaoInsert,
  RotaPonto,
  RotaPontoInsert,
} from '@/types/lubrificacao';

// ─── Rotas ──────────────────────────────────────────
export function useRotasLubrificacao() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['rotas-lubrificacao', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rotas_lubrificacao')
        .select('*')
        .eq('empresa_id', tenantId!)
        .order('codigo');

      if (error) throw error;
      return data as RotaLubrificacao[];
    },
    enabled: Boolean(tenantId),
  });
}

export function useCreateRotaLubrificacao() {
  const { tenantId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RotaLubrificacaoInsert) => {
      const { data, error } = await supabase
        .from('rotas_lubrificacao')
        .insert({ ...payload, empresa_id: tenantId! })
        .select()
        .single();
      if (error) throw error;
      return data as RotaLubrificacao;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rotas-lubrificacao'] }),
  });
}

export function useUpdateRotaLubrificacao() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<RotaLubrificacaoInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from('rotas_lubrificacao')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as RotaLubrificacao;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rotas-lubrificacao'] }),
  });
}

export function useDeleteRotaLubrificacao() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rotas_lubrificacao')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rotas-lubrificacao'] }),
  });
}

// ─── Pontos da Rota ─────────────────────────────────
export function usePontosRota(rotaId: string | null | undefined) {
  return useQuery({
    queryKey: ['rotas-lubrificacao-pontos', rotaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rotas_lubrificacao_pontos')
        .select('*')
        .eq('rota_id', rotaId!)
        .order('ordem');
      if (error) throw error;
      return data as RotaPonto[];
    },
    enabled: Boolean(rotaId),
  });
}

export function useSavePontosRota() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ rotaId, pontos }: { rotaId: string; pontos: RotaPontoInsert[] }) => {
      // Delete existing and re-insert (simple approach for ordering)
      const { error: delError } = await supabase
        .from('rotas_lubrificacao_pontos')
        .delete()
        .eq('rota_id', rotaId);
      if (delError) throw delError;

      if (pontos.length === 0) return [];

      const { data, error } = await supabase
        .from('rotas_lubrificacao_pontos')
        .insert(pontos.map((p, i) => ({ ...p, rota_id: rotaId, ordem: i })))
        .select();
      if (error) throw error;
      return data as RotaPonto[];
    },
    onSuccess: (_, { rotaId }) => {
      qc.invalidateQueries({ queryKey: ['rotas-lubrificacao-pontos', rotaId] });
      qc.invalidateQueries({ queryKey: ['rotas-lubrificacao'] });
    },
  });
}
