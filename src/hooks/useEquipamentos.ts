import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { equipamentosService } from '@/services/equipamentos.service';
import { type EquipamentoFormData } from '@/schemas/equipamento.schema';
import { writeAuditLog } from '@/lib/audit';

export interface EquipamentoRow {
  id: string;
  tag: string;
  nome: string;
  criticidade: string;
  nivel_risco: string;
  localizacao: string | null;
  fabricante: string | null;
  modelo: string | null;
  numero_serie: string | null;
  data_instalacao: string | null;
  sistema_id: string | null;
  ativo: boolean;
  temporario: boolean;
  data_vencimento: string | null;
  origem: string;
  created_at: string;
  updated_at: string;
  sistema?: {
    id: string;
    codigo: string;
    nome: string;
    area?: {
      id: string;
      codigo: string;
      nome: string;
      planta?: {
        id: string;
        codigo: string;
        nome: string;
      };
    };
  };
}

export interface EquipamentoInsert {
  tag: string;
  nome: string;
  criticidade?: string;
  nivel_risco?: string;
  localizacao?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  data_instalacao?: string | null;
  sistema_id?: string | null;
  ativo?: boolean;
  temporario?: boolean;
  data_vencimento?: string | null;
  origem?: string;
}

export interface EquipamentoUpdate {
  nome?: string;
  criticidade?: string;
  nivel_risco?: string;
  localizacao?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  data_instalacao?: string | null;
  sistema_id?: string | null;
  ativo?: boolean;
  temporario?: boolean;
  data_vencimento?: string | null;
  origem?: string;
}

export function useEquipamentos() {
  const { tenantId } = useAuth();

  const query = useQuery({
    queryKey: ['equipamentos', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) return [] as EquipamentoRow[];
      return equipamentosService.listar(tenantId) as Promise<EquipamentoRow[]>;
    },
  });

  return { ...query, isTruncated: (query.data?.length ?? 0) >= 500 };
}

export function useCreateEquipamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (equipamento: EquipamentoInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return equipamentosService.criar(equipamento as EquipamentoFormData, tenantId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos', tenantId] });
      writeAuditLog({ action: 'CREATE_EQUIPAMENTO', table: 'equipamentos', recordId: data?.id, empresaId: tenantId, dadosDepois: data as unknown as Record<string, unknown> });
      toast({
        title: 'Equipamento Cadastrado',
        description: `TAG ${data.tag} foi cadastrado com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cadastrar',
        description: error.message || 'Ocorreu um erro ao cadastrar o equipamento.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEquipamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EquipamentoUpdate & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return equipamentosService.atualizar(id, updates as Partial<EquipamentoFormData>, tenantId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos', tenantId] });
      writeAuditLog({ action: 'UPDATE_EQUIPAMENTO', table: 'equipamentos', recordId: data?.id, empresaId: tenantId, dadosDepois: data as unknown as Record<string, unknown> });
      toast({
        title: 'Equipamento Atualizado',
        description: `TAG ${data.tag} foi atualizado com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Ocorreu um erro ao atualizar o equipamento.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEquipamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      await equipamentosService.excluir(id, tenantId);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos', tenantId] });
      writeAuditLog({ action: 'DELETE_EQUIPAMENTO', table: 'equipamentos', recordId: deletedId, empresaId: tenantId, source: 'useEquipamentos', severity: 'warning' });
      toast({
        title: 'Equipamento Excluído',
        description: 'O equipamento foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Ocorreu um erro ao excluir o equipamento.',
        variant: 'destructive',
      });
    },
  });
}
