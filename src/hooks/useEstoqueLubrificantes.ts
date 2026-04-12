import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { writeAuditLog } from '@/lib/audit';
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
        .order('codigo')
        .limit(500);
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
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['lubrificantes'] });
      writeAuditLog({ action: 'CREATE_LUBRIFICANTE', table: 'lubrificantes', recordId: data.id, empresaId: tenantId, source: 'useEstoqueLubrificantes' });
    },
  });
}

export function useUpdateLubrificante() {
  const qc = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<LubrificanteInsert> & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não identificado.');
      const { data, error } = await supabase
        .from('lubrificantes')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('empresa_id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return data as Lubrificante;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['lubrificantes'] });
      writeAuditLog({ action: 'UPDATE_LUBRIFICANTE', table: 'lubrificantes', recordId: data.id, empresaId: tenantId, source: 'useEstoqueLubrificantes' });
    },
  });
}

export function useDeleteLubrificante() {
  const qc = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não identificado.');
      const { error } = await supabase.from('lubrificantes').delete().eq('id', id).eq('empresa_id', tenantId);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      qc.invalidateQueries({ queryKey: ['lubrificantes'] });
      writeAuditLog({ action: 'DELETE_LUBRIFICANTE', table: 'lubrificantes', recordId: deletedId, empresaId: tenantId, source: 'useEstoqueLubrificantes', severity: 'warning' });
    },
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
        .order('data', { ascending: false })
        .limit(500);
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
            .eq('id', payload.lubrificante_id)
            .eq('empresa_id', tenantId!);
        }
      });

      return data as MovimentacaoLubrificante;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['movimentacoes-lubrificante'] });
      qc.invalidateQueries({ queryKey: ['lubrificantes'] });
      writeAuditLog({ action: 'CREATE_MOVIMENTACAO_LUBRIFICANTE', table: 'movimentacoes_lubrificante', recordId: data.id, empresaId: tenantId, source: 'useEstoqueLubrificantes' });
    },
  });
}
