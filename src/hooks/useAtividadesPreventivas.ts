import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

      return (data as any[]).map(a => ({
        ...a,
        servicos: (a.servicos || []).sort((x: any, y: any) => x.ordem - y.ordem),
      })) as AtividadePreventiva[];
    },
  });
}

export function useCreateAtividade() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { plano_id: string; nome: string; responsavel?: string; ordem?: number }) => {
      const { data, error } = await supabase
        .from('atividades_preventivas')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['atividades-preventivas', d.plano_id] });
      toast({ title: 'Atividade criada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateAtividade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plano_id, ...updates }: Partial<AtividadePreventiva> & { id: string; plano_id: string }) => {
      const { error } = await supabase.from('atividades_preventivas').update(updates).eq('id', id);
      if (error) throw error;
      return plano_id;
    },
    onSuccess: (planoId) => qc.invalidateQueries({ queryKey: ['atividades-preventivas', planoId] }),
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
      toast({ title: 'Atividade excluída' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

// --- Serviços ---

export function useCreateServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { atividade_id: string; descricao: string; tempo_estimado_min: number; ordem?: number; _plano_id: string }) => {
      const { _plano_id, ...rest } = input;
      const { data, error } = await supabase.from('servicos_preventivos').insert(rest).select().single();
      if (error) throw error;
      // Recalc atividade tempo
      await recalcAtividadeTempo(input.atividade_id);
      return _plano_id;
    },
    onSuccess: (planoId) => qc.invalidateQueries({ queryKey: ['atividades-preventivas', planoId] }),
  });
}

export function useUpdateServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, _plano_id, _atividade_id, ...updates }: Partial<ServicoPreventivo> & { id: string; _plano_id: string; _atividade_id: string }) => {
      const { error } = await supabase.from('servicos_preventivos').update(updates).eq('id', id);
      if (error) throw error;
      await recalcAtividadeTempo(_atividade_id);
      return _plano_id;
    },
    onSuccess: (planoId) => qc.invalidateQueries({ queryKey: ['atividades-preventivas', planoId] }),
  });
}

export function useDeleteServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, _plano_id, _atividade_id }: { id: string; _plano_id: string; _atividade_id: string }) => {
      const { error } = await supabase.from('servicos_preventivos').delete().eq('id', id);
      if (error) throw error;
      await recalcAtividadeTempo(_atividade_id);
      return _plano_id;
    },
    onSuccess: (planoId) => qc.invalidateQueries({ queryKey: ['atividades-preventivas', planoId] }),
  });
}

async function recalcAtividadeTempo(atividadeId: string) {
  const { data } = await supabase
    .from('servicos_preventivos')
    .select('tempo_estimado_min')
    .eq('atividade_id', atividadeId);

  const total = (data || []).reduce((sum, s) => sum + (s.tempo_estimado_min || 0), 0);
  await supabase.from('atividades_preventivas').update({ tempo_total_min: total }).eq('id', atividadeId);
}
