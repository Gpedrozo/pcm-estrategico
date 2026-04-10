import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { writeAuditLog } from '@/lib/audit';

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
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: ['permissoes_granulares', userId, tenantId],
    queryFn: async () => {
      if (!userId) return [];
      let query = supabase
        .from('permissoes_granulares')
        .select('*')
        .eq('user_id', userId);
      if (tenantId) query = query.eq('empresa_id', tenantId);
      const { data, error } = await query.limit(1000);
      if (error) throw error;
      return data as PermissaoGranular[];
    },
    enabled: !!userId,
  });
}

export function useSavePermissoes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, permissoes }: { userId: string; permissoes: Partial<PermissaoGranular>[] }) => {
      // Delete existing permissions for user within the current tenant
      let deleteQuery = supabase.from('permissoes_granulares').delete().eq('user_id', userId);
      if (tenantId) deleteQuery = deleteQuery.eq('empresa_id', tenantId);
      await deleteQuery;
      
      // Insert new permissions with empresa_id
      const rows = permissoes.map(p => ({ ...p, user_id: userId, ...(tenantId ? { empresa_id: tenantId } : {}) }));
      if (rows.length > 0) {
        const { error } = await supabase.from('permissoes_granulares').insert(rows);
        if (error) throw error;
      }

      await writeAuditLog({
        action: 'UPDATE_PERMISSIONS',
        table: 'permissoes_granulares',
        recordId: userId,
        empresaId: tenantId,
        source: 'use_save_permissoes',
        metadata: {
          user_id: userId,
          modules: rows.map((row) => row.modulo),
          total_modules: rows.length,
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['permissoes_granulares', variables.userId] });
      toast({ title: 'Permissões Salvas', description: 'Permissões atualizadas com sucesso.' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Erro', description: error instanceof Error ? error.message : 'Falha ao salvar permissões', variant: 'destructive' });
    },
  });
}
