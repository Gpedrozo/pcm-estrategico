import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { writeAuditLog } from '@/lib/audit';
import { useAuth } from '@/contexts/AuthContext';

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
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: ['execucoes-preventivas', planoId, tenantId],
    enabled: !!planoId && !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('execucoes_preventivas')
        .select('*')
        .eq('plano_id', planoId!)
        .eq('empresa_id', tenantId!)
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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (input: { plano_id: string; executor_nome: string; checklist?: any; observacoes?: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('execucoes_preventivas')
            .insert(payload)
            .select()
            .single(),
        { ...input, empresa_id: tenantId } as Record<string, unknown>,
      );
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['execucoes-preventivas', d.plano_id] });
      toast({ title: 'Execução registrada' });
      writeAuditLog({ action: 'CREATE_EXECUCAO_PREVENTIVA', table: 'execucoes_preventivas', recordId: d.id, empresaId: tenantId, source: 'useExecucoesPreventivas' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateExecucao() {
  const qc = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation({
    mutationFn: async ({ id, plano_id, ...updates }: Partial<ExecucaoPreventiva> & { id: string; plano_id: string }) => {
      if (!tenantId) throw new Error('Tenant não identificado.');
      await updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('execucoes_preventivas')
            .update(payload)
            .eq('id', id)
            .eq('empresa_id', tenantId)
            .select()
            .single(),
        updates as Record<string, unknown>,
      );
      return { plano_id, id };
    },
    onSuccess: ({ plano_id, id }) => {
      qc.invalidateQueries({ queryKey: ['execucoes-preventivas', plano_id] });
      writeAuditLog({ action: 'UPDATE_EXECUCAO_PREVENTIVA', table: 'execucoes_preventivas', recordId: id, empresaId: tenantId, source: 'useExecucoesPreventivas' });
    },
  });
}
