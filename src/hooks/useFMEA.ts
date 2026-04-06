import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { writeAuditLog } from '@/lib/audit';

export interface FMEARow {
  id: string;
  equipamento_id: string | null;
  tag: string;
  funcao: string;
  falha_funcional: string;
  modo_falha: string;
  efeito_falha: string | null;
  causa_falha: string | null;
  severidade: number;
  ocorrencia: number;
  deteccao: number;
  rpn: number;
  acao_recomendada: string | null;
  responsavel: string | null;
  prazo: string | null;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';
  plano_preventivo_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FMEAInsert {
  tag: string;
  funcao: string;
  falha_funcional: string;
  modo_falha: string;
  efeito_falha?: string | null;
  causa_falha?: string | null;
  severidade: number;
  ocorrencia: number;
  deteccao: number;
  acao_recomendada?: string | null;
  responsavel?: string | null;
  prazo?: string | null;
  equipamento_id?: string | null;
}

export function useFMEA() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['fmea', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const { data, error } = await supabase
        .from('fmea')
        .select('*')
        .eq('empresa_id', tenantId)
        .order('rpn', { ascending: false });

      if (error) throw error;
      return data as FMEARow[];
    },
    enabled: !!tenantId,
  });
}

export function useFMEAByEquipamento(tag?: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['fmea', tenantId, 'equipamento', tag],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const { data, error } = await supabase
        .from('fmea')
        .select('*')
        .eq('empresa_id', tenantId)
        .eq('tag', tag!)
        .order('rpn', { ascending: false });

      if (error) throw error;
      return data as FMEARow[];
    },
    enabled: !!tenantId && !!tag,
  });
}

export function useCreateFMEA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (fmea: FMEAInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('fmea')
            .insert(payload)
            .select()
            .single(),
        { ...fmea, empresa_id: tenantId } as Record<string, unknown>,
      ) as Promise<FMEARow>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fmea', tenantId] });
      writeAuditLog({ action: 'CREATE_FMEA', table: 'fmea', recordId: data?.id, empresaId: tenantId, source: 'useFMEA', metadata: { tag: data?.tag, rpn: data?.rpn } });
      toast({
        title: 'FMEA criado',
        description: 'A análise FMEA foi criada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar FMEA',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateFMEA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FMEARow> & { id: string }) => {
      return updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('fmea')
            .update(payload)
            .eq('id', id)
            .select()
            .single(),
        updates as Record<string, unknown>,
      ) as Promise<FMEARow>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fmea', tenantId] });
      writeAuditLog({ action: 'UPDATE_FMEA', table: 'fmea', recordId: data?.id, empresaId: tenantId, source: 'useFMEA', metadata: { rpn: data?.rpn, status: data?.status } });
      toast({
        title: 'FMEA atualizado',
        description: 'A análise FMEA foi atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar FMEA',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteFMEA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fmea')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['fmea', tenantId] });
      writeAuditLog({ action: 'DELETE_FMEA', table: 'fmea', recordId: deletedId, empresaId: tenantId, source: 'useFMEA', severity: 'warning' });
      toast({
        title: 'FMEA excluído',
        description: 'A análise FMEA foi excluída com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir FMEA',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
