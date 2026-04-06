import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AtividadeLubrificacao } from '@/types/lubrificacao';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { writeAuditLog } from '@/lib/audit';
import { useAuth } from '@/contexts/AuthContext';

export function useAtividadesByPlano(planoId: string | null) {
  return useQuery({
    queryKey: ['atividades-lubrificacao', planoId],
    enabled: !!planoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atividades_lubrificacao')
        .select('*')
        .eq('plano_id', planoId!)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return data as AtividadeLubrificacao[];
    },
  });
}

export function useCreateAtividade() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<AtividadeLubrificacao> & { plano_id: string }) => {
      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('atividades_lubrificacao')
            .insert(payload)
            .select()
            .single(),
        input as Record<string, unknown>,
      ) as Promise<AtividadeLubrificacao>;
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['atividades-lubrificacao', vars.plano_id] });
      toast({ title: 'Atividade criada' });
      writeAuditLog({ action: 'CREATE_ATIVIDADE_LUBRIFICACAO', table: 'atividades_lubrificacao', recordId: data?.id, empresaId: tenantId, source: 'useAtividadesLubrificacao' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateAtividade() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, plano_id, ...updates }: Partial<AtividadeLubrificacao> & { id: string; plano_id: string }) => {
      return updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('atividades_lubrificacao')
            .update(payload)
            .eq('id', id)
            .select()
            .single(),
        updates as Record<string, unknown>,
      ) as Promise<AtividadeLubrificacao>;
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['atividades-lubrificacao', vars.plano_id] });
      toast({ title: 'Atividade atualizada' });
      writeAuditLog({ action: 'UPDATE_ATIVIDADE_LUBRIFICACAO', table: 'atividades_lubrificacao', recordId: data?.id, empresaId: tenantId, source: 'useAtividadesLubrificacao' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteAtividade() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, plano_id }: { id: string; plano_id: string }) => {
      const { error } = await supabase.from('atividades_lubrificacao').delete().eq('id', id);
      if (error) throw error;
      return { id, plano_id };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['atividades-lubrificacao', d.plano_id] });
      toast({ title: 'Atividade excluída' });
      writeAuditLog({ action: 'DELETE_ATIVIDADE_LUBRIFICACAO', table: 'atividades_lubrificacao', recordId: d.id, empresaId: tenantId, source: 'useAtividadesLubrificacao', severity: 'warning' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
