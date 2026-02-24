import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AtividadeLubrificacao } from '@/types/lubrificacao';

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

  return useMutation({
    mutationFn: async (input: Partial<AtividadeLubrificacao> & { plano_id: string }) => {
      const { data, error } = await supabase
        .from('atividades_lubrificacao')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as AtividadeLubrificacao;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['atividades-lubrificacao', vars.plano_id] });
      toast({ title: 'Atividade criada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateAtividade() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, plano_id, ...updates }: Partial<AtividadeLubrificacao> & { id: string; plano_id: string }) => {
      const { data, error } = await supabase
        .from('atividades_lubrificacao')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as AtividadeLubrificacao;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['atividades-lubrificacao', vars.plano_id] });
      toast({ title: 'Atividade atualizada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteAtividade() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, plano_id }: { id: string; plano_id: string }) => {
      const { error } = await supabase.from('atividades_lubrificacao').delete().eq('id', id);
      if (error) throw error;
      return { id, plano_id };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['atividades-lubrificacao', d.plano_id] });
      toast({ title: 'Atividade excluída' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
