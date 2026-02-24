import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
      const { data, error } = await supabase
        .from('execucoes_preventivas')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { error } = await supabase.from('execucoes_preventivas').update(updates).eq('id', id);
      if (error) throw error;
      return plano_id;
    },
    onSuccess: (planoId) => qc.invalidateQueries({ queryKey: ['execucoes-preventivas', planoId] }),
  });
}
