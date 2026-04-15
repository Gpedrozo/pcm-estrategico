import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AtividadeLubrificacao } from '@/types/lubrificacao';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { writeAuditLog } from '@/lib/audit';
import { useAuth } from '@/contexts/AuthContext';

export function useAtividadesByPlano(planoId: string | null) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: ['atividades-lubrificacao', planoId, tenantId],
    enabled: !!planoId && !!tenantId,
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      const { data, error } = await supabase
        .from('atividades_lubrificacao')
        .select('*')
        .eq('plano_id', planoId!)
        .eq('empresa_id', tenantId)
        .order('ordem', { ascending: true })
        .limit(500);
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
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('atividades_lubrificacao')
            .insert(payload)
            .select()
            .single(),
        { ...input, empresa_id: tenantId } as Record<string, unknown>,
      ) as Promise<AtividadeLubrificacao>;
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['atividades-lubrificacao', vars.plano_id] });
      toast({ title: 'Atividade criada' });
      writeAuditLog({ action: 'CREATE_ATIVIDADE_LUBRIFICACAO', table: 'atividades_lubrificacao', recordId: data?.id, empresaId: tenantId, source: 'useAtividadesLubrificacao' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateAtividade() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, plano_id: _plano_id, ...updates }: Partial<AtividadeLubrificacao> & { id: string; plano_id: string }) => {
      if (!tenantId) throw new Error('Tenant não identificado.');
      return updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('atividades_lubrificacao')
            .update(payload)
            .eq('id', id)
            .eq('empresa_id', tenantId)
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
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteAtividade() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, plano_id }: { id: string; plano_id: string }) => {
      if (!tenantId) throw new Error('Tenant não identificado.');
      const { error } = await supabase.from('atividades_lubrificacao').delete().eq('id', id).eq('empresa_id', tenantId);
      if (error) throw error;
      return { id, plano_id };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['atividades-lubrificacao', d.plano_id] });
      toast({ title: 'Atividade excluída' });
      writeAuditLog({ action: 'DELETE_ATIVIDADE_LUBRIFICACAO', table: 'atividades_lubrificacao', recordId: d.id, empresaId: tenantId, source: 'useAtividadesLubrificacao', severity: 'warning' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
