import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { contratosService } from '@/services/contratos.service';
import { contratoSchema, type ContratoFormData } from '@/schemas/contrato.schema';
import { ZodError } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { writeAuditLog } from '@/lib/audit';

export interface ContratoRow {
  id: string;
  numero_contrato: string;
  titulo: string;
  descricao: string | null;
  fornecedor_id: string | null;
  tipo: string | null;
  status: string | null;
  data_inicio: string;
  data_fim: string | null;
  valor_total: number | null;
  valor_mensal: number | null;
  sla_atendimento_horas: number | null;
  sla_resolucao_horas: number | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  penalidade_descricao: string | null;
  anexos: unknown | null;
  created_at: string;
  updated_at: string;
  fornecedor?: { nome: string | null; razao_social: string | null; nome_fantasia: string | null } | null;
}

export type ContratoInsert = ContratoFormData;

/* ================================
   QUERIES
================================ */

export function useContratos() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['contratos', tenantId],
    queryFn: async () => {
      const data = await contratosService.listar(tenantId!);
      return data as ContratoRow[];
    },
    enabled: !!tenantId,
  });
}

export function useContratosAtivos() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['contratos', tenantId, 'ativos'],
    queryFn: async () => {
      const data = await contratosService.listarAtivos(tenantId!);
      return data as ContratoRow[];
    },
    enabled: !!tenantId,
  });
}

export function useContratosByFornecedor(fornecedorId: string | undefined) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['contratos', tenantId, 'fornecedor', fornecedorId],
    queryFn: async () => {
      if (!fornecedorId) return [];
      const data = await contratosService.listarPorFornecedor(fornecedorId, tenantId!);
      return data as ContratoRow[];
    },
    enabled: !!tenantId && !!fornecedorId,
  });
}

/* ================================
   MUTATIONS
================================ */

export function useCreateContrato() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (contrato: ContratoFormData) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      try {
        contratoSchema.parse(contrato);
        return await contratosService.criar(contrato, tenantId);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new Error(error.errors[0]?.message || 'Erro de validação');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos', tenantId] });
      writeAuditLog({ action: 'CREATE_CONTRATO', table: 'contratos', empresaId: tenantId, source: 'useContratos' });
      toast({
        title: 'Sucesso!',
        description: 'Contrato cadastrado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cadastrar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateContrato() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (
      payload: Partial<ContratoFormData> & { id: string }
    ) => {
      const { id, ...updates } = payload;
      return await contratosService.atualizar(id, updates, tenantId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos', tenantId] });
      writeAuditLog({ action: 'UPDATE_CONTRATO', table: 'contratos', empresaId: tenantId, source: 'useContratos' });
      toast({
        title: 'Sucesso!',
        description: 'Contrato atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteContrato() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      return await contratosService.excluir(id, tenantId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos', tenantId] });
      writeAuditLog({ action: 'DELETE_CONTRATO', table: 'contratos', empresaId: tenantId, source: 'useContratos', severity: 'warning' });
      toast({
        title: 'Sucesso!',
        description: 'Contrato removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
