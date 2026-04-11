import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { mecanicosService } from '@/services/mecanicos.service';
import { writeAuditLog } from '@/lib/audit';

export interface MecanicoRow {
  id: string;
  nome: string;
  telefone: string | null;
  tipo: string;
  especialidade: string | null;
  custo_hora: number | null;
  ativo: boolean;
  codigo_acesso?: string | null;
  escala_trabalho?: string | null;
  folgas_planejadas?: string | null;
  ferias_inicio?: string | null;
  ferias_fim?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MecanicoInsert {
  nome: string;
  telefone?: string | null;
  tipo?: string;
  especialidade?: string | null;
  custo_hora?: number | null;
  ativo?: boolean;
  codigo_acesso?: string | null;
  escala_trabalho?: string | null;
  folgas_planejadas?: string | null;
  ferias_inicio?: string | null;
  ferias_fim?: string | null;
}

export interface MecanicoUpdate {
  nome?: string;
  telefone?: string | null;
  tipo?: string;
  especialidade?: string | null;
  custo_hora?: number | null;
  ativo?: boolean;
  codigo_acesso?: string | null;
  escala_trabalho?: string | null;
  folgas_planejadas?: string | null;
  ferias_inicio?: string | null;
  ferias_fim?: string | null;
}

export function useMecanicos() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['mecanicos', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      return mecanicosService.listar(tenantId!) as Promise<MecanicoRow[]>;
    },
  });
}

export function useMecanicosAtivos() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['mecanicos-ativos', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      return mecanicosService.listarAtivos(tenantId!) as Promise<MecanicoRow[]>;
    },
  });
}

export function useCreateMecanico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (mecanico: MecanicoInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return mecanicosService.criar(mecanico as any, tenantId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mecanicos', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['mecanicos-ativos', tenantId] });
      writeAuditLog({ action: 'CREATE_MECANICO', table: 'mecanicos', recordId: data?.id, empresaId: tenantId, dadosDepois: data as unknown as Record<string, unknown> });
      toast({
        title: 'Mecânico Cadastrado',
        description: `${data.nome} foi cadastrado com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao cadastrar',
        description: error.message || 'Ocorreu um erro ao cadastrar o mecânico.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMecanico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: MecanicoUpdate & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return mecanicosService.atualizar(id, updates as any, tenantId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mecanicos', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['mecanicos-ativos', tenantId] });
      writeAuditLog({ action: 'UPDATE_MECANICO', table: 'mecanicos', recordId: data?.id, empresaId: tenantId, dadosDepois: data as unknown as Record<string, unknown> });
      toast({
        title: 'Mecânico Atualizado',
        description: `${data.nome} foi atualizado com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Ocorreu um erro ao atualizar o mecânico.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteMecanico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      await mecanicosService.excluir(id, tenantId);
    },
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['mecanicos', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['mecanicos-ativos', tenantId] });
      writeAuditLog({ action: 'DELETE_MECANICO', table: 'mecanicos', recordId: deletedId, empresaId: tenantId, source: 'useMecanicos', severity: 'warning' });
      toast({
        title: 'Mecânico Excluído',
        description: 'O mecânico foi removido com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Ocorreu um erro ao excluir o mecânico.',
        variant: 'destructive',
      });
    },
  });
}
