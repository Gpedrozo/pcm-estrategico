import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { writeAuditLog } from '@/lib/audit';
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
        .order('codigo')
        .limit(500);

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
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['rotas-lubrificacao'] });
      writeAuditLog({ action: 'CREATE_ROTA_LUBRIFICACAO', table: 'rotas_lubrificacao', recordId: data.id, empresaId: tenantId, source: 'useRotasLubrificacao' });
    },
  });
}

export function useUpdateRotaLubrificacao() {
  const qc = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<RotaLubrificacaoInsert> & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não identificado.');
      const { data, error } = await supabase
        .from('rotas_lubrificacao')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('empresa_id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return data as RotaLubrificacao;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['rotas-lubrificacao'] });
      writeAuditLog({ action: 'UPDATE_ROTA_LUBRIFICACAO', table: 'rotas_lubrificacao', recordId: data.id, empresaId: tenantId, source: 'useRotasLubrificacao' });
    },
  });
}

export function useDeleteRotaLubrificacao() {
  const qc = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não identificado.');
      const { error } = await supabase
        .from('rotas_lubrificacao')
        .delete()
        .eq('id', id)
        .eq('empresa_id', tenantId);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      qc.invalidateQueries({ queryKey: ['rotas-lubrificacao'] });
      writeAuditLog({ action: 'DELETE_ROTA_LUBRIFICACAO', table: 'rotas_lubrificacao', recordId: deletedId, empresaId: tenantId, source: 'useRotasLubrificacao', severity: 'warning' });
    },
  });
}

// ─── Pontos da Rota ─────────────────────────────────
export function usePontosRota(rotaId: string | null | undefined) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: ['rotas-lubrificacao-pontos', rotaId, tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('rotas_lubrificacao_pontos')
        .select('*')
        .eq('rota_id', rotaId!)
        .order('ordem')
        .limit(500);
      if (error) throw error;
      return data as RotaPonto[];
    },
    enabled: Boolean(rotaId) && Boolean(tenantId),
  });
}

export function useSavePontosRota() {
  const qc = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ rotaId, pontos }: { rotaId: string; pontos: RotaPontoInsert[] }) => {
      // Delete existing and re-insert (simple approach for ordering)
      if (!tenantId) throw new Error('Tenant não resolvido.');
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
      writeAuditLog({ action: 'SAVE_PONTOS_ROTA', table: 'rotas_lubrificacao_pontos', recordId: rotaId, empresaId: tenantId, source: 'useRotasLubrificacao' });
    },
  });
}
