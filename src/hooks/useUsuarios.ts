import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { writeAuditLog } from '@/lib/audit';

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
  created_at: string;
}

export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('nome', { ascending: true });

      if (profilesError) throw profilesError;

      // Get roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine data
      const usuarios: UsuarioCompleto[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          nome: profile.nome,
          email: '', // Email not available from profiles
          role: userRole?.role || 'USUARIO',
          created_at: profile.created_at,
        };
      });

      return usuarios;
    },
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

      await writeAuditLog({
        action: 'UPDATE_USER_ROLE',
        table: 'user_roles',
        recordId: userId,
        source: 'use_update_usuario_role',
        metadata: { user_id: userId, role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: 'Perfil Atualizado',
        description: 'O perfil do usuário foi atualizado com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao atualizar o perfil.',
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

      await writeAuditLog({
        action: 'UPDATE_USER_NAME',
        table: 'profiles',
        recordId: userId,
        source: 'use_update_usuario_nome',
        metadata: { user_id: userId, nome },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: 'Nome Atualizado',
        description: 'O nome do usuário foi atualizado com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao atualizar o nome.',
        variant: 'destructive',
      });
    },
  });
}
