import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';

export interface ExecucaoPreventiva {
  id: string;
  plano_id: string;
  executor_nome: string;
  executor_id: string | null;
  data_execucao: string;
  tempo_real_min: number | null;
  status: string;
  checklist: any;
  observacoes: string | null;
  os_gerada_id: string | null;
  created_at: string;
}

export function useExecucoesByPlano(planoId: string | null) {
  return useQuery({
    queryKey: ['execucoes-preventivas', planoId],
    enabled: !!planoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('execucoes_preventivas')
        .select('*')
        .eq('plano_id', planoId!)
        .order('data_execucao', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ExecucaoPreventiva[];
    },
  });
}

export function useCreateExecucao() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { plano_id: string; executor_nome: string; checklist?: any; observacoes?: string }) => {
      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('execucoes_preventivas')
            .insert(payload)
            .select()
            .single(),
        input as Record<string, unknown>,
      );
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['execucoes-preventivas', d.plano_id] });
      toast({ title: 'Execução registrada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateExecucao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plano_id, ...updates }: Partial<ExecucaoPreventiva> & { id: string; plano_id: string }) => {
      await updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('execucoes_preventivas')
            .update(payload)
            .eq('id', id)
            .select()
            .single(),
        updates as Record<string, unknown>,
      );
      return plano_id;
    },
    onSuccess: (planoId) => qc.invalidateQueries({ queryKey: ['execucoes-preventivas', planoId] }),
  });
}
