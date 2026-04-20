import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { writeAuditLog } from '@/lib/audit';
import { logger } from '@/lib/logger';

/**
 * Cancela uma O.S. de forma segura:
 *  1. Marca ordens_servico.status = 'CANCELADA' + motivo
 *  2. Se a O.S. veio de programação (maintenance_schedule_id),
 *     reverte o schedule para 'programado' para que possa ser re-emitido
 *  3. Remove execução pendente vinculada (execucoes_preventivas/lubrificacao)
 */
export function useCancelOrdemServico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ osId, motivo }: { osId: string; motivo: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      // 1. Buscar O.S. para saber se veio de programação
      const { data: os, error: osErr } = await supabase
        .from('ordens_servico')
        .select('id, status, maintenance_schedule_id')
        .eq('id', osId)
        .eq('empresa_id', tenantId)
        .single();

      if (osErr || !os) throw new Error('O.S. não encontrada.');
      if (os.status === 'FECHADA') throw new Error('Não é possível cancelar uma O.S. já fechada.');
      if (os.status === 'CANCELADA') throw new Error('Esta O.S. já está cancelada.');

      // 2. Cancelar a O.S.
      const { error: cancelErr } = await supabase
        .from('ordens_servico')
        .update({ status: 'CANCELADA', motivo_cancelamento: motivo })
        .eq('id', osId)
        .eq('empresa_id', tenantId);

      if (cancelErr) throw new Error(`Falha ao cancelar: ${cancelErr.message}`);

      // 3. Se veio de programação, reverter schedule e limpar execução
      if (os.maintenance_schedule_id) {
        try {
          // Reverter schedule para programado
          await supabase
            .from('maintenance_schedule')
            .update({ status: 'programado' })
            .eq('id', os.maintenance_schedule_id)
            .eq('empresa_id', tenantId);

          // Limpar execuções pendentes vinculadas à O.S.
          await supabase
            .from('execucoes_preventivas')
            .delete()
            .eq('os_gerada_id', osId)
            .eq('status', 'PENDENTE')
            .eq('empresa_id', tenantId);

          await supabase
            .from('execucoes_lubrificacao')
            .delete()
            .eq('os_gerada_id', osId)
            .eq('status', 'PENDENTE')
            .eq('empresa_id', tenantId);
        } catch (rollbackErr) {
          // Não bloqueia o cancelamento — log para diagnóstico
          logger.warn('cancel_os_schedule_rollback_failed', {
            os_id: osId,
            schedule_id: os.maintenance_schedule_id,
            error: String(rollbackErr),
          });
        }
      }

      return { osId, scheduleReverted: !!os.maintenance_schedule_id };
    },
    onSuccess: ({ osId, scheduleReverted }) => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-pending', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-alert-count', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedule', tenantId] });
      writeAuditLog({
        action: 'CANCEL_ORDEM_SERVICO',
        table: 'ordens_servico',
        recordId: osId,
        empresaId: tenantId,
        source: 'useCancelOrdemServico',
        severity: 'warning',
      });
      toast({
        title: 'O.S. cancelada',
        description: scheduleReverted
          ? 'A O.S. foi cancelada e a programação de manutenção voltou ao calendário.'
          : 'A O.S. foi cancelada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cancelar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
