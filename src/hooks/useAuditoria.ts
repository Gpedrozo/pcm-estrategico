import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { writeAuditLog } from '@/lib/audit';

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
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        usuario_id: row.actor_user_id ?? null,
        usuario_nome: row.actor_email ?? 'SISTEMA',
        acao: row.action,
        descricao: row.metadata?.descricao ?? row.action,
        tag: row.metadata?.tag ?? null,
        data_hora: row.created_at,
      })) as AuditoriaRow[];
    },
  });
}

export function useCreateAuditoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (auditoria: AuditoriaInsert) => {
      await writeAuditLog({
        action: auditoria.acao,
        table: 'app_auditoria',
        recordId: auditoria.usuario_id ?? null,
        source: 'use_auditoria_hook',
        metadata: {
          descricao: auditoria.descricao,
          tag: auditoria.tag ?? null,
          usuario_nome: auditoria.usuario_nome,
        },
      });

      return {
        id: crypto.randomUUID(),
        usuario_id: auditoria.usuario_id ?? null,
        usuario_nome: auditoria.usuario_nome,
        acao: auditoria.acao,
        descricao: auditoria.descricao,
        tag: auditoria.tag ?? null,
        data_hora: new Date().toISOString(),
      } satisfies AuditoriaRow;
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
      logger.error('register_audit_failed', { error: String(error) });
    }
  };

  return { log };
}
