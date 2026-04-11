import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { insertWithColumnFallback } from '@/lib/supabaseCompat';
import { useAuth } from '@/contexts/AuthContext';
import { callRpc } from '@/integrations/supabase/rpc';
import { writeAuditLog } from '@/lib/audit';

export interface ExecucaoOSRow {
  id: string;
  os_id: string;
  mecanico_id: string | null;
  mecanico_nome: string;
  data_inicio?: string | null;
  data_execucao: string;
  hora_inicio: string;
  data_fim?: string | null;
  hora_fim: string;
  tempo_execucao: number;
  tempo_execucao_bruto?: number | null;
  tempo_pausas?: number | null;
  tempo_execucao_liquido?: number | null;
  servico_executado: string;
  custo_mao_obra: number | null;
  custo_materiais: number | null;
  custo_terceiros: number | null;
  custo_total: number | null;
  created_at: string;
}

export interface ExecucaoOSInsert {
  os_id: string;
  mecanico_id?: string | null;
  mecanico_nome: string;
  data_inicio?: string;
  hora_inicio: string;
  data_fim?: string;
  hora_fim: string;
  tempo_execucao: number;
  tempo_execucao_bruto?: number;
  tempo_pausas?: number;
  tempo_execucao_liquido?: number;
  servico_executado: string;
  custo_mao_obra?: number | null;
  custo_materiais?: number | null;
  custo_terceiros?: number | null;
  custo_total?: number | null;
}

export interface MaterialFechamentoAtomic {
  material_id: string;
  quantidade: number;
  custo_unitario: number;
  custo_total: number;
}

export interface PausaFechamentoAtomic {
  data_inicio?: string;
  inicio: string;
  data_fim?: string;
  fim: string;
  motivo?: string;
}

export interface CloseOSAtomicParams {
  os_id: string;
  mecanico_id: string | null;
  mecanico_nome: string;
  data_inicio: string;
  hora_inicio: string;
  data_fim: string;
  hora_fim: string;
  tempo_execucao: number;
  servico_executado: string;
  custo_mao_obra: number;
  custo_materiais: number;
  custo_terceiros: number;
  custo_total: number;
  materiais: MaterialFechamentoAtomic[];
  pausas: PausaFechamentoAtomic[];
  usuario_fechamento: string | null;
  modo_falha?: string | null;
  causa_raiz?: string | null;
  acao_corretiva?: string | null;
  licoes_aprendidas?: string | null;
}

export function useExecucoesOS() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['execucoes-os', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant nÃ£o resolvido.');

      const { data, error } = await supabase
        .from('execucoes_os')
        .select('*')
        .eq('empresa_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as ExecucaoOSRow[];
    },
    enabled: !!tenantId,
  });
}

export function useExecucaoByOSId(osId: string | undefined) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['execucao-os', tenantId, osId],
    queryFn: async () => {
      if (!osId) return null;
      if (!tenantId) throw new Error('Tenant nÃ£o resolvido.');
      
      const { data, error } = await supabase
        .from('execucoes_os')
        .select('*')
        .eq('empresa_id', tenantId)
        .eq('os_id', osId)
        .maybeSingle();

      if (error) throw error;
      return data as ExecucaoOSRow | null;
    },
    enabled: !!tenantId && !!osId,
  });
}

export function useCreateExecucaoOS() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (execucao: ExecucaoOSInsert) => {
      const payloadWithTenant = { ...execucao, empresa_id: tenantId } as Record<string, unknown>;
      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('execucoes_os')
            .insert(payload)
            .select()
            .single(),
        payloadWithTenant,
      ) as Promise<ExecucaoOSRow>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['execucoes-os', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['indicadores', tenantId] });
      writeAuditLog({ action: 'CREATE_EXECUCAO_OS', table: 'execucoes_os', recordId: data?.id, empresaId: tenantId, source: 'useExecucoesOS' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao registrar execuÃ§Ã£o',
        description: error.message || 'Ocorreu um erro ao registrar a execuÃ§Ã£o.',
        variant: 'destructive',
      });
    },
  });
}

export function useCloseOSAtomic() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (params: CloseOSAtomicParams) => {
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const safeUsuarioFechamento =
        typeof params.usuario_fechamento === 'string' && uuidPattern.test(params.usuario_fechamento)
          ? params.usuario_fechamento
          : null;

      const { data, error } = await callRpc<unknown[]>('close_os_with_execution_atomic', {
        p_os_id: params.os_id,
        p_mecanico_id: params.mecanico_id,
        p_mecanico_nome: params.mecanico_nome,
        p_data_inicio: params.data_inicio,
        p_hora_inicio: params.hora_inicio,
        p_data_fim: params.data_fim,
        p_hora_fim: params.hora_fim,
        p_tempo_execucao: params.tempo_execucao,
        p_servico_executado: params.servico_executado,
        p_custo_mao_obra: params.custo_mao_obra,
        p_custo_materiais: params.custo_materiais,
        p_custo_terceiros: params.custo_terceiros,
        p_custo_total: params.custo_total,
        p_materiais: params.materiais,
        p_pausas: params.pausas,
        p_usuario_fechamento: safeUsuarioFechamento,
        p_modo_falha: params.modo_falha ?? null,
        p_causa_raiz: params.causa_raiz ?? null,
        p_acao_corretiva: params.acao_corretiva ?? null,
        p_licoes_aprendidas: params.licoes_aprendidas ?? null,
      });

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-pending', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-recent', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['execucoes-os', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['indicadores', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['materiais', tenantId] });
      writeAuditLog({ action: 'CLOSE_OS_ATOMIC', table: 'ordens_servico', recordId: variables.os_id, empresaId: tenantId, source: 'useCloseOSAtomic', severity: 'info', metadata: { mecanico_nome: variables.mecanico_nome, custo_total: variables.custo_total } });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao fechar O.S (modo atÃ´mico)',
        description: error?.message || 'Falha no fechamento atÃ´mico da O.S.',
        variant: 'destructive',
      });
    },
  });
}
