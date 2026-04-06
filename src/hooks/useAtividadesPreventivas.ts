import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { useAuth } from '@/contexts/AuthContext';
import { writeAuditLog } from '@/lib/audit';

export interface AtividadePreventiva {
  id: string;
  plano_id: string;
  nome: string;
  responsavel: string | null;
  ordem: number;
  tempo_total_min: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  servicos?: ServicoPreventivo[];
}

export interface ServicoPreventivo {
  id: string;
  atividade_id: string;
  descricao: string;
  tempo_estimado_min: number;
  ordem: number;
  concluido: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

interface AtividadePreventivaRow extends AtividadePreventiva {
  servicos?: ServicoPreventivo[];
}

export function useAtividadesByPlano(planoId: string | null) {
  return useQuery({
    queryKey: ['atividades-preventivas', planoId],
    enabled: !!planoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atividades_preventivas')
        .select('*, servicos:servicos_preventivos(*)')
        .eq('plano_id', planoId!)
        .order('ordem');

      if (error) throw error;

      return (data as AtividadePreventivaRow[]).map(a => ({
        ...a,
        servicos: (a.servicos || []).sort((x, y) => x.ordem - y.ordem),
      })) as AtividadePreventiva[];
    },
  });
}

export function useCreateAtividade() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (input: { plano_id: string; nome: string; responsavel?: string; ordem?: number }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('atividades_preventivas')
            .insert(payload)
            .select()
            .single(),
        { empresa_id: tenantId, ...input } as Record<string, unknown>,
      );
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['atividades-preventivas', d.plano_id] });
      writeAuditLog({ action: 'CREATE_ATIVIDADE_PREVENTIVA', table: 'atividades_preventivas', recordId: d?.id, empresaId: tenantId, source: 'useAtividadesPreventivas' });
      toast({ title: 'Atividade criada' });
    },
    onError: (e: unknown) => toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao criar atividade', variant: 'destructive' }),
  });
}

export function useUpdateAtividade() {
  const qc = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation({
    mutationFn: async ({ id, plano_id, ...updates }: Partial<AtividadePreventiva> & { id: string; plano_id: string }) => {
      await updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('atividades_preventivas')
            .update(payload)
            .eq('id', id)
            .select()
            .single(),
        updates as Record<string, unknown>,
      );
      return plano_id;
    },
    onSuccess: (planoId) => {
      qc.invalidateQueries({ queryKey: ['atividades-preventivas', planoId] });
      writeAuditLog({ action: 'UPDATE_ATIVIDADE_PREVENTIVA', table: 'atividades_preventivas', empresaId: tenantId, source: 'useAtividadesPreventivas' });
    },
  });
}

export function useDeleteAtividade() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, plano_id }: { id: string; plano_id: string }) => {
      const { error } = await supabase.from('atividades_preventivas').delete().eq('id', id);
      if (error) throw error;
      return plano_id;
    },
    onSuccess: (planoId) => {
      qc.invalidateQueries({ queryKey: ['atividades-preventivas', planoId] });
      writeAuditLog({ action: 'DELETE_ATIVIDADE_PREVENTIVA', table: 'atividades_preventivas', empresaId: tenantId, source: 'useAtividadesPreventivas', severity: 'warning' });
      toast({ title: 'Atividade excluída' });
    },
    onError: (e: unknown) => toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao excluir atividade', variant: 'destructive' }),
  });
}

// --- Serviços ---

export function useCreateServico() {
  const qc = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation({
    mutationFn: async (input: { atividade_id: string; descricao: string; tempo_estimado_min: number; ordem?: number; _plano_id: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      const { _plano_id, ...rest } = input;
      await insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('servicos_preventivos')
            .insert(payload)
            .select()
            .single(),
        { empresa_id: tenantId, ...rest } as Record<string, unknown>,
      );
      // Recalc atividade tempo
      await recalcAtividadeTempo(input.atividade_id);
      return _plano_id;
    },
    onSuccess: (planoId) => {
      qc.invalidateQueries({ queryKey: ['atividades-preventivas', planoId] });
      writeAuditLog({ action: 'CREATE_SERVICO_PREVENTIVO', table: 'servicos_preventivos', empresaId: tenantId, source: 'useAtividadesPreventivas' });
    },
  });
}

export function useUpdateServico() {
  const qc = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation({
    mutationFn: async ({ id, _plano_id, _atividade_id, ...updates }: Partial<ServicoPreventivo> & { id: string; _plano_id: string; _atividade_id: string }) => {
      await updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('servicos_preventivos')
            .update(payload)
            .eq('id', id)
            .select()
            .single(),
        updates as Record<string, unknown>,
      );
      await recalcAtividadeTempo(_atividade_id);
      return _plano_id;
    },
    onSuccess: (planoId) => {
      qc.invalidateQueries({ queryKey: ['atividades-preventivas', planoId] });
      writeAuditLog({ action: 'UPDATE_SERVICO_PREVENTIVO', table: 'servicos_preventivos', empresaId: tenantId, source: 'useAtividadesPreventivas' });
    },
  });
}

export function useDeleteServico() {
  const qc = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation({
    mutationFn: async ({ id, _plano_id, _atividade_id }: { id: string; _plano_id: string; _atividade_id: string }) => {
      const { error } = await supabase.from('servicos_preventivos').delete().eq('id', id);
      if (error) throw error;
      await recalcAtividadeTempo(_atividade_id);
      return _plano_id;
    },
    onSuccess: (planoId) => {
      qc.invalidateQueries({ queryKey: ['atividades-preventivas', planoId] });
      writeAuditLog({ action: 'DELETE_SERVICO_PREVENTIVO', table: 'servicos_preventivos', empresaId: tenantId, source: 'useAtividadesPreventivas', severity: 'warning' });
    },
  });
}

async function recalcAtividadeTempo(atividadeId: string) {
  const { data } = await supabase
    .from('servicos_preventivos')
    .select('tempo_estimado_min')
    .eq('atividade_id', atividadeId);

  const total = (data || []).reduce((sum, s) => sum + (s.tempo_estimado_min || 0), 0);
  await updateWithColumnFallback(
    async (payload) =>
      supabase
        .from('atividades_preventivas')
        .update(payload)
        .eq('id', atividadeId)
        .select()
        .single(),
    { tempo_total_min: total },
  );
}
