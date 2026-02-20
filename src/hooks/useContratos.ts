import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { contratosService } from '@/services/contratos.service';
import { contratoSchema, type ContratoFormData } from '@/schemas/contrato.schema';
import { ZodError } from 'zod';

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
  fornecedor?: { razao_social: string; nome_fantasia: string | null } | null;
}

export type ContratoInsert = ContratoFormData;

export function useContratos() {
  return useQuery({
    queryKey: ['contratos'],
    queryFn: async () => {
      const data = await contratosService.listar();
      return data as ContratoRow[];
    },
  });
}

export function useContratosAtivos() {
  return useQuery({
    queryKey: ['contratos', 'ativos'],
    queryFn: async () => {
      const data = await contratosService.listarAtivos();
      return data as ContratoRow[];
    },
  });
}

export function useContratosByFornecedor(fornecedorId: string | undefined) {
  return useQuery({
    queryKey: ['contratos', 'fornecedor', fornecedorId],
    queryFn: async () => {
      if (!fornecedorId) return [];
      const data = await contratosService.listarPorFornecedor(fornecedorId);
      return data as ContratoRow[];
    },
    enabled: !!fornecedorId,
  });
}

export function useCreateContrato() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (contrato: ContratoFormData) => {
      try {
        contratoSchema.parse(contrato);
        return await contratosService.criar(contrato);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new Error(error.errors[0]?.message || 'Erro de validação');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({ title: 'Sucesso!', description: 'Contrato cadastrado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateContrato() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContratoFormData> & { id: string }) => {
      return await contratosService.atualizar(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({ title: 'Sucesso!', description: 'Contrato atualizado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteContrato() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => contratosService.excluir(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({ title: 'Sucesso!', description: 'Contrato removido com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    },
  });
}
