import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProfileRow {
  id: string;
  nome: string;
  created_at: string;
  updated_at: string;
}

export type AppRole = 'ADMIN' | 'USUARIO' | 'MASTER_TI';

export interface UserRoleRow {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface UsuarioCompleto {
  id: string;
  nome: string;
  email: string;
  role: AppRole;
  empresa_id?: string;
  role_empresa?: 'OWNER' | 'ADMIN' | 'MANAGER' | 'USER';
  role_global?: 'MASTER_TI' | null;
  created_at: string;
  updated_at?: string;
}

export async function fetchUsuariosFull(): Promise<UsuarioCompleto[]> {
  const { data, error } = await supabase
    .from('users_full')
    .select('id, nome, email, role, empresa_id, role_empresa, role_global, created_at, updated_at')
    .order('nome', { ascending: true });

  if (error) throw error;

  if (!data || data.length === 0) {
    console.warn('[usuarios] users_full retornou vazio. Tentando reconciliação de identidade.');
    const { error: reconcileError } = await supabase.rpc('reconcile_user_identity_drift');
    if (!reconcileError) {
      const { data: retryData, error: retryError } = await supabase
        .from('users_full')
        .select('id, nome, email, role, empresa_id, role_empresa, role_global, created_at, updated_at')
        .order('nome', { ascending: true });

      if (retryError) throw retryError;
      console.info('[usuarios] Reconciliação executada com sucesso.');
      return (retryData || []) as UsuarioCompleto[];
    }
    console.error('[usuarios] Falha na reconciliação de identidade:', reconcileError.message);
    const isPermissionError = (reconcileError as { code?: string }).code === 'P0001';
    if (isPermissionError) {
      throw new Error('Sem permissão para reconciliar usuários automaticamente. Verifique o perfil ADMIN/MASTER_TI.');
    }
    throw reconcileError;
  }

  return (data || []) as UsuarioCompleto[];
}

export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: fetchUsuariosFull,
  });
}

export function useUpdateUsuarioRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['master-users'] });
      toast({
        title: 'Perfil Atualizado',
        description: 'O perfil do usuário foi atualizado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Ocorreu um erro ao atualizar o perfil.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateUsuarioNome() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, nome }: { userId: string; nome: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ nome })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['master-users'] });
      toast({
        title: 'Nome Atualizado',
        description: 'O nome do usuário foi atualizado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Ocorreu um erro ao atualizar o nome.',
        variant: 'destructive',
      });
    },
  });
}
