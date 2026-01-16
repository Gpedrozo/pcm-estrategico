import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AuditoriaRow {
  id: string;
  usuario_id: string | null;
  usuario_nome: string;
  acao: string;
  descricao: string;
  tag: string | null;
  data_hora: string;
}

export interface AuditoriaInsert {
  usuario_nome: string;
  acao: string;
  descricao: string;
  tag?: string | null;
  usuario_id?: string | null;
}

export function useAuditoria() {
  return useQuery({
    queryKey: ['auditoria'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditoria')
        .select('*')
        .order('data_hora', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as AuditoriaRow[];
    },
  });
}

export function useCreateAuditoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (auditoria: AuditoriaInsert) => {
      const { data, error } = await supabase
        .from('auditoria')
        .insert(auditoria)
        .select()
        .single();

      if (error) throw error;
      return data as AuditoriaRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditoria'] });
    },
  });
}

// Hook para registrar ações de auditoria facilmente
export function useLogAuditoria() {
  const { user } = useAuth();
  const createAuditoria = useCreateAuditoria();

  const log = async (acao: string, descricao: string, tag?: string) => {
    if (!user) return;

    try {
      await createAuditoria.mutateAsync({
        usuario_id: user.id,
        usuario_nome: user.nome,
        acao,
        descricao,
        tag: tag || null,
      });
    } catch (error) {
      console.error('Erro ao registrar auditoria:', error);
    }
  };

  return { log };
}
