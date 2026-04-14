import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ordensServicoService } from '@/services/ordensServico.service';
import { type OrdemServicoFormData, type OrdemServicoUpdateData } from '@/schemas/ordemServico.schema';
import { writeAuditLog } from '@/lib/audit';

function getCreateOrdemServicoErrorMessage(error: unknown) {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';

  const normalized = message.toLowerCase();
  const isSchemaMismatch =
    normalized.includes('schema cache') ||
    normalized.includes('could not find') ||
    normalized.includes('column');
  const isMissingRequiredField =
    normalized.includes('violates not-null constraint') ||
    normalized.includes('null value in column');

  if (isSchemaMismatch) {
    return 'Não foi possível emitir a O.S por incompatibilidade de estrutura de dados. Atualize a página e tente novamente.';
  }

  if (isMissingRequiredField) {
    return 'Não foi possível emitir a O.S porque um campo obrigatório não foi preenchido corretamente. Atualize a página e tente novamente.';
  }

  return message || 'Ocorreu um erro ao criar a ordem de serviço.';
}

export interface OrdemServicoRow {
  id: string;
  numero_os: number;
  tipo: string;
  prioridade: string;
  tag: string;
  equipamento: string;
  solicitante: string;
  problema: string;
  data_solicitacao: string;
  status: string;
  data_fechamento: string | null;
  tempo_estimado: number | null;
  modo_falha: string | null;
  causa_raiz: string | null;
  acao_corretiva: string | null;
  licoes_aprendidas: string | null;
  usuario_abertura: string | null;
  usuario_fechamento: string | null;
  mecanico_responsavel_id?: string | null;
  mecanico_responsavel_codigo?: string | null;
  motivo_cancelamento?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrdemServicoInsert {
  tipo: string;
  prioridade?: string;
  tag: string;
  equipamento: string;
  solicitante: string;
  problema: string;
  tempo_estimado?: number | null;
  usuario_abertura?: string | null;
  mecanico_responsavel_id?: string | null;
  mecanico_responsavel_codigo?: string | null;
}

export interface OrdemServicoUpdate {
  status?: string;
  data_fechamento?: string | null;
  usuario_fechamento?: string | null;
  modo_falha?: string | null;
  causa_raiz?: string | null;
  acao_corretiva?: string | null;
  licoes_aprendidas?: string | null;
}

export function useOrdensServico() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['ordens-servico', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return ordensServicoService.listar(tenantId) as Promise<OrdemServicoRow[]>;
    },
    enabled: !!tenantId,
  });
}

export function useRecentOrdensServico(limit = 5) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['ordens-servico-recent', tenantId, limit],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return ordensServicoService.listarRecentes(tenantId, limit) as Promise<OrdemServicoRow[]>;
    },
    enabled: !!tenantId,
  });
}

export function usePendingOrdensServico() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['ordens-servico-pending', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return ordensServicoService.listarPendentes(tenantId) as Promise<OrdemServicoRow[]>;
    },
    enabled: !!tenantId,
  });
}

export function useCreateOrdemServico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (os: OrdemServicoInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return ordensServicoService.criar(os as OrdemServicoFormData, tenantId) as Promise<OrdemServicoRow>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-recent', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-pending', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['indicadores', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['document-sequences', tenantId] });
      writeAuditLog({ action: 'CREATE_ORDEM_SERVICO', table: 'ordens_servico', recordId: data?.id, empresaId: tenantId, dadosDepois: data as unknown as Record<string, unknown> });
      toast({
        title: 'O.S Criada com Sucesso!',
        description: `Ordem de Serviço nº ${data.numero_os} foi registrada.`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao criar O.S',
        description: getCreateOrdemServicoErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateOrdemServico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: OrdemServicoUpdate & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return ordensServicoService.atualizar(id, updates as OrdemServicoUpdateData, tenantId) as Promise<OrdemServicoRow>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-recent', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-pending', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['indicadores', tenantId] });
      writeAuditLog({ action: 'UPDATE_ORDEM_SERVICO', table: 'ordens_servico', recordId: data?.id, empresaId: tenantId, dadosDepois: data as unknown as Record<string, unknown> });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar O.S',
        description: error.message || 'Ocorreu um erro ao atualizar a ordem de serviço.',
        variant: 'destructive',
      });
    },
  });
}
