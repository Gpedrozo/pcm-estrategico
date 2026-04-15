import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RotaPonto, RotaPontoInsert } from '@/types/lubrificacao';
import { writeAuditLog } from '@/lib/audit';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Fetch lubrication route points linked to a specific plan (plano_id).
 */
export function usePontosPlano(planoId: string | null | undefined) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: ['pontos_lubrificacao', 'plano', planoId, tenantId],
    queryFn: async () => {
      if (!planoId || !tenantId) return [];
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
    enabled: !!planoId && !!tenantId,
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
      if (!tenantId) throw new Error('Tenant não resolvido.');
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

// ╔══════════════════════════════════════════════════════════════╗
// ║  Individual CRUD mutations (used in detail panel)            ║
// ╚══════════════════════════════════════════════════════════════╝

export function useCreatePontoPlano() {
  const qc = useQueryClient();
  const { tenantId } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      plano_id: string;
      descricao: string;
      codigo_ponto?: string;
      lubrificante?: string | null;
      quantidade?: string | null;
      ferramenta?: string | null;
      tempo_estimado_min?: number;
      instrucoes?: string | null;
      localizacao?: string | null;
      equipamento_tag?: string | null;
      requer_parada?: boolean;
      ordem?: number;
    }) => {
      const { data, error } = await supabase
        .from('rotas_lubrificacao_pontos')
        .insert({
          plano_id: input.plano_id,
          rota_id: null,
          descricao: input.descricao,
          codigo_ponto: input.codigo_ponto || `P${Date.now().toString(36).toUpperCase()}`,
          lubrificante: input.lubrificante ?? null,
          quantidade: input.quantidade ?? null,
          ferramenta: input.ferramenta ?? null,
          tempo_estimado_min: input.tempo_estimado_min ?? 5,
          instrucoes: input.instrucoes ?? null,
          localizacao: input.localizacao ?? null,
          equipamento_tag: input.equipamento_tag ?? null,
          requer_parada: input.requer_parada ?? false,
          ordem: input.ordem ?? 0,
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as RotaPonto;
    },
    onSuccess: (d, vars) => {
      qc.invalidateQueries({ queryKey: ['pontos_lubrificacao', 'plano', vars.plano_id] });
      writeAuditLog({ action: 'CREATE_PONTO_PLANO', table: 'rotas_lubrificacao_pontos', recordId: d?.id, empresaId: tenantId, source: 'usePontosPlano' });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao criar ponto', variant: 'destructive' }),
  });
}

export function useUpdatePontoPlano() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      plano_id: string;
      descricao?: string;
      lubrificante?: string | null;
      quantidade?: string | null;
      ferramenta?: string | null;
      tempo_estimado_min?: number;
      instrucoes?: string | null;
      localizacao?: string | null;
      equipamento_tag?: string | null;
      requer_parada?: boolean;
      ordem?: number;
    }) => {
      const { id, plano_id: _plano_id, ...updates } = input;
      const { data, error } = await supabase
        .from('rotas_lubrificacao_pontos')
        .update(updates as any)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as RotaPonto;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['pontos_lubrificacao', 'plano', vars.plano_id] });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao atualizar ponto', variant: 'destructive' }),
  });
}

export function useDeletePontoPlano() {
  const qc = useQueryClient();
  const { tenantId } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { id: string; plano_id: string }) => {
      const { error } = await supabase
        .from('rotas_lubrificacao_pontos')
        .delete()
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['pontos_lubrificacao', 'plano', vars.plano_id] });
      qc.invalidateQueries({ queryKey: ['etapas_ponto_lubrificacao'] });
      writeAuditLog({ action: 'DELETE_PONTO_PLANO', table: 'rotas_lubrificacao_pontos', recordId: vars.id, empresaId: tenantId, source: 'usePontosPlano', severity: 'warning' });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao excluir ponto', variant: 'destructive' }),
  });
}
