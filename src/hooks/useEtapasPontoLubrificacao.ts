import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { writeAuditLog } from '@/lib/audit';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// ╔══════════════════════════════════════════════════════════════╗
// ║  Tipos                                                       ║
// ╚══════════════════════════════════════════════════════════════╝

export interface EtapaPontoLubrificacao {
  id: string;
  ponto_id: string;
  descricao: string;
  tempo_estimado_min: number;
  ordem: number;
  concluido: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  Queries                                                     ║
// ╚══════════════════════════════════════════════════════════════╝

/**
 * Busca etapas de um ponto específico, ordenadas por `ordem`.
 */
export function useEtapasByPonto(pontoId: string | null | undefined) {
  return useQuery({
    queryKey: ['etapas_ponto_lubrificacao', pontoId],
    enabled: !!pontoId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('etapas_ponto_lubrificacao')
        .select('*')
        .eq('ponto_id', pontoId!)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data || []) as EtapaPontoLubrificacao[];
    },
  });
}

/**
 * Busca todas as etapas de TODOS os pontos de um plano (batch).
 * Retorna um Map<pontoId, EtapaPontoLubrificacao[]>.
 */
export function useEtapasByPlano(pontoIds: string[] | undefined) {
  return useQuery({
    queryKey: ['etapas_ponto_lubrificacao', 'batch', pontoIds],
    enabled: !!pontoIds && pontoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('etapas_ponto_lubrificacao')
        .select('*')
        .in('ponto_id', pontoIds!)
        .order('ordem', { ascending: true });
      if (error) throw error;
      const map = new Map<string, EtapaPontoLubrificacao[]>();
      for (const row of (data || []) as EtapaPontoLubrificacao[]) {
        const arr = map.get(row.ponto_id) || [];
        arr.push(row);
        map.set(row.ponto_id, arr);
      }
      return map;
    },
  });
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  Mutations                                                   ║
// ╚══════════════════════════════════════════════════════════════╝

/** Recalcula tempo_total_min do ponto a partir das etapas. */
async function recalcPontoTempo(pontoId: string) {
  const { data } = await (supabase as any)
    .from('etapas_ponto_lubrificacao')
    .select('tempo_estimado_min')
    .eq('ponto_id', pontoId);
  const total = (data || []).reduce((s: number, e: any) => s + (e.tempo_estimado_min || 0), 0);
  await supabase
    .from('rotas_lubrificacao_pontos')
    .update({ tempo_total_min: total } as any)
    .eq('id', pontoId);
}

export function useCreateEtapa() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      ponto_id: string;
      descricao: string;
      tempo_estimado_min?: number;
      ordem?: number;
      _plano_id?: string;
    }) => {
      const { _plano_id, ...payload } = input;
      const { data, error } = await (supabase as any)
        .from('etapas_ponto_lubrificacao')
        .insert({ ...payload, tempo_estimado_min: payload.tempo_estimado_min ?? 5 })
        .select()
        .maybeSingle();
      if (error) throw error;
      await recalcPontoTempo(input.ponto_id);
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['etapas_ponto_lubrificacao'] });
      qc.invalidateQueries({ queryKey: ['pontos_lubrificacao'] });
      writeAuditLog({ action: 'CREATE_ETAPA_LUBRIFICACAO', table: 'etapas_ponto_lubrificacao', recordId: d?.id, empresaId: tenantId, source: 'useEtapasPontoLubrificacao' });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao criar etapa', variant: 'destructive' }),
  });
}

export function useUpdateEtapa() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      ponto_id: string;
      descricao?: string;
      tempo_estimado_min?: number;
      ordem?: number;
      concluido?: boolean;
      observacoes?: string | null;
    }) => {
      const { id, ponto_id, ...updates } = input;
      const { data, error } = await (supabase as any)
        .from('etapas_ponto_lubrificacao')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      await recalcPontoTempo(ponto_id);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['etapas_ponto_lubrificacao'] });
      qc.invalidateQueries({ queryKey: ['pontos_lubrificacao'] });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao atualizar etapa', variant: 'destructive' }),
  });
}

export function useDeleteEtapa() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (input: { id: string; ponto_id: string }) => {
      const { error } = await (supabase as any)
        .from('etapas_ponto_lubrificacao')
        .delete()
        .eq('id', input.id);
      if (error) throw error;
      await recalcPontoTempo(input.ponto_id);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['etapas_ponto_lubrificacao'] });
      qc.invalidateQueries({ queryKey: ['pontos_lubrificacao'] });
      writeAuditLog({ action: 'DELETE_ETAPA_LUBRIFICACAO', table: 'etapas_ponto_lubrificacao', recordId: vars.id, empresaId: tenantId, source: 'useEtapasPontoLubrificacao', severity: 'warning' });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao excluir etapa', variant: 'destructive' }),
  });
}
