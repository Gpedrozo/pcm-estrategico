import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TemplatePreventivo {
  id: string;
  nome: string;
  descricao: string | null;
  estrutura: any;
  created_at: string;
}

export function useTemplatesPreventivos() {
  return useQuery({
    queryKey: ['templates-preventivos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('templates_preventivos')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data as TemplatePreventivo[];
    },
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { nome: string; descricao?: string; estrutura: any }) => {
      const { data, error } = await supabase
        .from('templates_preventivos')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates-preventivos'] });
      toast({ title: 'Template salvo com sucesso' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('templates_preventivos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates-preventivos'] });
      toast({ title: 'Template excluído' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
