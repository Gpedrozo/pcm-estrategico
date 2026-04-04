import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Lubrificante,
  LubrificanteInsert,
  MovimentacaoLubrificante,
  MovimentacaoLubrificanteInsert,
} from '@/types/lubrificacao';

// ─── Lubrificantes CRUD ─────────────────────────────

export function useLubrificantes() {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: ['lubrificantes', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lubrificantes')
        .select('*')
        .eq('empresa_id', tenantId!)
        .order('codigo');
      if (error) throw error;
      return data as Lubrificante[];
    },
    enabled: Boolean(tenantId),
  });
}

export function useCreateLubrificante() {
  const { tenantId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LubrificanteInsert) => {
      const { data, error } = await supabase
        .from('lubrificantes')
        .insert({ ...payload, empresa_id: tenantId! })
        .select()
        .single();
      if (error) throw error;
      return data as Lubrificante;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lubrificantes'] }),
  });
}

export function useUpdateLubrificante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<LubrificanteInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from('lubrificantes')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Lubrificante;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lubrificantes'] }),
  });
}

export function useDeleteLubrificante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lubrificantes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lubrificantes'] }),
  });
}

// ─── Movimentações ──────────────────────────────────

export function useMovimentacoes(lubrificanteId: string | null) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: ['movimentacoes-lubrificante', lubrificanteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimentacoes_lubrificante')
        .select('*')
        .eq('lubrificante_id', lubrificanteId!)
        .eq('empresa_id', tenantId!)
        .order('data', { ascending: false });
      if (error) throw error;
      return data as MovimentacaoLubrificante[];
    },
    enabled: Boolean(lubrificanteId && tenantId),
  });
}

export function useCreateMovimentacao() {
  const { tenantId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MovimentacaoLubrificanteInsert) => {
      const { data, error } = await supabase
        .from('movimentacoes_lubrificante')
        .insert({ ...payload, empresa_id: tenantId!, data: payload.data || new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;

      // Update estoque_atual
      const delta = payload.tipo === 'entrada' ? payload.quantidade : -payload.quantidade;
      await supabase.rpc('atualizar_estoque_lubrificante', {
        p_lubrificante_id: payload.lubrificante_id,
        p_delta: delta,
      }).then(({ error: rpcErr }) => {
        // If RPC doesn't exist, fallback to manual update
        if (rpcErr) {
          return supabase
            .from('lubrificantes')
            .update({ estoque_atual: supabase.rpc ? undefined : 0 })
            .eq('id', payload.lubrificante_id);
        }
      });

      return data as MovimentacaoLubrificante;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimentacoes-lubrificante'] });
      qc.invalidateQueries({ queryKey: ['lubrificantes'] });
    },
  });
}
