import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { insertWithColumnFallback } from '@/lib/supabaseCompat';
import { writeAuditLog } from '@/lib/audit';
import { useAuth } from '@/contexts/AuthContext';

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
        .order('nome')
        .limit(500);
      if (error) throw error;
      return data as TemplatePreventivo[];
    },
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (input: { nome: string; descricao?: string; estrutura: any }) => {
      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('templates_preventivos')
            .insert(payload)
            .select()
            .single(),
        input as Record<string, unknown>,
      );
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['templates-preventivos'] });
      toast({ title: 'Template salvo com sucesso' });
      writeAuditLog({ action: 'CREATE_TEMPLATE_PREVENTIVO', table: 'templates_preventivos', recordId: data?.id, empresaId: tenantId, source: 'useTemplatesPreventivos' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('templates_preventivos').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      qc.invalidateQueries({ queryKey: ['templates-preventivos'] });
      toast({ title: 'Template excluído' });
      writeAuditLog({ action: 'DELETE_TEMPLATE_PREVENTIVO', table: 'templates_preventivos', recordId: deletedId, empresaId: tenantId, source: 'useTemplatesPreventivos', severity: 'warning' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
