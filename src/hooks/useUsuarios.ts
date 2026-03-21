import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { writeAuditLog } from '@/lib/audit';
import { useAuth } from '@/contexts/AuthContext';

export interface ProfileRow {
  id: string;
  nome: string;
  created_at: string;
  updated_at: string;
}

export type AppRole = 'ADMIN' | 'USUARIO' | 'MASTER_TI' | 'SOLICITANTE';

export interface UserRoleRow {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface UsuarioCompleto {
  id: string;
  nome: string;
  email: string | null;
  role: AppRole;
  force_password_change: boolean;
  created_at: string;
}

export function useUsuarios() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['usuarios', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('empresa_id', tenantId)
        .order('nome', { ascending: true });

      if (profilesError) throw profilesError;

      // Get roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('empresa_id', tenantId);

      if (rolesError) throw rolesError;

      // Combine data
      const usuarios: UsuarioCompleto[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          nome: profile.nome,
          email: profile.email ?? null,
          role: userRole?.role || 'USUARIO',
          force_password_change: Boolean(profile.force_password_change),
          created_at: profile.created_at,
        };
      });

      return usuarios;
    },
    enabled: Boolean(tenantId),
  });
}

export function useUpdateUsuarioRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      if (!tenantId) throw new Error('Tenant não identificado para atualização de usuário.');

      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId)
        .eq('empresa_id', tenantId);

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
      queryClient.invalidateQueries({ queryKey: ['usuarios', tenantId] });
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
  const { tenantId } = useAuth();

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
      queryClient.invalidateQueries({ queryKey: ['usuarios', tenantId] });
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

export function useSetUsuarioForcePasswordChange() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, forcePasswordChange }: { userId: string; forcePasswordChange: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ force_password_change: forcePasswordChange })
        .eq('id', userId)
        .eq('empresa_id', tenantId);

      if (error) throw error;

      await writeAuditLog({
        action: 'UPDATE_USER_FORCE_PASSWORD_CHANGE',
        table: 'profiles',
        recordId: userId,
        source: 'use_set_usuario_force_password_change',
        metadata: { user_id: userId, force_password_change: forcePasswordChange },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios', tenantId] });
      toast({
        title: variables.forcePasswordChange ? 'Troca de senha habilitada' : 'Troca de senha desabilitada',
        description: variables.forcePasswordChange
          ? 'O usuário deverá trocar a senha no próximo login.'
          : 'O usuário não terá troca obrigatória no próximo login.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar senha obrigatória',
        description: error instanceof Error ? error.message : 'Não foi possível atualizar a política de senha.',
        variant: 'destructive',
      });
    },
  });
}
