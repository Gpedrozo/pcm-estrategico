import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { insertWithColumnFallback } from '@/lib/supabaseCompat';
import { useAuth } from '@/contexts/AuthContext';

export interface ExecucaoOSRow {
  id: string;
  os_id: string;
  mecanico_id: string | null;
  mecanico_nome: string;
  data_execucao: string;
  hora_inicio: string;
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
  hora_inicio: string;
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
  inicio: string;
  fim: string;
  motivo?: string;
}

export interface CloseOSAtomicParams {
  os_id: string;
  mecanico_id: string | null;
  mecanico_nome: string;
  hora_inicio: string;
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
      const { data, error } = await supabase
        .from('execucoes_os')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ExecucaoOSRow[];
    },
  });
}

export function useExecucaoByOSId(osId: string | undefined) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['execucao-os', tenantId, osId],
    queryFn: async () => {
      if (!osId) return null;
      
      const { data, error } = await supabase
        .from('execucoes_os')
        .select('*')
        .eq('os_id', osId)
        .maybeSingle();

      if (error) throw error;
      return data as ExecucaoOSRow | null;
    },
    enabled: !!osId,
  });
}

export function useCreateExecucaoOS() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (execucao: ExecucaoOSInsert) => {
      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('execucoes_os')
            .insert(payload)
            .select()
            .single(),
        execucao as Record<string, unknown>,
      ) as Promise<ExecucaoOSRow>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execucoes-os', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['indicadores', tenantId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao registrar execução',
        description: error.message || 'Ocorreu um erro ao registrar a execução.',
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
      const rpcClient = supabase as any;
      const { data, error } = await rpcClient.rpc('close_os_with_execution_atomic', {
        p_os_id: params.os_id,
        p_mecanico_id: params.mecanico_id,
        p_mecanico_nome: params.mecanico_nome,
        p_hora_inicio: params.hora_inicio,
        p_hora_fim: params.hora_fim,
        p_tempo_execucao: params.tempo_execucao,
        p_servico_executado: params.servico_executado,
        p_custo_mao_obra: params.custo_mao_obra,
        p_custo_materiais: params.custo_materiais,
        p_custo_terceiros: params.custo_terceiros,
        p_custo_total: params.custo_total,
        p_materiais: params.materiais,
        p_pausas: params.pausas,
        p_usuario_fechamento: params.usuario_fechamento,
        p_modo_falha: params.modo_falha ?? null,
        p_causa_raiz: params.causa_raiz ?? null,
        p_acao_corretiva: params.acao_corretiva ?? null,
        p_licoes_aprendidas: params.licoes_aprendidas ?? null,
      });

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-pending', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-recent', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['execucoes-os', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['indicadores', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['materiais'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao fechar O.S (modo atômico)',
        description: error?.message || 'Falha no fechamento atômico da O.S.',
        variant: 'destructive',
      });
    },
  });
}
