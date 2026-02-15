import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PermissaoGranular {
  id: string;
  user_id: string;
  modulo: string;
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
  alterar_status: boolean;
  imprimir: boolean;
  exportar: boolean;
  importar: boolean;
  acessar_indicadores: boolean;
  acessar_historico: boolean;
  ver_valores: boolean;
  ver_custos: boolean;
  ver_criticidade: boolean;
  ver_status: boolean;
  ver_obs_internas: boolean;
  ver_dados_financeiros: boolean;
}

export const MODULOS = [
  'Dashboard', 'Solicitações', 'Backlog', 'Emitir OS', 'Fechar OS', 'Histórico OS',
  'Programação', 'Preventiva', 'Preditiva', 'Inspeções', 'FMEA', 'Causa Raiz',
  'Melhorias', 'Hierarquia', 'Equipamentos', 'Mecânicos', 'Materiais',
  'Fornecedores', 'Contratos', 'Documentos', 'Custos', 'Relatórios', 'SSMA',
  'Usuários', 'Auditoria',
] as const;

export function usePermissoesUsuario(userId: string | undefined) {
  return useQuery({
    queryKey: ['permissoes_granulares', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('permissoes_granulares')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return data as PermissaoGranular[];
    },
    enabled: !!userId,
  });
}

export function useSavePermissoes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, permissoes }: { userId: string; permissoes: Partial<PermissaoGranular>[] }) => {
      // Delete existing permissions for user
      await supabase.from('permissoes_granulares').delete().eq('user_id', userId);
      
      // Insert new permissions
      const rows = permissoes.map(p => ({ ...p, user_id: userId }));
      if (rows.length > 0) {
        const { error } = await supabase.from('permissoes_granulares').insert(rows as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['permissoes_granulares', variables.userId] });
      toast({ title: 'Permissões Salvas', description: 'Permissões atualizadas com sucesso.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}
